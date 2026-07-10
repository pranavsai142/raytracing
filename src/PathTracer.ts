import * as THREE from 'three';
import { chapterById, type ChapterBadge, type ChapterId } from './chapters';
import vertShader from './shaders/pathTracer.vert.glsl?raw';
import fragShader from './shaders/pathTracer.frag.glsl?raw';

export type AbsorptionModel = 'neutral' | 'beer' | 'goethe';

/** Wave surface component — summed in the fragment shader (max 4). */
export interface WaveComponent {
  amplitude: number;
  frequency: number;
  speed: number;
  /** Propagation angle in XZ plane, degrees. */
  directionDeg: number;
  /** Phase offset in radians. */
  phase: number;
  /** Standing: A·sin(k·p+φ)·cos(ωt); traveling: A·sin(k·p−ωt+φ). */
  standing: boolean;
}

export type WavePreset =
  | 'multi-octave'
  | 'single-sine'
  | 'standing'
  | 'calm'
  | 'long-swell'
  | 'chop'
  | 'cross-sea'
  | 'opposing'
  | 'ripple'
  | 'dual-standing'
  | 'flat'
  | 'custom';

export const MAX_WAVE_COMPONENTS = 4;

/** Per-component / macro amplitude hard max (CPU + UI). */
export const WAVE_AMP_MAX = 0.12;
/** Sum of |amp| across components must stay ≤ this (scale down if over). */
export const WAVE_TOTAL_AMP_BUDGET = 0.22;
/** Per-component |amp|·frequency slope budget (reduce amp if needed). */
export const WAVE_SLOPE_BUDGET = 0.35;

/**
 * Clamp component amplitudes for sane surface normals / Snell:
 * 1) each |amp| ≤ WAVE_AMP_MAX
 * 2) sum |amp| ≤ WAVE_TOTAL_AMP_BUDGET (proportional scale)
 * 3) |amp|·freq ≤ WAVE_SLOPE_BUDGET per component (after total budget)
 */
export function sanitizeWaveComponents(comps: WaveComponent[]): WaveComponent[] {
  const out = comps.map((c) => ({
    ...c,
    amplitude: Math.min(WAVE_AMP_MAX, Math.max(0, c.amplitude)),
    frequency: Math.max(0, c.frequency),
  }));

  let sum = 0;
  for (const c of out) sum += Math.abs(c.amplitude);
  if (sum > WAVE_TOTAL_AMP_BUDGET && sum > 0) {
    const scale = WAVE_TOTAL_AMP_BUDGET / sum;
    for (const c of out) c.amplitude *= scale;
  }

  for (const c of out) {
    const freq = Math.abs(c.frequency);
    if (freq > 0 && Math.abs(c.amplitude) * freq > WAVE_SLOPE_BUDGET) {
      c.amplitude = Math.min(WAVE_AMP_MAX, WAVE_SLOPE_BUDGET / freq);
    }
  }

  return out;
}

/**
 * Rebuild the legacy 4-octave ocean as explicit components.
 * Matches pathTracer.frag historical ratios: amp*=0.52, freq*=1.85, spd*=1.05,
 * angles i*1.3+0.7 with dir normalize(cos(ang), sin(ang*0.6)), and per-octave
 * temporal factor (0.9 + i*0.15) baked into each component's speed.
 * Result is sanitized (amp/slope budgets) so maxed macros cannot blow up slopes.
 */
export function buildMultiOctaveComponents(
  baseAmp: number,
  baseFreq: number,
  baseSpd: number,
): WaveComponent[] {
  const comps: WaveComponent[] = [];
  let amp = Math.min(WAVE_AMP_MAX, Math.max(0, baseAmp));
  let freq = baseFreq;
  let spd = baseSpd;
  for (let i = 0; i < MAX_WAVE_COMPONENTS; i++) {
    const fi = i;
    const ang = fi * 1.3 + 0.7;
    const rawX = Math.cos(ang);
    const rawY = Math.sin(ang * 0.6);
    const len = Math.hypot(rawX, rawY) || 1;
    const dirX = rawX / len;
    const dirY = rawY / len;
    const directionDeg = (Math.atan2(dirY, dirX) * 180) / Math.PI;
    comps.push({
      amplitude: amp,
      frequency: freq,
      // Bake historical per-octave speed multiplier into ω
      speed: spd * (0.9 + fi * 0.15),
      directionDeg,
      phase: 0,
      standing: false,
    });
    amp *= 0.52;
    freq *= 1.85;
    spd *= 1.05;
  }
  return sanitizeWaveComponents(comps);
}

export function buildSingleSineComponent(
  amp: number,
  freq: number,
  spd: number,
): WaveComponent {
  return {
    amplitude: amp,
    frequency: freq,
    speed: spd,
    directionDeg: 0,
    phase: 0,
    standing: false,
  };
}

export function buildStandingComponent(
  amp: number,
  freq: number,
  spd: number,
): WaveComponent {
  return {
    amplitude: amp,
    frequency: freq,
    speed: spd,
    directionDeg: 0,
    phase: 0,
    standing: true,
  };
}

export function cloneWaveComponent(c: WaveComponent): WaveComponent {
  return { ...c };
}

/** Named preset component lists (excluding multi-octave / single-sine / standing / custom). */
export function buildNamedPresetComponents(preset: WavePreset): WaveComponent[] | null {
  switch (preset) {
    case 'calm':
      return [
        {
          amplitude: 0.02,
          frequency: 0.35,
          speed: 0.4,
          directionDeg: 15,
          phase: 0,
          standing: false,
        },
      ];
    case 'long-swell':
      return [
        {
          amplitude: 0.06,
          frequency: 0.25,
          speed: 0.45,
          directionDeg: 20,
          phase: 0,
          standing: false,
        },
        {
          amplitude: 0.035,
          frequency: 0.32,
          speed: 0.5,
          directionDeg: 35,
          phase: 0.4,
          standing: false,
        },
      ];
    case 'chop':
      return [
        {
          amplitude: 0.025,
          frequency: 1.2,
          speed: 1.1,
          directionDeg: 0,
          phase: 0,
          standing: false,
        },
        {
          amplitude: 0.022,
          frequency: 1.8,
          speed: 1.3,
          directionDeg: 55,
          phase: 0.7,
          standing: false,
        },
        {
          amplitude: 0.018,
          frequency: 2.5,
          speed: 1.5,
          directionDeg: 130,
          phase: 1.4,
          standing: false,
        },
      ];
    case 'cross-sea':
      return [
        {
          amplitude: 0.05,
          frequency: 0.5,
          speed: 0.55,
          directionDeg: 0,
          phase: 0,
          standing: false,
        },
        {
          amplitude: 0.04,
          frequency: 0.7,
          speed: 0.65,
          directionDeg: 90,
          phase: 0.3,
          standing: false,
        },
      ];
    case 'opposing':
      return [
        {
          amplitude: 0.05,
          frequency: 0.55,
          speed: 0.6,
          directionDeg: 0,
          phase: 0,
          standing: false,
        },
        {
          amplitude: 0.05,
          frequency: 0.55,
          speed: 0.6,
          directionDeg: 180,
          phase: 0,
          standing: false,
        },
      ];
    case 'ripple':
      return [
        {
          amplitude: 0.015,
          frequency: 2.5,
          speed: 1.8,
          directionDeg: 30,
          phase: 0,
          standing: false,
        },
      ];
    case 'dual-standing':
      return [
        {
          amplitude: 0.04,
          frequency: 0.6,
          speed: 0.5,
          directionDeg: 0,
          phase: 0,
          standing: true,
        },
        {
          amplitude: 0.04,
          frequency: 0.75,
          speed: 0.55,
          directionDeg: 60,
          phase: 0.5,
          standing: true,
        },
      ];
    case 'flat':
      return [
        {
          amplitude: 0,
          frequency: 0.5,
          speed: 0.6,
          directionDeg: 0,
          phase: 0,
          standing: false,
        },
      ];
    default:
      return null;
  }
}

/** Sensible macro labels for named static presets (primary amp/freq/spd). */
function macrosForNamedPreset(preset: WavePreset): {
  amp: number;
  freq: number;
  spd: number;
} | null {
  switch (preset) {
    case 'calm':
      return { amp: 0.02, freq: 0.35, spd: 0.4 };
    case 'long-swell':
      return { amp: 0.06, freq: 0.25, spd: 0.45 };
    case 'chop':
      return { amp: 0.025, freq: 1.2, spd: 1.1 };
    case 'cross-sea':
      return { amp: 0.05, freq: 0.5, spd: 0.55 };
    case 'opposing':
      return { amp: 0.05, freq: 0.55, spd: 0.6 };
    case 'ripple':
      return { amp: 0.015, freq: 2.5, spd: 1.8 };
    case 'dual-standing':
      return { amp: 0.04, freq: 0.6, spd: 0.5 };
    case 'flat':
      return { amp: 0, freq: 0.5, spd: 0.6 };
    default:
      return null;
  }
}

