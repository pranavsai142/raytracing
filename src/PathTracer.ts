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

export type WavePreset = 'multi-octave' | 'single-sine' | 'standing' | 'custom';

export const MAX_WAVE_COMPONENTS = 4;

/**
 * Rebuild the legacy 4-octave ocean as explicit components.
 * Matches pathTracer.frag historical ratios: amp*=0.52, freq*=1.85, spd*=1.05,
 * angles i*1.3+0.7 with dir normalize(cos(ang), sin(ang*0.6)), and per-octave
 * temporal factor (0.9 + i*0.15) baked into each component's speed.
 */
export function buildMultiOctaveComponents(
  baseAmp: number,
  baseFreq: number,
  baseSpd: number,
): WaveComponent[] {
  const comps: WaveComponent[] = [];
  let amp = baseAmp;
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
  return comps;
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
    samplesPerFrame: 1,
    maxAccumSamples: 256,
    temporalBlend: 0.05,
    exposure: 1.35,
    vignetteStrength: 0.25,
    waveAmplitude: 0.08,
    waveFrequency: 0.5,
    waveSpeed: 0.6,
    wavePreset: 'multi-octave',
    waveComponents: buildMultiOctaveComponents(0.08, 0.5, 0.6),
    timeScale: 0.15,
    // Default LIVE: animated ocean. Uncheck "Animate Scene" (or freezeForCapture) for clean progressive path-trace.
    animateWaves: true,
    cubeDepth: -2.2,
    cubeRotSpeedY: 0.004,
    cubeRotSpeedX: 0.002,
    fov: 55,
    moveSpeed: 1.2,
    moveAccel: 3.5,
    moveDamping: 6.0,
    mouseSensitivity: 0.0018,
    renderScale: 0.75,
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

    switch (id) {
      case 'ocean':
        this.params.underwaterView = true;
        // Frame the sacred cube: Snell window above, cube filling view, TIR around edges
        this.lookAtCubeUnderwater();
        break;

      case 'primordial':
        this.params.sunElevation = 0.12;
        this.params.mediumThickness = 0.6;
        this.params.atmosphereDensity = 1.0;
        this.params.volumeSigma = 0.04;
        this.params.turbidity = 0.4;
        this.params.underwaterView = false;
        this.cameraPos.set(0, 2.5, 5);
        this.updateCameraTargetFromAngles(0, -0.25);
        break;

      case 'atmosphere':
        this.params.atmosphereDensity = 1.2;
        this.params.sunElevation = 0.35;
        this.params.autoOrbit = true;
        this.params.flameEdgeBoost = 0.6;
        this.params.underwaterView = false;
        this.cameraPos.set(0, 2.5, 5);
        this.updateCameraTargetFromAngles(0, -0.3);
        break;

      case 'shadows':
        this.params.sunElevation = 0.15;
        this.params.sunIntensity = 1.4;
        this.params.fillIntensity = 0.5;
        this.params.fillTint = [0.7, 0.85, 1.0];
        this.params.exposure = 1.8;
        this.params.underwaterView = false;
        this.cameraPos.set(1.2, 2.0, 3);
        this.updateCameraTargetFromAngles(-0.5, -0.5);
        break;

      case 'shadows-underwater':
        this.params.sunElevation = 0.15;
        this.params.fillIntensity = 0.45;
        this.params.fillTint = [0.7, 0.85, 1.0];
        this.params.volumeSigma = 0.08;
        this.params.complementStrength = 0.25;
        this.params.underwaterView = true;
        this.lookAtCubeUnderwater();
        this.cameraPos.x = 0.6;
        this.cameraTarget.set(0, this.params.cubeDepth, 0);
        break;

      case 'contrast':
        this.params.physiologicalContrast = true;
        this.params.opponentStrength = 0.5;
        this.params.dispersion = 0.03;
        this.params.underwaterView = false;
        this.cameraPos.set(0, 2.2, 2.5);
        this.updateCameraTargetFromAngles(0, -0.55);
        break;

      case 'refraction':
        this.params.dispersion = 0.02;
        this.params.interfaceRoughness = 0.02;
        this.params.maxBounces = 8;
        this.params.waveAmplitude = 0.06;
        this.params.underwaterView = true;
        // Closer + slightly up: cube + wave surface caustics in one frame
        this.cameraPos.set(0, -0.55, 3.2);
        this.cameraTarget.set(0, this.params.cubeDepth + 0.3, 0);
        break;

      case 'double-reflect':
        this.params.waveAmplitude = 0;
        this.params.secondaryReflectWeight = 0.4;
        this.params.floorReflectance = 0.2;
        this.params.underwaterView = false;
        this.cameraPos.set(0, 1.5, 4);
        this.updateCameraTargetFromAngles(0, -0.35);
        break;

      case 'afterimage':
        this.params.fixationMode = true;
        this.params.underwaterView = false;
        this.cameraPos.set(0, 1.8, 3);
        this.updateCameraTargetFromAngles(0, -0.2);
        break;

      case 'twilight':
        this.params.sunElevation = 0.06;
        this.params.sunIntensity = 0.15;
        this.params.exposure = 2.2;
        this.params.fillIntensity = 0.4;
        this.params.moonIntensity = 0.25;
        this.params.candleIntensity = 0.6;
        this.params.complementStrength = 0.3;
        this.params.underwaterView = false;
        this.cameraPos.set(0, 1.2, 4);
        this.updateCameraTargetFromAngles(0, -0.2);
        break;

      case 'goethe-colourless-water':
        this.params.volumeSigma = 0.01;
        this.params.turbidity = 0.01;
        this.params.scatterTint = [1, 1, 1];
        this.params.absorptionModel = 'neutral';
        this.params.dispersion = 0.008;
        this.params.sunElevation = 0.7;
        this.params.waveAmplitude = 0.02;
        this.params.cubeDepth = -2.2;
        this.params.exposure = 1.2;
        this.params.underwaterView = false;
        this.lookAtCubeAbove();
        break;

      case 'diver-view':
        this.params.underwaterView = true;
        this.params.sunElevation = 0.85;
        this.params.absorptionModel = 'beer';
        this.params.turbidity = 0.1;
        this.params.volumeSigma = 0.08;
        this.params.fillIntensity = 0.4;
        this.params.complementStrength = 0.35;
        this.lookAtCubeUnderwater();
        break;

      case 'vessel-elevation':
        this.params.volumeSigma = 0.005;
        this.params.turbidity = 0.005;
        this.params.scatterTint = [1, 1, 1];
        this.params.cubeDepth = -1.5;
        this.params.underwaterView = false;
        this.lookAtCubeAbove();
        this.cameraPos.set(0, 3.2, 2.8);
        this.cameraTarget.set(0, this.params.cubeDepth, 0);
        break;

      case 'wave-contrast':
        this.params.underwaterView = false;
        this.params.sunElevation = 0.2;
        this.params.waveAmplitude = 0.12;
        this.params.interfaceRoughness = 0.02;
        this.params.complementStrength = 0.3;
        this.cameraPos.set(0, 0.5, 5);
        this.updateCameraTargetFromAngles(0, 0.1);
        break;

      case 'twilight-ocean':
        this.params.timeOfDay = 0.35;
        this.params.complementStrength = 0.35;
        this.applyTimeOfDay(0.35);
        this.params.underwaterView = false;
        this.cameraPos.set(0, 1.0, 5);
        this.updateCameraTargetFromAngles(0, -0.15);
        break;

      case 'sun-glitter':
        this.params.sunElevation = 0.05;
        this.params.waveAmplitude = 0.1;
        this.params.bloomStrength = 0.4;
        this.params.underwaterView = false;
        this.cameraPos.set(0, 0.8, 6);
        this.updateCameraTargetFromAngles(0, 0.05);
        break;
    }

    if (updateHash) {
      window.location.hash = `chapter=${id}`;
    }

    // Chapter presets often touch waveAmplitude; keep GPU components in sync for non-custom modes.
    this.syncWaveComponentsFromMacros();
    this.onChapterChanged?.(id, def.badge);
    this.markSceneChanged();
  }

  /**
   * Rebuild or scale waveComponents from legacy macro knobs according to wavePreset.
   * - multi-octave: full 4-octave rebuild (legacy fidelity)
   * - single-sine / standing: primary component amp/freq/speed from macros (dir/phase kept if present)
   * - custom: no-op (user owns the list)
   */
  syncWaveComponentsFromMacros(): void {
    const { waveAmplitude: amp, waveFrequency: freq, waveSpeed: spd, wavePreset } = this.params;
    if (wavePreset === 'custom') return;

    if (wavePreset === 'multi-octave') {
      this.params.waveComponents = buildMultiOctaveComponents(amp, freq, spd);
      return;
    }

    const standing = wavePreset === 'standing';
    const prev = this.params.waveComponents[0];
    const base = standing
      ? buildStandingComponent(amp, freq, spd)
      : buildSingleSineComponent(amp, freq, spd);
    if (prev) {
      base.directionDeg = prev.directionDeg;
      base.phase = prev.phase;
    }
    base.standing = standing;
    this.params.waveComponents = [base];
  }

  /** Apply a named preset, overwriting components (except custom, which only flips the label). */
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
      return;
    }
    if (preset === 'multi-octave') {
      this.params.waveComponents = buildMultiOctaveComponents(
        this.params.waveAmplitude,
        this.params.waveFrequency,
        this.params.waveSpeed,
      );
      return;
    }
    if (preset === 'single-sine') {
      this.params.waveComponents = [
        buildSingleSineComponent(
          this.params.waveAmplitude,
          this.params.waveFrequency,
          this.params.waveSpeed,
        ),
      ];
      return;
    }
    // standing
    this.params.waveComponents = [
      buildStandingComponent(
        this.params.waveAmplitude,
        this.params.waveFrequency,
        this.params.waveSpeed,
      ),
    ];
  }

  /** Mark components dirty → preset becomes custom (user edited a field). */
  markWaveComponentsCustom(): void {
    this.params.wavePreset = 'custom';
  }

  /** Clamp and ensure waveComponents length is in [1, MAX_WAVE_COMPONENTS]. */
  clampWaveComponents(): void {
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
    this.params.waveComponents = comps;
  }

  private packWaveUniforms(): void {
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
      waveAmplitude: { value: 0.08 },
      waveFrequency: { value: 0.5 },
      waveSpeed: { value: 0.6 },
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

  applyMouseLook(dx: number, dy: number): void {
    const sens = this.params.mouseSensitivity;
    const forward = new THREE.Vector3().subVectors(this.cameraTarget, this.cameraPos).normalize();
    let yaw = Math.atan2(forward.x, forward.z) - dx * sens;
    let pitch = Math.asin(THREE.MathUtils.clamp(forward.y, -0.99, 0.99)) - dy * sens;
    pitch = THREE.MathUtils.clamp(pitch, -1.45, 1.45);
    this.updateCameraTargetFromAngles(yaw, pitch);
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
  }

  /** North-star above-water frame: look down through interface at submerged cube. */
  lookAtCubeAbove(): void {
    const d = this.params.cubeDepth;
    this.cameraPos.set(0, 3.2, 5.0);
    this.cameraTarget.set(0, d, 0);
  }

  setUnderwaterView(underwater: boolean): void {
    if (this.params.underwaterView === underwater) return;
    this.params.underwaterView = underwater;
    if (underwater) this.lookAtCubeUnderwater();
    else this.lookAtCubeAbove();
    this.onCameraMoved?.();
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
    const anyWaveAmp = this.params.waveComponents.some((c) => Math.abs(c.amplitude) > 1e-5);
    const wavesMoving =
      this.params.timeScale > 1e-5 &&
      (anyWaveAmp || Math.abs(this.params.waveAmplitude) > 1e-5);
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
    u.waveAmplitude.value = this.params.waveAmplitude;
    u.waveFrequency.value = this.params.waveFrequency;
    u.waveSpeed.value = this.params.waveSpeed;
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
    const atBudget =
      !live && this.accumSampleCount >= this.params.maxAccumSamples && !this.needsReset;
    // LIVE: sample every display frame for real-time path-trace feel.
    // STILL: throttle by sampleFps until budget, then hold display.
    const shouldSample =
      !atBudget && (live || this.needsReset || now - this.lastSampleTime >= sampleInterval);

    if (shouldSample) {
      u.accumTexture.value = this.accumTargets[readIdx].texture;
      u.displayOnly.value = 0.0;
      if (live) u.resetAccum.value = 1.0;

      this.renderer.setRenderTarget(this.accumTargets[writeIdx]);
      this.renderer.render(this.scene, this.orthoCam);
      this.ping = writeIdx;
      this.lastSampleTime = now;

      if (!live) {
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
    const done = this.accumSampleCount >= this.params.maxAccumSamples ? ' DONE' : '';
    return `STILL accum ${this.accumSampleCount}/${this.params.maxAccumSamples} (${pct}%)${done} · ${w}×${h} · ${ch}`;
  }

  getGpuInfo(): string {
    return this.gpuInfo;
  }
}