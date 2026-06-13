// Color theme engine. Two axes: MODE (light / dark / high-contrast) and
// ACCENT palette. Applied by writing CSS variables on <html>, consumed by
// Tailwind (see tailwind.config.js) and index.css.

export type Mode = 'light' | 'dark' | 'contrast';

export interface Accent {
  key: string;
  name: string;
  swatch: string; // for the picker
  vars: Record<string, string>; // --brand-* as "r g b"
}

export const ACCENTS: Accent[] = [
  { key: 'clinical-blue', name: 'Clinical Blue', swatch: '#2563eb', vars: { '--brand-50': '239 246 255', '--brand-100': '219 234 254', '--brand-500': '59 130 246', '--brand-600': '37 99 235', '--brand-700': '29 78 216' } },
  { key: 'teal', name: 'Medical Teal', swatch: '#0d9488', vars: { '--brand-50': '240 253 250', '--brand-100': '204 251 241', '--brand-500': '20 184 166', '--brand-600': '13 148 136', '--brand-700': '15 118 110' } },
  { key: 'violet', name: 'Violet', swatch: '#7c3aed', vars: { '--brand-50': '245 243 255', '--brand-100': '237 233 254', '--brand-500': '139 92 246', '--brand-600': '124 58 237', '--brand-700': '109 40 217' } },
  { key: 'emerald', name: 'Emerald', swatch: '#059669', vars: { '--brand-50': '236 253 245', '--brand-100': '209 250 229', '--brand-500': '16 185 129', '--brand-600': '5 150 105', '--brand-700': '4 120 87' } },
  { key: 'amber', name: 'Industrial Amber', swatch: '#d97706', vars: { '--brand-50': '255 251 235', '--brand-100': '254 243 199', '--brand-500': '245 158 11', '--brand-600': '217 119 6', '--brand-700': '180 83 9' } },
  { key: 'rose', name: 'Rose', swatch: '#e11d48', vars: { '--brand-50': '255 241 242', '--brand-100': '255 228 230', '--brand-500': '244 63 94', '--brand-600': '225 29 72', '--brand-700': '190 18 60' } },
  { key: 'slate', name: 'Graphite', swatch: '#475569', vars: { '--brand-50': '248 250 252', '--brand-100': '241 245 249', '--brand-500': '100 116 139', '--brand-600': '71 85 105', '--brand-700': '51 65 85' } },
];

const MODE_VARS: Record<Mode, Record<string, string>> = {
  light: {
    '--surface': '255 255 255', '--surface-2': '248 250 252', '--surface-3': '241 245 249',
    '--ink': '15 23 42', '--ink-soft': '100 116 139', '--line': '226 232 240',
  },
  dark: {
    '--surface': '15 23 42', '--surface-2': '30 41 59', '--surface-3': '51 65 85',
    '--ink': '241 245 249', '--ink-soft': '148 163 184', '--line': '51 65 85',
  },
  contrast: {
    '--surface': '0 0 0', '--surface-2': '10 10 10', '--surface-3': '24 24 24',
    '--ink': '255 255 255', '--ink-soft': '209 213 219', '--line': '120 120 120',
  },
};

export interface ThemeState { mode: Mode; accent: string; }
const STORE_KEY = 'vpms-theme';

export function loadTheme(): ThemeState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { mode: 'light', accent: 'clinical-blue' };
}

export function applyTheme(state: ThemeState) {
  const root = document.documentElement;
  const accent = ACCENTS.find((a) => a.key === state.accent) || ACCENTS[0];
  const vars = { ...MODE_VARS[state.mode], ...accent.vars };
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.dataset.mode = state.mode;
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}
