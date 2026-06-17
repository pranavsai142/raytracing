import { PathTracer } from './PathTracer';

type NumKey = {
  [K in keyof PathTracer['params']]: PathTracer['params'][K] extends number ? K : never;
}[keyof PathTracer['params']];

export function setupUI(tracer: PathTracer): void {
  const bindSlider = (id: string, valId: string, key: NumKey, decimals = 2) => {
    const slider = document.getElementById(id) as HTMLInputElement;
    const valEl = document.getElementById(valId)!;
    const fmt = (v: string) => (decimals === 0 ? v : parseFloat(v).toFixed(decimals));
    slider.addEventListener('input', () => {
      (tracer.params[key] as number) = parseFloat(slider.value);
      valEl.textContent = fmt(slider.value);
      if (key === 'renderScale') tracer.applyRenderScale();
      else tracer.markSceneChanged();
    });
    valEl.textContent = fmt(slider.value);
  };

  bindSlider('samples-per-frame', 'samples-per-frame-val', 'samplesPerFrame', 0);
  bindSlider('temporal-blend', 'temporal-blend-val', 'temporalBlend');
  bindSlider('render-scale', 'render-scale-val', 'renderScale');
  bindSlider('sample-fps', 'sample-fps-val', 'sampleFps', 0);
  bindSlider('max-bounces', 'max-bounces-val', 'maxBounces', 0);
  bindSlider('exposure', 'exposure-val', 'exposure');
  bindSlider('vignette', 'vignette-val', 'vignetteStrength');
  bindSlider('ior', 'ior-val', 'waterIOR');
  bindSlider('roughness', 'roughness-val', 'interfaceRoughness');
  bindSlider('dispersion', 'dispersion-val', 'dispersion', 3);
  bindSlider('wave-amp', 'wave-amp-val', 'waveAmplitude', 3);
  bindSlider('wave-freq', 'wave-freq-val', 'waveFrequency');
  bindSlider('wave-spd', 'wave-spd-val', 'waveSpeed');
  bindSlider('time-scale', 'time-scale-val', 'timeScale');
  bindSlider('sun-elev', 'sun-elev-val', 'sunElevation');
  bindSlider('sun-az', 'sun-az-val', 'sunAzimuth');
  bindSlider('sun-int', 'sun-int-val', 'sunIntensity');
  bindSlider('volume-sigma', 'volume-sigma-val', 'volumeSigma', 3);
  bindSlider('volume-g', 'volume-g-val', 'volumeG');
  bindSlider('cube-depth', 'cube-depth-val', 'cubeDepth', 1);
  bindSlider('cube-spin-y', 'cube-spin-y-val', 'cubeRotSpeedY', 3);
  bindSlider('cube-spin-x', 'cube-spin-x-val', 'cubeRotSpeedX', 3);
  bindSlider('fov', 'fov-val', 'fov', 0);
  bindSlider('move-speed', 'move-speed-val', 'moveSpeed', 1);
  bindSlider('move-accel', 'move-accel-val', 'moveAccel', 1);
  bindSlider('mouse-sens', 'mouse-sens-val', 'mouseSensitivity', 4);

  const animateWaves = document.getElementById('animate-waves') as HTMLInputElement;
  animateWaves.addEventListener('change', () => {
    tracer.params.animateWaves = animateWaves.checked;
  });

  const btnAbove = document.getElementById('view-above')!;
  const btnBelow = document.getElementById('view-below')!;
  const btnOrbit = document.getElementById('auto-orbit')!;
  const btnReset = document.getElementById('reset-accum')!;
  const btnExport = document.getElementById('export-png')!;
  const stats = document.getElementById('stats')!;

  const setView = (underwater: boolean) => {
    tracer.setUnderwaterView(underwater);
    btnAbove.classList.toggle('active', !underwater);
    btnBelow.classList.toggle('active', underwater);
  };

  btnAbove.addEventListener('click', () => setView(false));
  btnBelow.addEventListener('click', () => setView(true));

  btnOrbit.addEventListener('click', () => {
    tracer.params.autoOrbit = !tracer.params.autoOrbit;
    btnOrbit.textContent = `Auto Orbit: ${tracer.params.autoOrbit ? 'ON' : 'OFF'}`;
    btnOrbit.classList.toggle('active', tracer.params.autoOrbit);
    tracer.markSceneChanged();
  });

  btnReset.addEventListener('click', () => tracer.markSceneChanged());
  btnExport.addEventListener('click', () => exportImage(tracer));

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === '1') setView(false);
    if (e.key === '2') setView(true);
    if (e.key === 'o' || e.key === 'O') btnOrbit.click();
    if (e.key === 'r' || e.key === 'R') tracer.markSceneChanged();
    if (e.key === 'x' || e.key === 'X') exportImage(tracer);
  });

  window.addEventListener('resize', () => tracer.resize());

  const refreshStats = () => {
    stats.textContent = `${tracer.getStats()} · ${tracer.getGpuInfo()}`;
  };
  refreshStats();
  setInterval(refreshStats, 400);
}

function exportImage(tracer: PathTracer): void {
  const link = document.createElement('a');
  link.download = `oceanscape-${Date.now()}.png`;
  link.href = tracer.exportPNG();
  link.click();
}