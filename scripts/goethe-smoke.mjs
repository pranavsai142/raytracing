#!/usr/bin/env node
/**
 * Goethe chapter smoke — Playwright stills + observation matrix report.
 *
 * Validates every CHAPTERS + WATER_PRESETS id against Goethe § / quote /
 * badge expectations from REQ + chapters.ts — not only "did the page load."
 *
 * Usage:
 *   npm run dev            # terminal A
 *   npm run smoke:goethe   # terminal B
 *
 * Env:
 *   BASE_URL   default http://127.0.0.1:5173/raytracing/
 *   OUT_DIR    default notes/GROK/validation/goethe
 *   SAMPLES    default 64 (still-mode target before screenshot)
 *   RENDER_SCALE default 1.0 (internal path-trace resolution)
 *   SPP        samples per frame during still (default 2)
 *   CHAPTER    optional single chapter id (e.g. atmosphere) — skip hash check
 *   SKIP_HASH  set 1 to skip #chapter=shadows spot-check
 *   HEADED     set 1 to show browser
 *
 * Single chapter (for subagent handoffs):
 *   CHAPTER=atmosphere SAMPLES=64 npm run smoke:goethe:one
 */

import { chromium } from 'playwright';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:5173/raytracing/';
const OUT_DIR = process.env.OUT_DIR
  ? path.resolve(process.env.OUT_DIR)
  : path.join(root, 'notes/GROK/validation/goethe');
const SAMPLES = Number(process.env.SAMPLES || 64);
const RENDER_SCALE = Math.min(1, Math.max(0.5, Number(process.env.RENDER_SCALE || 1)));
const SPP = Math.max(1, Number(process.env.SPP || 2));
const CHAPTER_ONLY = (process.env.CHAPTER || process.argv.find((a) => a.startsWith('--chapter='))?.split('=')[1] || '')
  .trim()
  .toLowerCase();
const SKIP_HASH = process.env.SKIP_HASH === '1' || !!CHAPTER_ONLY;
const HEADED = process.env.HEADED === '1';

/**
 * Observation matrix — sourced from REQ-goethe-theory-of-colours.md + chapters.ts.
 * badgeExpected must match ChapterDef.badge in src/chapters.ts.
 *
 * @type {{
 *   chapterId: string,
 *   section: string,
 *   quote: string,
 *   goetheSaw: string,
 *   userShouldSee: string,
 *   badgeExpected: 'PHYSICAL' | 'MIXED' | 'PHYSIOLOGICAL (viewer)',
 *   notes?: string,
 * }[]}
 */
