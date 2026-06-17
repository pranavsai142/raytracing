import * as THREE from 'three';
import vertShader from './shaders/pathTracer.vert.glsl?raw';
import fragShader from './shaders/pathTracer.frag.glsl?raw';

export interface SimParams {
  waterIOR: number;
  interfaceRoughness: number;
  sunElevation: number;
  sunAzimuth: number;
  sunIntensity: number;
  volumeSigma: number;
  volumeG: number;
  samplesPerPixel: number;
  underwaterView: boolean;
  autoOrbit: boolean;
  cubeRotY: number;
  cubeRotX: number;
}

export class PathTracer {
  private renderer: THREE.WebGLRenderer;
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;
  private accumTarget: THREE.WebGLRenderTarget;
  private frame = 0;
  private needsReset = true;
  private startTime = performance.now();

  params: SimParams = {
    waterIOR: 1.33,
    interfaceRoughness: 0.15,
    sunElevation: 0.8,
    sunAzimuth: 0.4,
    sunIntensity: 1.2,
    volumeSigma: 0.06,
    volumeG: 0.55,
    samplesPerPixel: 2,
    underwaterView: true,
    autoOrbit: true,
    cubeRotY: 0,
    cubeRotX: 0,
  };

  cameraPos = new THREE.Vector3(0, -1.5, 4);
  cameraTarget = new THREE.Vector3(0, -2, 0);
  cameraUp = new THREE.Vector3(0, 1, 0);
  fov = 55;
  orbitPhase = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.resize();

    this.accumTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });

    this.material = new THREE.ShaderMaterial({
      vertexShader: vertShader,
      fragmentShader: fragShader,
      uniforms: {
        resolution: { value: new THREE.Vector2() },
        time: { value: 0 },
        frame: { value: 0 },
        samplesPerPixel: { value: 2 },
        cameraPos: { value: new THREE.Vector3() },
        cameraTarget: { value: new THREE.Vector3() },
        cameraUp: { value: new THREE.Vector3() },
        fov: { value: 55 },
        waterIOR: { value: 1.33 },
        interfaceRoughness: { value: 0.15 },
        sunDir: { value: new THREE.Vector3() },
        sunIntensity: { value: 1.2 },
        volumeSigma: { value: 0.06 },
        volumeG: { value: 0.55 },
        cubeRotY: { value: 0 },
        cubeRotX: { value: 0 },
        accumTexture: { value: null },
        resetAccum: { value: true },
      },
    });

    const geo = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;

    const scene = new THREE.Scene();
    scene.add(this.mesh);
    this.scene = scene;
  }

  private scene: THREE.Scene;

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.accumTarget.setSize(w, h);
    this.material?.uniforms.resolution?.value.set(w, h);
    this.resetAccum();
  }

  resetAccum(): void {
    this.frame = 0;
    this.needsReset = true;
  }

  setUnderwaterView(underwater: boolean): void {
    if (this.params.underwaterView !== underwater) {
      this.params.underwaterView = underwater;
      if (underwater) {
        this.cameraPos.set(0, -1.5, 4);
        this.cameraTarget.set(0, -2, 0);
        this.cameraUp.set(0, 1, 0);
      } else {
        this.cameraPos.set(0, 3, 6);
        this.cameraTarget.set(0, -1, 0);
        this.cameraUp.set(0, 1, 0);
      }
      this.resetAccum();
    }
  }

  updateCamera(): void {
    if (this.params.autoOrbit) {
      this.orbitPhase += 0.003;
      const radius = this.params.underwaterView ? 5 : 7;
      const y = this.params.underwaterView ? -1.5 + Math.sin(this.orbitPhase * 0.5) * 0.5 : 3;
      this.cameraPos.x = Math.sin(this.orbitPhase) * radius;
      this.cameraPos.z = Math.cos(this.orbitPhase) * radius;
      this.cameraPos.y = y;
      this.cameraTarget.set(0, this.params.underwaterView ? -2 : -1, 0);
      this.resetAccum();
    }
  }

  private updateUniforms(): void {
    const u = this.material.uniforms;
    const elapsed = (performance.now() - this.startTime) / 1000;

    this.params.cubeRotY += 0.01;
    this.params.cubeRotX += 0.007;

    const sunX = Math.cos(this.params.sunAzimuth) * Math.cos(this.params.sunElevation);
    const sunY = Math.sin(this.params.sunElevation);
    const sunZ = Math.sin(this.params.sunAzimuth) * Math.cos(this.params.sunElevation);

    u.time.value = elapsed;
    u.frame.value = this.frame;
    u.samplesPerPixel.value = this.params.samplesPerPixel;
    u.cameraPos.value.copy(this.cameraPos);
    u.cameraTarget.value.copy(this.cameraTarget);
    u.cameraUp.value.copy(this.cameraUp);
    u.fov.value = this.fov;
    u.waterIOR.value = this.params.waterIOR;
    u.interfaceRoughness.value = this.params.interfaceRoughness;
    u.sunDir.value.set(sunX, sunY, sunZ);
    u.sunIntensity.value = this.params.sunIntensity;
    u.volumeSigma.value = this.params.volumeSigma;
    u.volumeG.value = this.params.volumeG;
    u.cubeRotY.value = this.params.cubeRotY;
    u.cubeRotX.value = this.params.cubeRotX;
    u.accumTexture.value = this.accumTarget.texture;
    u.resetAccum.value = this.needsReset;
  }

  render(): void {
    this.updateCamera();
    this.updateUniforms();

    this.renderer.setRenderTarget(this.accumTarget);
    this.renderer.render(this.scene, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));

    this.renderer.setRenderTarget(null);
    this.material.uniforms.accumTexture.value = this.accumTarget.texture;
    this.material.uniforms.resetAccum.value = false;
    this.renderer.render(this.scene, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));

    this.frame++;
    this.needsReset = false;
  }

  exportPNG(): string {
    const w = this.renderer.domElement.width;
    const h = this.renderer.domElement.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(this.renderer.domElement, 0, 0);
    return canvas.toDataURL('image/png');
  }

  getStats(): string {
    const elapsed = ((performance.now() - this.startTime) / 1000).toFixed(1);
    return `Frame ${this.frame} · ${this.params.samplesPerPixel} spp · ${elapsed}s · IOR ${this.params.waterIOR.toFixed(2)}`;
  }
}