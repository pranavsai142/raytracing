precision highp float;

varying vec2 vUv;

uniform vec2 resolution;
uniform float time;
uniform float accumSampleCount;
uniform float samplesPerFrame;
uniform float maxAccumSamples;
uniform vec3 cameraPos;
uniform vec3 cameraTarget;
uniform vec3 cameraUp;
uniform float fov;
uniform float waterIOR;
uniform float interfaceRoughness;
uniform float dispersion;
uniform float maxBounces;
uniform vec3 sunDir;
uniform float sunIntensity;
uniform float volumeSigma;
uniform float volumeG;
// Packed wave components (single path for all presets). Max 4.
// waveCompA[i] = (amplitude, frequency, speed/ω, phase)
// waveCompB[i] = (dirX, dirY, standing 0/1, unused)
// waveCount is set by CPU for metadata/debug; height loops fixed-4 with amp=0 pads.
uniform int waveCount;
uniform vec4 waveCompA[4];
uniform vec4 waveCompB[4];
uniform float cubeDepth;
uniform float cubeRotY;
uniform float cubeRotX;
uniform float exposure;
uniform float vignetteStrength;
uniform sampler2D accumTexture;
uniform float resetAccum;
uniform float displayOnly;
uniform float temporalBlend;
uniform float cameraInteracting;
uniform float turbidity;
uniform vec3 scatterTint;
uniform int absorptionModel;
uniform vec3 sigmaLambda;
uniform vec3 volumeTint;
uniform float atmosphereDensity;
uniform float mediumThickness;
uniform vec3 mediumTint;
uniform vec3 fillDir;
uniform float fillIntensity;
uniform vec3 fillTint;
uniform int sceneMode;
uniform float physiologicalContrast;
uniform float opponentStrength;
uniform float complementStrength;
uniform float secondaryReflectWeight;
uniform float floorReflectance;
uniform float floorHeight;
uniform float floorEnabled;
uniform int floorPattern;
uniform vec3 floorAlbedoColor;
uniform float floorAlbedoScale;
uniform float floorBumpAmp;
uniform float floorBumpFreq;
uniform int floorBumpOctaves;
uniform float floorRoughness;
uniform int floorMaterial;
uniform float floorSpecular;
uniform float floorCheckerScale;
uniform float flameEdgeBoost;
uniform vec3 moonDir;
uniform float moonIntensity;
uniform float candleIntensity;
uniform float bloomStrength;
uniform float fixationStrength;

