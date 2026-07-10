import { CHAPTERS, WATER_PRESETS, type ChapterId } from './chapters';
import {
  PathTracer,
  MAX_WAVE_COMPONENTS,
  WAVE_AMP_MAX,
  cloneWaveComponent,
  type AbsorptionModel,
  type FloorPresetName,
  type WaveComponent,
  type WavePreset,
} from './PathTracer';
import type { FlyGate } from './flyBasis';

type NumKey = {
  [K in keyof PathTracer['params']]: PathTracer['params'][K] extends number ? K : never;
}[keyof PathTracer['params']];

/** Selected component index for the Wave Advanced editor. */
let selectedWaveCompIndex = 0;

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
  // Wave macros: custom handlers so multi-octave / single / standing rebuild components
  bindWaveMacroSlider(tracer, 'wave-amp', 'wave-amp-val', 'waveAmplitude', 3);
  bindWaveMacroSlider(tracer, 'wave-freq', 'wave-freq-val', 'waveFrequency', 2);
  bindWaveMacroSlider(tracer, 'wave-spd', 'wave-spd-val', 'waveSpeed', 2);
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
  bindSlider('floor-height', 'floor-height-val', 'floorHeight', 1);
  bindSlider('floor-alb-scale', 'floor-alb-scale-val', 'floorAlbedoScale');
  bindSlider('floor-bump-amp', 'floor-bump-amp-val', 'floorBumpAmp');
  bindSlider('floor-bump-freq', 'floor-bump-freq-val', 'floorBumpFreq', 1);
  bindSlider('floor-bump-octaves', 'floor-bump-octaves-val', 'floorBumpOctaves', 0);
  bindSlider('floor-rough', 'floor-rough-val', 'floorRoughness');
  bindSlider('floor-spec', 'floor-spec-val', 'floorSpecular');
  bindSlider('floor-checker', 'floor-checker-val', 'floorCheckerScale', 1);
  bindSlider('flame-edge', 'flame-edge-val', 'flameEdgeBoost');
  bindSlider('moon-elev', 'moon-elev-val', 'moonElevation');
  bindSlider('moon-az', 'moon-az-val', 'moonAzimuth');
  bindSlider('moon-int', 'moon-int-val', 'moonIntensity');
  bindSlider('candle-int', 'candle-int-val', 'candleIntensity');
  bindSlider('afterimage-decay', 'afterimage-decay-val', 'afterimageDecay', 3);

  setupWaveAdvancedUI(tracer);

  const bindVec3 = (
    ids: [string, string, string],
    key: 'scatterTint' | 'volumeTint' | 'mediumTint' | 'fillTint' | 'fillDir' | 'sigmaLambda' | 'floorAlbedoColor',
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
  bindVec3(['floor-alb-r', 'floor-alb-g', 'floor-alb-b'], 'floorAlbedoColor');

  const floorPattern = document.getElementById('floor-pattern') as HTMLSelectElement;
  floorPattern?.addEventListener('change', () => {
    tracer.params.floorPattern = parseInt(floorPattern.value, 10);
    tracer.markSceneChanged();
  });

  const floorMaterial = document.getElementById('floor-material') as HTMLSelectElement;
  floorMaterial?.addEventListener('change', () => {
    tracer.params.floorMaterial = parseInt(floorMaterial.value, 10);
    tracer.markSceneChanged();
  });

  const absorptionModel = document.getElementById('absorption-model') as HTMLSelectElement;
  absorptionModel?.addEventListener('change', () => {
    tracer.params.absorptionModel = absorptionModel.value as AbsorptionModel;
    tracer.markSceneChanged();
  });

  const animateWaves = document.getElementById('animate-waves') as HTMLInputElement;
  const legendAnimate = document.getElementById('legend-animate') as HTMLInputElement | null;
  const onAnimateChange = (on: boolean) => {
    // Critical: freeze freezes waves AND cube so progressive path-trace can converge.
    // LIVE mode never blends history (avoids spotty ghost caustics).
    tracer.setAnimateScene(on);
    if (animateWaves) animateWaves.checked = on;
    if (legendAnimate) legendAnimate.checked = on;
    syncAutoOrbitButton(tracer);
    const modeEl = document.getElementById('legend-mode');
    if (modeEl) {
      modeEl.textContent = on ? 'LIVE path-trace' : 'STILL accumulate';
    }
  };
  animateWaves?.addEventListener('change', () => onAnimateChange(animateWaves.checked));
  legendAnimate?.addEventListener('change', () => onAnimateChange(legendAnimate.checked));

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

  const floorEnabled = document.getElementById('floor-enabled') as HTMLInputElement;
  floorEnabled?.addEventListener('change', () => {
    tracer.params.floorEnabled = floorEnabled.checked;
    tracer.markSceneChanged();
  });

  document.querySelectorAll('[data-floor-preset]').forEach((el) => {
    el.addEventListener('click', () => {
      const name = (el as HTMLElement).dataset.floorPreset as FloorPresetName;
      if (!name) return;
      tracer.applyFloorPreset(name);
      document.querySelectorAll('[data-floor-preset]').forEach((b) => {
        b.classList.toggle('active', (b as HTMLElement).dataset.floorPreset === name);
      });
      applyParamsToUI(tracer);
    });
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
    // Orbit only advances in LIVE mode — enabling Auto Orbit turns Animate ON so state matches.
    if (tracer.params.autoOrbit && !tracer.params.animateWaves) {
      tracer.setAnimateScene(true);
      if (animateWaves) animateWaves.checked = true;
    }
    syncAutoOrbitButton(tracer);
    tracer.markSceneChanged();
  });

  btnReset.addEventListener('click', () => tracer.markSceneChanged());
  btnExport.addEventListener('click', () => exportImage(tracer));

  const loadChapter = (id: ChapterId) => {
    tracer.applyChapterPreset(id);
    document.querySelectorAll('[data-chapter]').forEach((el) => {
      el.classList.toggle('active', (el as HTMLElement).dataset.chapter === id);
    });
    applyParamsToUI(tracer);
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
  applyParamsToUI(tracer);
}

function bindWaveMacroSlider(
  tracer: PathTracer,
  id: string,
  valId: string,
  key: 'waveAmplitude' | 'waveFrequency' | 'waveSpeed',
  decimals: number,
): void {
  const slider = document.getElementById(id) as HTMLInputElement | null;
  const valEl = document.getElementById(valId);
  if (!slider || !valEl) return;
  const fmt = (v: number) => v.toFixed(decimals);
  slider.addEventListener('input', () => {
    let v = parseFloat(slider.value);
    if (key === 'waveAmplitude') {
      v = Math.min(WAVE_AMP_MAX, Math.max(0, v));
      slider.value = String(v);
    }
    tracer.params[key] = v;
    valEl.textContent = fmt(v);
    tracer.syncWaveComponentsFromMacros();
    // Keep amp/slope budgets even when macros do not rebuild (custom / named static).
    tracer.sanitizeWaves();
    syncWaveAdvancedUI(tracer);
    // Macro amp/freq/spd labels may change when named preset re-selected; keep macros in UI
    applyWaveMacroLabels(tracer);
    tracer.markSceneChanged();
  });
  valEl.textContent = fmt(parseFloat(slider.value));
}

/** Sync only the three wave macro sliders/labels from params. */
function applyWaveMacroLabels(tracer: PathTracer): void {
  const set = (id: string, val: number, valId: string, decimals: number) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.value = String(val);
    const v = document.getElementById(valId);
    if (v) v.textContent = val.toFixed(decimals);
  };
  const p = tracer.params;
  set('wave-amp', p.waveAmplitude, 'wave-amp-val', 3);
  set('wave-freq', p.waveFrequency, 'wave-freq-val', 2);
  set('wave-spd', p.waveSpeed, 'wave-spd-val', 2);
}

