# Goethe chapter handoffs

One agent per chapter. Each file is a self-contained brief.

## Launch all smokes (serial, full set)

```bash
npm run dev   # other terminal
SAMPLES=64 RENDER_SCALE=1 SPP=2 npm run smoke:goethe
```

## Single chapter

```bash
CHAPTER=atmosphere npm run smoke:goethe:one
```

## Chapters

- [01-ocean](01-ocean.md) — —
- [02-primordial](02-primordial.md) — §175
- [03-atmosphere](03-atmosphere.md) — §155
- [04-shadows](04-shadows.md) — §76
- [05-shadows-underwater](05-shadows-underwater.md) — §78
- [06-contrast](06-contrast.md) — §56
- [07-refraction](07-refraction.md) — §227
- [08-double-reflect](08-double-reflect.md) — §224
- [09-afterimage](09-afterimage.md) — §50
- [10-twilight](10-twilight.md) — §85
- [11-goethe-colourless-water](11-goethe-colourless-water.md) — §161
- [12-diver-view](12-diver-view.md) — §78
- [13-vessel-elevation](13-vessel-elevation.md) — §187
- [14-wave-contrast](14-wave-contrast.md) — §57
- [15-twilight-ocean](15-twilight-ocean.md) — §75
- [16-sun-glitter](16-sun-glitter.md) — §93
