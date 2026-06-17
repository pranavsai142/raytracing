precision highp float;

varying vec2 vUv;

uniform vec2 resolution;
uniform float time;
uniform int frame;
uniform int samplesPerPixel;
uniform vec3 cameraPos;
uniform vec3 cameraTarget;
uniform vec3 cameraUp;
uniform float fov;
uniform float waterIOR;
uniform float interfaceRoughness;
uniform vec3 sunDir;
uniform float sunIntensity;
uniform float volumeSigma;
uniform float volumeG;
uniform float cubeRotY;
uniform float cubeRotX;
uniform sampler2D accumTexture;
uniform bool resetAccum;

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

// --- Waves (multi-octave) ---
float waveHeight(vec2 p, float t) {
  float h = 0.0;
  float amp = 0.12;
  float freq = 0.6;
  float spd = 1.1;
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
  float amp = 0.12;
  float freq = 0.6;
  float spd = 1.1;
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

// --- Ray primitives ---
struct Ray {
  vec3 origin;
  vec3 direction;
};

struct HitInfo {
  bool hit;
  float dist;
  vec3 point;
  vec3 normal;
  int material; // 0=plane, 1=cube, 2=floor
};

float intersectPlane(vec3 ro, vec3 rd, out vec3 hitN, out vec2 hitXZ) {
  float t = (-ro.y) / rd.y;
  if (t < 0.001 || t > 200.0) return -1.0;
  vec3 p = ro + rd * t;
  hitXZ = p.xz;
  float h = waveHeight(hitXZ, time);
  float planeY = h;
  // Refine intersection with waved surface
  t = (planeY - ro.y) / rd.y;
  if (t < 0.001) return -1.0;
  p = ro + rd * t;
  hitXZ = p.xz;
  hitN = waveNormal(hitXZ, time);
  return t;
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

float intersectFloor(vec3 ro, vec3 rd) {
  if (rd.y >= -0.001) return -1.0;
  float t = (-5.8 - ro.y) / rd.y;
  return (t > 0.001 && t < 200.0) ? t : -1.0;
}

// Rotate point around Y then X (cube animation)
vec3 rotateCube(vec3 p) {
  float cy = cos(cubeRotY);
  float sy = sin(cubeRotY);
  vec3 p1 = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);
  float cx = cos(cubeRotX);
  float sx = sin(cubeRotX);
  return vec3(p1.x, cx * p1.y - sx * p1.z, sx * p1.y + cx * p1.z);
}

vec3 rotateCubeInv(vec3 p) {
  float cx = cos(-cubeRotX);
  float sx = sin(-cubeRotX);
  vec3 p1 = vec3(p.x, cx * p.y - sx * p.z, sx * p.y + cx * p.z);
  float cy = cos(-cubeRotY);
  float sy = sin(-cubeRotY);
  return vec3(cy * p1.x + sy * p1.z, p1.y, -sy * p1.x + cy * p1.z);
}

vec3 rotateCubeDir(vec3 d) {
  return rotateCube(d);
}

HitInfo traceScene(Ray r) {
  HitInfo info;
  info.hit = false;
  info.dist = 1e20;

  vec3 planeN;
  vec2 hitXZ;
  float tPlane = intersectPlane(r.origin, r.direction, planeN, hitXZ);

  // Cube at y=-3, size 1.5
  vec3 cubeCenter = vec3(0.0, -3.0, 0.0);
  vec3 localRo = rotateCubeInv(r.origin - cubeCenter);
  vec3 localRd = rotateCubeInv(r.direction);
  vec3 cubeN;
  float tCube = intersectBox(localRo, localRd, vec3(-0.75), vec3(0.75), cubeN);
  if (tCube > 0.0) {
    tCube = length((rotateCube(localRo + localRd * tCube) + cubeCenter) - r.origin);
    cubeN = rotateCube(cubeN);
  }

  float tFloor = intersectFloor(r.origin, r.direction);

  float tMin = 1e20;
  int mat = -1;

  if (tPlane > 0.0 && tPlane < tMin) { tMin = tPlane; mat = 0; }
  if (tCube > 0.0 && tCube < tMin) { tMin = tCube; mat = 1; }
  if (tFloor > 0.0 && tFloor < tMin) { tMin = tFloor; mat = 2; }

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

// --- Dielectric BSDF (ported from Oceanscape Metal) ---
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
  if (g < 0.001) cosTheta = 2.0 * ru.x - 1.0;
  float sinTheta = sqrt(max(0.0, 1.0 - cosTheta * cosTheta));
  float phi = 6.28318 * ru.y;
  vec3 up = abs(incDir.y) > 0.999 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 T = normalize(cross(up, incDir));
  vec3 B = cross(incDir, T);
  return normalize(sinTheta * cos(phi) * T + sinTheta * sin(phi) * B + cosTheta * incDir);
}

vec3 envLight(vec3 dir) {
  vec3 sky = vec3(0.45, 0.65, 0.92);
  float sunDot = max(dot(normalize(dir), normalize(sunDir)), 0.0);
  float sun = pow(sunDot, 64.0) * 4.0 * sunIntensity;
  return sky + vec3(3.5, 3.2, 2.8) * sun;
}

vec3 cubeTexture(vec3 localP, vec3 localN) {
  vec2 uv;
  if (abs(localN.x) > 0.5) uv = localP.yz * 0.5 + 0.5;
  else if (abs(localN.y) > 0.5) uv = localP.xz * 0.5 + 0.5;
  else uv = localP.xy * 0.5 + 0.5;
  // Checkerboard + color bands (ColorMap-like)
  float checker = mod(floor(uv.x * 8.0) + floor(uv.y * 8.0), 2.0);
  vec3 c1 = vec3(0.85, 0.55, 0.25);
  vec3 c2 = vec3(0.35, 0.65, 0.85);
  return mix(c1, c2, checker);
}

// Tone mapping (enhanced reinhard + vignette + ocean tint)
vec3 toneMap(vec3 hdr) {
  hdr *= 1.35;
  vec3 mapped = hdr / (hdr + vec3(1.0));
  mapped = mapped / (mapped + vec3(0.15)); // filmic
  mapped = mix(mapped, mapped * vec3(0.85, 0.95, 1.05), 0.15); // ocean tint
  return mapped;
}

vec3 pathTrace(Ray primary, vec2 seed) {
  vec3 accum = vec3(0.0);
  vec3 throughput = vec3(1.0);
  Ray ray = primary;
  bool underwater = false;

  for (int bounce = 0; bounce < 8; bounce++) {
    HitInfo hit = traceScene(ray);
    vec2 ru = rand2(seed + float(bounce) * 0.17);

    if (!hit.hit) {
      accum += throughput * envLight(ray.direction);
      break;
    }

    vec3 I = ray.direction;
    vec3 N = hit.normal;

    if (hit.material == 1) {
      // Cube hit — accumulate textured color
      vec3 cubeCenter = vec3(0.0, -3.0, 0.0);
      vec3 localP = rotateCubeInv(hit.point - cubeCenter);
      vec3 localN = rotateCubeInv(N);
      vec3 cubeCol = cubeTexture(localP, localN);
      accum += throughput * cubeCol;
      break;
    }

    if (hit.material == 2) {
      // Floor
      float atten = exp(-0.12 * hit.dist);
      accum += throughput * atten * vec3(0.05, 0.08, 0.12);
      break;
    }

    // Water plane — dielectric interface
    float eta;
    vec3 N_eff = N;
    if (dot(I, N) > 0.0) {
      N_eff = -N;
      eta = waterIOR;
      underwater = true;
    } else {
      eta = 1.0 / waterIOR;
      underwater = false;
    }

    float criticalAngle = asin(1.0 / waterIOR);
    float cosTheta = max(dot(N_eff, -I), 0.0);
    float reflectance = schlickFresnel(cosTheta, eta);
    vec3 T = refractDir(I, N_eff, eta);
    float theta_i = acos(cosTheta);
    bool tir = false;
    if (eta > 1.0 && theta_i > criticalAngle) tir = true;
    if (tir || length(T) < 0.001) {
      reflectance = 1.0;
      tir = true;
    }

    vec3 N_micro = sampleMicrofacet(N_eff, interfaceRoughness, ru);

    bool chooseReflect = tir || ru.x < reflectance;

    if (chooseReflect) {
      vec3 reflDir = I - 2.0 * dot(I, N_micro) * N_micro;
      ray.origin = hit.point + reflDir * 0.002;
      ray.direction = normalize(reflDir);
      if (!tir) throughput *= reflectance / max(reflectance, 0.001);
    } else {
      // Transmit — volume scattering on underwater leg
      vec3 transDir = normalize(refractDir(I, N_micro, eta));
      float legDist = 2.0;
      if (underwater || dot(transDir, vec3(0.0, 1.0, 0.0)) < 0.0) {
        float sigma_t = volumeSigma > 0.001 ? volumeSigma : 0.06;
        float sigma_s = sigma_t * 0.55;
        float u = hash3(vec3(seed, float(bounce)));
        float freePath = -log(max(u, 0.001)) / sigma_t;
        if (freePath < legDist && sigma_s > 0.001) {
          float atten = exp(-sigma_t * freePath);
          throughput *= atten * (sigma_s / sigma_t);
          vec3 scatterDir = sampleHG(transDir, volumeG, rand2(seed + float(bounce + 10)));
          vec3 scatterPos = hit.point + transDir * freePath;
          accum += throughput * vec3(0.1, 0.25, 0.4) * 0.3;
          ray.origin = scatterPos + scatterDir * 0.002;
          ray.direction = scatterDir;
          continue;
        }
      }
      throughput *= (1.0 - reflectance);
      ray.origin = hit.point + transDir * 0.002;
      ray.direction = transDir;
    }
  }

  return accum;
}

void main() {
  vec2 uv = vUv;
  vec2 pixel = uv * resolution;

  // Camera basis
  vec3 forward = normalize(cameraTarget - cameraPos);
  vec3 right = normalize(cross(forward, cameraUp));
  vec3 up = cross(right, forward);
  float aspect = resolution.x / resolution.y;
  float tanHalfFov = tan(radians(fov) * 0.5);

  vec3 color = vec3(0.0);
  int spp = samplesPerPixel;

  for (int s = 0; s < 8; s++) {
    if (s >= spp) break;
    vec2 jitter = rand2(pixel + float(s) * 13.7 + float(frame) * 0.31);
    vec2 ndc = (pixel + jitter - 0.5) / resolution * 2.0 - 1.0;
    ndc.x *= aspect;

    vec3 rd = normalize(forward + right * ndc.x * tanHalfFov + up * ndc.y * tanHalfFov);
    Ray primary;
    primary.origin = cameraPos;
    primary.direction = rd;

    color += pathTrace(primary, pixel + jitter + float(s));
  }
  color /= float(spp);

  // Temporal accumulation
  vec3 prev = resetAccum ? vec3(0.0) : texture2D(accumTexture, uv).rgb;
  float n = resetAccum ? 1.0 : float(frame) + 1.0;
  vec3 accumulated = (prev * (n - 1.0) + color) / n;

  // Vignette
  vec2 vigUv = uv * 2.0 - 1.0;
  float vig = 1.0 - dot(vigUv, vigUv) * 0.25;
  accumulated *= vig;

  gl_FragColor = vec4(toneMap(accumulated), 1.0);
}