function setupWaveAdvancedUI(tracer: PathTracer): void {
  const presetEl = document.getElementById('wave-preset') as HTMLSelectElement | null;
  const indexEl = document.getElementById('wave-comp-index') as HTMLSelectElement | null;
  const ampEl = document.getElementById('wave-comp-amp') as HTMLInputElement | null;
  const freqEl = document.getElementById('wave-comp-freq') as HTMLInputElement | null;
  const spdEl = document.getElementById('wave-comp-spd') as HTMLInputElement | null;
  const dirEl = document.getElementById('wave-comp-dir') as HTMLInputElement | null;
  const phaseEl = document.getElementById('wave-comp-phase') as HTMLInputElement | null;
  const standingEl = document.getElementById('wave-comp-standing') as HTMLInputElement | null;
  const addBtn = document.getElementById('wave-comp-add') as HTMLButtonElement | null;
  const removeBtn = document.getElementById('wave-comp-remove') as HTMLButtonElement | null;

  if (!presetEl || !indexEl || !ampEl || !freqEl || !spdEl || !dirEl || !phaseEl || !standingEl) {
    return;
  }

  const readSelected = (): WaveComponent | null => {
    const comps = tracer.params.waveComponents;
    if (comps.length === 0) return null;
    selectedWaveCompIndex = Math.max(0, Math.min(selectedWaveCompIndex, comps.length - 1));
    return comps[selectedWaveCompIndex];
  };

  const writeField = (mutator: (c: WaveComponent) => void) => {
    const c = readSelected();
    if (!c) return;
    mutator(c);
    tracer.markWaveComponentsCustom();
    tracer.sanitizeWaves();
    syncWaveAdvancedUI(tracer);
    tracer.markSceneChanged();
  };

  const setVal = (valId: string, text: string) => {
    const el = document.getElementById(valId);
    if (el) el.textContent = text;
  };

  presetEl.addEventListener('change', () => {
    tracer.setWavePreset(presetEl.value as WavePreset);
    selectedWaveCompIndex = 0;
    applyWaveMacroLabels(tracer);
    syncWaveAdvancedUI(tracer);
    tracer.markSceneChanged();
  });

  indexEl.addEventListener('change', () => {
    selectedWaveCompIndex = parseInt(indexEl.value, 10) || 0;
    syncWaveAdvancedUI(tracer);
  });

  ampEl.addEventListener('input', () => {
    const v = parseFloat(ampEl.value);
    setVal('wave-comp-amp-val', v.toFixed(3));
    writeField((c) => {
      c.amplitude = v;
    });
  });
  freqEl.addEventListener('input', () => {
    const v = parseFloat(freqEl.value);
    setVal('wave-comp-freq-val', v.toFixed(2));
    writeField((c) => {
      c.frequency = v;
    });
  });
  spdEl.addEventListener('input', () => {
    const v = parseFloat(spdEl.value);
    setVal('wave-comp-spd-val', v.toFixed(2));
    writeField((c) => {
      c.speed = v;
    });
  });
  dirEl.addEventListener('input', () => {
    const v = parseFloat(dirEl.value);
    setVal('wave-comp-dir-val', String(Math.round(v)));
    writeField((c) => {
      c.directionDeg = v;
    });
  });
  phaseEl.addEventListener('input', () => {
    const v = parseFloat(phaseEl.value);
    setVal('wave-comp-phase-val', v.toFixed(2));
    writeField((c) => {
      c.phase = v;
    });
  });
  standingEl.addEventListener('change', () => {
    writeField((c) => {
      c.standing = standingEl.checked;
    });
  });

  addBtn?.addEventListener('click', () => {
    tracer.sanitizeWaves();
    const comps = tracer.params.waveComponents;
    if (comps.length >= MAX_WAVE_COMPONENTS) return;
    const last = comps[comps.length - 1];
    const next = cloneWaveComponent(last);
    // Slightly vary so new component is visible
    next.directionDeg = (next.directionDeg + 47) % 360;
    next.amplitude *= 0.6;
    next.frequency *= 1.4;
    comps.push(next);
    tracer.markWaveComponentsCustom();
    tracer.sanitizeWaves();
    selectedWaveCompIndex = comps.length - 1;
    syncWaveAdvancedUI(tracer);
    tracer.markSceneChanged();
  });

  removeBtn?.addEventListener('click', () => {
    tracer.sanitizeWaves();
    const comps = tracer.params.waveComponents;
    if (comps.length <= 1) return;
    comps.splice(selectedWaveCompIndex, 1);
    selectedWaveCompIndex = Math.min(selectedWaveCompIndex, comps.length - 1);
    tracer.markWaveComponentsCustom();
    tracer.sanitizeWaves();
    syncWaveAdvancedUI(tracer);
    tracer.markSceneChanged();
  });

  syncWaveAdvancedUI(tracer);
}

