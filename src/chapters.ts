export type ChapterBadge = 'PHYSICAL' | 'PHYSIOLOGICAL (viewer)' | 'MIXED';

export type ChapterId =
  | 'ocean'
  | 'primordial'
  | 'atmosphere'
  | 'shadows'
  | 'shadows-underwater'
  | 'contrast'
  | 'refraction'
  | 'double-reflect'
  | 'afterimage'
  | 'twilight'
  | 'goethe-colourless-water'
  | 'diver-view'
  | 'wave-contrast'
  | 'vessel-elevation'
  | 'twilight-ocean'
  | 'sun-glitter';

export interface ChapterDef {
  id: ChapterId;
  label: string;
  badge: ChapterBadge;
  quote: string;
  section: string;
  sceneMode: number;
  keys?: string;
}

export const CHAPTERS: ChapterDef[] = [
  { id: 'ocean', label: 'Ocean (default)', badge: 'PHYSICAL', quote: 'Dielectric interface path tracer', section: '—', sceneMode: 0 },
  { id: 'primordial', label: 'I · Primordial', badge: 'PHYSICAL', quote: 'Light, darkness, and a colourless medium', section: '§175', sceneMode: 1, keys: '1' },
  // keyboard 1–8 maps to chapters I–VIII (GTC-00)
  { id: 'atmosphere', label: 'II · Atmosphere', badge: 'PHYSICAL', quote: 'Darkness seen through illumined vapour', section: '§155', sceneMode: 2, keys: '2' },
  { id: 'shadows', label: 'III · Shadows', badge: 'MIXED', quote: 'Contrary light fills the shadow', section: '§76', sceneMode: 3, keys: '3' },
  { id: 'shadows-underwater', label: 'III · Underwater', badge: 'MIXED', quote: 'Divers: red field, green shadows', section: '§78', sceneMode: 3 },
  { id: 'contrast', label: 'IV · Contrast', badge: 'MIXED', quote: 'White on yellow → purple tint', section: '§56', sceneMode: 4, keys: '4' },
  { id: 'refraction', label: 'V · Refraction', badge: 'PHYSICAL', quote: 'Displacement at boundaries produces colour', section: '§227', sceneMode: 0, keys: '5' },
  { id: 'double-reflect', label: 'VI · Double Reflect', badge: 'PHYSICAL', quote: 'Separated reflections are weak and shadowy', section: '§224', sceneMode: 5, keys: '6' },
  { id: 'afterimage', label: 'VII · After-Image', badge: 'PHYSIOLOGICAL (viewer)', quote: 'Opponent colour floats on neutral ground', section: '§50', sceneMode: 7, keys: '7' },
  { id: 'twilight', label: 'VIII · Twilight', badge: 'MIXED', quote: 'Faint lights appear coloured at night', section: '§85', sceneMode: 0, keys: '8' },
  // keys 1–2 reserved for chapters I–II per REQ GTC-00
];

export const WATER_PRESETS: ChapterDef[] = [
  { id: 'goethe-colourless-water', label: 'Water Has No Colour', badge: 'PHYSICAL', quote: 'Water deprived slightly of transparency', section: '§161', sceneMode: 0 },
  { id: 'diver-view', label: 'Diver (Red / Green)', badge: 'MIXED', quote: 'Everything seen in red light; shadows green', section: '§78', sceneMode: 0 },
  { id: 'vessel-elevation', label: 'Vessel Elevation', badge: 'PHYSICAL', quote: 'The bottom appears raised', section: '§187', sceneMode: 0 },
  { id: 'wave-contrast', label: 'Agitated Sea', badge: 'MIXED', quote: 'Lit side green; shadow opposite', section: '§57', sceneMode: 0 },
  { id: 'twilight-ocean', label: 'Twilight Ocean', badge: 'MIXED', quote: 'Sea-green shadows at twilight', section: '§75', sceneMode: 0 },
  { id: 'sun-glitter', label: 'Sun Glitter', badge: 'MIXED', quote: 'Halo around the sun image on water', section: '§93', sceneMode: 0 },
];

export function chapterById(id: string): ChapterDef | undefined {
  return [...CHAPTERS, ...WATER_PRESETS].find((c) => c.id === id);
}