const OBSERVATION_MATRIX = [
  {
    chapterId: 'ocean',
    section: '—',
    quote: 'Dielectric interface path tracer',
    goetheSaw:
      'North-star dielectric ocean: Fresnel, Snell window, TIR trap/escape, and spectral caustics at the air–water interface (not a Goethe paragraph — physics baseline).',
    userShouldSee:
      'Submerged checkerboard cube; realistic interface; Snell/TIR/cube framing; no fake bulk pigment.',
    badgeExpected: 'PHYSICAL',
    notes: 'Physics north-star; visual Goethe match N/A — structural + dielectric proof.',
  },
  {
    chapterId: 'primordial',
    section: '§175',
    quote: 'Light, darkness, and a colourless medium',
    goetheSaw:
      'Light + darkness + a colourless semi-transparent medium produce colour; thickness of the medium modulates the appearance.',
    userShouldSee:
      'Low sun through medium: warm near horizon / cool overhead relations; thickness changes colour; bulk water not blue paint at low opacity.',
    badgeExpected: 'PHYSICAL',
  },
  {
    chapterId: 'atmosphere',
    section: '§155',
    quote: 'Darkness seen through illumined vapour',
    goetheSaw:
      'Sky blue is darkness seen through thin illumined vapour; the sun through mist warms yellow→ruby.',
    userShouldSee:
      'Zenith blue deepens with denser atmosphere / low sun; sun disk warms; optional flame-edge demo when sceneMode=2.',
    badgeExpected: 'PHYSICAL',
  },
  {
    chapterId: 'shadows',
    section: '§76',
    quote: 'Contrary light fills the shadow',
    goetheSaw:
      'Principal light tints the surface; contrary (fill) light fills the shadow → complementary coloured shadows.',
    userShouldSee:
      'Dual-light rod/floor: two distinct coloured shadows; overlap darker/neutral; MIXED badge.',
    badgeExpected: 'MIXED',
  },
  {
    chapterId: 'shadows-underwater',
    section: '§78',
    quote: 'Divers: red field, green shadows',
    goetheSaw:
      'Divers report a red-biased field with green-tending shadows under water.',
    userShouldSee:
      'Underwater dual-light: warm lit faces, cooler/greener shadow regions on cube/floor.',
    badgeExpected: 'MIXED',
  },
  {
    chapterId: 'contrast',
    section: '§56',
    quote: 'White on yellow → purple tint',
    goetheSaw:
      'White against a yellow field takes on a purple (physiological) tint at the boundary.',
    userShouldSee:
      'Yellow/white split floor; purple fringe when physiological layer enabled; MIXED badge.',
    badgeExpected: 'MIXED',
    notes: 'Physiological fringe may need human eyes on PNG; structural badge + scene load required.',
  },
  {
    chapterId: 'refraction',
    section: '§227',
    quote: 'Displacement at boundaries produces colour',
    goetheSaw:
      'At refracting boundaries, displacement of the image produces coloured fringes.',
    userShouldSee:
      'Spectral edges / dispersion at water boundaries and cube silhouette; PHYSICAL badge.',
    badgeExpected: 'PHYSICAL',
  },
  {
    chapterId: 'double-reflect',
    section: '§224',
    quote: 'Separated reflections are weak and shadowy',
    goetheSaw:
      'When surface reflections are separated (double reflection), secondary images appear weak and shadowy.',
    userShouldSee:
      'Calm surface; secondary reflection path weaker than primary; PHYSICAL badge.',
    badgeExpected: 'PHYSICAL',
  },
  {
    chapterId: 'afterimage',
    section: '§50',
    quote: 'Opponent colour floats on neutral ground',
    goetheSaw:
      'After fixation on a colour, the opponent colour appears floating on a neutral ground (physiological).',
    userShouldSee:
      'Fixation / opponent afterimage layer labeled PHYSIOLOGICAL (viewer); not smuggled into water radiance.',
    badgeExpected: 'PHYSIOLOGICAL (viewer)',
    notes:
      'Opponent afterimage is inherently visual/human; STILL freeze ok for structure. Review PNG for fixation plane; colour match not automatable.',
  },
  {
    chapterId: 'twilight',
    section: '§85',
    quote: 'Faint lights appear coloured at night',
    goetheSaw:
      'At night / twilight, faint lights (moon, candle) appear distinctly coloured.',
    userShouldSee:
      'Low ambient with moon/candle-style lights tinted; MIXED badge.',
    badgeExpected: 'MIXED',
  },
  {
    chapterId: 'goethe-colourless-water',
    section: '§161',
    quote: 'Water deprived slightly of transparency',
    goetheSaw:
      'Water itself has no colour; slight semi-opacity (not pigment) yields the dioptrical effects.',
    userShouldSee:
      'Cube through colourless medium; no bulk blue pigment; PHYSICAL badge.',
    badgeExpected: 'PHYSICAL',
  },
  {
    chapterId: 'diver-view',
    section: '§78',
    quote: 'Everything seen in red light; shadows green',
    goetheSaw:
      'Underwater diver perspective: red-biased illumination field with green-tending shadows (§78).',
    userShouldSee:
      'Underwater cube; beer-style absorption; red/green relations; MIXED badge.',
    badgeExpected: 'MIXED',
  },
  {
    chapterId: 'vessel-elevation',
    section: '§187',
    quote: 'The bottom appears raised',
    goetheSaw:
      'Looking into a vessel of water, the bottom appears raised by refraction.',
    userShouldSee:
      'Apparent elevation of submerged geometry / bottom plane; PHYSICAL badge.',
    badgeExpected: 'PHYSICAL',
  },
  {
    chapterId: 'wave-contrast',
    section: '§57',
    quote: 'Lit side green; shadow opposite',
    goetheSaw:
      'On an agitated sea, lit faces and shadow sides show strong contrast (green-tending lit, opposite in shadow).',
    userShouldSee:
      'Waves with clear lit/shadow contrast across slopes; MIXED badge.',
    badgeExpected: 'MIXED',
  },
  {
    chapterId: 'twilight-ocean',
    section: '§75',
    quote: 'Sea-green shadows at twilight',
    goetheSaw:
      'At twilight the sea shows green-tending shadows under residual sky light.',
    userShouldSee:
      'Low sun ocean; sea-green shadow tendency; MIXED badge.',
    badgeExpected: 'MIXED',
  },
  {
    chapterId: 'sun-glitter',
    section: '§93',
    quote: 'Halo around the sun image on water',
    goetheSaw:
      'The reflected sun image on water is surrounded by a glittering halo / dazzle.',
    userShouldSee:
      'Bright sun glitter path on surface with halo-like bloom or sparkle; MIXED badge.',
    badgeExpected: 'MIXED',
  },
];