/** Refresh Wave Advanced controls from tracer.params. */
function syncWaveAdvancedUI(tracer: PathTracer): void {
  const presetEl = document.getElementById('wave-preset') as HTMLSelectElement | null;
  const indexEl = document.getElementById('wave-comp-index') as HTMLSelectElement | null;
  const ampEl = document.getElementById('wave-comp-amp') as HTMLInputElement | null;
  const freqEl = document.getElementById('wave-comp-freq') as HTMLInputElement | null;
  const spdEl = document.getElementById('wave-comp-spd') as HTMLInputElement | null;
  const dirEl = document.getElementById('wave-comp-dir') as HTMLInputElement | null;
  const phaseEl = document.getElementById('wave-comp-phase') as HTMLInputElement | null;
  const standingEl = document.getElementById('wave-comp-standing') as HTMLInputElement | null;
  const addBtn = document.getElementById('wave-comp-add') as HTMLButtonElement | null;
  const removeBtn = document.getElementById('wave-comp-remove') as HTMLButtonElement | null;

  if (!presetEl || !indexEl || !ampEl || !freqEl || !spdEl || !dirEl || !phaseEl || !standingEl) {
    return;
  }

  tracer.sanitizeWaves();
  const comps = tracer.params.waveComponents;
  selectedWaveCompIndex = Math.max(0, Math.min(selectedWaveCompIndex, comps.length - 1));

  presetEl.value = tracer.params.wavePreset;

  // Rebuild index options
  indexEl.innerHTML = '';
  for (let i = 0; i < comps.length; i++) {
    const opt = document.createElement('option');
    opt.value = String(i);
    const tag = comps[i].standing ? 'stand' : 'travel';
    opt.textContent = `${i} (${tag})`;
    indexEl.appendChild(opt);
  }
  indexEl.value = String(selectedWaveCompIndex);

  const c = comps[selectedWaveCompIndex];
  ampEl.value = String(c.amplitude);
  freqEl.value = String(c.frequency);
  spdEl.value = String(c.speed);
  // Normalize direction display to [0, 360)
  let dir = c.directionDeg % 360;
  if (dir < 0) dir += 360;
  dirEl.value = String(dir);
  phaseEl.value = String(c.phase);
  standingEl.checked = c.standing;

  const setText = (id: string, t: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t;
  };
  setText('wave-comp-amp-val', c.amplitude.toFixed(3));
  setText('wave-comp-freq-val', c.frequency.toFixed(2));
  setText('wave-comp-spd-val', c.speed.toFixed(2));
  setText('wave-comp-dir-val', String(Math.round(dir)));
  setText('wave-comp-phase-val', c.phase.toFixed(2));

  if (addBtn) addBtn.disabled = comps.length >= MAX_WAVE_COMPONENTS;
  if (removeBtn) removeBtn.disabled = comps.length <= 1;
}