// --- RNG ---
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float hash3(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

vec2 rand2(vec2 seed) {
  return vec2(hash(seed), hash(seed + 0.1));
}

// --- Waves: surface TOPOLOGY drives escape angles ---
// Sum of up to 4 components (CPU packs multi-octave / single / standing / custom).
// Traveling: A * sin(k·p − ω t + φ)
// Standing:  A * sin(k·p + φ) * cos(ω t)
// k = frequency * (dirX, dirY), ω = speed
float waveHeight(vec2 p, float t) {
  float h = 0.0;
  // Fixed 4-iter loop (unused slots packed with amp=0). waveCount kept for CPU/debug.
  for (int i = 0; i < 4; i++) {
    float amp = waveCompA[i].x;
    float freq = waveCompA[i].y;
    float spd = waveCompA[i].z;
    float phase = waveCompA[i].w;
    vec2 dir = waveCompB[i].xy;
    float standing = waveCompB[i].z;
    float kdot = dot(dir, p) * freq;
    if (standing > 0.5) {
      h += amp * sin(kdot + phase) * cos(spd * t);
    } else {
      h += amp * sin(kdot - spd * t + phase);
    }
  }
  return h;
}

vec2 waveDeriv(vec2 p, float t) {
  float dhdx = 0.0;
  float dhdz = 0.0;
  for (int i = 0; i < 4; i++) {
    float amp = waveCompA[i].x;
    float freq = waveCompA[i].y;
    float spd = waveCompA[i].z;
    float phase = waveCompA[i].w;
    vec2 dir = waveCompB[i].xy;
    float standing = waveCompB[i].z;
    float kdot = dot(dir, p) * freq;
    // k = frequency * dir
    float kx = freq * dir.x;
    float kz = freq * dir.y;
    if (standing > 0.5) {
      // ∂/∂x [A sin(k·p+φ) cos(ωt)] = A cos(k·p+φ) * kx * cos(ωt)
      float c = cos(kdot + phase) * cos(spd * t);
      dhdx += amp * kx * c;
      dhdz += amp * kz * c;
    } else {
      // ∂/∂x [A sin(k·p − ωt + φ)] = A cos(k·p − ωt + φ) * kx
      float c = cos(kdot - spd * t + phase);
      dhdx += amp * kx * c;
      dhdz += amp * kz * c;
    }
  }
  return vec2(dhdx, dhdz);
}

vec3 waveNormal(vec2 p, float t) {
  vec2 d = waveDeriv(p, t);
  return normalize(vec3(-d.x, 1.0, -d.y));
}

// Spectral: wavelength-dependent IOR (emergent chromatic caustics, not faked)
float iorAtWavelength(float lambdaNm, float baseIOR, float disp) {
  if (disp <= 0.001) return baseIOR;
  return baseIOR + disp * ((550.0 - lambdaNm) / 150.0);
}

vec3 spectrumWeight(float lambdaNm) {
  float r = smoothstep(400.0, 700.0, lambdaNm);
  float b = 1.0 - r;
  float g = 1.0 - abs(lambdaNm - 550.0) / 200.0;
  return vec3(r, g, b);
}

struct Ray {
  vec3 origin;
  vec3 direction;
};

struct HitInfo {
  bool hit;
  float dist;
  vec3 point;
  vec3 normal;
  int material;
};

// Geometric medium test: below the heightfield ⇒ water.
// waveNormal points toward air ( +Y hemisphere ).
bool isInWaterAt(vec3 p) {
  return p.y < waveHeight(p.xz, time);
}

// ─── ROOT CAUSE of “STILL / Animate-off goes black” (esp. Above Water) ───
// Water is an *open heightfield*, not a closed mesh. A path that enters water
// (air→water refract) then fails to re-hit surface/floor is still marked
// inWater and contributes underwaterMissRadiance (~near black).
// LIVE hides this: each frame is a noisy independent sample; occasional hits
// look “alive.” STILL progressive 1/N *averages* many black-miss samples →
// solid black. Fix = reliable surface hits + domain closure (never leave a
// underwater ray with nowhere to go). Not exposure, not a paint fudge.
//
// f(t) = (ro+rd*t).y − H((ro+rd*t).xz) = 0
// 1) Classic Oceanscape Newton first (years of above-water reliability).
// 2) Sign-change march for multi-crest / grazing.
// 3) Accept Newton if residual is modest (heightfield is low-frequency vs t).
bool intersectWaterSurface(vec3 ro, vec3 rd, out float t, out vec3 hitN, out vec2 hitXZ) {
  const float ampBound = 0.28; // ≥ WAVE_TOTAL_AMP_BUDGET + margin
  const float tMin = 1e-3;
  const float tMax = 200.0;
  t = -1.0;
  hitXZ = ro.xz;
  hitN = vec3(0.0, 1.0, 0.0);

  // —— 1) Classic Oceanscape: seed mean plane y=0, refine with wave height ——
  // This is the path that made above-water look correct before over-strict
  // “sign-change only” intersection started false-missing.
  if (abs(rd.y) >= 1e-5) {
    t = (-ro.y) / rd.y;
    if (t >= tMin && t <= tMax) {
      bool ok = true;
      for (int i = 0; i < 6; i++) {
        vec3 p = ro + rd * t;
        hitXZ = p.xz;
        float h = waveHeight(hitXZ, time);
        float tNew = (h - ro.y) / rd.y;
        if (tNew < tMin || tNew > tMax) {
          ok = false;
          break;
        }
        // Analytic Newton step when slope is available (faster convergence)
        vec2 dH = waveDeriv(hitXZ, time);
        float f = p.y - h;
        float dfdt = rd.y - (dH.x * rd.x + dH.y * rd.z);
        if (abs(dfdt) > 1e-6) {
          float tN = t - f / dfdt;
          if (tN >= tMin && tN <= tMax) tNew = tN;
        }
        if (abs(tNew - t) < 1e-4) {
          t = tNew;
          break;
        }
        t = tNew;
      }
      if (ok && t >= tMin && t <= tMax) {
        hitXZ = (ro + rd * t).xz;
        float hN = waveHeight(hitXZ, time);
        float resid = abs((ro.y + rd.y * t) - hN);
        // Waves are smooth at our amp budget; modest residual is a real hit.
        if (resid < 0.12) {
          hitN = waveNormal(hitXZ, time);
          return true;
        }
      }
    }
  }

  // —— 2) Sign-change march (grazing / multi-crest / Newton miss) ——
  float tLo;
  float tHi;
  if (abs(rd.y) < 1e-5) {
    tLo = tMin;
    tHi = min(tMax, 100.0);
  } else {
    float yLo = min(-ampBound, ro.y - 0.5);
    float yHi = max(ampBound, ro.y + 0.5);
    yLo = min(yLo, -ampBound);
    yHi = max(yHi, ampBound);
    float ta = (yLo - ro.y) / rd.y;
    float tb = (yHi - ro.y) / rd.y;
    tLo = max(tMin, min(ta, tb));
    tHi = min(tMax, max(ta, tb));
    if (tLo > tHi) {
      tLo = tMin;
      tHi = tMax;
    }
  }

  const int STEPS = 64;
  float dt = (tHi - tLo) / float(STEPS);
  float tPrev = tLo;
  float fPrev = (ro.y + rd.y * tPrev) - waveHeight((ro + rd * tPrev).xz, time);

  for (int i = 1; i <= STEPS; i++) {
    float tCurr = (i == STEPS) ? tHi : (tLo + float(i) * dt);
    float fCurr = (ro.y + rd.y * tCurr) - waveHeight((ro + rd * tCurr).xz, time);

    if (fPrev * fCurr <= 0.0 && (abs(fPrev) + abs(fCurr)) > 1e-8) {
      float a = tPrev;
      float b = tCurr;
      float fa = fPrev;
      for (int j = 0; j < 20; j++) {
        float m = 0.5 * (a + b);
        float fm = (ro.y + rd.y * m) - waveHeight((ro + rd * m).xz, time);
        if (fa * fm <= 0.0) {
          b = m;
        } else {
          a = m;
          fa = fm;
        }
      }
      t = 0.5 * (a + b);
      if (t >= tMin && t <= tMax) {
        hitXZ = (ro + rd * t).xz;
        hitN = waveNormal(hitXZ, time);
        return true;
      }
    }
    tPrev = tCurr;
    fPrev = fCurr;
  }

  return false;
}

float intersectBox(vec3 ro, vec3 rd, vec3 boxMin, vec3 boxMax, out vec3 outN) {
  vec3 invD = 1.0 / rd;
  vec3 t0 = (boxMin - ro) * invD;
  vec3 t1 = (boxMax - ro) * invD;
  vec3 tmin = min(t0, t1);
  vec3 tmax = max(t0, t1);
  float tNear = max(max(tmin.x, tmin.y), tmin.z);
  float tFar = min(min(tmax.x, tmax.y), tmax.z);
  if (tNear > tFar || tFar < 0.001) return -1.0;
  float t = tNear > 0.001 ? tNear : tFar;
  vec3 p = ro + rd * t;
  vec3 center = (boxMin + boxMax) * 0.5;
  vec3 d = p - center;
  vec3 size = (boxMax - boxMin) * 0.5;
  vec3 ad = abs(d) / size;
  if (ad.x > ad.y && ad.x > ad.z) outN = vec3(sign(d.x), 0.0, 0.0);
  else if (ad.y > ad.z) outN = vec3(0.0, sign(d.y), 0.0);
  else outN = vec3(0.0, 0.0, sign(d.z));
  return t;
}

// Finite vertical cylinder (Y-axis) — stick for §76 dual coloured shadows.
// Prior sphere math ignored the Y extent and produced only a pinhead occluder.
float intersectRod(vec3 ro, vec3 rd) {
  if (sceneMode < 3) return -1.0;
  vec2 rodXZ = vec2(0.5, 0.0);
  float r = 0.09;
  float rodTop = floorHeight + 2.0;
  vec2 oc = ro.xz - rodXZ;
  vec2 d = rd.xz;
  float a = dot(d, d);
  float b = dot(oc, d);
  float c = dot(oc, oc) - r * r;
  float disc = b * b - a * c;
  if (disc < 0.0 || a < 1e-12) return -1.0;
  float s = sqrt(disc);
  float invA = 1.0 / a;
  float t0 = (-b - s) * invA;
  float t1 = (-b + s) * invA;
  float tHit = 1e20;
  for (int k = 0; k < 2; k++) {
    float t = (k == 0) ? t0 : t1;
    if (t < 0.001 || t > 200.0) continue;
    float y = ro.y + rd.y * t;
    if (y >= floorHeight && y <= rodTop) tHit = min(tHit, t);
  }
  return tHit < 1e19 ? tHit : -1.0;
}

float intersectGreyPlane(vec3 ro, vec3 rd) {
  if (sceneMode != 7 || rd.y >= -0.001) return -1.0;
  float t = (1.5 - ro.y) / rd.y;
  if (t < 0.001 || t > 200.0) return -1.0;
  vec3 p = ro + rd * t;
  if (abs(p.x) > 4.0 || abs(p.z) > 4.0) return -1.0;
  return t;
}

// --- Seafloor heightfield (bump noise) + albedo patterns ---
float floorValueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float floorHeightField(vec2 xz) {
  if (floorBumpAmp < 1e-5) return floorHeight;
  float h = 0.0;
  float amp = 1.0;
  float freq = max(floorBumpFreq, 0.05);
  float sumAmp = 0.0;
  int octs = clamp(floorBumpOctaves, 1, 4);
  for (int o = 0; o < 4; o++) {
    if (o >= octs) break;
    h += amp * (floorValueNoise(xz * freq) * 2.0 - 1.0);
    sumAmp += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  if (sumAmp > 1e-5) h /= sumAmp;
  return floorHeight + floorBumpAmp * h;
}

vec2 floorHeightDeriv(vec2 xz) {
  float e = 0.025;
  float hx0 = floorHeightField(xz - vec2(e, 0.0));
  float hx1 = floorHeightField(xz + vec2(e, 0.0));
  float hz0 = floorHeightField(xz - vec2(0.0, e));
  float hz1 = floorHeightField(xz + vec2(0.0, e));
  return vec2((hx1 - hx0) / (2.0 * e), (hz1 - hz0) / (2.0 * e));
}

vec3 floorNormalAt(vec2 xz) {
  vec2 dH = floorHeightDeriv(xz);
  return normalize(vec3(-dH.x, 1.0, -dH.y));
}

// Plane seed + optional low-amp Newton; residual fail → plane fallback.
float intersectFloor(vec3 ro, vec3 rd, out vec3 outN) {
  outN = vec3(0.0, 1.0, 0.0);
  if (floorEnabled < 0.5) return -1.0;
  if (rd.y >= -0.001) return -1.0;

  float tPlane = (floorHeight - ro.y) / rd.y;
  if (tPlane < 0.001 || tPlane > 200.0) return -1.0;

  if (floorBumpAmp < 1e-5) {
    return tPlane;
  }

  float ampBound = max(floorBumpAmp * 1.25, 0.02);
  float t0 = (floorHeight - ampBound - ro.y) / rd.y;
  float t1 = (floorHeight + ampBound - ro.y) / rd.y;
  float tLo = max(min(t0, t1), 0.001);
  float tHi = min(max(t0, t1), 200.0);
  if (tLo > tHi) return tPlane;

  float t = clamp(tPlane, tLo, tHi);
  for (int i = 0; i < 4; i++) {
    vec3 p = ro + rd * t;
    float h = floorHeightField(p.xz);
    float f = p.y - h;
    if (abs(f) < 1e-4) break;
    vec2 dH = floorHeightDeriv(p.xz);
    float dfdt = rd.y - (dH.x * rd.x + dH.y * rd.z);
    if (abs(dfdt) < 1e-6) break;
    float tNew = clamp(t - f / dfdt, tLo, tHi);
    if (abs(tNew - t) < 1e-5) {
      t = tNew;
      break;
    }
    t = tNew;
  }

  vec3 pHit = ro + rd * t;
  float residual = abs(pHit.y - floorHeightField(pHit.xz));
  if (t < 0.001 || t > 200.0 || residual > max(0.08, floorBumpAmp * 2.5)) {
    outN = vec3(0.0, 1.0, 0.0);
    return tPlane;
  }
  outN = floorNormalAt(pHit.xz);
  return t;
}

// Parametric albedo: pattern + color*scale (sceneMode no longer drives floor paint).
vec3 floorAlbedo(vec3 p) {
  vec3 base = floorAlbedoColor * floorAlbedoScale;

  // 3 = split yellow|white (Goethe §56 contrast)
  if (floorPattern == 3) {
    float s = max(floorAlbedoScale, 0.01);
    return p.x < 0.0 ? vec3(0.9, 0.85, 0.1) * s : vec3(0.92) * s;
  }

  // 4 = checker
  if (floorPattern == 4) {
    float sc = max(floorCheckerScale, 0.5);
    float checker = mod(floor(p.x * sc) + floor(p.z * sc), 2.0);
    return mix(base * 0.35, base, checker);
  }

  // 1 = gravel multi-scale noise
  if (floorPattern == 1) {
    float f = max(floorBumpFreq, 0.5);
    float n1 = floorValueNoise(p.xz * f * 1.7);
    float n2 = floorValueNoise(p.xz * f * 4.3 + 17.0);
    float n3 = floorValueNoise(p.xz * f * 9.1 + 41.0);
    float gravel = 0.72 + 0.22 * n1 + 0.12 * (n2 - 0.5) + 0.06 * (n3 - 0.5);
    vec3 rock = mix(base, base * vec3(0.82, 0.86, 0.92), n2 * 0.45);
    return rock * gravel;
  }

  // 2 = sand finer smoother grain
  if (floorPattern == 2) {
    float f = max(floorBumpFreq, 0.5);
    float n1 = floorValueNoise(p.xz * f * 3.0);
    float n2 = floorValueNoise(p.xz * f * 8.0 + 3.0);
    float sand = 0.9 + 0.08 * n1 + 0.04 * n2;
    return base * sand;
  }

  // 0 = uniform
  return base;
}

bool shadowedByRod(vec3 p, vec3 lightDir) {
  if (sceneMode < 3) return false;
  vec2 rodXZ = vec2(0.5, 0.0);
  float r = 0.09;
  float rodTop = floorHeight + 2.0;
  vec2 oc = p.xz - rodXZ;
  vec2 d = lightDir.xz;
  float a = dot(d, d);
  float b = dot(oc, d);
  float c = dot(oc, oc) - r * r;
  // Near-vertical light: umbra is the rod's footprint on the floor
  if (a < 1e-8) return c < 0.0;
  float disc = b * b - a * c;
  if (disc < 0.0) return false;
  float s = sqrt(disc);
  float invA = 1.0 / a;
  float t0 = (-b - s) * invA;
  float t1 = (-b + s) * invA;
  for (int k = 0; k < 2; k++) {
    float t = (k == 0) ? t0 : t1;
    if (t < 0.001) continue;
    float y = p.y + lightDir.y * t;
    if (y >= floorHeight && y <= rodTop) return true;
  }
  return false;
}

vec3 rotateCube(vec3 p) {
  float cy = cos(cubeRotY); float sy = sin(cubeRotY);
  vec3 p1 = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);
  float cx = cos(cubeRotX); float sx = sin(cubeRotX);
  return vec3(p1.x, cx * p1.y - sx * p1.z, sx * p1.y + cx * p1.z);
}

vec3 rotateCubeInv(vec3 p) {
  float cx = cos(-cubeRotX); float sx = sin(-cubeRotX);
  vec3 p1 = vec3(p.x, cx * p.y - sx * p.z, sx * p.y + cx * p.z);
  float cy = cos(-cubeRotY); float sy = sin(-cubeRotY);
  return vec3(cy * p1.x + sy * p1.z, p1.y, -sy * p1.x + cy * p1.z);
}

HitInfo traceScene(Ray r) {
  HitInfo info;
  info.hit = false;

  float tPlane;
  vec3 planeN;
  vec2 hitXZ;
  bool planeHit = intersectWaterSurface(r.origin, r.direction, tPlane, planeN, hitXZ);

  vec3 cubeCenter = vec3(0.0, cubeDepth, 0.0);
  vec3 localRo = rotateCubeInv(r.origin - cubeCenter);
  vec3 localRd = rotateCubeInv(r.direction);
  vec3 cubeN;
  float tCube = intersectBox(localRo, localRd, vec3(-0.75), vec3(0.75), cubeN);
  if (tCube > 0.0) {
    vec3 worldHit = rotateCube(localRo + localRd * tCube) + cubeCenter;
    tCube = length(worldHit - r.origin);
    cubeN = rotateCube(cubeN);
  }

  vec3 floorN;
  float tFloor = intersectFloor(r.origin, r.direction, floorN);
  float tRod = intersectRod(r.origin, r.direction);
  float tGrey = intersectGreyPlane(r.origin, r.direction);

  float tMin = 1e20;
  int mat = -1;
  if (planeHit && tPlane > 0.001 && tPlane < tMin) { tMin = tPlane; mat = 0; }
  if (tCube > 0.0 && tCube < tMin) { tMin = tCube; mat = 1; }
  if (tFloor > 0.0 && tFloor < tMin) { tMin = tFloor; mat = 2; }
  if (tRod > 0.0 && tRod < tMin) { tMin = tRod; mat = 3; }
  if (tGrey > 0.0 && tGrey < tMin) { tMin = tGrey; mat = 4; }

  if (mat >= 0) {
    info.hit = true;
    info.dist = tMin;
    info.point = r.origin + r.direction * tMin;
    info.material = mat;
    if (mat == 0) {
      // Exact heightfield point (intersection t is approximate on xz)
      info.point = vec3(info.point.x, waveHeight(info.point.xz, time), info.point.z);
      info.normal = planeN;
    } else if (mat == 1) info.normal = cubeN;
    else if (mat == 2) info.normal = floorN;
    else info.normal = vec3(0.0, 1.0, 0.0);
  }
  return info;
}

vec3 refractDir(vec3 I, vec3 N, float eta) {
  float cosI = dot(-I, N);
  float sinT2 = eta * eta * (1.0 - cosI * cosI);
  if (sinT2 > 1.0) return vec3(0.0);
  float cosT = sqrt(1.0 - sinT2);
  return eta * I + (eta * cosI - cosT) * N;
}

float schlickFresnel(float cosTheta, float eta) {
  float r0 = pow((1.0 - eta) / (1.0 + eta), 2.0);
  return r0 + (1.0 - r0) * pow(1.0 - cosTheta, 5.0);
}

vec3 sampleMicrofacet(vec3 N, float roughness, vec2 ru) {
  if (roughness < 0.001) return N;
  float a = roughness * roughness;
  float phi = 6.28318 * ru.x;
  float cosTheta = sqrt((1.0 - ru.y) / (1.0 + (a * a - 1.0) * ru.y));
  float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
  vec3 up = abs(N.y) > 0.999 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 T = normalize(cross(up, N));
  vec3 B = cross(N, T);
  return normalize(sinTheta * cos(phi) * T + sinTheta * sin(phi) * B + cosTheta * N);
}

vec3 sampleHG(vec3 incDir, float g, vec2 ru) {
  float g2 = g * g;
  float sqrTerm = (1.0 - g2) / (1.0 - g + 2.0 * g * ru.x);
  float cosTheta = (1.0 + g2 - sqrTerm * sqrTerm) / (2.0 * g);
  if (abs(g) < 0.001) cosTheta = 2.0 * ru.x - 1.0;
  float sinTheta = sqrt(max(0.0, 1.0 - cosTheta * cosTheta));
  float phi = 6.28318 * ru.y;
  vec3 up = abs(incDir.y) > 0.999 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 T = normalize(cross(up, incDir));
  vec3 B = cross(incDir, T);
  return normalize(sinTheta * cos(phi) * T + sinTheta * sin(phi) * B + cosTheta * incDir);
}

float henyeyGreensteinPhase(float g, float cosTh) {
  float g2 = g * g;
  float denom = 1.0 + g2 - 2.0 * g * cosTh;
  return (1.0 - g2) / (4.0 * 3.14159 * denom * sqrt(denom));
}

vec3 envLight(vec3 dir, float lambdaNm) {
  vec3 d = normalize(dir);
  float lambdaNorm = (lambdaNm - 400.0) / 300.0;
  float rayleigh = atmosphereDensity * pow(1.0 - lambdaNorm, 4.0) * 0.8;
  vec3 sky = mix(vec3(0.45, 0.65, 0.92), vec3(0.55, 0.75, 1.0), rayleigh);
  sky *= mediumTint;

  float up = max(d.y, 0.0);
  float thickness = mediumThickness * atmosphereDensity;
  sky *= mix(vec3(1.0), vec3(1.2, 0.95, 0.75), thickness * (1.0 - up));

  float sunDot = max(dot(d, normalize(sunDir)), 0.0);
  float airmass = 1.0 / max(d.y + 0.08, 0.05);
  float sunAtten = exp(-airmass * atmosphereDensity * 0.15 * (1.0 + lambdaNorm));
  float sun = pow(sunDot, 64.0) * 4.0 * sunIntensity * sunAtten;

  float moonDot = max(dot(d, normalize(moonDir)), 0.0);
  float moon = pow(moonDot, 128.0) * 6.0 * moonIntensity;

  if (sceneMode == 2) {
    vec3 flamePos = vec3(1.5, -4.5, 0.5);
    float flameDist = length(d - normalize(flamePos - cameraPos));
    float flame = exp(-flameDist * 8.0) * flameEdgeBoost;
    sky += vec3(0.3, 0.5, 1.0) * flame;
  }

  return (sky + vec3(3.5, 3.2, 2.8) * sun + vec3(2.8, 2.6, 2.2) * moon) * spectrumWeight(lambdaNm);
}

// Residual in-scatter if a path truly cannot hit surface/floor (should be rare
// after domain closure). Never sample air sky here — medium leak / white bar.
vec3 underwaterMissRadiance(vec3 dir, float lambdaNm) {
  return scatterTint * volumeTint * spectrumWeight(lambdaNm) * 0.04;
}

vec3 cubeTexture(vec3 localP, vec3 localN) {
  vec2 uv;
  if (abs(localN.x) > 0.5) uv = localP.yz * 0.5 + 0.5;
  else if (abs(localN.y) > 0.5) uv = localP.xz * 0.5 + 0.5;
  else uv = localP.xy * 0.5 + 0.5;
  float checker = mod(floor(uv.x * 8.0) + floor(uv.y * 8.0), 2.0);
  return mix(vec3(0.85, 0.55, 0.25), vec3(0.35, 0.65, 0.85), checker);
}

vec3 toneMap(vec3 hdr) {
  hdr *= exposure;
  vec3 mapped = hdr / (hdr + vec3(1.0));
  mapped = mapped / (mapped + vec3(0.15));
  mapped = mix(mapped, mapped * vec3(0.85, 0.95, 1.05), 0.15);
  return mapped;
}

// Volume scatter along leg — can redirect back to interface (trapped light escape)
vec3 volumeAttenuation(float dist, float lambdaNm) {
  float sigma = volumeSigma + turbidity * 0.12;
  if (absorptionModel == 1) {
    vec3 sw = spectrumWeight(lambdaNm);
    vec3 att = exp(-sigmaLambda * sigma * dist * sw);
    return att;
  }
  if (absorptionModel == 2) {
    float warm = turbidity * dist * 0.15;
    return mix(vec3(1.0), vec3(1.2, 0.95, 0.7), warm) * exp(-sigma * dist);
  }
  return vec3(exp(-sigma * dist));
}

bool volumeScatterLeg(Ray ray, float legDist, float lambdaNm, vec2 seed, int bounce,
                      inout vec3 throughput, inout vec3 accum, inout Ray outRay) {
  float sigma_t = volumeSigma + turbidity * 0.12;
  if (sigma_t < 0.001) return false;
  float sigma_s = sigma_t * 0.55;
  float g = volumeG;
  vec3 godBeam = scatterTint * spectrumWeight(lambdaNm) * volumeTint;

  float u = hash3(vec3(seed, float(bounce)));
  float freePath = -log(max(u, 0.001)) / sigma_t;

  if (freePath > 0.001 && freePath < legDist && sigma_s > 0.001) {
    vec3 atten = volumeAttenuation(freePath, lambdaNm);
    throughput *= atten * (sigma_s / sigma_t);
    vec3 scatterDir = sampleHG(ray.direction, g, rand2(seed + float(bounce + 70)));
    float cosPh = dot(-ray.direction, scatterDir);
    float ph = henyeyGreensteinPhase(g, cosPh);
    accum += throughput * godBeam * ph * 0.06;
    outRay.origin = ray.origin + ray.direction * freePath + scatterDir * 0.002;
    outRay.direction = scatterDir;
    return true;
  }
  return false;
}

// Full multi-bounce path tracer — light traps until topology + angle allow escape
vec3 pathTrace(Ray primary, vec2 seed, float lambdaNm) {
  vec3 accum = vec3(0.0);
  vec3 throughput = vec3(1.0);
  Ray ray = primary;
  float ior = iorAtWavelength(lambdaNm, waterIOR, dispersion);
  // Medium from heightfield, not flat y=0 (waves displace the interface)
  bool inWater = isInWaterAt(primary.origin);

  int maxB = int(maxBounces + 0.5);
  for (int bounce = 0; bounce < 12; bounce++) {
    if (bounce >= maxB) break;
    HitInfo hit = traceScene(ray);
    vec2 ru = rand2(seed + float(bounce) * 17.0);

    // —— Domain closure (production): infinite ocean = surface + optional floor.
    // Underwater rays that "miss" are almost always a false miss (intersection
    // failure or near-horizontal path). Those used to terminate with near-black
    // residual → speckles / black spots that pop each sample in LIVE/early STILL.
    // Close the domain instead of inventing sky underwater.
    if (!hit.hit && inWater) {
      if (ray.direction.y > 1e-4) {
        // Going up: must meet the free surface
        float tS;
        vec3 nS;
        vec2 xzS;
        if (intersectWaterSurface(ray.origin, ray.direction, tS, nS, xzS) && tS > 0.001) {
          hit.hit = true;
          hit.dist = tS;
          hit.point = vec3(xzS.x, waveHeight(xzS, time), xzS.y);
          hit.normal = nS;
          hit.material = 0;
        }
      } else if (floorEnabled > 0.5 && ray.direction.y < -1e-4) {
        // Going down: must meet the seafloor plane
        float tF = (floorHeight - ray.origin.y) / ray.direction.y;
        if (tF > 0.001 && tF < 200.0) {
          hit.hit = true;
          hit.dist = tF;
          hit.point = ray.origin + ray.direction * tF;
          hit.normal = vec3(0.0, 1.0, 0.0);
          hit.material = 2;
        }
      }
    }

    // Travel segment through water: Beer attenuation (physical path length)
    if (inWater && hit.hit) {
      throughput *= volumeAttenuation(hit.dist, lambdaNm);
    } else if (inWater && !hit.hit) {
      // Near-horizontal residual only (should be uncommon after closure)
      throughput *= volumeAttenuation(12.0, lambdaNm);
    }

    if (!hit.hit) {
      if (inWater) accum += throughput * underwaterMissRadiance(ray.direction, lambdaNm);
      else accum += throughput * envLight(ray.direction, lambdaNm);
      break;
    }

    vec3 I = ray.direction;
    vec3 N = hit.normal;

    if (hit.material == 3) {
      accum += throughput * vec3(0.02);
      break;
    }

    if (hit.material == 4) {
      vec3 grey = vec3(0.45);
      accum += throughput * grey * spectrumWeight(lambdaNm);
      break;
    }

    // Cube — north-star validation geometry. Light comes through the dielectric:
    // reverse-NEE samples the waved surface, Snell-refracts toward the sun (caustics),
    // and TIR paths contribute zero transmission (trapped light never arrives).
    if (hit.material == 1) {
      vec3 cubeCenter = vec3(0.0, cubeDepth, 0.0);
      vec3 localP = rotateCubeInv(hit.point - cubeCenter);
      vec3 localN = normalize(rotateCubeInv(N));
      vec3 worldN = normalize(N);
      // Path atten already applied for this leg; residual single-scatter glow
      if (inWater) {
        vec3 godBeam = scatterTint * spectrumWeight(lambdaNm) * volumeTint;
        float pathTau = volumeSigma + turbidity * 0.12;
        float glow = 1.0 - exp(-pathTau * hit.dist);
        accum += throughput * godBeam * glow * 0.06;
      }
      vec3 albedo = cubeTexture(localP, localN);
      vec3 sunL = normalize(sunDir);
      vec3 fillL = normalize(fillDir);

      // Interface caustic gather: sample surface points above the cube hit
      vec3 caustic = vec3(0.0);
      for (int ci = 0; ci < 4; ci++) {
        vec2 rj = rand2(seed + float(bounce * 31 + ci * 7) + float(ci) * 0.17);
        // Jitter on surface around vertical projection of hit toward sun slant
        vec2 surfXZ = hit.point.xz + (rj - 0.5) * 2.4 + sunL.xz * 0.8;
        float h = waveHeight(surfXZ, time);
        vec3 surfP = vec3(surfXZ.x, h, surfXZ.y);
        vec3 toSurf = surfP - hit.point;
        float distS = length(toSurf);
        if (distS < 0.001) continue;
        vec3 L = toSurf / distS;
        float nDotL = max(dot(worldN, L), 0.0);
        if (nDotL < 0.001) continue;

        vec3 sN = waveNormal(surfXZ, time);
        // Water -> air refraction of path from cube to surface continuing to sun
        vec3 N_eff = sN;
        float eta = ior; // water IOR / air
        if (dot(-L, N_eff) < 0.0) N_eff = -N_eff;
        float cosI = max(dot(N_eff, -L), 0.0);
        float sinT2 = eta * eta * (1.0 - cosI * cosI);
        // TIR: no transmission out — light stays trapped; no contribution
        if (sinT2 > 1.0) continue;
        float cosT = sqrt(max(0.0, 1.0 - sinT2));
        vec3 Tdir = normalize(eta * (-L) + (eta * cosI - cosT) * N_eff);
        float sunAlign = max(dot(Tdir, sunL), 0.0);
        // Sharp focus = caustic hotspots from wave topology + spectral IOR
        float focus = pow(sunAlign, 48.0 + dispersion * 400.0);
        float fresT = 1.0 - schlickFresnel(cosI, eta);
        vec3 attPath = volumeAttenuation(distS, lambdaNm);
        caustic += attPath * fresT * focus * nDotL * sunIntensity * vec3(1.15, 1.05, 0.9);
      }
      caustic *= spectrumWeight(lambdaNm) * 0.25;

      // Soft fill through Snell cone (ambient ocean light, not painted pigment)
      float snellAmbient = 0.12 + 0.18 * max(sunL.y, 0.0);
      vec3 fillTerm = fillIntensity * fillTint * max(dot(worldN, fillL), 0.0) * 0.35;
      vec3 ambient = snellAmbient * mix(vec3(0.35, 0.5, 0.65), scatterTint, 0.35);
      // Mild direct only when camera/path is above water (air-side view of cube through interface)
      float airDirect = inWater ? 0.0 : max(dot(worldN, sunL), 0.0) * sunIntensity * 0.25;

      vec3 lit = albedo * (caustic + ambient + fillTerm + airDirect * vec3(1.1, 1.0, 0.85));
      accum += throughput * lit * spectrumWeight(lambdaNm);
      break;
    }

    if (hit.material == 2) {
      // Path atten already applied for this leg; residual single-scatter glow
      if (inWater) {
        vec3 godBeam = scatterTint * spectrumWeight(lambdaNm) * volumeTint;
        float pathTau = volumeSigma + turbidity * 0.12;
        float glow = 1.0 - exp(-pathTau * hit.dist);
        accum += throughput * godBeam * glow * 0.06;
      }

      // Mirror: reflect and continue path (do not terminate with a white shade)
      if (floorMaterial == 2) {
        vec3 Nn = N;
        if (dot(Nn, -I) < 0.0) Nn = -Nn;
        vec3 reflDir = normalize(I - 2.0 * dot(I, Nn) * Nn);
        float cosR = max(dot(-I, Nn), 0.0);
        float fres = mix(max(floorSpecular, 0.6), 1.0, pow(1.0 - cosR, 5.0));
        vec3 mAlb = floorAlbedo(hit.point);
        throughput *= mix(vec3(max(floorReflectance, 0.55)), mAlb, 0.12) * fres;
        ray.origin = hit.point + Nn * 0.003;
        ray.direction = reflDir;
        continue;
      }

      vec3 alb = floorAlbedo(hit.point);
      vec3 sunL = normalize(sunDir);
      vec3 fillL = normalize(fillDir);
      bool sunSh = shadowedByRod(hit.point, sunL);
      bool fillSh = shadowedByRod(hit.point, fillL);
      vec3 lit = vec3(0.0);
      float nSun = max(dot(N, sunL), 0.0);
      float nFill = max(dot(N, fillL), 0.0);
      if (!sunSh) lit += alb * sunIntensity * vec3(1.1, 1.0, 0.85) * nSun;
      if (!fillSh) lit += alb * fillIntensity * fillTint * nFill;
      if (sunSh && fillSh) lit = alb * 0.02;

      // Glossy: Blinn-Phong specular on top of diffuse (roughness → shininess)
      if (floorMaterial == 1) {
        vec3 V = normalize(-I);
        float rough = clamp(floorRoughness, 0.04, 1.0);
        float shininess = mix(256.0, 4.0, rough);
        if (!sunSh) {
          vec3 H = normalize(sunL + V);
          float spec = pow(max(dot(N, H), 0.0), shininess);
          lit += floorSpecular * sunIntensity * vec3(1.1, 1.0, 0.85) * spec;
        }
        if (!fillSh) {
          vec3 Hf = normalize(fillL + V);
          float specF = pow(max(dot(N, Hf), 0.0), shininess * 0.5);
          lit += floorSpecular * 0.45 * fillIntensity * fillTint * specF;
        }
      }

      accum += throughput * lit * spectrumWeight(lambdaNm);
      break;
    }

    // --- Water interface: Fresnel / Snell / TIR on geometric heightfield normal ---
    // waveNormal points toward air. fromInside = ray in water (approaching from -N).
    bool fromInside = dot(I, N) > 0.0;
    vec3 N_eff = fromInside ? -N : N;
    float eta = fromInside ? ior : (1.0 / ior); // incident IOR / transmitted IOR for refractDir

    float cosTheta = max(dot(N_eff, -I), 0.0);
    float reflectance = schlickFresnel(cosTheta, eta);
    vec3 T = refractDir(I, N_eff, eta);
    bool tir = (eta > 1.0) && (length(T) < 1e-6);
    if (tir) reflectance = 1.0;

    // Microfacet for rough interface (same N_eff for both reflect and refract — no ad-hoc spread)
    vec3 N_micro = sampleMicrofacet(N_eff, interfaceRoughness, ru);
    // Keep microfacet on same hemisphere as geometric N_eff
    if (dot(N_micro, N_eff) < 0.0) N_micro = -N_micro;

    bool chooseReflect = tir || (ru.x < reflectance);
    vec3 nextDir;

    if (chooseReflect) {
      nextDir = normalize(I - 2.0 * dot(I, N_micro) * N_micro);
      // Reflect must leave into the incident medium hemisphere
      if (dot(nextDir, N_eff) < 0.0) {
        nextDir = normalize(I - 2.0 * dot(I, N_eff) * N_eff);
      }
      if (!fromInside && secondaryReflectWeight > 0.001) {
        vec3 reflDir = nextDir;
        if (reflDir.y < -0.05) {
          float tFl = (floorHeight - hit.point.y) / reflDir.y;
          if (tFl > 0.001 && tFl < 30.0) {
            accum += throughput * floorReflectance * secondaryReflectWeight * vec3(0.08, 0.1, 0.14);
          }
        }
      }
    } else {
      // Do NOT normalize(0) — GLSL gives NaN → whole path blacks STILL average
      vec3 Tm = refractDir(I, N_micro, eta);
      if (dot(Tm, Tm) < 1e-12) {
        Tm = refractDir(I, N_eff, eta);
      }
      if (dot(Tm, Tm) < 1e-12) {
        nextDir = normalize(I - 2.0 * dot(I, N_eff) * N_eff);
        chooseReflect = true;
      } else {
        nextDir = normalize(Tm);
      }
    }

    // Medium after event: reflect stays, transmit flips
    if (!chooseReflect) inWater = !fromInside;

    // Dielectric spawn: offset along geometric normal into the medium we enter.
    // waveNormal points to air (+). Snap so heightfield side matches intent
    // (tilted N + eps can land in a trough/air pocket → medium desync → black path).
    bool enterAir = chooseReflect ? !fromInside : fromInside;
    float eps = 0.003;
    vec3 spawnPos = hit.point + N * (enterAir ? eps : -eps);
    for (int k = 0; k < 5; k++) {
      bool below = isInWaterAt(spawnPos);
      if (enterAir && !below) break;
      if (!enterAir && below) break;
      spawnPos += N * (enterAir ? eps : -eps);
    }
    // Prefer geometric side of the free surface after snap
    inWater = isInWaterAt(spawnPos);
    if (enterAir && inWater) {
      spawnPos += N * (eps * 3.0);
      inWater = false;
    } else if (!enterAir && !inWater) {
      spawnPos -= N * (eps * 3.0);
      inWater = true;
    }

    ray.origin = spawnPos;
    ray.direction = nextDir;

    // Optional single-scatter in water along the *outgoing* ray (not the old incident ray)
    if (inWater) {
      Ray volRay;
      float legLen = 4.0;
      if (volumeScatterLeg(ray, legLen, lambdaNm, seed, bounce, throughput, accum, volRay)) {
        ray = volRay;
        inWater = isInWaterAt(ray.origin);
      }
    }

    // Russian roulette after a few bounces — keep q floor higher so we don't
    // kill barely-alive underwater paths into pure black samples as often.
    if (bounce >= 4) {
      float lum = max(throughput.r, max(throughput.g, throughput.b));
      float q = clamp(lum, 0.15, 0.95);
      if (hash3(vec3(seed, float(bounce + 99))) > q) break;
      throughput /= q;
    }
  }

  return accum;
}

void main() {
  vec2 uv = vUv;

  if (displayOnly > 0.5) {
    vec3 accumulated = texture2D(accumTexture, uv).rgb;

    if (physiologicalContrast > 0.5) {
      vec2 px = 1.0 / resolution;
      vec3 avg = vec3(0.0);
      for (int dy = -2; dy <= 2; dy++) {
        for (int dx = -2; dx <= 2; dx++) {
          avg += texture2D(accumTexture, uv + vec2(float(dx), float(dy)) * px * 4.0).rgb;
        }
      }
      avg /= 25.0;
      vec3 opp = vec3(1.0) - avg;
      accumulated += opp * opponentStrength * 0.15;
    }

    if (complementStrength > 0.001) {
      float lum = dot(accumulated, vec3(0.299, 0.587, 0.114));
      vec3 opp = vec3(1.0) - accumulated / max(lum, 0.001);
      float shadowMask = 1.0 - smoothstep(0.02, 0.12, lum);
      accumulated += opp * complementStrength * shadowMask * 0.2;
    }

    if (bloomStrength > 0.001) {
      vec2 px = 1.0 / resolution;
      vec3 bloom = vec3(0.0);
      for (int i = 1; i <= 3; i++) {
        float fi = float(i);
        bloom += texture2D(accumTexture, uv + vec2(fi, 0.0) * px * 3.0).rgb;
        bloom += texture2D(accumTexture, uv - vec2(fi, 0.0) * px * 3.0).rgb;
        bloom += texture2D(accumTexture, uv + vec2(0.0, fi) * px * 3.0).rgb;
        bloom += texture2D(accumTexture, uv - vec2(0.0, fi) * px * 3.0).rgb;
      }
      bloom /= 12.0;
      float bright = max(bloom.r, max(bloom.g, bloom.b));
      accumulated += bloom * bloomStrength * smoothstep(0.3, 0.8, bright);
    }

    if (fixationStrength > 0.01) {
      vec2 center = vec2(0.5, 0.45);
      float d = length(uv - center);
      float mask = smoothstep(0.15, 0.05, d) * fixationStrength;
      accumulated += vec3(0.1, 0.35, 0.45) * mask * 0.25;
    }

    vec2 vigUv = uv * 2.0 - 1.0;
    accumulated *= 1.0 - dot(vigUv, vigUv) * vignetteStrength;
    gl_FragColor = vec4(toneMap(accumulated), 1.0);
    return;
  }

  vec2 pixel = uv * resolution;
  vec3 forward = normalize(cameraTarget - cameraPos);
  vec3 right = normalize(cross(forward, cameraUp));
  vec3 up = cross(right, forward);
  float aspect = resolution.x / resolution.y;
  float tanHalfFov = tan(radians(fov) * 0.5);

  vec3 color = vec3(0.0);
  int spp = int(samplesPerFrame + 0.5);

  for (int s = 0; s < 8; s++) {
    if (s >= spp) break;
    vec2 jitter = rand2(pixel + float(s) * 13.7 + accumSampleCount * 0.31);

    // Hero wavelength per sample — spectral dispersion from real IOR variation
    float lambdaNm = mix(400.0, 700.0, hash(pixel + float(s) * 7.0));

    vec2 ndc = (pixel + jitter - 0.5) / resolution * 2.0 - 1.0;
    ndc.x *= aspect;
    vec3 rd = normalize(forward + right * ndc.x * tanHalfFov + up * ndc.y * tanHalfFov);

    Ray primary;
    primary.origin = cameraPos;
    primary.direction = rd;
    vec3 sampleCol = pathTrace(primary, pixel + jitter + float(s), lambdaNm);
    // Soft firefly clamp (production path tracers): kill rare huge spikes that
    // make neighboring near-black samples look like "popping" holes in LIVE.
    float peak = max(sampleCol.r, max(sampleCol.g, sampleCol.b));
    if (peak > 8.0) sampleCol *= 8.0 / peak;
    color += sampleCol;
  }
  color /= max(float(spp), 1.0);

  // LIVE (cameraInteracting / reset): current path-trace frame only — no history.
  // Blending mismatched wave/cube poses was the spotty ghosting bug.
  // STILL: progressive Monte Carlo 1/N until maxAccumSamples, then *rolling* blend
  // so each pixel keeps a sample lifetime (new path samples never fully freeze out).
  // That matches the product need: Animate-off must not lock a black plate forever
  // if early samples were dark; continuous refresh can wash them out once paths are valid.
  vec3 accumulated;
  if (cameraInteracting > 0.5 || resetAccum > 0.5) {
    accumulated = color;
  } else {
    vec3 prev = texture2D(accumTexture, uv).rgb;
    float n = max(accumSampleCount, 0.0);
    float spp = max(samplesPerFrame, 1.0);
    float cap = max(maxAccumSamples, 1.0);
    // Progressive MC: after n prior samples, fold in spp new ones with weight spp/(n+spp).
    float w = spp / (n + spp);
    // Sample TTL / rolling: once at nominal budget, keep a floor weight so new
    // path samples still replace a fraction of history (never fully stop).
    if (n + 0.5 >= cap) {
      float roll = max(temporalBlend, spp / cap);
      w = max(w, roll);
    }
    accumulated = mix(prev, color, clamp(w, 0.0, 1.0));
  }

  gl_FragColor = vec4(accumulated, 1.0);
}