const EXPECTED_IDS = OBSERVATION_MATRIX.map((r) => r.chapterId);

async function waitForApi(page, timeoutMs = 20000) {
  await page.waitForFunction(() => window.__oceanscape?.ready === true, null, { timeout: timeoutMs });
}

/**
 * @param {import('playwright').Page} page
 * @param {(typeof OBSERVATION_MATRIX)[number]} row
 * @param {number} index
 */
async function captureChapter(page, row, index) {
  const nn = String(index + 1).padStart(2, '0');
  const fileBase = `${nn}-${row.chapterId}`;
  const errors = [];

  try {
    await page.evaluate(
      ({ chapterId, renderScale, spp }) => {
        const api = window.__oceanscape;
        if (!api?.ready) throw new Error('__oceanscape not ready');
        const t = api.tracer;
        // Apply chapter first (presets set quality), then force capture-quality overrides
        api.applyChapter(/** @type {any} */ (chapterId));
        t.params.samplesPerFrame = Math.max(t.params.samplesPerFrame || 1, spp);
        t.params.renderScale = renderScale;
        t.applyRenderScale();
        api.freezeForCapture();
        // Re-assert after freeze (freeze may not touch scale)
        t.params.renderScale = renderScale;
        t.params.samplesPerFrame = Math.max(t.params.samplesPerFrame || 1, spp);
        t.applyRenderScale();
      },
      { chapterId: row.chapterId, renderScale: RENDER_SCALE, spp: SPP },
    );
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return buildRowResult(row, fileBase, {
      badgeActual: '',
      badgeOk: false,
      caption: '',
      samples: 0,
      mode: '?',
      samplesOk: false,
      capturePath: '',
      captureOk: false,
      errors,
      status: 'FAIL',
    });
  }

  await page.waitForTimeout(400);

  let sampleResult = { samples: 0, mode: '?', ok: false };
  try {
    sampleResult = await page.evaluate(async (target) => {
      return window.__oceanscape.waitForSamples(target, 45000);
    }, SAMPLES);
  } catch (err) {
    errors.push(`waitForSamples: ${err instanceof Error ? err.message : String(err)}`);
  }

  const domInfo = await page.evaluate(() => {
    const badgeEl = document.getElementById('chapter-badge');
    const captionEl = document.getElementById('chapter-caption');
    const apiInfo =
      typeof window.__oceanscape?.getChapterInfo === 'function'
        ? window.__oceanscape.getChapterInfo()
        : null;
    return {
      badge: (badgeEl?.textContent || '').trim(),
      caption: (captionEl?.textContent || '').trim(),
      apiInfo,
      samples: window.__oceanscape?.getSamples?.() ?? 0,
      mode: window.__oceanscape?.getMode?.() ?? '?',
    };
  });

  const badgeActual = domInfo.badge || domInfo.apiInfo?.badge || '';
  const caption = domInfo.caption || domInfo.apiInfo?.caption || '';
  const badgeOk = badgeActual === row.badgeExpected;

  if (!badgeOk) {
    errors.push(`badge mismatch: expected "${row.badgeExpected}", got "${badgeActual}"`);
  }
  if (!caption) {
    errors.push('caption empty (#chapter-caption)');
  }

  const pngPath = path.join(OUT_DIR, `${fileBase}.png`);
  let captureOk = false;
  let capturePath = '';
  try {
    await page.locator('#canvas').screenshot({ path: pngPath });
    const st = await stat(pngPath);
    captureOk = st.size > 0;
    capturePath = path.relative(root, pngPath);
    if (!captureOk) errors.push('screenshot empty');
  } catch (err) {
    errors.push(`screenshot: ${err instanceof Error ? err.message : String(err)}`);
  }

  const samplesOk = sampleResult.ok && sampleResult.mode === 'still';
  if (!samplesOk) {
    errors.push(
      `samples not ready: mode=${sampleResult.mode} samples=${sampleResult.samples} target=${SAMPLES}`,
    );
  }

  // Structural PASS if no fatal automated failures; visual Goethe match is human via PNGs.
  const structuralFail =
    !badgeOk || !captureOk || errors.some((e) => e.startsWith('apply') || e.includes('not ready'));
  // Chapter apply errors already returned FAIL. Empty caption is warn-level but counts fail if required.
  const captionFail = !caption;
  const status =
    structuralFail || captionFail || !captureOk || !badgeOk
      ? 'FAIL'
      : !samplesOk
        ? 'FAIL'
        : 'PASS';

  return buildRowResult(row, fileBase, {
    badgeActual,
    badgeOk,
    caption,
    samples: sampleResult.samples,
    mode: sampleResult.mode,
    samplesOk,
    capturePath,
    captureOk,
    errors,
    status,
  });
}