/** Sync Auto Orbit button text/class from `tracer.params.autoOrbit`. */
export function syncAutoOrbitButton(tracer: PathTracer): void {
  const btnOrbit = document.getElementById('auto-orbit');
  if (!btnOrbit) return;
  btnOrbit.textContent = `Auto Orbit: ${tracer.params.autoOrbit ? 'ON' : 'OFF'}`;
  btnOrbit.classList.toggle('active', tracer.params.autoOrbit);
}

/** Alias for main.ts freeze / setAnimateScene API paths. */
export const syncOrbitUI = syncAutoOrbitButton;

/** Full UI resync from tracer.params (chapter load / external API). */
export function applyParamsToUI(tracer: PathTracer): void {
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
  set('floor-height', p.floorHeight, 'floor-height-val', 1);
  set('floor-alb-scale', p.floorAlbedoScale, 'floor-alb-scale-val');
  set('floor-bump-amp', p.floorBumpAmp, 'floor-bump-amp-val');
  set('floor-bump-freq', p.floorBumpFreq, 'floor-bump-freq-val', 1);
  set('floor-bump-octaves', p.floorBumpOctaves, 'floor-bump-octaves-val', 0);
  set('floor-rough', p.floorRoughness, 'floor-rough-val');
  set('floor-spec', p.floorSpecular, 'floor-spec-val');
  set('floor-checker', p.floorCheckerScale, 'floor-checker-val', 1);
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
  setVec(['floor-alb-r', 'floor-alb-g', 'floor-alb-b'], p.floorAlbedoColor);

  const abs = document.getElementById('absorption-model') as HTMLSelectElement | null;
  if (abs) abs.value = p.absorptionModel;

  const floorPat = document.getElementById('floor-pattern') as HTMLSelectElement | null;
  if (floorPat) floorPat.value = String(p.floorPattern);

  const floorMat = document.getElementById('floor-material') as HTMLSelectElement | null;
  if (floorMat) floorMat.value = String(p.floorMaterial);

  const animate = document.getElementById('animate-waves') as HTMLInputElement | null;
  if (animate) animate.checked = p.animateWaves;
  const legendAnimate = document.getElementById('legend-animate') as HTMLInputElement | null;
  if (legendAnimate) legendAnimate.checked = p.animateWaves;
  const modeEl = document.getElementById('legend-mode');
  if (modeEl) {
    modeEl.textContent = p.animateWaves ? 'LIVE path-trace' : 'STILL accumulate';
  }

  const physio = document.getElementById('physio-contrast') as HTMLInputElement | null;
  if (physio) physio.checked = p.physiologicalContrast;

  const fixation = document.getElementById('fixation-mode') as HTMLInputElement | null;
  if (fixation) fixation.checked = p.fixationMode;

  const floorEn = document.getElementById('floor-enabled') as HTMLInputElement | null;
  if (floorEn) floorEn.checked = p.floorEnabled;

  syncAutoOrbitButton(tracer);

  const btnAbove = document.getElementById('view-above');
  const btnBelow = document.getElementById('view-below');
  btnAbove?.classList.toggle('active', !p.underwaterView);
  btnBelow?.classList.toggle('active', p.underwaterView);

  syncWaveAdvancedUI(tracer);
}

