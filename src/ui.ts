import { CHAPTERS, WATER_PRESETS, type ChapterId } from './chapters';
import { PathTracer, type AbsorptionModel } from './PathTracer';

type NumKey = {
  [K in keyof PathTracer['params']]: PathTracer['params'][K] extends number ? K : never;
}[keyof PathTracer['params']];

export function setupUI(tracer: PathTracer): void {
  const bindSlider = (id: string, valId: string, key: NumKey, decimals = 2) => {
    const slider = document.getElementById(id) as HTMLInputElement | null;
    const valEl = document.getElementById(valId);
    if (!slider || !valEl) return;
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
  bindSlider('max-accum', 'max-accum-val', 'maxAccumSamples', 0);
  bindSlider('temporal-blend', 'temporal-blend-val', 'temporalBlend');
  bindSlider('render-scale', 'render-scale-val', 'renderScale');
  bindSlider('sample-fps', 'sample-fps-val', 'sampleFps', 0);
  bindSlider('max-bounces', 'max-bounces-val', 'maxBounces', 0);
  bindSlider('exposure', 'exposure-val', 'exposure');
  bindSlider('vignette', 'vignette-val', 'vignetteStrength');
  bindSlider('bloom', 'bloom-val', 'bloomStrength');
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
  bindSlider('move-damping', 'move-damping-val', 'moveDamping', 1);
  bindSlider('mouse-sens', 'mouse-sens-val', 'mouseSensitivity', 4);

  bindSlider('turbidity', 'turbidity-val', 'turbidity');
  bindSlider('medium-thickness', 'medium-thickness-val', 'mediumThickness');
  bindSlider('atmosphere-density', 'atmosphere-density-val', 'atmosphereDensity');
  bindSlider('fill-intensity', 'fill-intensity-val', 'fillIntensity');
  bindSlider('complement-strength', 'complement-strength-val', 'complementStrength');
  bindSlider('time-of-day', 'time-of-day-val', 'timeOfDay');
  bindSlider('opponent', 'opponent-val', 'opponentStrength');
  bindSlider('secondary-reflect', 'secondary-reflect-val', 'secondaryReflectWeight');
  bindSlider('floor-refl', 'floor-refl-val', 'floorReflectance');
  bindSlider('flame-edge', 'flame-edge-val', 'flameEdgeBoost');
  bindSlider('moon-elev', 'moon-elev-val', 'moonElevation');
  bindSlider('moon-az', 'moon-az-val', 'moonAzimuth');
  bindSlider('moon-int', 'moon-int-val', 'moonIntensity');
  bindSlider('candle-int', 'candle-int-val', 'candleIntensity');
  bindSlider('afterimage-decay', 'afterimage-decay-val', 'afterimageDecay', 3);

  const bindVec3 = (
    ids: [string, string, string],
    key: 'scatterTint' | 'volumeTint' | 'mediumTint' | 'fillTint' | 'fillDir' | 'sigmaLambda',
  ) => {
    const sync = () => {
      tracer.params[key] = [
        parseFloat((document.getElementById(ids[0]) as HTMLInputElement).value),
        parseFloat((document.getElementById(ids[1]) as HTMLInputElement).value),
        parseFloat((document.getElementById(ids[2]) as HTMLInputElement).value),
      ];
      tracer.markSceneChanged();
    };
    ids.forEach((id) => document.getElementById(id)?.addEventListener('input', sync));
  };

  bindVec3(['scatter-r', 'scatter-g', 'scatter-b'], 'scatterTint');
  bindVec3(['volume-tint-r', 'volume-tint-g', 'volume-tint-b'], 'volumeTint');
  bindVec3(['medium-tint-r', 'medium-tint-g', 'medium-tint-b'], 'mediumTint');
  bindVec3(['fill-tint-r', 'fill-tint-g', 'fill-tint-b'], 'fillTint');
  bindVec3(['fill-dir-x', 'fill-dir-y', 'fill-dir-z'], 'fillDir');
  bindVec3(['sigma-r', 'sigma-g', 'sigma-b'], 'sigmaLambda');

  const absorptionModel = document.getElementById('absorption-model') as HTMLSelectElement;
  absorptionModel?.addEventListener('change', () => {
    tracer.params.absorptionModel = absorptionModel.value as AbsorptionModel;
    tracer.markSceneChanged();
  });

  const animateWaves = document.getElementById('animate-waves') as HTMLInputElement;
  animateWaves?.addEventListener('change', () => {
    // Critical: freeze freezes waves AND cube so progressive path-trace can converge.
    // LIVE mode never blends history (avoids spotty ghost caustics).
    tracer.setAnimateScene(animateWaves.checked);
  });

  const physio = document.getElementById('physio-contrast') as HTMLInputElement;
  physio?.addEventListener('change', () => {
    tracer.params.physiologicalContrast = physio.checked;
    tracer.markSceneChanged();
  });

  const fixation = document.getElementById('fixation-mode') as HTMLInputElement;
  fixation?.addEventListener('change', () => {
    tracer.params.fixationMode = fixation.checked;
    tracer.markSceneChanged();
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
  const set = (id: string, val: number, valId?: string, decimals?: number) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return;
    el.value = String(val);
    if (valId) {
      const v = document.getElementById(valId);
      if (v) {
        v.textContent =
          decimals === 0 || decimals === undefined
            ? decimals === 0
              ? String(Math.round(val))
              : String(val)
            : val.toFixed(decimals);
      }
    }
  };
  const setVec = (ids: [string, string, string], arr: [number, number, number]) => {
    ids.forEach((id, i) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = String(arr[i]);
    });
  };

  const p = tracer.params;
  set('samples-per-frame', p.samplesPerFrame, 'samples-per-frame-val', 0);
  set('max-accum', p.maxAccumSamples, 'max-accum-val', 0);
  set('temporal-blend', p.temporalBlend, 'temporal-blend-val');
  set('render-scale', p.renderScale, 'render-scale-val');
  set('sample-fps', p.sampleFps, 'sample-fps-val', 0);
  set('max-bounces', p.maxBounces, 'max-bounces-val', 0);
  set('exposure', p.exposure, 'exposure-val');
  set('vignette', p.vignetteStrength, 'vignette-val');
  set('bloom', p.bloomStrength, 'bloom-val');
  set('ior', p.waterIOR, 'ior-val');
  set('roughness', p.interfaceRoughness, 'roughness-val');
  set('dispersion', p.dispersion, 'dispersion-val', 3);
  set('wave-amp', p.waveAmplitude, 'wave-amp-val', 3);
  set('wave-freq', p.waveFrequency, 'wave-freq-val');
  set('wave-spd', p.waveSpeed, 'wave-spd-val');
  set('time-scale', p.timeScale, 'time-scale-val');
  set('sun-elev', p.sunElevation, 'sun-elev-val');
  set('sun-az', p.sunAzimuth, 'sun-az-val');
  set('sun-int', p.sunIntensity, 'sun-int-val');
  set('volume-sigma', p.volumeSigma, 'volume-sigma-val', 3);
  set('volume-g', p.volumeG, 'volume-g-val');
  set('turbidity', p.turbidity, 'turbidity-val');
  set('complement-strength', p.complementStrength, 'complement-strength-val');
  set('medium-thickness', p.mediumThickness, 'medium-thickness-val');
  set('atmosphere-density', p.atmosphereDensity, 'atmosphere-density-val');
  set('fill-intensity', p.fillIntensity, 'fill-intensity-val');
  set('cube-depth', p.cubeDepth, 'cube-depth-val', 1);
  set('cube-spin-y', p.cubeRotSpeedY, 'cube-spin-y-val', 3);
  set('cube-spin-x', p.cubeRotSpeedX, 'cube-spin-x-val', 3);
  set('fov', p.fov, 'fov-val', 0);
  set('move-speed', p.moveSpeed, 'move-speed-val', 1);
  set('move-accel', p.moveAccel, 'move-accel-val', 1);
  set('move-damping', p.moveDamping, 'move-damping-val', 1);
  set('mouse-sens', p.mouseSensitivity, 'mouse-sens-val', 4);
  set('time-of-day', p.timeOfDay, 'time-of-day-val');
  set('opponent', p.opponentStrength, 'opponent-val');
  set('secondary-reflect', p.secondaryReflectWeight, 'secondary-reflect-val');
  set('floor-refl', p.floorReflectance, 'floor-refl-val');
  set('flame-edge', p.flameEdgeBoost, 'flame-edge-val');
  set('moon-elev', p.moonElevation, 'moon-elev-val');
  set('moon-az', p.moonAzimuth, 'moon-az-val');
  set('moon-int', p.moonIntensity, 'moon-int-val');
  set('candle-int', p.candleIntensity, 'candle-int-val');
  set('afterimage-decay', p.afterimageDecay, 'afterimage-decay-val', 3);

  setVec(['scatter-r', 'scatter-g', 'scatter-b'], p.scatterTint);
  setVec(['volume-tint-r', 'volume-tint-g', 'volume-tint-b'], p.volumeTint);
  setVec(['medium-tint-r', 'medium-tint-g', 'medium-tint-b'], p.mediumTint);
  setVec(['fill-tint-r', 'fill-tint-g', 'fill-tint-b'], p.fillTint);
  setVec(['fill-dir-x', 'fill-dir-y', 'fill-dir-z'], p.fillDir);
  setVec(['sigma-r', 'sigma-g', 'sigma-b'], p.sigmaLambda);

  const abs = document.getElementById('absorption-model') as HTMLSelectElement | null;
  if (abs) abs.value = p.absorptionModel;

  const animate = document.getElementById('animate-waves') as HTMLInputElement | null;
  if (animate) animate.checked = p.animateWaves;

  const physio = document.getElementById('physio-contrast') as HTMLInputElement | null;
  if (physio) physio.checked = p.physiologicalContrast;

  const fixation = document.getElementById('fixation-mode') as HTMLInputElement | null;
  if (fixation) fixation.checked = p.fixationMode;

  const btnOrbit = document.getElementById('auto-orbit');
  if (btnOrbit) {
    btnOrbit.textContent = `Auto Orbit: ${p.autoOrbit ? 'ON' : 'OFF'}`;
    btnOrbit.classList.toggle('active', p.autoOrbit);
  }

  const btnAbove = document.getElementById('view-above');
  const btnBelow = document.getElementById('view-below');
  btnAbove?.classList.toggle('active', !p.underwaterView);
  btnBelow?.classList.toggle('active', p.underwaterView);
}

function exportImage(tracer: PathTracer): void {
  const link = document.createElement('a');
  link.download = `goethe-${tracer.params.activeChapter}-${Date.now()}.png`;
  link.href = tracer.exportPNG();
  link.click();
}
