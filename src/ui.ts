import { PathTracer } from './PathTracer';

export function setupUI(tracer: PathTracer): void {
  const bindSlider = (
    id: string,
    valId: string,
    key: keyof PathTracer['params'],
    onChange?: () => void,
  ) => {
    const slider = document.getElementById(id) as HTMLInputElement;
    const valEl = document.getElementById(valId)!;
    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      (tracer.params[key] as number) = v;
      valEl.textContent = slider.value;
      tracer.resetAccum();
      onChange?.();
    });
  };

  bindSlider('ior', 'ior-val', 'waterIOR');
  bindSlider('roughness', 'roughness-val', 'interfaceRoughness');
  bindSlider('sun-elev', 'sun-elev-val', 'sunElevation');
  bindSlider('sun-int', 'sun-int-val', 'sunIntensity');
  bindSlider('volume-sigma', 'volume-sigma-val', 'volumeSigma');
  bindSlider('spp', 'spp-val', 'samplesPerPixel');

  const btnAbove = document.getElementById('view-above')!;
  const btnBelow = document.getElementById('view-below')!;
  const btnOrbit = document.getElementById('auto-orbit')!;
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
    tracer.resetAccum();
  });

  btnExport.addEventListener('click', () => exportImage(tracer));

  window.addEventListener('keydown', (e) => {
    if (e.key === '1') setView(false);
    if (e.key === '2') setView(true);
    if (e.key === ' ') {
      tracer.params.autoOrbit = !tracer.params.autoOrbit;
      btnOrbit.textContent = `Auto Orbit: ${tracer.params.autoOrbit ? 'ON' : 'OFF'}`;
      tracer.resetAccum();
    }
    if (e.key === 'x' || e.key === 'X') exportImage(tracer);
  });

  window.addEventListener('resize', () => tracer.resize());

  setInterval(() => {
    stats.textContent = tracer.getStats();
  }, 500);
}

function exportImage(tracer: PathTracer): void {
  const dataUrl = tracer.exportPNG();
  const link = document.createElement('a');
  link.download = `oceanscape-${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
}