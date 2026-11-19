 // lib/server-api.ts
import { Blog } from './types/blog';
import { BackendProperty } from './types/property-utils';
import { sortCitiesByPopularity } from './pk';

const RAW_API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3005';
const BASE_URL = RAW_API_URL.trim().endsWith('/')
  ? `${RAW_API_URL.trim()}api`
  : `${RAW_API_URL.trim()}/api`;

console.log('🚀 Server API Base URL:', BASE_URL);

/**
 * For endpoints that may not exist yet: while a deploy builds, the old API
 * is still the one answering, and it reads /cities/names or
 * /properties/city-popularity as an id and returns 500. The caller has a
 * fallback, so this returns null instead of logging an error.
 */
async function optionalGet<T>(path: string, revalidate: number, tags: string[]): Promise<T | null> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      next: { revalidate, tags },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export const serverApi = {
  async get<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = path.startsWith('/') ? `${BASE_URL}${path}` : `${BASE_URL}/${path}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        next: {
          revalidate: 3600,
          ...options.next,
        },
      });

      if (!response.ok) {
        if (response.status !== 404) {
           console.error(`❌ API Error [${response.status}] for ${url}. BaseURL: ${BASE_URL}`);
        }
        throw new Error(`API Error: ${response.status} ${response.statusText} at ${path}`);
      }

      return response.json();
    } catch (error: any) {
      if (!error.message?.includes('404')) {
        console.error(`💥 Fetch Failed for ${url}. (BaseURL: ${BASE_URL}) Error:`, error.message);
        if (error.cause) console.error('  Cause:', error.cause);
      }
      throw error;
    }
  },

  // City API
  /** [{ _id, name, thumbnail }] — falls back to the full list on an older API. */
  async getCityNames(): Promise<any[]> {
    try {
      const rows = await optionalGet<any[]>('/cities/names', 600, ['cities']);
      if (Array.isArray(rows)) return rows;
    } catch {
      // older API
    }
    const all = await this.get<any[]>('/cities', { next: { revalidate: 600, tags: ['cities'] } });
    return (all ?? []).map((c: any) => ({ _id: c._id, name: c.name, thumbnail: c.thumbnail }));
  },

  async getCities(): Promise<any[]> {
    return this.get('/cities', { next: { revalidate: 60, tags: ['cities'] } });
  },

  async getCityByName(name: string): Promise<any | null> {
    try {
      return await this.get(`/cities/name/${name}`, {
        next: { revalidate: 60, tags: ['cities'] },
      });
    } catch (error: any) {
      if (error.message?.includes('404')) return null;
      throw error;
    }
  },

  // Property API
  // Note: tag values must match the tags emitted by the API on writes
  // (see RevalidateService callers in NestJS). Mismatches mean the page
  // won't refresh until natural TTL elapses.
  async getProperties(params: string = ''): Promise<any> {
    const path = params ? `/properties?${params}` : '/properties';
    return this.get(path, { next: { revalidate: 60, tags: ['properties'] } });
  },

  async getTypes(): Promise<string[]> {
    return this.get('/properties/types', { next: { revalidate: 60, tags: ['property-types'] } });
  },

  async getAreaBySlug(slug: string, cityId?: string): Promise<any> {
    const query = cityId ? `?cityId=${cityId}` : '';
    return this.get(`/areas/slug/${slug}${query}`, { next: { revalidate: 60, tags: ['areas'] } });
  },

  async getAreasByCity(cityId: string): Promise<any[]> {
    return this.get(`/areas?cityId=${cityId}`, { next: { revalidate: 60, tags: ['areas'] } });
  },

  async getPropertyBySlug(slug: string): Promise<any> {
    return this.get(`/properties/slug/${slug}`, {
      next: { revalidate: 60, tags: ['properties', `property:slug:${slug}`] },
    });
  },

  async getLocationStats(city: string): Promise<any> {
    return this.get(`/properties/stats/locations?city=${encodeURIComponent(city)}`, {
      next: { revalidate: 60, tags: ['properties'] },
    });
  },

  // Blog API
  async getPublishedBlogs(): Promise<Blog[]> {
    return this.get('/blog/published', { next: { revalidate: 60, tags: ['blogs'] } });
  },

  // Page API
  async getPageBySlug(slug: string): Promise<any> {
    return this.get(`/page/slug/${slug}`, { next: { revalidate: 60, tags: ['pages', `page:slug:${slug}`] } });
  },
};
/**
 * Page one of a results list, fetched on the server with the same filters
 * PropertiesListing would use in the browser, so the list arrives with the
 * HTML instead of after a spinner and a second round trip. Never throws: an
 * empty result just lets the client fetch as it always did.
 */
export async function fetchInitialListings(filters: {
  purpose: 'rent';
  cityId?: string;
  cityName?: string;
  areaId?: string;
  type?: string;
  marla?: number | null;
}): Promise<{ properties: import('./data').Property[]; totalPages: number; raw: BackendProperty[] }> {
  const { mapBackendToFrontendProperty } = await import('./types/property-utils');
  // Settings → General → Listings per page.
  const { getSiteSettings } = await import('./site-settings.server');
  const perPage = (await getSiteSettings()).listingsPerPage || 12;
  const p = new URLSearchParams({ page: '1', limit: String(perPage) });
  if (filters.cityId) p.set('cityId', filters.cityId);
  if (filters.cityName) p.set('city', filters.cityName);
  if (filters.areaId) p.set('areaId', filters.areaId);
  if (filters.type && filters.type !== 'all') p.set('type', filters.type);
  p.set('purpose', 'rent');
  if (filters.marla) {
    p.set('marlaMin', String(filters.marla));
    p.set('marlaMax', String(filters.marla));
  }
  try {
    const res: any = await serverApi.getProperties(p.toString());
    const raw: BackendProperty[] = Array.isArray(res) ? res : res?.properties ?? [];
    return {
      // Cards only: the description is left out of what is sent to the browser.
      properties: raw.map((r) => ({ ...mapBackendToFrontendProperty(r), description: undefined })),
      totalPages: Array.isArray(res) ? 1 : Number(res?.totalPages) || 1,
      raw: raw.map((r: any) => ({ _id: r._id, slug: r.slug, title: r.title })) as BackendProperty[],
    };
  } catch (error) {
    // A slow or failing API must not be cached as "no listings": throw, and
    // the page keeps its last good version (the list then loads in the browser).
    // Except during `next build`, when there is no last good version and the
    // API may simply not be running: the page is built empty, loads its list
    // in the browser, and is regenerated with listings on its first revalidate.
    if (!isNotFoundError(error) && process.env.NEXT_PHASE !== 'phase-production-build') throw error;
    return { properties: [], totalPages: 1, raw: [] };
  }
}

/**
 * Cities for the round shortcuts, popular cities first. Uses the API's
 * /properties/city-popularity; falls back to the plain city list sorted by
 * popularity. Never throws.
 */
export async function getCityStories(): Promise<import('@/components/CityStories').CityStory[]> {
  const slug = (n: string) => n.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  try {
    const rows = await optionalGet<any[]>('/properties/city-popularity', 600, ['properties', 'cities']);
    if (Array.isArray(rows) && rows.length) return sortCitiesByPopularity(rows);
  } catch {
    // Older API — fall through.
  }
  try {
    const cities: any[] = await serverApi.getCities();
    const mapped = (cities ?? []).map((c: any) => ({
      _id: String(c._id),
      name: c.name,
      slug: slug(c.name),
      thumbnail: c.thumbnail,
    }));
    return sortCitiesByPopularity(mapped);
  } catch {
    return [];
  }
}

/** Active agent plans, cheapest first — for the homepage. */
export async function getPlans(): Promise<import('./plans').Plan[]> {
  const rows = await optionalGet<import('./plans').Plan[]>('/packages', 600, ['packages']);
  return Array.isArray(rows) ? rows : [];
}

export interface SpotlightAgency {
  _id: string;
  name: string;
  person: string;
  avatarUrl: string;
  address: string;
  listings: number;
  verified: boolean;
}

/** Verified agencies with the spotlight benefit. Empty on an API without the endpoint. */
export async function getSpotlightAgencies(): Promise<SpotlightAgency[]> {
  const rows = await optionalGet<SpotlightAgency[]>('/agents/spotlight', 600, ['subscriptions']);
  return Array.isArray(rows) ? rows : [];
}

/** Verified agencies and agents working in a city, for its listing pages. Empty on an API without the endpoint. */
export async function getCityAgencies(cityId: string): Promise<SpotlightAgency[]> {
  if (!cityId) return [];
  const rows = await optionalGet<SpotlightAgency[]>(`/agents/city/${encodeURIComponent(cityId)}`, 600, ['subscriptions', 'agents']);
  return Array.isArray(rows) ? rows : [];
}

/**
 * True when the API answered "not found" — a page should 404. Anything else
 * (timeout, 5xx, API restarting) is not the page's fault: throw it, and Next
 * keeps serving the last good version instead of caching an empty or 404 page.
 */
export function isNotFoundError(error: unknown): boolean {
  return /API Error: 404\b/.test(String((error as Error)?.message ?? ''));
}

/* ── Property dealers directory (lib/dealers.ts) ── */

// 'properties' too: a Free account joins its city's page with its first approved listing.
const DEALER_TAGS = ['dealers', 'agents', 'subscriptions', 'properties'];

/** Every city with its number of agencies and agents. Empty on an API without the endpoint. */
export async function getDealerCities(): Promise<import('./dealers').DealerCity[]> {
  const rows = await optionalGet<import('./dealers').DealerCity[]>('/dealers/cities', 600, DEALER_TAGS);
  return Array.isArray(rows) ? rows : [];
}

/** The admin's text for /property-dealers and the default city text. */
export async function getDealerSettings(): Promise<import('./dealers').DealerSettings> {
  const s = await optionalGet<import('./dealers').DealerSettings>('/dealers/settings', 600, DEALER_TAGS);
  return { hub: s?.hub ?? {}, cityDefaults: s?.cityDefaults ?? {} };
}

/**
 * One city's dealers. Null when there is no such city (the page 404s); any
 * other failure is thrown, so Next keeps serving the last good page.
 */
export async function getDealerCity(slug: string): Promise<import('./dealers').DealerCityData | null> {
  try {
    return await serverApi.get(`/dealers/city/${encodeURIComponent(slug)}?limit=30`, { next: { revalidate: 600, tags: DEALER_TAGS } });
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

/** Every city's agencies, biggest plans first, with their city. Empty on an API without the endpoint. */
export async function getDealerAgencies(limit = 24): Promise<{ total: number; agencies: import('./dealers').DealerAgency[] }> {
  const r = await optionalGet<{ total: number; agencies: import('./dealers').DealerAgency[] }>(`/dealers/agencies?limit=${limit}`, 600, DEALER_TAGS);
  return { total: r?.total ?? 0, agencies: Array.isArray(r?.agencies) ? r!.agencies : [] };
}
