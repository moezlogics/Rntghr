/*
 * The property search, shared by the homepage and every results page: what
 * the address of a results page means, and the address for a search.
 *
 *   /properties/rent/<city>/<area>/<type>/<5marla|1kanal>?priceMin=…
 *
 * Rent Ghar lists rentals only, so every results page lives under
 * /properties/rent. The path holds what has its own landing page (city, area, type, a
 * standard size); the rest — price, a size range, beds, a keyword — goes in
 * the query string. Existing addresses are read exactly as before.
 */

/** Kept as a type so shared code reads the same; the only purpose is rent. */
export type Purpose = 'rent';

/** The property types that are rented out — the only ones Rent Ghar lists. */
export const KNOWN_TYPES = ['house', 'upper-portion', 'lower-portion', 'flat', 'apartment', 'room', 'hostel', 'shop', 'office', 'warehouse', 'commercial'];

export interface SearchState {
  purpose: Purpose;
  citySlug: string;
  areaSlug: string;
  type: string;
  priceMin?: number;
  priceMax?: number;
  marlaMin?: number;
  marlaMax?: number;
  beds?: number;
  search?: string;
}

export const EMPTY_SEARCH: SearchState = { purpose: 'rent', citySlug: '', areaSlug: '', type: '' };

export const toSlug = (t: string) => String(t ?? '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const sizeOf = (s: string) => {
  const m = /^(\d+)(marla|kanal)$/i.exec(s);
  if (!m) return null;
  return m[2]!.toLowerCase() === 'kanal' ? Number(m[1]) * 20 : Number(m[1]);
};

const num = (v: string | null) => {
  const n = Number(v);
  return v && Number.isFinite(n) && n > 0 ? n : undefined;
};

/** What a results page's address asks for. */
export function parseSearch(pathname: string, params?: URLSearchParams | null): SearchState {
  const parts = (pathname || '').split('/').filter(Boolean);
  const state: SearchState = { ...EMPTY_SEARCH };
  if (parts[0] === 'properties' && parts[1] === 'rent') {
    const rest = parts.slice(2);
    const size = rest.map(sizeOf).find((m) => m !== null);
    if (size) state.marlaMin = state.marlaMax = size;
    const segs = rest.filter((s) => sizeOf(s) === null);
    if (segs[0] && KNOWN_TYPES.includes(segs[0].toLowerCase())) {
      state.type = segs[0].toLowerCase();
    } else if (segs[0]) {
      state.citySlug = segs[0];
      if (segs[1] && KNOWN_TYPES.includes(segs[1].toLowerCase())) state.type = segs[1].toLowerCase();
      else if (segs[1]) {
        state.areaSlug = segs[1];
        if (segs[2] && KNOWN_TYPES.includes(segs[2].toLowerCase())) state.type = segs[2].toLowerCase();
      }
    }
  }
  if (params) {
    if (!state.citySlug && params.get('city')) state.citySlug = toSlug(params.get('city')!);
    if (!state.type && params.get('type')) state.type = params.get('type')!.toLowerCase();
    state.priceMin = num(params.get('priceMin'));
    state.priceMax = num(params.get('priceMax'));
    state.marlaMin = num(params.get('marlaMin')) ?? state.marlaMin;
    state.marlaMax = num(params.get('marlaMax')) ?? state.marlaMax;
    state.beds = num(params.get('beds'));
    state.search = params.get('search') || undefined;
  }
  return state;
}

/** One standard size has its own page ("/5marla", "/1kanal"); a range goes in the query string. */
function sizePath(s: SearchState): string {
  if (!s.marlaMin || s.marlaMin !== s.marlaMax) return '';
  if (s.marlaMin >= 20 && s.marlaMin % 20 === 0) return `/${s.marlaMin / 20}kanal`;
  return Number.isInteger(s.marlaMin) ? `/${s.marlaMin}marla` : '';
}

/** The results page for a search. */
export function searchUrl(s: SearchState): string {
  const type = s.type && s.type !== 'all' ? `/${s.type}` : '';
  const size = sizePath(s);
  let path = '/properties/rent';
  if (s.citySlug) {
    path += `/${s.citySlug}`;
    if (s.areaSlug) path += `/${s.areaSlug}`;
  }
  path += type + size;

  const q = new URLSearchParams();
  if (s.priceMin) q.set('priceMin', String(s.priceMin));
  if (s.priceMax) q.set('priceMax', String(s.priceMax));
  if (!size) {
    if (s.marlaMin) q.set('marlaMin', String(s.marlaMin));
    if (s.marlaMax) q.set('marlaMax', String(s.marlaMax));
  }
  if (s.beds) q.set('beds', String(s.beds));
  if (s.search?.trim()) q.set('search', s.search.trim());
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

/** How many of the "more" filters are set — for the Filters button's badge. */
export function extraCount(s: SearchState): number {
  return [s.priceMin || s.priceMax, s.marlaMin || s.marlaMax, s.beds, s.search].filter(Boolean).length;
}

// ── Choices ─────────────────────────────────────────────────────────────

const L = 100_000;
const C = 10_000_000;
/** Monthly rent steps for the price filter. */
export const RENT_PRICES = [5_000, 10_000, 15_000, 20_000, 25_000, 30_000, 40_000, 50_000, 75_000, 1 * L, 1.5 * L, 2 * L, 3 * L, 5 * L, 10 * L];
export const MARLA_SIZES = [2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20, 40, 60, 80, 100, 200];
export const BEDS = [1, 2, 3, 4, 5];

/** "50 Lakh", "1.5 Crore", "25,000". */
export function priceLabel(n: number): string {
  if (n >= C) return `${+(n / C).toFixed(2)} Crore`;
  if (n >= L) return `${+(n / L).toFixed(2)} Lakh`;
  return n.toLocaleString('en-PK');
}

/** "5 Marla", "1 Kanal". */
export function marlaLabel(m: number): string {
  if (m >= 20 && m % 20 === 0) return `${m / 20} Kanal`;
  return `${m} Marla`;
}

export function rangeLabel(min: number | undefined, max: number | undefined, fmt: (n: number) => string, any = 'Any'): string {
  if (min && max) return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return any;
}

export const TYPE_LABELS: Record<string, string> = {
  house: 'House',
  'upper-portion': 'Upper Portion',
  'lower-portion': 'Lower Portion',
  flat: 'Flat',
  apartment: 'Apartment',
  room: 'Room',
  hostel: 'Hostel',
  shop: 'Shop',
  office: 'Office',
  warehouse: 'Warehouse',
  commercial: 'Commercial',
};
/** A type's name for headings: "upper-portion" → "Upper Portion". */
export const typeTitle = (t: string) =>
  TYPE_LABELS[String(t || '').toLowerCase()] ?? String(t || '').replace(/[-\s]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Types sized in marla / kanal (the marla filter applies). */
export const MARLA_TYPES = ['house', 'upper-portion', 'lower-portion'];

/** Types without bedrooms. */
export const NO_BEDS = ['shop', 'office', 'warehouse', 'commercial'];