export interface SimParams {
  waterIOR: number;
  interfaceRoughness: number;
  dispersion: number;
  maxBounces: number;
  sunElevation: number;
  sunAzimuth: number;
  sunIntensity: number;
  volumeSigma: number;
  volumeG: number;
  samplesPerFrame: number;
  maxAccumSamples: number;
  temporalBlend: number;
  exposure: number;
  vignetteStrength: number;
  /** Legacy macro amplitude — rebuilds multi-octave / scales single|standing primary. */
  waveAmplitude: number;
  /** Legacy macro spatial frequency. */
  waveFrequency: number;
  /** Legacy macro phase speed. */
  waveSpeed: number;
  wavePreset: WavePreset;
  /** Active wave components (1–4). GPU uses waveCount = length. */
  waveComponents: WaveComponent[];
  timeScale: number;
  animateWaves: boolean;
  cubeDepth: number;
  cubeRotSpeedY: number;
  cubeRotSpeedX: number;
  fov: number;
  moveSpeed: number;
  moveAccel: number;
  moveDamping: number;
  mouseSensitivity: number;
  renderScale: number;
  sampleFps: number;
  underwaterView: boolean;
  autoOrbit: boolean;
  // Goethe extensions
  turbidity: number;
  scatterTint: [number, number, number];
  absorptionModel: AbsorptionModel;
  sigmaLambda: [number, number, number];
  volumeTint: [number, number, number];
  atmosphereDensity: number;
  mediumThickness: number;
  mediumTint: [number, number, number];
  fillDir: [number, number, number];
  fillIntensity: number;
  fillTint: [number, number, number];
  sceneMode: number;
  activeChapter: ChapterId;
  physiologicalContrast: boolean;
  opponentStrength: number;
  complementStrength: number;
  secondaryReflectWeight: number;
  floorReflectance: number;
  floorHeight: number;
  floorEnabled: boolean;
  /** 0 uniform, 1 gravel, 2 sand, 3 splitYw, 4 checker */
  floorPattern: number;
  floorAlbedoColor: [number, number, number];
  floorAlbedoScale: number;
  floorBumpAmp: number;
  floorBumpFreq: number;
  floorBumpOctaves: number;
  floorRoughness: number;
  /** 0 diffuse, 1 glossy, 2 mirror */
  floorMaterial: number;
  floorSpecular: number;
  floorCheckerScale: number;
  flameEdgeBoost: number;
  moonElevation: number;
  moonAzimuth: number;
  moonIntensity: number;
  candleIntensity: number;
  timeOfDay: number;
  bloomStrength: number;
  fixationMode: boolean;
  afterimageDecay: number;
}

function pickAccumType(renderer: THREE.WebGLRenderer): THREE.TextureDataType {
  const gl = renderer.getContext();
  const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  if (isWebGL2) return THREE.HalfFloatType;
  const ext = gl.getExtension('OES_texture_half_float');
  return ext ? THREE.HalfFloatType : THREE.UnsignedByteType;
}

