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
uniform float waveAmplitude;
uniform float waveFrequency;
uniform float waveSpeed;
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
float waveHeight(vec2 p, float t) {
  float h = 0.0;
  float amp = waveAmplitude;
  float freq = waveFrequency;
  float spd = waveSpeed;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float ang = fi * 1.3 + 0.7;
    vec2 dir = normalize(vec2(cos(ang), sin(ang * 0.6)));
    float ph = dot(dir, p) * freq - t * spd * (0.9 + fi * 0.15);
    h += amp * sin(ph);
    amp *= 0.52;
    freq *= 1.85;
    spd *= 1.05;
  }
  return h;
}

vec2 waveDeriv(vec2 p, float t) {
  float dhdx = 0.0;
  float dhdz = 0.0;
  float amp = waveAmplitude;
  float freq = waveFrequency;
  float spd = waveSpeed;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float ang = fi * 1.3 + 0.7;
    vec2 dir = normalize(vec2(cos(ang), sin(ang * 0.6)));
    float ph = dot(dir, p) * freq - t * spd * (0.9 + fi * 0.15);
    float c = cos(ph);
    float k = freq;
    dhdx += amp * k * dir.x * c;
    dhdz += amp * k * dir.y * c;
    amp *= 0.52;
    freq *= 1.85;
    spd *= 1.05;
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

// Iterative waved-surface intersection (topology matters for TIR escape)
bool intersectWaterSurface(vec3 ro, vec3 rd, out float t, out vec3 hitN, out vec2 hitXZ) {
  t = (-ro.y) / rd.y;
  if (t < 0.001 || t > 200.0) return false;
  for (int i = 0; i < 4; i++) {
    vec3 p = ro + rd * t;
    hitXZ = p.xz;
    float h = waveHeight(hitXZ, time);
    t = (h - ro.y) / rd.y;
    if (t < 0.001) return false;
  }
  vec3 p = ro + rd * t;
  hitXZ = p.xz;
  hitN = waveNormal(hitXZ, time);
  return true;
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

float intersectRod(vec3 ro, vec3 rd) {
  if (sceneMode < 3) return -1.0;
  vec3 rodC = vec3(0.5, -4.8, 0.0);
  float r = 0.03;
  vec3 oc = ro - rodC;
  float b = dot(oc, rd);
  float c = dot(oc, oc) - r * r;
  float disc = b * b - c;
  if (disc < 0.0) return -1.0;
  float s = sqrt(disc);
  float t0 = -b - s;
  float t1 = -b + s;
  float t = t0 > 0.001 ? t0 : t1;
  if (t < 0.001 || t > 200.0) return -1.0;
  vec3 p = ro + rd * t;
  if (p.y < -5.8 || p.y > -3.8) return -1.0;
  return t;
}

float intersectGreyPlane(vec3 ro, vec3 rd) {
  if (sceneMode != 7 || rd.y >= -0.001) return -1.0;
  float t = (1.5 - ro.y) / rd.y;
  if (t < 0.001 || t > 200.0) return -1.0;
  vec3 p = ro + rd * t;
  if (abs(p.x) > 4.0 || abs(p.z) > 4.0) return -1.0;
  return t;
}

float intersectFloor(vec3 ro, vec3 rd) {
  if (rd.y >= -0.001) return -1.0;
  float t = (-5.8 - ro.y) / rd.y;
  return (t > 0.001 && t < 200.0) ? t : -1.0;
}

vec3 floorAlbedo(vec3 p) {
  if (sceneMode == 4) {
    return p.x < 0.0 ? vec3(0.9, 0.85, 0.1) : vec3(0.92);
  }
  if (sceneMode >= 3) return vec3(0.9);
  return vec3(0.05, 0.08, 0.12);
}

bool shadowedByRod(vec3 p, vec3 lightDir) {
  if (sceneMode < 3) return false;
  vec3 rodC = vec3(0.5, -4.8, 0.0);
  float r = 0.03;
  vec3 oc = p - rodC;
  float b = dot(oc, lightDir);
  float c = dot(oc, oc) - r * r;
  float disc = b * b - c;
  if (disc < 0.0) return false;
  float s = sqrt(disc);
  float t = -b - s;
  if (t < 0.001) t = -b + s;
  if (t < 0.001) return false;
  vec3 hit = p + lightDir * t;
  return hit.y >= -5.8 && hit.y <= -3.8;
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

  float tFloor = intersectFloor(r.origin, r.direction);
  float tRod = intersectRod(r.origin, r.direction);
  float tGrey = intersectGreyPlane(r.origin, r.direction);

  float tMin = 1e20;
  int mat = -1;
  if (planeHit && tPlane < tMin) { tMin = tPlane; mat = 0; }
  if (tCube > 0.0 && tCube < tMin) { tMin = tCube; mat = 1; }
  if (tFloor > 0.0 && tFloor < tMin) { tMin = tFloor; mat = 2; }
  if (tRod > 0.0 && tRod < tMin) { tMin = tRod; mat = 3; }
  if (tGrey > 0.0 && tGrey < tMin) { tMin = tGrey; mat = 4; }

  if (mat >= 0) {
    info.hit = true;
    info.dist = tMin;
    info.point = r.origin + r.direction * tMin;
    info.material = mat;
    if (mat == 0) info.normal = planeN;
    else if (mat == 1) info.normal = cubeN;
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
  bool inWater = cameraPos.y < 0.0; // start medium from camera position

  int maxB = int(maxBounces + 0.5);
  for (int bounce = 0; bounce < 12; bounce++) {
    if (bounce >= maxB) break;
    HitInfo hit = traceScene(ray);
    vec2 ru = rand2(seed + float(bounce) * 17.0);

    if (!hit.hit) {
      accum += throughput * envLight(ray.direction, lambdaNm);
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
      if (inWater) {
        vec3 att = volumeAttenuation(hit.dist, lambdaNm);
        vec3 godBeam = scatterTint * spectrumWeight(lambdaNm) * volumeTint;
        accum += throughput * godBeam * (vec3(1.0) - att) * 0.08;
        throughput *= att;
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
      vec3 alb = floorAlbedo(hit.point);
      vec3 sunL = normalize(sunDir);
      vec3 fillL = normalize(fillDir);
      bool sunSh = shadowedByRod(hit.point, sunL);
      bool fillSh = shadowedByRod(hit.point, fillL);
      vec3 lit = vec3(0.0);
      if (!sunSh) lit += alb * sunIntensity * vec3(1.1, 1.0, 0.85) * max(dot(N, sunL), 0.0);
      if (!fillSh) lit += alb * fillIntensity * fillTint * max(dot(N, fillL), 0.0);
      if (sunSh && fillSh) lit = alb * 0.02;
      accum += throughput * lit * spectrumWeight(lambdaNm);
      break;
    }

    // --- Water interface: exact dielectric port from Oceanscape Metal ---
    // Side/eta: internal (water->air) when dot(I,N)>0; external (air->water) otherwise
    float eta;
    vec3 N_eff = N;
    if (dot(I, N) > 0.0) {
      N_eff = -N;
      eta = ior; // water -> air
    } else {
      eta = 1.0 / ior; // air -> water
    }

    float criticalAngle = asin(1.0 / ior);
    float cosTheta = max(dot(N_eff, -I), 0.0);
    float reflectance = schlickFresnel(cosTheta, eta);
    vec3 T = refractDir(I, N_eff, eta);
    float theta_i = acos(clamp(cosTheta, 0.0, 1.0));
    bool tir = false;
    if (eta > 1.0 && theta_i > criticalAngle) tir = true;
    if (tir || length(T) < 0.001) {
      reflectance = 1.0;
      tir = true;
    }

    vec3 N_micro = sampleMicrofacet(N_eff, interfaceRoughness, ru);

    // Stochastic Fresnel: TIR always reflects (trapped), escape only when angle < critical
    bool chooseReflect = tir || (ru.x < reflectance);
    vec3 nextDir;

    bool fromInside = dot(I, N) > 0.0;

    if (chooseReflect) {
      nextDir = normalize(I - 2.0 * dot(I, N_micro) * N_micro);
      if (!fromInside && secondaryReflectWeight > 0.001) {
        vec3 reflDir = normalize(nextDir);
        if (reflDir.y < -0.05) {
          float tFl = (-5.8 - hit.point.y) / reflDir.y;
          if (tFl > 0.001 && tFl < 30.0) {
            accum += throughput * floorReflectance * secondaryReflectWeight * vec3(0.08, 0.1, 0.14);
          }
        }
      }
    } else {
      nextDir = normalize(refractDir(I, N_micro, eta));
      if (interfaceRoughness > 0.001) {
        vec3 spreadAxis = normalize(cross(nextDir, vec3(0.3, 0.7, 0.4)));
        nextDir = normalize(nextDir + spreadAxis * interfaceRoughness * 0.15 * (ru.y - 0.5));
      }
      inWater = !fromInside; // crossed the interface
    }

    // Volume scatter along underwater propagation legs (god rays + redirect back to surface)
    if (inWater) {
      Ray volRay;
      float legLen = 3.0;
      if (volumeScatterLeg(ray, legLen, lambdaNm, seed, bounce, throughput, accum, volRay)) {
        ray = volRay;
        continue;
      }
    }

    // Spawn at wave-adjusted surface position (topology affects next intersection)
    vec2 hitXZ = hit.point.xz;
    float h = waveHeight(hitXZ, time);
    vec3 spawnPos = vec3(hit.point.x, h, hit.point.z) + nextDir * 0.002;

    ray.origin = spawnPos;
    ray.direction = nextDir;

    // Russian roulette after a few bounces (deeper trapped paths)
    if (bounce >= 3) {
      float lum = max(throughput.r, max(throughput.g, throughput.b));
      float q = clamp(lum, 0.05, 0.95);
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
    color += pathTrace(primary, pixel + jitter + float(s), lambdaNm);
  }
  color /= max(float(spp), 1.0);

  // LIVE (cameraInteracting / reset): current path-trace frame only — no history.
  // Blending mismatched wave/cube poses was the spotty ghosting bug.
  // STILL: progressive Monte Carlo average 1/N so caustics, Snell, TIR converge cleanly.
  vec3 accumulated;
  if (cameraInteracting > 0.5 || resetAccum > 0.5) {
    accumulated = color;
  } else {
    vec3 prev = texture2D(accumTexture, uv).rgb;
    float n = max(accumSampleCount, 0.0);
    float spp = max(samplesPerFrame, 1.0);
    // Progressive MC: after n prior samples, fold in spp new ones with weight spp/(n+spp).
    float w = spp / (n + spp);
    accumulated = mix(prev, color, clamp(w, 0.0, 1.0));
  }

  gl_FragColor = vec4(accumulated, 1.0);
}