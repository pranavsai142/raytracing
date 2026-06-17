import * as THREE from 'three';
import vertShader from './shaders/pathTracer.vert.glsl?raw';
import fragShader from './shaders/pathTracer.frag.glsl?raw';

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
  waveAmplitude: number;
  waveFrequency: number;
  waveSpeed: number;
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
  private sceneVersion = 0;

  preRender: ((dt: number) => void) | null = null;
  onCameraMoved: (() => void) | null = null;

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
    maxAccumSamples: 128,
    temporalBlend: 0.05,
    exposure: 1.35,
    vignetteStrength: 0.25,
    waveAmplitude: 0.08,
    waveFrequency: 0.5,
    waveSpeed: 0.6,
    timeScale: 0.15,
    animateWaves: true,
    cubeDepth: -2.2,
    cubeRotSpeedY: 0.004,
    cubeRotSpeedX: 0.002,
    fov: 55,
    moveSpeed: 1.2,
    moveAccel: 3.5,
    moveDamping: 6.0,
    mouseSensitivity: 0.0018,
    renderScale: 0.65,
    sampleFps: 20,
    underwaterView: true,
    autoOrbit: false,
  };

  cameraPos = new THREE.Vector3(0, -1.2, 3.5);
  cameraTarget = new THREE.Vector3(0, -1.8, 0);
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
  }

  setUserInteracting(active: boolean): void {
    this.userInteracting = active;
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
    this.sceneVersion++;
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
    const dir = new THREE.Vector3(
      Math.sin(yaw) * cp,
      Math.sin(pitch),
      Math.cos(yaw) * cp,
    );
    this.cameraTarget.copy(this.cameraPos).add(dir);
  }

  setUnderwaterView(underwater: boolean): void {
    if (this.params.underwaterView === underwater) return;
    this.params.underwaterView = underwater;
    if (underwater) {
      this.cameraPos.set(0, -1.2, 3.5);
      this.updateCameraTargetFromAngles(0, -0.15);
    } else {
      this.cameraPos.set(0, 2.5, 5);
      this.updateCameraTargetFromAngles(0, -0.3);
    }
    this.onCameraMoved?.();
    this.markSceneChanged();
  }

  private updateAutoOrbit(dt: number): void {
    if (!this.params.autoOrbit) return;
    this.orbitPhase += dt * 0.25;
    const radius = this.params.underwaterView ? 4.5 : 6;
    const y = this.params.underwaterView ? -1.2 + Math.sin(this.orbitPhase * 0.5) * 0.3 : 2.5;
    this.cameraPos.x = Math.sin(this.orbitPhase) * radius;
    this.cameraPos.z = Math.cos(this.orbitPhase) * radius;
    this.cameraPos.y = y;
    const yaw = this.orbitPhase + Math.PI;
    const pitch = this.params.underwaterView ? -0.12 : -0.28;
    this.updateCameraTargetFromAngles(yaw, pitch);
  }

  private advanceSimulation(dt: number): void {
    if (this.params.animateWaves) {
      this.simTime += dt * this.params.timeScale;
    }
    this.cubeRotY += this.params.cubeRotSpeedY;
    this.cubeRotX += this.params.cubeRotSpeedX;
  }

  private updateUniforms(): void {
    const u = this.material.uniforms;
    const sunX = Math.cos(this.params.sunAzimuth) * Math.cos(this.params.sunElevation);
    const sunY = Math.sin(this.params.sunElevation);
    const sunZ = Math.sin(this.params.sunAzimuth) * Math.cos(this.params.sunElevation);

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
    u.cubeDepth.value = this.params.cubeDepth;
    u.sunDir.value.set(sunX, sunY, sunZ);
    u.sunIntensity.value = this.params.sunIntensity;
    u.volumeSigma.value = this.params.volumeSigma;
    u.volumeG.value = this.params.volumeG;
    u.cubeRotY.value = this.cubeRotY;
    u.cubeRotX.value = this.cubeRotX;
  }

  render(): void {
    const now = performance.now();
    const dt = Math.min((now - (this.lastRenderTime || now)) / 1000, 0.05);
    this.lastRenderTime = now;

    this.preRender?.(dt);
    this.updateAutoOrbit(dt);
    this.advanceSimulation(dt);

    const camMoving = this.isCameraInMotion();

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
    const interacting = camMoving || !this.cameraSettled;
    u.cameraInteracting.value = interacting ? 1.0 : 0.0;
    u.resetAccum.value = interacting || this.needsReset ? 1.0 : 0.0;
    u.temporalBlend.value = interacting ? 1.0 : this.params.temporalBlend;

    this.updateUniforms();

    const readIdx = this.ping;
    const writeIdx = 1 - this.ping;
    const sampleInterval = 1000 / Math.max(1, this.params.sampleFps);
    const shouldSample =
      interacting || now - this.lastSampleTime >= sampleInterval;

    if (shouldSample) {
      u.accumTexture.value = interacting
        ? this.accumTargets[readIdx].texture
        : this.accumTargets[readIdx].texture;
      u.displayOnly.value = 0.0;
      if (interacting) u.resetAccum.value = 1.0;

      this.renderer.setRenderTarget(this.accumTargets[writeIdx]);
      this.renderer.render(this.scene, this.orthoCam);
      this.ping = writeIdx;
      this.lastSampleTime = now;

      if (!interacting) {
        this.accumSampleCount = Math.min(
          this.accumSampleCount + this.params.samplesPerFrame,
          this.params.maxAccumSamples,
        );
        this.needsReset = false;
      }
    }

    const displayIdx = shouldSample ? writeIdx : readIdx;
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
    const pct = Math.min(100, Math.round((this.accumSampleCount / this.params.maxAccumSamples) * 100));
    const { w, h } = this.renderSize();
    return `Samples ${this.accumSampleCount}/${this.params.maxAccumSamples} (${pct}%) · ${w}×${h} PT`;
  }

  getGpuInfo(): string {
    return this.gpuInfo;
  }
}