function createAccumTarget(w: number, h: number, type: THREE.TextureDataType): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(w, h, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

const ABSORPTION_MAP: Record<AbsorptionModel, number> = { neutral: 0, beer: 1, goethe: 2 };

/** Goethe §76/§56 seafloor plane Y (rod base). */
const GOETHE_FLOOR_HEIGHT = -5.8;

/** Named seafloor substrate presets (UI buttons + applyFloorPreset). */
export type FloorPresetName = 'abyss' | 'sand' | 'gravel' | 'white' | 'mirror' | 'split';

export class PathTracer {
  private renderer: THREE.WebGLRenderer;
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;
  private scene: THREE.Scene;
  private orthoCam: THREE.OrthographicCamera;
  private accumTargets: [THREE.WebGLRenderTarget, THREE.WebGLRenderTarget];
  private accumType: THREE.TextureDataType;
  private ping = 0;
  private accumSampleCount = 0;
  private needsReset = true;
  private lastRenderTime = 0;
  private lastSampleTime = 0;
  private lastCamPos = new THREE.Vector3();
  private lastCamTarget = new THREE.Vector3();
  private cameraSettled = true;
  private settleCooldown = 0;
  private userInteracting = false;
  private gpuInfo = '';
  private simTime = 0;
  private cubeRotY = 0;
  private cubeRotX = 0;
  private fixationHold = 0;
  /** LIVE = scene animating (no history blend). STILL = frozen geometry, progressive accumulate. */
  private renderMode: 'live' | 'still' = 'live';

  preRender: ((dt: number) => void) | null = null;
  onCameraMoved: (() => void) | null = null;
  onChapterChanged: ((id: ChapterId, badge: ChapterBadge) => void) | null = null;

  params: SimParams = {
    waterIOR: 1.33,
    interfaceRoughness: 0.06,
    dispersion: 0.012,
    maxBounces: 6,
    sunElevation: 0.8,
    sunAzimuth: 0.4,
    sunIntensity: 1.2,
    volumeSigma: 0.05,
    volumeG: 0.55,
    samplesPerFrame: 2,
    maxAccumSamples: 256,
    temporalBlend: 0.05,
    exposure: 1.5,
    vignetteStrength: 0.22,
    waveAmplitude: 0.06,
    waveFrequency: 0.5,
    waveSpeed: 0.6,
    wavePreset: 'multi-octave',
    waveComponents: buildMultiOctaveComponents(0.06, 0.5, 0.6),
    timeScale: 0.15,
    // Production first-run: STILL freeze so progressive path-trace cleans the hero frame.
    // User turns Animate ON for LIVE.
    animateWaves: false,
    cubeDepth: -2.2,
    cubeRotSpeedY: 0.004,
    cubeRotSpeedX: 0.002,
    fov: 58,
    moveSpeed: 1.2,
    moveAccel: 3.5,
    moveDamping: 6.0,
    mouseSensitivity: 0.0018,
    renderScale: 0.85,
    sampleFps: 30,
    underwaterView: true,
    autoOrbit: false,
    turbidity: 0.05,
    scatterTint: [1, 1, 1],
    absorptionModel: 'neutral',
    sigmaLambda: [0.04, 0.08, 0.18],
    volumeTint: [1, 1, 1],
    atmosphereDensity: 0.5,
    mediumThickness: 0.3,
    mediumTint: [1, 1, 1],
    fillDir: [-0.4, 0.6, -0.3],
    fillIntensity: 0.35,
    fillTint: [0.7, 0.85, 1.0],
    sceneMode: 0,
    activeChapter: 'ocean',
    physiologicalContrast: false,
    opponentStrength: 0.4,
    complementStrength: 0,
    secondaryReflectWeight: 0,
    floorReflectance: 0.15,
    floorHeight: -3.5,
    floorEnabled: true,
    floorPattern: 1, // gravel
    floorAlbedoColor: [0.55, 0.48, 0.32],
    floorAlbedoScale: 0.4,
    floorBumpAmp: 0.06,
    floorBumpFreq: 2.5,
    floorBumpOctaves: 3,
    floorRoughness: 0.55,
    floorMaterial: 0, // diffuse
    floorSpecular: 0.05,
    floorCheckerScale: 0,
    flameEdgeBoost: 0,
    moonElevation: -0.15,
    moonAzimuth: 2.5,
    moonIntensity: 0,
    candleIntensity: 0,
    timeOfDay: 0.5,
    bloomStrength: 0,
    fixationMode: false,
    afterimageDecay: 0.02,
  };

  // Default underwater frame: look AT the submerged cube (origin), not away along +Z.
  cameraPos = new THREE.Vector3(0, -1.0, 4.0);
  cameraTarget = new THREE.Vector3(0, -2.2, 0);
  cameraUp = new THREE.Vector3(0, 1, 0);
  orbitPhase = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance',
      precision: 'highp',
    });

    const gl = this.renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    this.gpuInfo = debugInfo
      ? (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string)
      : 'WebGL GPU';

    this.accumType = pickAccumType(this.renderer);
    this.accumTargets = [createAccumTarget(1, 1, this.accumType), createAccumTarget(1, 1, this.accumType)];

    this.material = new THREE.ShaderMaterial({
      vertexShader: vertShader,
      fragmentShader: fragShader,
      uniforms: this.createUniforms(1, 1),
      depthTest: false,
      depthWrite: false,
    });

    if (!this.renderer.capabilities.isWebGL2) {
      this.material.glslVersion = THREE.GLSL1;
    }

    const geo = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.mesh);
    this.orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.applyRenderScale();
    this.lastCamPos.copy(this.cameraPos);
    this.lastCamTarget.copy(this.cameraTarget);

    const hash = window.location.hash.replace('#chapter=', '');
    if (hash && chapterById(hash)) {
      this.applyChapterPreset(hash as ChapterId, false);
    }
  }

  setUserInteracting(active: boolean): void {
    this.userInteracting = active;
  }

  getChapterBadge(): ChapterBadge {
    return chapterById(this.params.activeChapter)?.badge ?? 'PHYSICAL';
  }

  applyChapterPreset(id: ChapterId, updateHash = true): void {
    const def = chapterById(id);
    if (!def) return;

    this.params.activeChapter = id;
    this.params.sceneMode = def.sceneMode;
    this.params.autoOrbit = false;
    this.params.physiologicalContrast = false;
    this.params.complementStrength = 0;
    this.params.fixationMode = false;
    this.params.bloomStrength = 0;
    this.params.flameEdgeBoost = 0;
    this.params.moonIntensity = 0;
    this.params.candleIntensity = 0;
    this.params.secondaryReflectWeight = 0;

    // Chapter hero quality: full internal resolution + richer paths so every § reads clearly.
    // (User-fixed atmosphere ugliness by raising render scale — apply that to all chapters.)
    this.params.renderScale = 1.0;
    this.params.samplesPerFrame = Math.max(this.params.samplesPerFrame, 2);
    this.params.maxBounces = Math.max(this.params.maxBounces, 6);
    this.params.exposure = 1.35;
    this.params.vignetteStrength = 0.2;
    this.params.sunIntensity = 1.2;
    this.params.fillIntensity = 0.35;
    this.params.fillTint = [0.7, 0.85, 1.0];
    this.params.volumeSigma = 0.05;
    this.params.turbidity = 0.05;
    this.params.atmosphereDensity = 0.5;
    this.params.mediumThickness = 0.3;
    this.params.dispersion = 0.012;
    this.params.interfaceRoughness = 0.06;
    this.params.absorptionModel = 'neutral';
    this.params.scatterTint = [1, 1, 1];
    this.params.cubeDepth = -2.2;
    // Ocean floor bundle (gravel substrate; water colour from physics, not floor pigment)
    this.params.floorHeight = -3.5;
    this.params.floorEnabled = true;
    this.params.floorReflectance = 0.15;
    this.params.floorPattern = 1; // gravel
    this.params.floorAlbedoColor = [0.55, 0.48, 0.32]; // warm sand gravel
    this.params.floorAlbedoScale = 0.4;
    this.params.floorBumpAmp = 0.06; // med
    this.params.floorBumpFreq = 2.5;
    this.params.floorBumpOctaves = 3;
    this.params.floorRoughness = 0.55;
    this.params.floorMaterial = 0; // diffuse
    this.params.floorSpecular = 0.05;
    this.params.floorCheckerScale = 0;
    this.params.fov = 55;
    this.params.timeScale = 0.15;
    this.params.waveAmplitude = 0.08;
    this.params.waveFrequency = 0.5;
    this.params.waveSpeed = 0.6;
    this.params.wavePreset = 'multi-octave';
    let waveMacrosTouched = true;

    switch (id) {
      case 'ocean':
        // North-star dielectric: cube + Snell window + TIR trap/escape + caustics
        this.params.underwaterView = true;
        this.params.dispersion = 0.02;
        this.params.maxBounces = 10;
        this.params.sunElevation = 0.85;
        this.params.sunAzimuth = 0.35;
        this.params.sunIntensity = 1.55;
        this.params.exposure = 1.5;
        this.params.volumeSigma = 0.03;
        this.params.interfaceRoughness = 0.02;
        this.params.waveAmplitude = 0.06;
        this.lookAtCubeUnderwater();
        // Cube dominant mid-frame; surface strip above = Snell bright + TIR dark rim
        this.cameraPos.set(0.3, -0.7, 3.35);
        this.cameraTarget.set(0, this.params.cubeDepth + 0.35, 0);
        this.params.fov = 58;
        break;

      case 'primordial':
        // §175: light + darkness + colourless medium → colour; thickness modulates
        // Low warm sun through medium; cool overhead / warm horizon; not blue-paint water
        this.params.sunElevation = 0.06;
        this.params.sunAzimuth = 0.45;
        this.params.sunIntensity = 1.85;
        this.params.mediumThickness = 1.05;
        this.params.atmosphereDensity = 1.45;
        this.params.volumeSigma = 0.016;
        this.params.turbidity = 0.1;
        this.params.mediumTint = [1, 1, 1];
        this.params.scatterTint = [1, 1, 1];
        this.params.volumeTint = [1, 1, 1];
        this.params.absorptionModel = 'neutral';
        this.params.exposure = 1.28;
        this.params.fillIntensity = 0.15;
        this.params.underwaterView = false;
        this.params.waveAmplitude = 0.03;
        // Frame low sun on horizon — warm airmass glow vs cooler upper sky
        // sunDir ≈ (cos0.45*cos0.06, sin0.06, sin0.45*cos0.06) ≈ (0.90, 0.06, 0.43)
        this.cameraPos.set(0, 1.05, 5.2);
        this.cameraTarget.set(18, 2.0, 8.8);
        this.params.fov = 56;
        break;

      case 'atmosphere':
        // §155: sky blue = darkness through illumined vapour; sun through mist warms
        // Prior bug: camera looked −Z while sun sat near +X/+Z → no disk, muddy flat sky.
        this.params.atmosphereDensity = 1.7; // Rayleigh cool upper sky
        this.params.mediumThickness = 1.05; // warm solar / horizon vapour
        this.params.turbidity = 0.42;
        this.params.volumeSigma = 0.012;
        this.params.sunElevation = 0.08; // low sun on misty horizon → yellow→ruby
        this.params.sunAzimuth = 0.5;
        this.params.sunIntensity = 2.25;
        this.params.exposure = 1.52;
        this.params.fillIntensity = 0.1; // don't wash warm solar limb with cool fill
        this.params.flameEdgeBoost = 0.25; // subtle sceneMode=2 edge; sky is the hero
        this.params.underwaterView = false;
        this.params.waveAmplitude = 0.015;
        this.params.autoOrbit = false; // still-readable hero; user can re-enable orbit
        // Low eye over water: horizon band + sun glow mid-frame, cooler sky above
        // sunDir ≈ (cos0.5·cos0.08, sin0.08, sin0.5·cos0.08) ≈ (0.87, 0.08, 0.48)
        this.cameraPos.set(0.0, 1.15, 4.8);
        this.cameraTarget.set(16.0, 1.9, 9.0);
        this.params.fov = 58;
        break;

      case 'shadows':
        // §76: contrary light fills the shadow → complementary coloured shadows
        // Warm principal (sun) + cool contrary (fill). Floor lit by both; each light's
        // umbra is filled by the other → two tinted shadows; double-umbra nearly black.
        this.params.sunElevation = 0.38;
        this.params.sunAzimuth = 0.9;
        this.params.sunIntensity = 2.25;
        this.params.fillIntensity = 1.4;
        this.params.fillDir = [-0.75, 0.5, -0.4]; // orthogonal fan vs sun umbra
        this.params.fillTint = [0.12, 0.32, 1.0]; // strong cool contrary light
        this.params.exposure = 1.15;
        this.params.floorReflectance = 0.95;
        this.params.volumeSigma = 0.003; // clear so floor tints aren't muddied
        this.params.turbidity = 0.01;
        this.params.waveAmplitude = 0; // freeze surface; dual shadows stay sharp
        this.params.underwaterView = true;
        this.params.cubeDepth = -9.0; // park cube below floor — rod/floor is the hero
        this.params.floorHeight = GOETHE_FLOOR_HEIGHT;
        // Bright flat white card (Slice C params win over sceneMode albedo)
        this.params.floorPattern = 0;
        this.params.floorAlbedoColor = [1.0, 1.0, 1.0];
        this.params.floorAlbedoScale = 0.9;
        this.params.floorBumpAmp = 0;
        this.params.floorMaterial = 0;
        // Slightly elevated: rod upright, warm sun-umbra one way, cool fill-umbra the other
        this.cameraPos.set(1.35, -3.85, 2.55);
        this.cameraTarget.set(0.35, this.params.floorHeight, -0.2);
        this.params.fov = 48;
        break;

      case 'shadows-underwater':
        // §78: divers — sunlight into diving-bell → red-biased field, green shadows
        // Deeper eye (less floor mint wash); beer/warm medium for red field; green fill + complement on cube.
        // Modest sand floor — readable underwater, not white-card wash
        this.params.floorHeight = -3.5;
        this.params.floorPattern = 2; // sand
        this.params.floorAlbedoColor = [0.58, 0.48, 0.34];
        this.params.floorAlbedoScale = 0.38;
        this.params.floorBumpAmp = 0.04;
        this.params.floorMaterial = 0;
        this.params.sunElevation = 0.88;
        this.params.sunAzimuth = 0.35;
        this.params.sunIntensity = 2.0;
        this.params.fillIntensity = 0.72;
        this.params.fillDir = [0.25, 0.35, 0.9];
        this.params.fillTint = [0.3, 0.98, 0.45];
        this.params.volumeSigma = 0.11;
        this.params.turbidity = 0.14;
        this.params.absorptionModel = 'beer';
        this.params.sigmaLambda = [0.02, 0.2, 0.85];
        this.params.scatterTint = [1.55, 0.55, 0.35];
        this.params.volumeTint = [1.4, 0.75, 0.5];
        this.params.mediumTint = [1.9, 0.5, 0.28];
        this.params.mediumThickness = 1.2;
        this.params.atmosphereDensity = 0.18;
        this.params.complementStrength = 0.8;
        this.params.exposure = 1.45;
        this.params.waveAmplitude = 0.02;
        this.params.underwaterView = true;
        this.params.cubeDepth = -2.3;
        this.lookAtCubeUnderwater();
        // Deeper, slightly upward: cube + surface band; avoid green-lit floor filling the frame
        this.cameraPos.set(0.55, -1.05, 3.35);
        this.cameraTarget.set(0.0, this.params.cubeDepth + 0.55, 0.0);
        this.params.fov = 52;
        break;

      case 'contrast':
        // §56: white on yellow → purple tint (physiological layer labeled)
        // Hero = split floor boundary (sceneMode 4); cube parked off-stage.
        this.params.physiologicalContrast = true;
        this.params.opponentStrength = 0.9;
        this.params.dispersion = 0.012;
        this.params.sunElevation = 0.75;
        this.params.sunAzimuth = 0.15;
        this.params.sunIntensity = 1.7;
        this.params.exposure = 1.25;
        this.params.fillIntensity = 0.2;
        this.params.fillTint = [0.9, 0.9, 1.0];
        this.params.volumeSigma = 0.002; // clear so yellow|white read pure
        this.params.turbidity = 0.01;
        this.params.floorReflectance = 0.7;
        this.params.underwaterView = true; // in-water: no surface sheen washing tints
        this.params.waveAmplitude = 0; // freeze surface; boundary stays sharp
        this.params.cubeDepth = -9.0; // park cube below floor
        this.params.floorHeight = GOETHE_FLOOR_HEIGHT;
        // Yellow|white split floor (Slice C params; pattern 3)
        this.params.floorPattern = 3;
        this.params.floorAlbedoScale = 0.92;
        this.params.floorBumpAmp = 0;
        this.params.floorMaterial = 0;
        // Close above floor: vertical yellow|white seam centered; rod as scale cue only
        this.cameraPos.set(0.05, -4.15, 1.9);
        this.cameraTarget.set(0.0, this.params.floorHeight, -0.15);
        this.params.fov = 50;
        break;

      case 'refraction':
        // §227: displacement at boundaries produces colour
        // Cube near interface so silhouette meets Snell bright / TIR dark → spectral edges
        this.params.cubeDepth = -1.7; // closer to surface: boundary displacement reads
        this.params.dispersion = 0.05; // max UI — λ-dependent IOR fringes / chromatic caustics
        this.params.interfaceRoughness = 0.008; // sharp water plane
        this.params.maxBounces = 10;
        this.params.waveAmplitude = 0.035; // mild caustic topology without washout
        this.params.sunElevation = 0.92;
        this.params.sunAzimuth = 0.28;
        this.params.sunIntensity = 1.9;
        this.params.exposure = 1.5;
        this.params.volumeSigma = 0.022; // clear water — cube edges stay crisp
        this.params.fillIntensity = 0.22;
        this.params.underwaterView = true;
        // Upper third: interface (Snell + TIR); cube fills mid — light edge over dark volume
        this.cameraPos.set(0.25, -0.48, 2.95);
        this.cameraTarget.set(0, this.params.cubeDepth + 0.35, 0);
        this.params.fov = 54;
        break;

      case 'double-reflect':
        // §224: separated reflections weak and shadowy; calm surface
        // Near-calm micro-slope + microfacet so secondary floor path can fire (shader needs
        // slightly downward external reflects); still reads as flat water.
        // Mirror floor plane + high reflectance for secondary stand reflection
        this.params.floorHeight = -2.5;
        this.params.floorPattern = 0; // uniform
        this.params.floorAlbedoColor = [0.95, 0.95, 0.98];
        this.params.floorAlbedoScale = 0.8;
        this.params.floorBumpAmp = 0;
        this.params.floorMaterial = 2; // mirror
        this.params.floorSpecular = 1.0;
        this.params.floorRoughness = 0.02;
        this.params.waveAmplitude = 0.005;
        this.params.waveFrequency = 0.22;
        this.params.waveSpeed = 0.15;
        this.params.secondaryReflectWeight = 0.95;
        this.params.floorReflectance = 0.9;
        this.params.interfaceRoughness = 0.015;
        this.params.volumeSigma = 0.014;
        this.params.turbidity = 0.01;
        this.params.atmosphereDensity = 0.26;
        this.params.mediumThickness = 0.16;
        this.params.sunElevation = 0.4;
        this.params.sunAzimuth = 0.75;
        this.params.sunIntensity = 1.8;
        this.params.exposure = 1.32;
        this.params.fillIntensity = 0.16;
        this.params.maxBounces = 9;
        this.params.underwaterView = false;
        // Slightly lower/farther: more Fresnel calm plane + cube; soft stand secondary
        this.cameraPos.set(1.15, 1.2, 4.0);
        this.cameraTarget.set(0.0, -0.55, -0.15);
        this.params.fov = 48;
        break;

      case 'afterimage':
        // §50: opponent colour floats on neutral ground (viewer layer)
        // Hero = sceneMode-7 grey plane (y=1.5) + display-pass fixation/opponent — not water pigment.
        this.params.fixationMode = true;
        this.params.physiologicalContrast = true;
        this.params.opponentStrength = 1.0; // max still-readable opponent push on grey
        // Pre-warm hold so STILL smoke (few real-time seconds) shows full fixationStrength
        this.fixationHold = 8;
        this.params.sunElevation = 0.9;
        this.params.sunAzimuth = 0.1;
        this.params.sunIntensity = 0.85;
        this.params.exposure = 1.1;
        this.params.fillIntensity = 0.55;
        this.params.fillTint = [1.0, 1.0, 1.0]; // neutral — avoid cool green cast on grey
        this.params.atmosphereDensity = 0.12;
        this.params.mediumThickness = 0.08;
        this.params.volumeSigma = 0.002;
        this.params.turbidity = 0.01;
        this.params.underwaterView = false;
        this.params.waveAmplitude = 0;
        this.params.cubeDepth = -9.0; // park cube — grey plane + viewer layer are the §
        this.params.vignetteStrength = 0.12;
        // Overhead onto grey plane: full-frame neutral ground for fixation afterimage float
        this.cameraPos.set(0.0, 3.4, 0.6);
        this.cameraTarget.set(0.0, 1.5, 0.0);
        this.params.fov = 52;
        break;

      case 'twilight':
        // §85: faint lights appear coloured at night; moon disk + warm candle-fill
        // Root cause of prior fog soup: moon sat behind camera (az 2.2 vs look −Z)
        // and atmosphereDensity 0.9 buried both lights in Rayleigh wash.
        this.params.sunElevation = 0.02;
        this.params.sunAzimuth = 2.8; // sun opposite / out of frame — not day
        this.params.sunIntensity = 0.05;
        this.params.exposure = 2.15; // lift faint lights without blowing moon white
        // Night sky: dim cooler medium so moon / candle read as coloured lights
        this.params.atmosphereDensity = 0.32;
        this.params.mediumThickness = 0.2;
        this.params.mediumTint = [0.28, 0.34, 0.52];
        this.params.volumeSigma = 0.015;
        this.params.turbidity = 0.02;
        // Moon disk upper sky (cream–yellow env lobe) — moderate so colour survives tonemap
        this.params.moonIntensity = 0.95;
        this.params.moonElevation = 0.28;
        this.params.moonAzimuth = -1.68;
        this.params.candleIntensity = 1.0; // UI/param; warm local via fill (shader candle unused)
        // Warm candle proxy: yellow–orange fill on cube / near surfaces
        this.params.fillIntensity = 1.45;
        this.params.fillTint = [1.0, 0.48, 0.12];
        this.params.fillDir = [0.15, 0.75, 0.45];
        this.params.complementStrength = 0.3;
        this.params.underwaterView = false;
        this.params.waveAmplitude = 0.02;
        this.params.cubeDepth = -1.55;
        // Low eye: cube lower third; moon upper sky along −Z
        this.cameraPos.set(0.4, 1.0, 3.5);
        this.cameraTarget.set(0.0, 0.2, -0.8);
        this.params.fov = 58;
        break;

      case 'goethe-colourless-water':
        // §161: water has no colour; slight semi-opacity is not pigment.
        // sceneMode≥3 → light floor (not default dark-blue seabed) so bulk isn't
        // misread as blue dye; neutral scatter/volume tints only.
        // Demo A: pale sand substrate (floor is substrate, not water pigment)
        this.params.floorHeight = -3.0;
        this.params.floorPattern = 2; // sand
        this.params.floorAlbedoColor = [0.62, 0.54, 0.38];
        this.params.floorAlbedoScale = 0.55;
        this.params.floorBumpAmp = 0.025; // low
        this.params.floorMaterial = 0;
        this.params.sceneMode = 5;
        this.params.volumeSigma = 0.004;
        this.params.turbidity = 0.02; // "deprived slightly of transparency"
        this.params.scatterTint = [1, 1, 1];
        this.params.volumeTint = [1, 1, 1];
        this.params.mediumTint = [1, 1, 1];
        this.params.absorptionModel = 'neutral';
        this.params.dispersion = 0.008; // edge fringes only, not body colour
        this.params.sunElevation = 0.82;
        this.params.sunAzimuth = 0.4;
        this.params.sunIntensity = 1.7; // white high sun — "highest light colourless"
        this.params.fillIntensity = 0.2;
        this.params.fillTint = [1.0, 1.0, 0.98]; // no cool blue fill wash
        this.params.atmosphereDensity = 0.14; // cut Rayleigh blue-as-water misread
        this.params.mediumThickness = 0.08;
        this.params.waveAmplitude = 0.018;
        this.params.interfaceRoughness = 0.02;
        this.params.floorReflectance = 0.55;
        this.params.exposure = 1.35;
        this.params.cubeDepth = -1.7; // shorter water path → less bulk path colour
        this.params.underwaterView = false;
        this.lookAtCubeAbove();
        // Oblique above: cube through surface; pale neutral veil, not teal murk
        this.cameraPos.set(0.55, 2.15, 3.7);
        this.cameraTarget.set(0.0, this.params.cubeDepth + 0.2, -0.1);
        this.params.fov = 48;
        break;

      case 'diver-view':
        // §78: diving-bell — everything in red light; shadows green
        // Beer + warm medium for red field; green contrary fill + complement on umbrae
        // Ocean-ish gravel floor (substrate; field colour from Beer medium)
        this.params.floorHeight = -3.5;
        this.params.floorPattern = 1; // gravel
        this.params.floorAlbedoColor = [0.55, 0.48, 0.32];
        this.params.floorAlbedoScale = 0.4;
        this.params.floorBumpAmp = 0.06;
        this.params.floorMaterial = 0;
        this.params.underwaterView = true;
        this.params.sunElevation = 0.9;
        this.params.sunAzimuth = 0.32;
        this.params.sunIntensity = 2.05;
        this.params.absorptionModel = 'beer';
        this.params.sigmaLambda = [0.02, 0.22, 0.92]; // blue-heavy absorb → red field
        this.params.volumeSigma = 0.12;
        this.params.turbidity = 0.13;
        this.params.scatterTint = [1.65, 0.48, 0.3];
        this.params.volumeTint = [1.5, 0.68, 0.42];
        this.params.mediumTint = [2.0, 0.45, 0.24];
        this.params.mediumThickness = 1.2;
        this.params.atmosphereDensity = 0.14;
        this.params.fillIntensity = 0.78;
        this.params.fillDir = [0.28, 0.38, 0.88];
        this.params.fillTint = [0.25, 0.98, 0.4]; // green contrary light
        this.params.complementStrength = 0.78;
        this.params.exposure = 1.42;
        this.params.dispersion = 0.012;
        this.params.waveAmplitude = 0.02;
        this.params.cubeDepth = -2.25;
        this.lookAtCubeUnderwater();
        // Cube clear mid-frame; slight up-look for warm surface band, less floor mint wash
        this.cameraPos.set(0.45, -1.0, 3.35);
        this.cameraTarget.set(0, this.params.cubeDepth + 0.5, 0);
        this.params.fov = 54;
        break;

      case 'vessel-elevation':
        // §187 elevation (hebung): look diagonally into vessel; bottom raised by refraction.
        // Theory: diagonal sight that misses the dry bottom brings the wet bottom into view.
        // Light floor + rod = vessel-bottom cues; calm clear water; air-side IOR raises cube.
        // Raised sand bottom under cube (cubeDepth ~-1.55)
        this.params.floorHeight = -2.3;
        this.params.floorPattern = 2; // sand
        this.params.floorAlbedoColor = [0.6, 0.52, 0.38];
        this.params.floorAlbedoScale = 0.7;
        this.params.floorBumpAmp = 0.03; // low
        this.params.floorMaterial = 0;
        this.params.sceneMode = 5;
        this.params.volumeSigma = 0.005;
        this.params.turbidity = 0.015; // slight path presence, not murk
        this.params.scatterTint = [1, 1, 1];
        this.params.volumeTint = [1, 1, 1];
        this.params.mediumTint = [1, 1, 1];
        this.params.absorptionModel = 'neutral';
        this.params.waterIOR = 1.33;
        this.params.cubeDepth = -1.55; // submerged; refract → apparent raise toward surface
        this.params.waveAmplitude = 0.006; // near-calm; mild caustic cue that medium is water
        this.params.waveFrequency = 0.28;
        this.params.waveSpeed = 0.2;
        this.params.interfaceRoughness = 0.014;
        this.params.floorReflectance = 0.85;
        this.params.atmosphereDensity = 0.22;
        this.params.mediumThickness = 0.12;
        this.params.sunElevation = 0.78;
        this.params.sunAzimuth = 0.42;
        this.params.sunIntensity = 1.85;
        this.params.fillIntensity = 0.18;
        this.params.fillTint = [1.0, 1.0, 0.98];
        this.params.exposure = 1.4;
        this.params.dispersion = 0.012;
        this.params.maxBounces = 9;
        this.params.underwaterView = false;
        // Diagonal look-down over “rim” through surface at raised cube/bottom
        this.cameraPos.set(0.95, 1.95, 3.85);
        this.cameraTarget.set(0.0, this.params.cubeDepth + 0.45, -0.25);
        this.params.fov = 50;
        break;

      case 'wave-contrast':
        // §57: agitated sea — lit faces green, shadow opposite (not flat soup / cube hero)
        // Same wave topology that reads in sun-glitter, but low *side* sun so faces
        // show lit vs umbra + complement (not a glitter path). Cube parked off-stage.
        this.params.underwaterView = false;
        this.params.sunElevation = 0.16; // low raking → slope relief
        this.params.sunAzimuth = 0.2; // ~+X cross-light vs camera look (−Z)
        this.params.sunIntensity = 2.15;
        this.params.fillIntensity = 0.12; // preserve face contrast
        this.params.fillTint = [0.72, 0.88, 1.0];
        this.params.waveAmplitude = 0.12; // WAVE_AMP_MAX — multi-octave readable slopes
        this.params.waveFrequency = 0.72; // matches glitter topology that photographs well
        this.params.interfaceRoughness = 0.01; // sharp microfacet → lit peaks
        this.params.complementStrength = 0.58; // physiological opposite in umbra
        this.params.exposure = 1.42;
        this.params.volumeSigma = 0.025;
        this.params.turbidity = 0.02;
        this.params.atmosphereDensity = 0.34;
        this.params.cubeDepth = -5.5; // not the subject
        // Eye over open water looking out to horizon (glitter framing, not look-down soup)
        this.cameraPos.set(0.05, 0.95, 4.8);
        this.cameraTarget.set(0.0, 0.02, -4.5);
        this.params.fov = 48;
        break;

      case 'twilight-ocean':
        // §75: Harz sunset on ocean — red residual light; umbrae light sea-green / emerald
        // Warm principal (low sun through vapour) + sea-green contrary fill on opposite faces;
        // complement post pushes dark regions toward green (MIXED physiological).
        // Goethe: shadows “in lightness… sea-green… beauty… emerald” — not black voids.
        this.params.timeOfDay = 0.32; // sea-green-shadow phase of TOD ramp
        this.applyTimeOfDay(0.32);
        // Low warm sun — red residual on lit sides; stronger than pure TOD so contrast reads
        this.params.sunElevation = 0.07;
        this.params.sunAzimuth = 1.05; // raking from camera-right
        this.params.sunIntensity = 1.9;
        // Warm residual vapour (sunset red-orange) — haze light enough for dual-face read
        this.params.atmosphereDensity = 0.38;
        this.params.mediumThickness = 0.55;
        this.params.mediumTint = [1.35, 0.62, 0.35];
        this.params.turbidity = 0.12;
        this.params.volumeSigma = 0.01;
        // Sea-green contrary on opposite cube faces / soft umbrae
        this.params.fillIntensity = 1.25;
        this.params.fillDir = [-0.9, 0.35, -0.25]; // anti-sun
        this.params.fillTint = [0.15, 0.98, 0.5]; // emerald / sea-green
        this.params.complementStrength = 0.8;
        this.params.exposure = 1.48;
        this.params.underwaterView = false;
        this.params.waveAmplitude = 0.04;
        this.params.interfaceRoughness = 0.022;
        this.params.cubeDepth = -1.4;
        this.params.floorReflectance = 0.65;
        // Low eye over ocean: cube mid-frame under warm residual sky
        this.cameraPos.set(0.45, 0.95, 3.9);
        this.cameraTarget.set(0.0, 0.0, -0.2);
        this.params.fov = 53;
        break;

      case 'sun-glitter':
        // §93: halo around the sun image on water — glitter path + bloom readable
        // Sun ahead of camera (−Z) at grazing elev so specular trail runs toward the disk.
        this.params.sunElevation = 0.055;
        this.params.sunAzimuth = -1.48; // ~−Z, in look direction
        this.params.sunIntensity = 2.55;
        this.params.waveAmplitude = 0.12;
        this.params.waveFrequency = 0.72;
        this.params.bloomStrength = 0.9; // §93 subjective halo on sun image
        this.params.exposure = 1.48;
        this.params.interfaceRoughness = 0.01; // sharp microfacet peaks → glitter
        this.params.underwaterView = false;
        this.params.volumeSigma = 0.028;
        this.params.turbidity = 0.02;
        this.params.atmosphereDensity = 0.32; // less haze so path stays bright
        this.params.fillIntensity = 0.18; // keep specular contrast
        this.params.cubeDepth = -5.5; // park cube — not the subject
        // Eye above water looking out along glitter path to sun
        this.cameraPos.set(0.05, 1.05, 5.0);
        this.cameraTarget.set(0.0, 0.02, -5.0);
        this.params.fov = 46;
        break;
    }

    this.applyRenderScale();

    if (updateHash) {
      window.location.hash = `chapter=${id}`;
    }

    // Chapters that set waveAmplitude must own GPU height — leave custom only when untouched.
    if (waveMacrosTouched) {
      this.params.wavePreset = 'multi-octave';
    }
    this.syncWaveComponentsFromMacros();
    this.onChapterChanged?.(id, def.badge);
    // Re-sync fly yaw/pitch + kill residual WASD velocity after camera teleport
    this.onCameraMoved?.();
    this.markSceneChanged();
  }

  /**
   * Quick seafloor substrate bundles for the Seafloor panel preset buttons.
   * Floor is substrate only — water colour comes from path physics.
   */
  applyFloorPreset(name: FloorPresetName): void {
    this.params.floorEnabled = true;
    this.params.floorMaterial = 0;
    this.params.floorSpecular = 0.05;
    this.params.floorRoughness = 0.55;
    this.params.floorBumpFreq = 2.5;
    this.params.floorBumpOctaves = 3;
    this.params.floorCheckerScale = 0;
    this.params.floorReflectance = 0.15;
    this.params.floorAlbedoColor = [0.55, 0.48, 0.32];

    switch (name) {
      case 'abyss':
        // Prefer disabled plane (or deep black) so mid-water scenes read without floor wash
        this.params.floorEnabled = false;
        this.params.floorHeight = -12;
        this.params.floorPattern = 0;
        this.params.floorAlbedoScale = 0.05;
        this.params.floorBumpAmp = 0;
        break;
      case 'sand':
        this.params.floorHeight = -3.5;
        this.params.floorPattern = 2;
        this.params.floorAlbedoColor = [0.62, 0.54, 0.38];
        this.params.floorAlbedoScale = 0.55;
        this.params.floorBumpAmp = 0.03;
        break;
      case 'gravel':
        this.params.floorHeight = -3.5;
        this.params.floorPattern = 1;
        this.params.floorAlbedoColor = [0.55, 0.48, 0.32];
        this.params.floorAlbedoScale = 0.4;
        this.params.floorBumpAmp = 0.06;
        break;
      case 'white':
        this.params.floorHeight = GOETHE_FLOOR_HEIGHT;
        this.params.floorPattern = 0;
        this.params.floorAlbedoColor = [1.0, 1.0, 1.0];
        this.params.floorAlbedoScale = 0.9;
        this.params.floorBumpAmp = 0;
        this.params.floorReflectance = 0.95;
        break;
      case 'mirror':
        this.params.floorHeight = -2.5;
        this.params.floorPattern = 0;
        this.params.floorAlbedoColor = [0.95, 0.95, 0.98];
        this.params.floorAlbedoScale = 0.8;
        this.params.floorBumpAmp = 0;
        this.params.floorMaterial = 2;
        this.params.floorSpecular = 1.0;
        this.params.floorRoughness = 0.02;
        this.params.floorReflectance = 0.9;
        break;
      case 'split':
        this.params.floorHeight = GOETHE_FLOOR_HEIGHT;
        this.params.floorPattern = 3;
        this.params.floorAlbedoScale = 0.92;
        this.params.floorBumpAmp = 0;
        this.params.floorReflectance = 0.7;
        break;
    }

    this.markSceneChanged();
  }

  /**
   * Rebuild waveComponents from legacy macro knobs according to wavePreset.
   * - multi-octave: full 4-octave rebuild (legacy fidelity)
   * - single-sine / standing: primary from macros; optionally keep dir/phase
   * - named static presets + custom: no-op (user owns the list / fixed builder)
   */
  private rebuildWaveFromMacros(preservePrimaryMeta: boolean): void {
    const { waveAmplitude: rawAmp, waveFrequency: freq, waveSpeed: spd, wavePreset } = this.params;
    const amp = Math.min(WAVE_AMP_MAX, Math.max(0, rawAmp));
    this.params.waveAmplitude = amp;

    if (wavePreset === 'multi-octave') {
      this.params.waveComponents = buildMultiOctaveComponents(amp, freq, spd);
      this.sanitizeWaves();
      return;
    }

    if (wavePreset === 'single-sine' || wavePreset === 'standing') {
      const standing = wavePreset === 'standing';
      const base = standing
        ? buildStandingComponent(amp, freq, spd)
        : buildSingleSineComponent(amp, freq, spd);
      if (preservePrimaryMeta) {
        const prev = this.params.waveComponents[0];
        if (prev) {
          base.directionDeg = prev.directionDeg;
          base.phase = prev.phase;
        }
      }
      base.standing = standing;
      this.params.waveComponents = [base];
      this.sanitizeWaves();
      return;
    }

    // custom + named static presets: macros do not rewrite components
  }

  /**
   * Macro slider path: rebuild components for multi-octave / single-sine / standing.
   * Preserves primary dir/phase for single-sine / standing.
   */
  syncWaveComponentsFromMacros(): void {
    this.rebuildWaveFromMacros(true);
  }

  /**
   * Apply a named preset. Named (non-custom) presets overwrite components and set
   * macros to sensible UI labels. Always sanitizes amp/slope budgets.
   */
  setWavePreset(preset: WavePreset): void {
    this.params.wavePreset = preset;
    if (preset === 'custom') {
      // Ensure at least one component exists for the editor
      if (this.params.waveComponents.length === 0) {
        this.params.waveComponents = [
          buildSingleSineComponent(
            this.params.waveAmplitude,
            this.params.waveFrequency,
            this.params.waveSpeed,
          ),
        ];
      }
      this.sanitizeWaves();
      return;
    }

    if (preset === 'multi-octave') {
      this.params.waveAmplitude = Math.min(WAVE_AMP_MAX, Math.max(0, this.params.waveAmplitude));
      this.params.waveComponents = buildMultiOctaveComponents(
        this.params.waveAmplitude,
        this.params.waveFrequency,
        this.params.waveSpeed,
      );
      this.sanitizeWaves();
      return;
    }

    if (preset === 'single-sine' || preset === 'standing') {
      this.params.waveAmplitude = Math.min(WAVE_AMP_MAX, Math.max(0, this.params.waveAmplitude));
      this.params.waveComponents = [
        preset === 'standing'
          ? buildStandingComponent(
              this.params.waveAmplitude,
              this.params.waveFrequency,
              this.params.waveSpeed,
            )
          : buildSingleSineComponent(
              this.params.waveAmplitude,
              this.params.waveFrequency,
              this.params.waveSpeed,
            ),
      ];
      this.sanitizeWaves();
      return;
    }

    const named = buildNamedPresetComponents(preset);
    const macros = macrosForNamedPreset(preset);
    if (named && macros) {
      this.params.waveAmplitude = macros.amp;
      this.params.waveFrequency = macros.freq;
      this.params.waveSpeed = macros.spd;
      this.params.waveComponents = named;
    }
    this.sanitizeWaves();
  }

  /** Mark components dirty → preset becomes custom (user edited a field). */
  markWaveComponentsCustom(): void {
    this.params.wavePreset = 'custom';
  }

  /**
   * Ensure length in [1, MAX_WAVE_COMPONENTS], clamp macro amp, and apply
   * per-component amp / total peak / slope budgets.
   */
  sanitizeWaves(): void {
    this.params.waveAmplitude = Math.min(WAVE_AMP_MAX, Math.max(0, this.params.waveAmplitude));
    let comps = this.params.waveComponents;
    if (comps.length > MAX_WAVE_COMPONENTS) {
      comps = comps.slice(0, MAX_WAVE_COMPONENTS);
    }
    if (comps.length === 0) {
      comps = [
        buildSingleSineComponent(
          this.params.waveAmplitude,
          this.params.waveFrequency,
          this.params.waveSpeed,
        ),
      ];
    }
    this.params.waveComponents = sanitizeWaveComponents(comps);
  }

  /** Alias for sanitizeWaves (length + amp/slope budgets). */
  clampWaveComponents(): void {
    this.sanitizeWaves();
  }

  private packWaveUniforms(): void {
    this.sanitizeWaves();
    const u = this.material.uniforms;
    const comps = this.params.waveComponents;
    const n = Math.min(MAX_WAVE_COMPONENTS, Math.max(0, comps.length));
    u.waveCount.value = n;
    const aArr = u.waveCompA.value as THREE.Vector4[];
    const bArr = u.waveCompB.value as THREE.Vector4[];
    for (let i = 0; i < MAX_WAVE_COMPONENTS; i++) {
      if (i < n) {
        const c = comps[i];
        const theta = (c.directionDeg * Math.PI) / 180;
        const dirX = Math.cos(theta);
        const dirY = Math.sin(theta);
        // A: amp, freq, speed(ω), phase
        aArr[i].set(c.amplitude, c.frequency, c.speed, c.phase);
        // B: dirX, dirY, standing flag, unused
        bArr[i].set(dirX, dirY, c.standing ? 1 : 0, 0);
      } else {
        aArr[i].set(0, 0, 0, 0);
        bArr[i].set(1, 0, 0, 0);
      }
    }
  }

  applyTimeOfDay(t: number): void {
    this.params.timeOfDay = t;
    if (t < 0.25) {
      this.params.sunElevation = 0.05;
      this.params.sunIntensity = 1.0;
      this.params.moonIntensity = 0;
    } else if (t < 0.45) {
      this.params.sunElevation = 0.08;
      this.params.sunIntensity = 0.6;
      this.params.moonIntensity = 0;
      this.params.complementStrength = Math.max(this.params.complementStrength, 0.3);
    } else if (t < 0.65) {
      this.params.sunElevation = -0.02;
      this.params.sunIntensity = 0.15;
      this.params.moonIntensity = 0.05;
    } else {
      this.params.sunElevation = -0.2;
      this.params.sunIntensity = 0.04;
      this.params.moonIntensity = 0.3;
      this.params.candleIntensity = 0.4;
    }
  }

  private clearAccumBuffers(): void {
    const prevColor = this.renderer.getClearColor(new THREE.Color());
    const prevAlpha = this.renderer.getClearAlpha();
    this.renderer.setClearColor(0x000000, 1);
    for (const rt of this.accumTargets) {
      this.renderer.setRenderTarget(rt);
      this.renderer.clear();
    }
    this.renderer.setRenderTarget(null);
    this.renderer.setClearColor(prevColor, prevAlpha);
  }

  private isCameraInMotion(): boolean {
    if (this.params.autoOrbit || this.userInteracting) return true;
    return (
      this.cameraPos.distanceToSquared(this.lastCamPos) > 1e-5 ||
      this.cameraTarget.distanceToSquared(this.lastCamTarget) > 1e-5
    );
  }

  private createUniforms(w: number, h: number): Record<string, THREE.IUniform> {
    return {
      resolution: { value: new THREE.Vector2(w, h) },
      time: { value: 0 },
      accumSampleCount: { value: 0 },
      samplesPerFrame: { value: 1 },
      maxAccumSamples: { value: 128 },
      cameraPos: { value: new THREE.Vector3() },
      cameraTarget: { value: new THREE.Vector3() },
      cameraUp: { value: new THREE.Vector3() },
      fov: { value: 55 },
      waterIOR: { value: 1.33 },
      interfaceRoughness: { value: 0.06 },
      dispersion: { value: 0.012 },
      maxBounces: { value: 6 },
      sunDir: { value: new THREE.Vector3() },
      sunIntensity: { value: 1.2 },
      volumeSigma: { value: 0.05 },
      volumeG: { value: 0.55 },
      // Wave surface is fully driven by packed components (macros stay on SimParams only).
      waveCount: { value: 4 },
      waveCompA: {
        value: [
          new THREE.Vector4(),
          new THREE.Vector4(),
          new THREE.Vector4(),
          new THREE.Vector4(),
        ],
      },
      waveCompB: {
        value: [
          new THREE.Vector4(),
          new THREE.Vector4(),
          new THREE.Vector4(),
          new THREE.Vector4(),
        ],
      },
      cubeDepth: { value: -2.2 },
      cubeRotY: { value: 0 },
      cubeRotX: { value: 0 },
      exposure: { value: 1.35 },
      vignetteStrength: { value: 0.25 },
      accumTexture: { value: this.accumTargets[0].texture },
      resetAccum: { value: 1.0 },
      displayOnly: { value: 0.0 },
      temporalBlend: { value: 0.05 },
      cameraInteracting: { value: 0.0 },
      turbidity: { value: 0.05 },
      scatterTint: { value: new THREE.Vector3(1, 1, 1) },
      absorptionModel: { value: 0 },
      sigmaLambda: { value: new THREE.Vector3(0.04, 0.08, 0.18) },
      volumeTint: { value: new THREE.Vector3(1, 1, 1) },
      atmosphereDensity: { value: 0.5 },
      mediumThickness: { value: 0.3 },
      mediumTint: { value: new THREE.Vector3(1, 1, 1) },
      fillDir: { value: new THREE.Vector3(-0.4, 0.6, -0.3) },
      fillIntensity: { value: 0.35 },
      fillTint: { value: new THREE.Vector3(0.7, 0.85, 1.0) },
      sceneMode: { value: 0 },
      physiologicalContrast: { value: 0.0 },
      opponentStrength: { value: 0.4 },
      complementStrength: { value: 0.0 },
      secondaryReflectWeight: { value: 0.0 },
      floorReflectance: { value: 0.15 },
      floorHeight: { value: -3.5 },
      floorEnabled: { value: 1.0 },
      floorPattern: { value: 1 },
      floorAlbedoColor: { value: new THREE.Vector3(0.55, 0.48, 0.32) },
      floorAlbedoScale: { value: 0.4 },
      floorBumpAmp: { value: 0.06 },
      floorBumpFreq: { value: 2.5 },
      floorBumpOctaves: { value: 3 },
      floorRoughness: { value: 0.55 },
      floorMaterial: { value: 0 },
      floorSpecular: { value: 0.05 },
      floorCheckerScale: { value: 0.0 },
      flameEdgeBoost: { value: 0.0 },
      moonDir: { value: new THREE.Vector3() },
      moonIntensity: { value: 0.0 },
      candleIntensity: { value: 0.0 },
      bloomStrength: { value: 0.0 },
      fixationStrength: { value: 0.0 },
    };
  }

  private renderSize(): { w: number; h: number } {
    const scale = this.params.renderScale;
    return {
      w: Math.max(320, Math.floor(window.innerWidth * scale)),
      h: Math.max(240, Math.floor(window.innerHeight * scale)),
    };
  }

  applyRenderScale(): void {
    const { w, h } = this.renderSize();
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.accumTargets[0].setSize(w, h);
    this.accumTargets[1].setSize(w, h);
    this.material.uniforms.resolution.value.set(w, h);
    this.resetAccum();
  }

  resize(): void {
    this.applyRenderScale();
  }

  resetAccum(): void {
    this.accumSampleCount = 0;
    this.needsReset = true;
    this.ping = 0;
  }

  markSceneChanged(): void {
    this.clearAccumBuffers();
    this.accumSampleCount = 0;
    this.needsReset = true;
    this.ping = 0;
    this.cameraSettled = true;
    this.lastCamPos.copy(this.cameraPos);
    this.lastCamTarget.copy(this.cameraTarget);
  }

  /**
   * Incremental mouse look. Prefer cameraControls updating shared yaw/pitch;
   * this remains for API callers and always notifies onCameraMoved so fly state syncs.
   */
  applyMouseLook(dx: number, dy: number): void {
    const sens = this.params.mouseSensitivity;
    const forward = new THREE.Vector3().subVectors(this.cameraTarget, this.cameraPos).normalize();
    let yaw = Math.atan2(forward.x, forward.z) - dx * sens;
    let pitch = Math.asin(THREE.MathUtils.clamp(forward.y, -0.99, 0.99)) - dy * sens;
    pitch = THREE.MathUtils.clamp(pitch, -1.45, 1.45);
    this.updateCameraTargetFromAngles(yaw, pitch);
    // Critical: fly controller keeps its own yaw/pitch for WASD — must re-sync.
    this.onCameraMoved?.();
  }

  updateCameraTargetFromAngles(yaw: number, pitch: number): void {
    const cp = Math.cos(pitch);
    const dir = new THREE.Vector3(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp);
    this.cameraTarget.copy(this.cameraPos).add(dir);
  }

  /** North-star underwater frame: cube + surface (Snell window / TIR). */
  lookAtCubeUnderwater(): void {
    const d = this.params.cubeDepth;
    this.cameraPos.set(0, Math.min(-0.6, d + 1.2), 4.0);
    this.cameraTarget.set(0, d, 0);
    this.onCameraMoved?.();
  }

  /** North-star above-water frame: look down through interface at submerged cube. */
  lookAtCubeAbove(): void {
    const d = this.params.cubeDepth;
    this.cameraPos.set(0, 3.2, 5.0);
    this.cameraTarget.set(0, d, 0);
    this.onCameraMoved?.();
  }

  setUnderwaterView(underwater: boolean): void {
    if (this.params.underwaterView === underwater) return;
    this.params.underwaterView = underwater;
    if (underwater) this.lookAtCubeUnderwater();
    else this.lookAtCubeAbove();
    // lookAt* already calls onCameraMoved
    this.markSceneChanged();
  }

  private updateAutoOrbit(dt: number): void {
    if (!this.params.autoOrbit) return;
    this.orbitPhase += dt * 0.25;
    const radius = this.params.underwaterView ? 4.5 : 6;
    const y = this.params.underwaterView
      ? Math.min(-0.6, this.params.cubeDepth + 1.2) + Math.sin(this.orbitPhase * 0.5) * 0.25
      : 3.0;
    this.cameraPos.x = Math.sin(this.orbitPhase) * radius;
    this.cameraPos.z = Math.cos(this.orbitPhase) * radius;
    this.cameraPos.y = y;
    // Always keep the cube as the look-at so orbit demonstrates interface physics, not empty water
    this.cameraTarget.set(0, this.params.cubeDepth, 0);

    if (this.params.activeChapter === 'atmosphere') {
      this.params.sunElevation = 0.05 + (Math.sin(this.orbitPhase * 0.3) * 0.5 + 0.5) * 0.85;
    }
  }

  /**
   * Scene is "dynamic" when geometry/time changes between frames.
   * Blending dynamic frames causes ghosting/spotty caustics — the root cause of the "spotty" look.
   * LIVE mode: one-sample-per-frame path-trace, no history.
   * STILL mode: freeze waves + cube, progressive 1/N accumulation.
   */
  isSceneDynamic(): boolean {
    if (!this.params.animateWaves) return false;
    const cubeSpinning =
      Math.abs(this.params.cubeRotSpeedY) > 1e-6 || Math.abs(this.params.cubeRotSpeedX) > 1e-6;
    // GPU height comes only from waveComponents — not the legacy macro knob.
    const anyWaveAmp = this.params.waveComponents.some((c) => Math.abs(c.amplitude) > 1e-5);
    const wavesMoving = this.params.timeScale > 1e-5 && anyWaveAmp;
    return cubeSpinning || wavesMoving || this.params.autoOrbit;
  }

  getRenderMode(): 'live' | 'still' {
    return this.renderMode;
  }

  getAccumSampleCount(): number {
    return this.accumSampleCount;
  }

  /** Freeze waves + cube spin and reset buffer so progressive path-trace can converge. */
  freezeForCapture(): void {
    this.params.animateWaves = false;
    this.params.autoOrbit = false;
    this.markSceneChanged();
  }

  /** Resume live animated path-trace (noisy, no ghost blend). */
  unfreezeLive(): void {
    this.params.animateWaves = true;
    this.markSceneChanged();
  }

  setAnimateScene(on: boolean): void {
    if (this.params.animateWaves === on) return;
    this.params.animateWaves = on;
    if (!on) this.params.autoOrbit = false;
    this.markSceneChanged();
  }

  private advanceSimulation(dt: number): void {
    // Only advance time/spin when animating. STILL mode freezes the entire dielectric scene
    // so TIR escape angles, caustics, and Snell paths are consistent across samples.
    if (this.params.animateWaves) {
      this.simTime += dt * this.params.timeScale;
      this.cubeRotY += this.params.cubeRotSpeedY;
      this.cubeRotX += this.params.cubeRotSpeedX;
    }

    if (this.params.fixationMode) {
      this.fixationHold = Math.min(10, this.fixationHold + dt);
    } else {
      this.fixationHold = Math.max(0, this.fixationHold - dt * this.params.afterimageDecay * 2);
    }
  }

  private updateUniforms(): void {
    const u = this.material.uniforms;
    const sunX = Math.cos(this.params.sunAzimuth) * Math.cos(this.params.sunElevation);
    const sunY = Math.sin(this.params.sunElevation);
    const sunZ = Math.sin(this.params.sunAzimuth) * Math.cos(this.params.sunElevation);

    const moonX = Math.cos(this.params.moonAzimuth) * Math.cos(this.params.moonElevation);
    const moonY = Math.sin(this.params.moonElevation);
    const moonZ = Math.sin(this.params.moonAzimuth) * Math.cos(this.params.moonElevation);

    u.time.value = this.simTime;
    u.accumSampleCount.value = this.accumSampleCount;
    u.samplesPerFrame.value = this.params.samplesPerFrame;
    u.maxAccumSamples.value = this.params.maxAccumSamples;
    u.cameraPos.value.copy(this.cameraPos);
    u.cameraTarget.value.copy(this.cameraTarget);
    u.cameraUp.value.copy(this.cameraUp);
    u.fov.value = this.params.fov;
    u.waterIOR.value = this.params.waterIOR;
    u.interfaceRoughness.value = this.params.interfaceRoughness;
    u.dispersion.value = this.params.dispersion;
    u.maxBounces.value = this.params.maxBounces;
    u.temporalBlend.value = this.params.temporalBlend;
    u.exposure.value = this.params.exposure;
    u.vignetteStrength.value = this.params.vignetteStrength;
    this.packWaveUniforms();
    u.cubeDepth.value = this.params.cubeDepth;
    u.sunDir.value.set(sunX, sunY, sunZ);
    u.sunIntensity.value = this.params.sunIntensity;
    u.volumeSigma.value = this.params.volumeSigma;
    u.volumeG.value = this.params.volumeG;
    u.cubeRotY.value = this.cubeRotY;
    u.cubeRotX.value = this.cubeRotX;

    u.turbidity.value = this.params.turbidity;
    u.scatterTint.value.set(...this.params.scatterTint);
    u.absorptionModel.value = ABSORPTION_MAP[this.params.absorptionModel];
    u.sigmaLambda.value.set(...this.params.sigmaLambda);
    u.volumeTint.value.set(...this.params.volumeTint);
    u.atmosphereDensity.value = this.params.atmosphereDensity;
    u.mediumThickness.value = this.params.mediumThickness;
    u.mediumTint.value.set(...this.params.mediumTint);
    u.fillDir.value.set(...this.params.fillDir).normalize();
    u.fillIntensity.value = this.params.fillIntensity;
    u.fillTint.value.set(...this.params.fillTint);
    u.sceneMode.value = this.params.sceneMode;
    u.physiologicalContrast.value = this.params.physiologicalContrast ? 1.0 : 0.0;
    u.opponentStrength.value = this.params.opponentStrength;
    u.complementStrength.value = this.params.complementStrength;
    u.secondaryReflectWeight.value = this.params.secondaryReflectWeight;
    u.floorReflectance.value = this.params.floorReflectance;
    u.floorHeight.value = this.params.floorHeight;
    u.floorEnabled.value = this.params.floorEnabled ? 1.0 : 0.0;
    u.floorPattern.value = this.params.floorPattern;
    u.floorAlbedoColor.value.set(...this.params.floorAlbedoColor);
    u.floorAlbedoScale.value = this.params.floorAlbedoScale;
    u.floorBumpAmp.value = this.params.floorBumpAmp;
    u.floorBumpFreq.value = this.params.floorBumpFreq;
    u.floorBumpOctaves.value = this.params.floorBumpOctaves;
    u.floorRoughness.value = this.params.floorRoughness;
    u.floorMaterial.value = this.params.floorMaterial;
    u.floorSpecular.value = this.params.floorSpecular;
    u.floorCheckerScale.value = this.params.floorCheckerScale;
    u.flameEdgeBoost.value = this.params.flameEdgeBoost;
    u.moonDir.value.set(moonX, moonY, moonZ);
    u.moonIntensity.value = this.params.moonIntensity;
    u.candleIntensity.value = this.params.candleIntensity;
    u.bloomStrength.value = this.params.bloomStrength;
    u.fixationStrength.value = this.params.fixationMode ? Math.min(1, this.fixationHold / 5) : 0;
  }

  render(): void {
    const now = performance.now();
    const dt = Math.min((now - (this.lastRenderTime || now)) / 1000, 0.05);
    this.lastRenderTime = now;

    this.preRender?.(dt);
    this.updateAutoOrbit(dt);
    this.advanceSimulation(dt);

    const camMoving = this.isCameraInMotion();
    const sceneDynamic = this.isSceneDynamic();
    // LIVE whenever camera moves OR the dielectric scene is animating.
    // Only STILL (frozen) scenes may progressive-accumulate — otherwise caustics ghost.
    const live = camMoving || sceneDynamic || !this.cameraSettled;
    this.renderMode = live ? 'live' : 'still';

    if (camMoving) {
      this.settleCooldown = 0.4;
      if (this.cameraSettled) {
        this.clearAccumBuffers();
        this.cameraSettled = false;
        this.accumSampleCount = 0;
        this.needsReset = true;
      }
    } else {
      this.settleCooldown -= dt;
      if (!this.cameraSettled && this.settleCooldown <= 0) {
        this.clearAccumBuffers();
        this.cameraSettled = true;
        this.accumSampleCount = 0;
        this.needsReset = true;
      }
    }

    this.lastCamPos.copy(this.cameraPos);
    this.lastCamTarget.copy(this.cameraTarget);

    const u = this.material.uniforms;
    // cameraInteracting = "do not blend history" (live single-frame path-trace)
    u.cameraInteracting.value = live ? 1.0 : 0.0;
    u.resetAccum.value = live || this.needsReset ? 1.0 : 0.0;
    // Progressive weight computed in shader from accumSampleCount when still.
    // temporalBlend kept as fallback floor for very early samples only.
    u.temporalBlend.value = live ? 1.0 : this.params.temporalBlend;

    this.updateUniforms();

    const readIdx = this.ping;
    const writeIdx = 1 - this.ping;
    const sampleInterval = 1000 / Math.max(1, this.params.sampleFps);
    // LIVE: every display frame (fresh path samples, no history).
    // STILL: throttle by sampleFps but NEVER permanently stop sampling.
    // Old behavior stopped at maxAccumSamples and *froze* the buffer — if early
    // samples were black (false underwater misses), the image stayed black forever.
    // Continuous STILL keeps a sample TTL / rolling blend after the nominal budget.
    const shouldSample =
      live || this.needsReset || now - this.lastSampleTime >= sampleInterval;

    if (shouldSample) {
      u.accumTexture.value = this.accumTargets[readIdx].texture;
      u.displayOnly.value = 0.0;
      if (live) u.resetAccum.value = 1.0;

      this.renderer.setRenderTarget(this.accumTargets[writeIdx]);
      this.renderer.render(this.scene, this.orthoCam);
      this.ping = writeIdx;
      this.lastSampleTime = now;

      if (!live) {
        // Climb to maxAccumSamples for progressive 1/N, then stay at max so the
        // shader switches to rolling blend (pixels keep receiving new path samples).
        this.accumSampleCount = Math.min(
          this.accumSampleCount + this.params.samplesPerFrame,
          this.params.maxAccumSamples,
        );
        this.needsReset = false;
      } else {
        // Live path-trace: each frame stands alone; counter shows "1" for clarity.
        this.accumSampleCount = this.params.samplesPerFrame;
        this.needsReset = false;
      }
    }

    const displayIdx = shouldSample ? writeIdx : this.ping;
    u.accumTexture.value = this.accumTargets[displayIdx].texture;
    u.displayOnly.value = 1.0;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.orthoCam);
  }

  exportPNG(): string {
    const canvas = document.createElement('canvas');
    canvas.width = this.renderer.domElement.width;
    canvas.height = this.renderer.domElement.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(this.renderer.domElement, 0, 0);
    return canvas.toDataURL('image/png');
  }

  getStats(): string {
    const { w, h } = this.renderSize();
    const ch = this.params.activeChapter;
    if (this.renderMode === 'live') {
      return `LIVE path-trace · ${this.params.samplesPerFrame} spp · ${w}×${h} · ${ch} · uncheck Animate for clean accum`;
    }
    const pct = Math.min(100, Math.round((this.accumSampleCount / this.params.maxAccumSamples) * 100));
    // After nominal budget we keep rolling (sample TTL) — not a frozen DONE plate.
    const phase =
      this.accumSampleCount >= this.params.maxAccumSamples ? ' rolling' : '';
    return `STILL accum ${this.accumSampleCount}/${this.params.maxAccumSamples} (${pct}%)${phase} · ${w}×${h} · ${ch}`;
  }

  getGpuInfo(): string {
    return this.gpuInfo;
  }
}