function buildRowResult(row, fileBase, extra) {
  return {
    chapterId: row.chapterId,
    section: row.section,
    quote: row.quote,
    goetheSaw: row.goetheSaw,
    userShouldSee: row.userShouldSee,
    badgeExpected: row.badgeExpected,
    badgeActual: extra.badgeActual,
    badgeOk: extra.badgeOk,
    caption: extra.caption,
    samples: extra.samples,
    mode: extra.mode,
    samplesOk: extra.samplesOk,
    capturePath: extra.capturePath,
    captureOk: extra.captureOk,
    fileBase,
    status: extra.status,
    notes: row.notes || '',
    visualChecklist: row.userShouldSee,
    errors: extra.errors,
  };
}

async function hashSpotCheck(page) {
  /**
   * Fresh document load with #chapter=shadows — PathTracer constructor applies hash.
   * Must not be a same-document hash-only navigation (no remount → stale chapter).
   */
  const base = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
  const hashUrl = `${base}?goetheHashCheck=${Date.now()}#chapter=shadows`;

  await page.goto('about:blank');
  await page.goto(hashUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await waitForApi(page);
  // Constructor hash apply + setupUI onChapterChanged bootstrap
  await page.waitForTimeout(800);

  const info = await page.evaluate(() => {
    const badge = (document.getElementById('chapter-badge')?.textContent || '').trim();
    const caption = (document.getElementById('chapter-caption')?.textContent || '').trim();
    const active = window.__oceanscape?.tracer?.params?.activeChapter ?? null;
    const hash = window.location.hash;
    return { badge, caption, active, hash };
  });

  const ok =
    info.active === 'shadows' &&
    info.badge === 'MIXED' &&
    info.hash.includes('chapter=shadows');

  return {
    ok,
    hashUrl,
    ...info,
    expect: { active: 'shadows', badge: 'MIXED' },
  };
}

function buildMarkdown(report) {
  const lines = [
    '# Goethe chapter smoke report',
    '',
    `Generated: ${report.generatedAt}`,
    `Base URL: \`${report.baseUrl}\``,
    `Still sample target: ${report.samplesTarget}`,
    `Pass: **${report.pass ? 'YES' : 'NO'}**`,
    `Chapters: ${report.results.length} / ${EXPECTED_IDS.length}`,
    '',
    '## Purpose',
    '',
    'Full Playwright still capture across all Goethe chapters (I–VIII + water phenomena + ocean).',
    'Each row ties the scene to Goethe’s observation (§ + quote) so validation is against the **book**, not only page load.',
    '',
    '**Automated checks:** app ready, chapter apply, badge match, non-empty caption, non-empty PNG, still samples progressed, hash restore.',
    '**Visual Goethe match** (colours, fringes, afterimages) is **human-reviewed** via the PNG set — see visual checklist per row.',
    '',
    '## Hash spot-check',
    '',
    report.hashCheck
      ? [
          `- URL: \`${report.hashCheck.hashUrl}\``,
          `- activeChapter: \`${report.hashCheck.active}\` (expect \`shadows\`)`,
          `- badge: \`${report.hashCheck.badge}\` (expect \`MIXED\`)`,
          `- hash: \`${report.hashCheck.hash}\``,
          `- OK: **${report.hashCheck.ok ? 'yes' : 'no'}**`,
        ].join('\n')
      : '_not run_',
    '',
    '## Observation matrix',
    '',
    '| # | Chapter | § | Badge exp | Badge act | Badge OK | Samples | Mode | Status | PNG |',
    '|---|---------|---|-----------|-----------|----------|---------|------|--------|-----|',
    ...report.results.map((r, i) => {
      const n = String(i + 1).padStart(2, '0');
      const png = r.capturePath ? `\`${path.basename(r.capturePath)}\`` : '—';
      return `| ${n} | ${r.chapterId} | ${r.section} | ${r.badgeExpected} | ${r.badgeActual || '—'} | ${r.badgeOk ? 'yes' : 'no'} | ${r.samples} | ${r.mode} | **${r.status}** | ${png} |`;
    }),
    '',
    '## Per-chapter Goethe alignment',
    '',
  ];

  for (const r of report.results) {
    lines.push(`### ${r.fileBase} — ${r.chapterId} (${r.section})`);
    lines.push('');
    lines.push(`- **Status:** ${r.status}`);
    lines.push(`- **Quote:** ${r.quote}`);
    lines.push(`- **Goethe saw:** ${r.goetheSaw}`);
    lines.push(`- **User should see:** ${r.userShouldSee}`);
    lines.push(
      `- **Badge:** expected \`${r.badgeExpected}\` · actual \`${r.badgeActual || '—'}\` · ok=${r.badgeOk}`,
    );
    lines.push(`- **Mode / samples:** ${r.mode} / ${r.samples}`);
    lines.push(`- **Capture:** ${r.capturePath ? `\`${r.capturePath}\`` : '—'}`);
    if (r.notes) lines.push(`- **Notes:** ${r.notes}`);
    lines.push(`- **Visual checklist (human):** ${r.visualChecklist}`);
    if (r.errors?.length) {
      lines.push(`- **Errors:** ${r.errors.join('; ')}`);
    }
    lines.push('');
  }

  if (report.fatal) {
    lines.push('## Fatal');
    lines.push('');
    lines.push(report.fatal);
    lines.push('');
  }

  lines.push('## How to re-run');
  lines.push('');
  lines.push('```bash');
  lines.push('npm run dev                 # terminal A → http://127.0.0.1:5173/raytracing/');
  lines.push('npm run smoke:goethe        # terminal B');
  lines.push('# or: npm run smoke:goethe:headed');
  lines.push('# SAMPLES=48 BASE_URL=http://127.0.0.1:4173/raytracing/ npm run smoke:goethe');
  lines.push('```');
  lines.push('');
  lines.push('Outputs: `SMOKE_REPORT.md`, `SMOKE_REPORT.json`, `NN-<chapterId>.png` in this directory.');
  lines.push('');

  return lines.join('\n');
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Sanity: matrix covers expected 16 ids uniquely
  const ids = OBSERVATION_MATRIX.map((r) => r.chapterId);
  const unique = new Set(ids);
  if (unique.size !== 16 || ids.length !== 16) {
    console.error(`FATAL: observation matrix must have 16 unique chapters, got ${ids.length} (${unique.size} unique)`);
    process.exit(1);
  }

  /** @type {typeof OBSERVATION_MATRIX} */
  let rows = OBSERVATION_MATRIX;
  if (CHAPTER_ONLY) {
    rows = OBSERVATION_MATRIX.filter((r) => r.chapterId === CHAPTER_ONLY);
    if (rows.length === 0) {
      console.error(`FATAL: unknown CHAPTER="${CHAPTER_ONLY}". Valid: ${EXPECTED_IDS.join(', ')}`);
      process.exit(1);
    }
    console.log(`Single-chapter mode: ${CHAPTER_ONLY} (renderScale=${RENDER_SCALE} spp=${SPP} samples=${SAMPLES})`);
  }

  const browser = await chromium.launch({ headless: !HEADED });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  const results = [];
  let fatal = null;
  let hashCheck = null;

  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForApi(page);

    for (const row of rows) {
      const i = OBSERVATION_MATRIX.findIndex((r) => r.chapterId === row.chapterId);
      process.stdout.write(`· ${String(i + 1).padStart(2, '0')}-${row.chapterId} … `);
      const r = await captureChapter(page, row, i);
      results.push(r);
      console.log(
        `${r.status} badge=${r.badgeOk ? 'ok' : 'FAIL'} ${r.mode} spp=${r.samples} → ${r.capturePath || 'no-png'}`,
      );
      if (r.errors?.length) {
        for (const e of r.errors) console.log(`    ! ${e}`);
      }
    }

    if (!SKIP_HASH) {
      process.stdout.write('· hash #chapter=shadows … ');
      hashCheck = await hashSpotCheck(page);
      console.log(hashCheck.ok ? 'OK' : 'FAIL');
    } else {
      console.log('· hash spot-check skipped (single-chapter or SKIP_HASH=1)');
    }
  } catch (err) {
    fatal = err instanceof Error ? err.message : String(err);
    console.error('FATAL:', fatal);
  } finally {
    await browser.close();
  }

  const structuralOk =
    !fatal && results.length === rows.length && results.every((r) => r.status === 'PASS');
  const allStructuralPass = structuralOk && (SKIP_HASH || (hashCheck?.ok ?? false));

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    samplesTarget: SAMPLES,
    renderScale: RENDER_SCALE,
    spp: SPP,
    chapterOnly: CHAPTER_ONLY || null,
    purpose:
      'Goethe Theory of Colours chapter smoke — structural + observation matrix against book §§',
    expectedChapters: CHAPTER_ONLY ? [CHAPTER_ONLY] : EXPECTED_IDS,
    results,
    hashCheck,
    fatal,
    pass: allStructuralPass,
    summary: {
      total: results.length,
      pass: results.filter((r) => r.status === 'PASS').length,
      fail: results.filter((r) => r.status === 'FAIL').length,
      badgeFailures: results.filter((r) => !r.badgeOk).map((r) => r.chapterId),
      hashOk: SKIP_HASH ? null : (hashCheck?.ok ?? false),
    },
  };

  const reportSuffix = CHAPTER_ONLY ? `-${CHAPTER_ONLY}` : '';
  const reportPath = path.join(OUT_DIR, `SMOKE_REPORT${reportSuffix}.json`);
  const mdPath = path.join(OUT_DIR, `SMOKE_REPORT${reportSuffix}.md`);
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  await writeFile(mdPath, buildMarkdown(report));

  // Also write a tiny VERDICT for subagents
  if (CHAPTER_ONLY && results[0]) {
    const r = results[0];
    const verdictPath = path.join(OUT_DIR, `VERDICT-${CHAPTER_ONLY}.md`);
    await writeFile(
      verdictPath,
      [
        `# Verdict — ${CHAPTER_ONLY}`,
        '',
        `- Structural: **${r.status}**`,
        `- Badge: ${r.badgeOk ? 'OK' : 'FAIL'} (\`${r.badgeActual}\` vs \`${r.badgeExpected}\`)`,
        `- Samples: ${r.samples} (${r.mode})`,
        `- PNG: \`${r.capturePath || 'none'}\``,
        `- Goethe §: ${r.section}`,
        `- Quote: ${r.quote}`,
        `- Goethe saw: ${r.goetheSaw}`,
        `- User should see: ${r.userShouldSee}`,
        '',
        '**Next:** Open the PNG with the read_file tool and judge visual/philosophical fidelity. Fix PathTracer.applyChapterPreset if needed, re-run CHAPTER=… smoke.',
        '',
      ].join('\n'),
    );
    console.log(`Verdict: ${path.relative(root, verdictPath)}`);
  }

  console.log(`\nReport: ${path.relative(root, mdPath)}`);
  console.log(`JSON:   ${path.relative(root, reportPath)}`);
  console.log(`Pass:   ${report.pass ? 'YES' : 'NO'}`);
  process.exit(report.pass ? 0 : 1);
}

main();
