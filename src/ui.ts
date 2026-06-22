import { CHAPTERS, WATER_PRESETS, type ChapterId } from './chapters';
import { PathTracer, type AbsorptionModel } from './PathTracer';

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

  bindSlider('turbidity', 'turbidity-val', 'turbidity');
  bindSlider('medium-thickness', 'medium-thickness-val', 'mediumThickness');
  bindSlider('atmosphere-density', 'atmosphere-density-val', 'atmosphereDensity');
  bindSlider('fill-intensity', 'fill-intensity-val', 'fillIntensity');
  bindSlider('complement-strength', 'complement-strength-val', 'complementStrength');
  bindSlider('time-of-day', 'time-of-day-val', 'timeOfDay');

  const scatterR = document.getElementById('scatter-r') as HTMLInputElement;
  const scatterG = document.getElementById('scatter-g') as HTMLInputElement;
  const scatterB = document.getElementById('scatter-b') as HTMLInputElement;
  const syncScatter = () => {
    tracer.params.scatterTint = [
      parseFloat(scatterR.value),
      parseFloat(scatterG.value),
      parseFloat(scatterB.value),
    ];
    tracer.markSceneChanged();
  };
  scatterR?.addEventListener('input', syncScatter);
  scatterG?.addEventListener('input', syncScatter);
  scatterB?.addEventListener('input', syncScatter);

  const bindTint = (rId: string, gId: string, bId: string, key: 'volumeTint') => {
    const sync = () => {
      tracer.params[key] = [
        parseFloat((document.getElementById(rId) as HTMLInputElement).value),
        parseFloat((document.getElementById(gId) as HTMLInputElement).value),
        parseFloat((document.getElementById(bId) as HTMLInputElement).value),
      ];
      tracer.markSceneChanged();
    };
    [rId, gId, bId].forEach((id) => document.getElementById(id)?.addEventListener('input', sync));
  };
  bindTint('volume-tint-r', 'volume-tint-g', 'volume-tint-b', 'volumeTint');

  const absorptionModel = document.getElementById('absorption-model') as HTMLSelectElement;
  absorptionModel?.addEventListener('change', () => {
    tracer.params.absorptionModel = absorptionModel.value as AbsorptionModel;
    tracer.markSceneChanged();
  });

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
  const badge = document.getElementById('chapter-badge')!;
  const caption = document.getElementById('chapter-caption')!;

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

  const loadChapter = (id: ChapterId) => {
    tracer.applyChapterPreset(id);
    document.querySelectorAll('[data-chapter]').forEach((el) => {
      el.classList.toggle('active', (el as HTMLElement).dataset.chapter === id);
    });
    syncSlidersFromTracer(tracer);
  };

  tracer.onChapterChanged = (id, badgeType) => {
    const def = [...CHAPTERS, ...WATER_PRESETS].find((c) => c.id === id);
    badge.textContent = badgeType;
    badge.className = `chapter-badge badge-${badgeType.replace(/[^A-Z]/gi, '').toLowerCase()}`;
    if (def) caption.textContent = `${def.section} — ${def.quote}`;
  };

  document.querySelectorAll('[data-chapter]').forEach((el) => {
    el.addEventListener('click', () => loadChapter((el as HTMLElement).dataset.chapter as ChapterId));
  });

  const timeOfDaySlider = document.getElementById('time-of-day') as HTMLInputElement;
  timeOfDaySlider?.addEventListener('input', () => {
    tracer.applyTimeOfDay(parseFloat(timeOfDaySlider.value));
    tracer.markSceneChanged();
  });

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.key === 'o' || e.key === 'O') btnOrbit.click();
    if (e.key === 'r' || e.key === 'R') tracer.markSceneChanged();
    if (e.key === 'x' || e.key === 'X') exportImage(tracer);
    CHAPTERS.forEach((ch) => {
      if (ch.keys && e.key === ch.keys) loadChapter(ch.id);
    });
  });

  window.addEventListener('resize', () => tracer.resize());

  const refreshStats = () => {
    stats.textContent = `${tracer.getStats()} · ${tracer.getGpuInfo()}`;
  };
  refreshStats();
  setInterval(refreshStats, 400);

  tracer.onChapterChanged(tracer.params.activeChapter, tracer.getChapterBadge());
}

function syncSlidersFromTracer(tracer: PathTracer): void {
  const set = (id: string, val: number, valId?: string) => {
    const el = document.getElementById(id) as HTMLInputElement;
    if (el) {
      el.value = String(val);
      if (valId) {
        const v = document.getElementById(valId);
        if (v) v.textContent = String(val);
      }
    }
  };
  const p = tracer.params;
  set('sun-elev', p.sunElevation, 'sun-elev-val');
  set('sun-int', p.sunIntensity, 'sun-int-val');
  set('volume-sigma', p.volumeSigma, 'volume-sigma-val');
  set('dispersion', p.dispersion, 'dispersion-val');
  set('wave-amp', p.waveAmplitude, 'wave-amp-val');
  set('exposure', p.exposure, 'exposure-val');
  set('turbidity', p.turbidity, 'turbidity-val');
  set('complement-strength', p.complementStrength, 'complement-strength-val');
  set('medium-thickness', p.mediumThickness, 'medium-thickness-val');
  set('atmosphere-density', p.atmosphereDensity, 'atmosphere-density-val');
  set('fill-intensity', p.fillIntensity, 'fill-intensity-val');
  set('cube-depth', p.cubeDepth, 'cube-depth-val');
  set('max-bounces', p.maxBounces, 'max-bounces-val');
  const abs = document.getElementById('absorption-model') as HTMLSelectElement;
  if (abs) abs.value = p.absorptionModel;
}

function exportImage(tracer: PathTracer): void {
  const link = document.createElement('a');
  link.download = `goethe-${tracer.params.activeChapter}-${Date.now()}.png`;
  link.href = tracer.exportPNG();
  link.click();
}