function exportImage(tracer: PathTracer): void {
  const link = document.createElement('a');
  link.download = `oceanscape-${tracer.params.activeChapter}-${Date.now()}.png`;
  link.href = tracer.exportPNG();
  link.click();
}

export type ShellUX = {
  entered: boolean;
  enter: () => void;
  refreshLegendMode: () => void;
};

/**
 * Intro overlay, control legend, mobile menu drawer.
 * Fly gate stays disabled until enter() so cold load does not steal free-fly focus.
 */
export function setupShellUX(tracer: PathTracer, flyGate: FlyGate): ShellUX {
  const overlay = document.getElementById('intro-overlay');
  const enterBtn = document.getElementById('enter-oceanscape');
  const legend = document.getElementById('controls-legend');
  const menuBtn = document.getElementById('menu-toggle');
  const ui = document.getElementById('ui');
  let entered = false;

  const refreshLegendMode = () => {
    const modeEl = document.getElementById('legend-mode');
    if (modeEl) {
      modeEl.textContent = tracer.params.animateWaves ? 'LIVE path-trace' : 'STILL accumulate';
    }
    const legendAnimate = document.getElementById('legend-animate') as HTMLInputElement | null;
    if (legendAnimate) legendAnimate.checked = tracer.params.animateWaves;
    const panelAnimate = document.getElementById('animate-waves') as HTMLInputElement | null;
    if (panelAnimate) panelAnimate.checked = tracer.params.animateWaves;
  };

  const setMenuOpen = (open: boolean) => {
    ui?.classList.toggle('ui-open', open);
    menuBtn?.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (menuBtn) menuBtn.textContent = open ? 'Close' : 'Menu';
    document.body.classList.toggle('menu-open', open);
  };

  menuBtn?.addEventListener('click', () => {
    const open = !ui?.classList.contains('ui-open');
    setMenuOpen(open);
  });

  // Tap outside panel on mobile closes drawer
  document.addEventListener('pointerdown', (e) => {
    if (!ui?.classList.contains('ui-open')) return;
    const t = e.target as Node;
    if (ui.contains(t) || menuBtn?.contains(t)) return;
    if (window.matchMedia('(max-width: 720px)').matches) setMenuOpen(false);
  });

  const enter = () => {
    if (entered) return;
    entered = true;
    flyGate.enabled = true;
    overlay?.classList.add('intro-hidden');
    overlay?.setAttribute('aria-hidden', 'true');
    if (legend) legend.hidden = false;
    // STILL hero already accumulating under the dimmed intro — keep freeze
    if (!tracer.params.animateWaves) {
      tracer.freezeForCapture();
    }
    refreshLegendMode();
    applyParamsToUI(tracer);
    const stats = document.getElementById('stats');
    if (stats) stats.textContent = tracer.getStats();
  };

  enterBtn?.addEventListener('click', () => enter());
  window.addEventListener('keydown', (e) => {
    if (entered) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      enter();
    }
  });

  refreshLegendMode();
  const shell: ShellUX = {
    get entered() {
      return entered;
    },
    enter,
    refreshLegendMode,
  };
  return shell;
}
