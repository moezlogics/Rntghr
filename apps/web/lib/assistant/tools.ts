/**
 * What the site assistant can look up and work out. Server only.
 *
 * Facts come from the live API (rental listings, places, market rents,
 * agents, articles), so the model never invents a listing or a rent.
 */
import { searchUrl } from "@/lib/search";
import type { Visual } from "./types";
import { dealerHref, dealersCityPath } from "@/lib/dealers";

const RAW = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3105";
const API = `${RAW.trim().replace(/\/$/, "")}/api`;

async function api<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return res.json() as Promise<T>;
}

/** Cached for a few minutes: rates and the calculator settings change rarely. */
const memo = new Map<string, { at: number; v: unknown }>();
async function cached<T>(key: string, ms: number, fn: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < ms) return hit.v as T;
  const v = await fn();
  memo.set(key, { at: Date.now(), v });
  return v;
}

const rs = (n: number) => {
  const v = Math.round(Number(n) || 0);
  const t = (x: number) => String(Number(x.toFixed(2)));
  if (v >= 1e7) return `PKR ${t(v / 1e7)} Crore`;
  if (v >= 1e5) return `PKR ${t(v / 1e5)} Lakh`;
  return `PKR ${v.toLocaleString("en-PK")}`;
};

/* ── tool definitions (OpenAI-style function calling) ───────────────────── */

const num = (description: string) => ({ type: "number", description });
const str = (description: string, e?: string[]) => ({ type: "string", description, ...(e ? { enum: e } : {}) });

export const TOOL_DEFS = [
  {
    type: "function",
    function: {
      name: "site_search",
      description: "Search the WHOLE site at once — listings, areas, dealers and articles — for any words. Use first when a question is broad, vague, or you're not sure which lookup fits (a name, a project, a landmark, a topic).",
      parameters: { type: "object", properties: { query: str("What to look for, in the user's words"), city: str("City, only if the user said one") }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_listing",
      description: "Full public details of ONE listing: price, size, beds/baths, features, description, who posted it (verified or not), when, status, and how its price compares with similar listings nearby. Use when the user asks about a specific property, or says 'this property / is property / yeh wala' while viewing a listing page (pass that page's slug).",
      parameters: { type: "object", properties: { ref: str("The listing's slug or URL (/properties/...) or id") }, required: ["ref"] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_areas",
      description: "The areas of a city with the most live listings — for 'which areas are there in X', 'where should I look in X', 'popular societies in X'.",
      parameters: { type: "object", properties: { city: str("City name") }, required: ["city"] },
    },
  },
  {
    type: "function",
    function: {
      name: "site_overview",
      description: "The site in numbers right now: total live listings, by type and buy/rent, and the busiest cities.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "read_article",
      description: "Read one of the site's articles (blog) to answer from it — pass its URL or slug from site_guides/site_search.",
      parameters: { type: "object", properties: { ref: str("Article URL (/blog/...) or slug") }, required: ["ref"] },
    },
  },
  {
    type: "function",
    function: {
      name: "dealer_profile",
      description: "One dealer or agency's public profile: city, experience, verified, live listings, rating and reviews summary, profile link. Never phone numbers. Pass a name (searched across all cities) or a profile URL.",
      parameters: { type: "object", properties: { name: str("Dealer/agency name"), url: str("Profile URL (/agents/...)") } },
    },
  },
  {
    type: "function",
    function: {
      name: "site_info",
      description: "About the site itself: 'contact' (the site's own phone/WhatsApp/email), 'plans' (packages for agents and their prices/limits), or a page: 'about', 'terms', 'privacy-policy', or any static page slug (how to post, policies…).",
      parameters: { type: "object", properties: { topic: str("contact | plans | about | terms | privacy-policy | another page slug") }, required: ["topic"] },
    },
  },
  {
    type: "function",
    function: {
      name: "find_places",
      description: "Find areas, societies, phases and cities by name (e.g. 'bahria town', 'dha phase 6 lahore', 'johar town'). Returns ids for search_listings / market_prices, listing counts, and society facts (developer, approval, possession, plot sizes).",
      parameters: { type: "object", properties: { query: str("The place as the user wrote it"), city: str("City, if the user said one") }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "search_listings",
      description: "Search live listings. Matching listings are shown to the user as cards automatically; you only summarise. Pass place_ids / city_id from find_places, OR pass location / city directly.",
      parameters: {
        type: "object",
        properties: {
          place_ids: { type: "array", items: { type: "string" }, description: "Area ids from find_places" },
          city_id: str("City id from find_places, when searching a whole city"),
          location: str("Area or city name (e.g. 'Bahria Town Lahore', 'DHA Phase 6', 'Johar Town')"),
          city: str("City name (e.g. 'Lahore', 'Karachi', 'Islamabad')"),
          purpose: str("Always rent — this site lists rentals only", ["rent"]),
          types: { type: "array", items: { type: "string", enum: ["house", "upper-portion", "lower-portion", "flat", "apartment", "room", "hostel", "shop", "office", "warehouse", "commercial"] }, description: "Rental types (a portion of a house: upper-portion / lower-portion; a single room or shared room: room)" },
          min_price: num("Minimum monthly rent in PKR"),
          max_price: num("Maximum monthly rent in PKR"),
          min_marla: num("Minimum size in marla (1 kanal = 20 marla)"),
          max_marla: num("Maximum size in marla"),
          min_beds: num("Minimum bedrooms"),
          keywords: str("Words to look for in the listing, e.g. 'corner', 'furnished', 'park facing'"),
          sort: str("Order", ["best", "cheapest", "newest", "largest", "expensive"]),
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "market_prices",
      description: "What renting actually costs in a place right now, from its live rental listings: median monthly rent, typical range, and breakdown by marla/kanal size. Use for 'what is the rent of a 5 marla house in X', 'is this a fair rent', area comparisons.",
      parameters: {
        type: "object",
        properties: {
          place_ids: { type: "array", items: { type: "string" } },
          city_id: str("City id"),
          location: str("Area or city name (e.g. 'Bahria Town Lahore', 'DHA Lahore')"),
          city: str("City name (e.g. 'Lahore', 'Karachi', 'Islamabad')"),
          purpose: str("Always rent", ["rent"]),
          types: { type: "array", items: { type: "string" } },
          min_marla: num("Only this size and up (marla)"),
          max_marla: num("Only up to this size (marla)"),
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_search_form",
      description: "Show the user a one-step rental search form (city, area, type, size, monthly budget, bedrooms) prefilled with whatever they already said. Use this when someone wants to rent but has not given BOTH a location and a budget or size — instead of asking questions one by one.",
      parameters: {
        type: "object",
        properties: {
          purpose: str("Always rent", ["rent"]),
          city: str("City, if said"),
          location: str("Area, if said"),
          type: str("Rental type, if said", ["house", "upper-portion", "lower-portion", "flat", "room", "hostel", "shop", "office", "warehouse"]),
          marla: num("Size in marla, if said"),
          max_price: num("Monthly rent budget in PKR, if said"),
          beds: num("Bedrooms, if said"),
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "contact_support",
      description: "Show the site team's WhatsApp, call and 'find it for me' options. Use when the user wants to talk to a person, asks for a contact/helpline, is unhappy or stuck, or you cannot help with something.",
      parameters: { type: "object", properties: { topic: str("What they need help with, in a few words, in their language") } },
    },
  },
  {
    type: "function",
    function: {
      name: "find_agents",
      description: "Find property dealers / agencies / agents. With `name`: searches EVERY city for a dealer by that name (close spellings too) — use for 'is there a dealer named X', 'X estate', 'find agent X'. With only `city`: the dealers in that city, verified first. Never invent a city the user didn't say. Shown as dealer cards with profile links (never phone numbers).",
      parameters: { type: "object", properties: { name: str("Dealer, agent or agency name, if the user gave one"), city: str("City, ONLY if the user said one") } },
    },
  },
  {
    type: "function",
    function: {
      name: "site_guides",
      description: "Articles on Rent Ghar that explain renting topics: rent agreements, advance and security, tenant police registration, landlord and tenant rights, moving tips. Shown as article links. Use for 'how to', process or legal questions, then give a short answer yourself.",
      parameters: { type: "object", properties: { query: str("Topic in a few English words, e.g. 'rent agreement', 'tenant registration punjab'") }, required: ["query"] },
    },
  },
] as const;

/** Short words for the "working on it" line the user sees. */
export function toolLabel(name: string, args: any): string {
  switch (name) {
    case "find_places":
      return `Looking up ${args?.query || "location"}`;
    case "search_listings":
      return "Finding rentals";
    case "market_prices":
      return "Checking market prices";
    case "find_agents":
      return args?.name ? `Searching dealers named “${args.name}”` : `Finding dealers in ${args?.city || "your city"}`;
    case "site_guides":
      return "Finding guides";
    case "contact_support":
      return "Connecting you with our team";
    case "site_search":
      return `Searching the site for “${String(args?.query || "").slice(0, 40)}”`;
    case "get_listing":
      return "Opening the property";
    case "list_areas":
      return `Checking areas in ${args?.city || "the city"}`;
    case "site_overview":
      return "Counting live listings";
    case "read_article":
      return "Reading the guide";
    case "dealer_profile":
      return `Opening ${args?.name || "the dealer"}'s profile`;
    case "site_info":
      return "Checking site details";
    case "show_search_form":
      return "Opening search";
    default:
      return "Loading details";
  }
}

const pkrExact = (n: unknown) => `Rs ${Math.round(Number(n) || 0).toLocaleString("en-PK")}`;
const isObjectId = (s: unknown) => typeof s === "string" && /^[a-f0-9]{24}$/i.test(s.trim());

/** Automatically resolve location/city text into valid Mongo ObjectIds if the model didn't pass valid ids. */
async function resolveScope(a: any): Promise<{ placeIds?: string[]; cityId?: string; label?: string }> {
  const validPlaces = Array.isArray(a.place_ids) ? a.place_ids.filter(isObjectId) : [];
  const validCity = isObjectId(a.city_id) ? String(a.city_id).trim() : undefined;
  const given = [a.location, a.city].filter((x) => typeof x === "string" && x.trim()).join(", ") || undefined;
  if (validPlaces.length || validCity) return { placeIds: validPlaces.length ? validPlaces : undefined, cityId: validCity, label: given };

  const nonIdPlace = Array.isArray(a.place_ids) ? a.place_ids.find((x: any) => typeof x === "string" && x.trim()) : "";
  const nonIdCity = typeof a.city_id === "string" && !isObjectId(a.city_id) ? a.city_id.trim() : "";
  const q = String(a.location || nonIdPlace || a.city || nonIdCity || "").trim();
  const cityHint = String(a.city || nonIdCity || "").trim();
  if (!q) return {};

  try {
    const found = await api<{ places?: { id: string; name: string; cityId: string }[]; group?: { name: string; city: string; cityId: string; ids: string[] } | null; cities?: { id: string; name: string }[] }>(
      `/assistant/places?q=${encodeURIComponent(q)}${cityHint && cityHint.toLowerCase() !== q.toLowerCase() ? `&city=${encodeURIComponent(cityHint)}` : ""}`,
    );
    if (found?.group?.ids?.length) {
      const g = found.group;
      return { placeIds: g.ids, cityId: g.cityId, label: `${g.name}, ${g.city}` };
    }
    if (found?.places?.length) {
      const p = found.places[0]! as any;
      return { placeIds: [p.id], cityId: p.cityId, label: [p.name, p.city].filter(Boolean).join(", ") };
    }
    if (found?.cities?.length) {
      return { cityId: found.cities[0]!.id, label: found.cities[0]!.name };
    }
  } catch {
    /* ignore */
  }
  return {};
}

/* ── understanding a typed search ("dha 6 mein 10 marla ghar 3 crore tak") ── */

const MONEY_RE = /(\d+(?:\.\d+)?)\s*(crore|crores|cr|karor|karod|lakh|lakhs|lac|lacs|l|thousand|hazar|hazaar|k|arab)\b/gi;
function moneyOf(n: string, unit: string): number {
  const u = unit.toLowerCase();
  const m = /^(crore|crores|cr|karor|karod)$/.test(u) ? 1e7 : /^(lakh|lakhs|lac|lacs|l)$/.test(u) ? 1e5 : /^(thousand|hazar|hazaar|k)$/.test(u) ? 1e3 : u === "arab" ? 1e9 : 1;
  return Math.round(Number(n) * m);
}

/** Purpose, type, size, budget, bedrooms and extras from a sentence. */
export function readSearch(text: string) {
  const t = ` ${text.toLowerCase().replace(/[,]/g, " ").replace(/\s+/g, " ")} `;
  const purpose = "rent" as const;
  const type = /\b(room|rooms|kamra|kamre|kamray)\b/.test(t) && !/\d\s*(room|rooms|kamre|kamray|kamra)\b/.test(t)
    ? "room"
    : /\b(hostel|hostels|pg)\b/.test(t)
    ? "hostel"
    : /\b(upper portion|upper|oopar)\b/.test(t)
    ? "upper-portion"
    : /\b(lower portion|ground portion|neechay|neeche)\b/.test(t)
    ? "lower-portion"
    : /\b(flat|flats|apartment|apartments)\b/.test(t)
      ? "flat"
      : /\b(shop|shops|dukan|dukaan|office|offices|commercial|plaza|warehouse|godown)\b/.test(t)
        ? /\boffice/.test(t) ? "office" : /\bshop|dukan|dukaan/.test(t) ? "shop" : /\bwarehouse|godown/.test(t) ? "warehouse" : "commercial"
        : /\b(ghar|house|houses|home|makan|makaan|bungalow|villa|portion)\b/.test(t)
          ? "house"
          : "";
  const size = /(\d+(?:\.\d+)?)\s*(marla|marle|marly|kanal|kanaal|knal)\b/.exec(t);
  const marla = size ? Number(size[1]) * (/^k/.test(size[2]!) ? 20 : 1) : undefined;
  // "2 se 3 crore", "2 to 3 crore", "2-3 crore": the unit belongs to both numbers.
  const span = /(\d+(?:\.\d+)?)\s*(?:se|to|-|–|and|aur)\s*(\d+(?:\.\d+)?)\s*(crore|crores|cr|karor|karod|lakh|lakhs|lac|lacs|thousand|hazar|hazaar|k)(?![a-z])/i.exec(t);
  const amounts = span
    ? [moneyOf(span[1]!, span[3]!), moneyOf(span[2]!, span[3]!)]
    : [...t.matchAll(MONEY_RE)].map((m) => moneyOf(m[1]!, m[2]!)).filter((v) => v >= 5000);
  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  if (amounts.length >= 2) [minPrice, maxPrice] = [Math.min(...amounts), Math.max(...amounts)];
  else if (amounts.length === 1) {
    if (/\b(above|over|se zyada|se ziada|se upar|minimum|min|at least|kam az kam)\b/.test(t)) minPrice = amounts[0];
    else maxPrice = amounts[0];
  }
  const bedsM = /(\d)\s*(bed|beds|bedroom|bedrooms|bed room|kamre|kamray|kamra|rooms?)\b/.exec(t);
  const extras = ["furnished", "semi furnished", "separate gate", "family", "bachelor", "independent", "brand new"].filter((k) => t.includes(` ${k}`));
  const priceQuestion = /\b(price|prices|qeemat|keemat|kimat|kitne ka|kitny ka|kitne ki|kitna kiraya|rent kitna|average rent|market rent)\b/.test(t) && !/\b(lena|leni|chahiye|chahye|chahiyay|dikhao|dikhayen|show|find|dhoond|dhundo|search|available)\b/.test(t);
  return { purpose, type, marla, minPrice, maxPrice, beds: bedsM ? Number(bedsM[1]) : undefined, extras, priceQuestion };
}

/* ── running a tool ─────────────────────────────────────────────────────── */

export interface ToolResult {
  /** What the model reads (kept short). */
  forModel: unknown;
  /** Shown to the user as cards. */
  cards?: Visual;
}

const CITY_SLUG = (s: string) => String(s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export async function runTool(name: string, args: any): Promise<ToolResult> {
  const a = args || {};
  switch (name) {
    case "find_places": {
      const r = await api<any>(`/assistant/places?q=${encodeURIComponent(String(a.query || ""))}${a.city ? `&city=${encodeURIComponent(a.city)}` : ""}`);
      return { forModel: r };
    }
    case "search_listings": {
      const scope = await resolveScope(a);
      const r = await api<any>("/assistant/search", {
        placeIds: scope.placeIds,
        cityId: scope.cityId,
        purpose: "rent",
        types: a.types,
        minPrice: a.min_price,
        maxPrice: a.max_price,
        minMarla: a.min_marla,
        maxMarla: a.max_marla,
        minBeds: a.min_beds,
        keywords: a.keywords,
        sort: a.sort,
        limit: 6,
      });
      return {
        forModel: {
          total: r.total,
          shownAsCards: r.listings.length,
          priceRange: r.priceRange,
          listings: r.listings.map((l: any) => ({ title: l.title, price: l.priceText, size: l.size, beds: l.beds, place: l.place, verified: l.verified, url: l.url })),
        },
        cards: {
          kind: "listings",
          q: { ...a, place_ids: scope.placeIds, city_id: scope.cityId },
          total: r.total,
          items: r.listings,
          label: scope.label,
          priceRange: r.priceRange,
          // The same search on the site's results page, for "See all".
          // Several areas under one name ("Bahria Town"): the city page, searched by that name.
          moreExact: !(scope.placeIds && scope.placeIds.length > 1),
          moreUrl: searchUrl({
            purpose: "rent",
            citySlug: r.link?.citySlug || "",
            areaSlug: scope.placeIds && scope.placeIds.length > 1 ? "" : r.link?.areaSlug || "",
            search: scope.placeIds && scope.placeIds.length > 1 ? scope.label?.split(",")[0] : undefined,
            type: Array.isArray(a.types) && a.types.length === 1 ? (a.types[0] === "flat" ? "flat" : a.types[0]) : "",
            priceMin: a.min_price || undefined,
            priceMax: a.max_price || undefined,
            marlaMin: a.min_marla || undefined,
            marlaMax: a.max_marla || undefined,
            beds: a.min_beds || undefined,
          }),
        },
      };
    }
    case "market_prices": {
      const scope = await resolveScope(a);
      const r = await api<any>("/assistant/market", {
        placeIds: scope.placeIds,
        cityId: scope.cityId,
        purpose: "rent",
        types: a.types,
        minMarla: a.min_marla,
        maxMarla: a.max_marla,
      });
      const place = scope.label || "All Pakistan";
      return {
        forModel: { place, ...r, shownAsCard: true },
        cards: { kind: "market", q: { ...a, place_ids: scope.placeIds, city_id: scope.cityId }, place, market: r.market || [], url: r.link ? searchUrl({ purpose: "rent", citySlug: r.link.citySlug, areaSlug: r.link.areaSlug, type: "" }) : undefined },
      };
    }
    case "site_search": {
      const q = String(a.query || "").slice(0, 120);
      const city = String(a.city || "").trim();
      const [places, listings, dealers, guides] = await Promise.all([
        api<any>(`/assistant/places?q=${encodeURIComponent(q)}${city ? `&city=${encodeURIComponent(city)}` : ""}`).catch(() => null),
        api<any>("/assistant/search", { keywords: q, limit: 5, ...(city ? {} : {}) }).catch(() => null),
        api<any>(`/dealers/search?q=${encodeURIComponent(q)}${city ? `&city=${encodeURIComponent(city)}` : ""}`).catch(() => null),
        api<any>(`/assistant/guides?q=${encodeURIComponent(q)}`).catch(() => null),
      ]);
      const ls = (listings?.listings || []).slice(0, 5);
      return {
        forModel: {
          places: (places?.places || []).slice(0, 5).map((p: any) => ({ name: p.name, city: p.city, kind: p.kind, listings: p.listings, listingsUrl: p.url, guideUrl: p.society?.url })),
          listingsMatchingWords: { total: listings?.total || 0, top: ls.map((l: any) => ({ title: l.title, price: l.priceText, size: l.size, place: l.place, url: l.url })) },
          dealers: (dealers?.dealers || []).slice(0, 5).map((d: any) => ({ name: d.name, city: d.city?.name, exactName: d.exact, listings: d.listings, verified: d.verified, profileUrl: dealerHref(d) })),
          articles: (guides?.guides || []).slice(0, 4).map((g: any) => ({ title: g.title, url: g.url })),
        },
        cards: ls.length ? { kind: "listings", total: listings.total, items: ls, label: `“${q}”`, q: { keywords: q } } : undefined,
      };
    }
    case "get_listing": {
      const r = await api<any>(`/assistant/listing?ref=${encodeURIComponent(String(a.ref || "").slice(0, 200))}`).catch(() => null);
      if (!r?.found) return { forModel: { found: false, note: "No live listing with that link — it may be rented out or removed." } };
      const { card, ...facts } = r;
      return { forModel: facts, cards: { kind: "listings", total: 1, items: [card], label: card.place } };
    }
    case "list_areas": {
      const r = await api<any>(`/assistant/areas?city=${encodeURIComponent(String(a.city || ""))}&limit=25`).catch(() => null);
      return { forModel: r || { areas: [] } };
    }
    case "site_overview": {
      return { forModel: await api<any>("/assistant/overview").catch(() => ({ error: "unavailable" })) };
    }
    case "read_article": {
      const slug = String(a.ref || "").replace(/^.*\/blog\//, "").replace(/[?#].*$/, "").replace(/\/$/, "").slice(0, 150);
      const b = await api<any>(`/blog/slug/${encodeURIComponent(slug)}`).catch(() => null);
      const blog = b?.data || b;
      if (!blog?.title) return { forModel: { found: false } };
      const text = String(blog.content || "").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      return { forModel: { title: blog.title, url: `/blog/${blog.slug || slug}`, text: text.slice(0, 3500) }, cards: { kind: "guides", items: [{ title: blog.title, url: `/blog/${blog.slug || slug}`, excerpt: String(blog.excerpt || "").slice(0, 160), image: blog.featuredImage || "" }] } };
    }
    case "dealer_profile": {
      let id = /([a-f0-9]{24})(?:\/?$|[?#])/i.exec(String(a.url || ""))?.[1] || "";
      let city = "";
      let fromSearch: any = null;
      if (!id && a.name) {
        const s = await api<any>(`/dealers/search?q=${encodeURIComponent(String(a.name).slice(0, 60))}`).catch(() => null);
        const d = (s?.dealers || [])[0];
        if (!d) return { forModel: { found: false, note: `No dealer named ${a.name} on the site.` } };
        id = d._id;
        city = d.city?.name || "";
        fromSearch = d;
      }
      if (!id) return { forModel: { found: false } };
      const [p, rev] = await Promise.all([api<any>(`/agents/${id}`).catch(() => null), api<any>(`/agents/${id}/reviews/summary`).catch(() => null)]);
      const prof = p?.profile || p?.user || p;
      if (!prof?.name && !prof?.companyName) return { forModel: { found: false } };
      const name = String(prof.companyName || prof.name);
      const listings = Number(fromSearch?.listings ?? (Array.isArray(p?.listings) ? p.listings.length : p?.total ?? 0)) || 0;
      const summary = rev?.data || rev || {};
      const url = dealerHref({ _id: id, name: prof.name, companyName: prof.companyName, agency: null } as any);
      return {
        forModel: {
          name,
          city: city || prof.city?.name || "",
          about: String(prof.bio || "").replace(/<[^>]+>/g, " ").slice(0, 500),
          experienceYears: prof.experienceYears || fromSearch?.experienceYears || null,
          verified: !!(p?.verified || fromSearch?.verified),
          liveListings: listings,
          rating: summary.average ?? summary.avg ?? null,
          reviews: summary.count ?? summary.total ?? null,
          profileUrl: url,
          note: "Contact is on the profile page; never give numbers.",
        },
        cards: { kind: "agents", city: city || "", total: 1, items: [{ name, url, avatar: prof.avatarUrl || "", verified: !!(p?.verified || prof.verified), listings, years: prof.experienceYears || 0, isAgency: !!prof.companyName, agency: "", plan: "", city }], moreUrl: url, query: name, exact: 1 },
      };
    }
    case "site_info": {
      const topic = String(a.topic || "").toLowerCase().trim();
      if (/contact|phone|whatsapp|email|number/.test(topic)) {
        const s = await cached("site_settings", 5 * 60_000, () => api<any>("/site-settings").catch(() => ({})));
        const v = s?.data || s || {};
        return { forModel: { siteName: v.siteName, phone: v.contactPhone, whatsapp: v.contactWhatsapp || v.contactPhone, email: v.contactEmail, contactPage: "/contact" }, cards: { kind: "support" } };
      }
      if (/plan|package|price|pricing|subscription/.test(topic)) {
        const r = await cached("packages", 5 * 60_000, () => api<any>("/packages").catch(() => []));
        const list: any[] = Array.isArray(r) ? r : r?.data || r?.packages || [];
        const keep = (o: any) => Object.fromEntries(Object.entries(o).filter(([k, v]) => !k.startsWith("_") && !/At$|^id$|stripe|internal/i.test(k) && (typeof v !== "object" || Array.isArray(v))).map(([k, v]) => [k, Array.isArray(v) ? v.slice(0, 8) : v]));
        return { forModel: { plans: list.slice(0, 8).map(keep), page: "/packages" } };
      }
      const slug = topic.replace(/[^a-z0-9-]/g, "") || "about";
      const pg = await api<any>(`/page/slug/${encodeURIComponent(slug)}`).catch(() => null);
      const page = pg?.data || pg;
      if (!page?.title && !page?.content) return { forModel: { found: false, pages: ["about", "contact", "terms", "privacy-policy"] } };
      const text = String(page.content || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      return { forModel: { title: page.title, url: `/${slug}`, text: text.slice(0, 3000) } };
    }
    case "smart_search": {
      const text = String(a.text || "").slice(0, 300);
      const want = readSearch(text);
      const where = await api<any>(`/assistant/match?text=${encodeURIComponent(text)}`).catch(() => null);
      const place = where?.place;
      const city = where?.city;
      // Nowhere named: the search form, already filled in with what they said.
      if (!place && !city) {
        return {
          forModel: { needsPlace: true },
          cards: { kind: "form", form: "search", prefill: { purpose: want.purpose, type: want.type || undefined, marla: want.marla, maxPrice: want.maxPrice } },
        };
      }
      const scope = place ? { place_ids: place.ids, city: place.city, city_id: place.cityId, location: place.name } : { city: city.name, city_id: city.id, location: city.name };
      if (want.priceQuestion) {
        return runTool("market_prices", { ...scope, purpose: want.purpose, types: want.type ? [want.type] : undefined, min_marla: want.marla, max_marla: want.marla });
      }
      const args = {
        ...scope,
        purpose: want.purpose,
        types: want.type ? [want.type] : undefined,
        min_marla: want.marla,
        max_marla: want.marla,
        min_price: want.minPrice,
        max_price: want.maxPrice,
        min_beds: want.beds,
        keywords: want.extras.length ? want.extras.join(" ") : undefined,
        sort: "best",
      };
      const r = await runTool("search_listings", args);
      if (r.cards?.kind !== "listings" || r.cards.total) return r;
      // Nothing matches everything: loosen one thing at a time and show the closest, saying what changed.
      const steps: { note: string; change: Record<string, unknown> }[] = [
        ...(args.keywords ? [{ note: `without "${args.keywords}"`, change: { keywords: undefined } }] : []),
        ...(args.min_beds ? [{ note: "any number of bedrooms", change: { keywords: undefined, min_beds: undefined } }] : []),
        ...(args.max_price || args.min_price
          ? [{ note: `a little over your budget`, change: { keywords: undefined, min_beds: undefined, min_price: undefined, max_price: args.max_price ? Math.round(Number(args.max_price) * 1.25) : undefined } }]
          : []),
        ...(args.min_marla ? [{ note: "other sizes", change: { keywords: undefined, min_beds: undefined, min_marla: undefined, max_marla: undefined } }] : []),
        ...(args.max_price || args.min_price ? [{ note: "any budget", change: { keywords: undefined, min_beds: undefined, min_price: undefined, max_price: undefined } }] : []),
        ...(args.types ? [{ note: "other property types", change: { keywords: undefined, min_beds: undefined, types: undefined } }] : []),
        { note: "nearby options in the area", change: { keywords: undefined, min_beds: undefined, min_price: undefined, max_price: undefined, min_marla: undefined, max_marla: undefined, types: undefined } },
      ];
      let change: Record<string, unknown> = {};
      const loosened: string[] = [];
      for (const s of steps) {
        change = { ...change, ...s.change };
        // Later steps include earlier ones ("any budget" replaces "a little over your budget").
        if (s.note === "any budget") {
          const i = loosened.indexOf("a little over your budget");
          if (i >= 0) loosened.splice(i, 1);
        }
        loosened.push(s.note);
        const near = await runTool("search_listings", { ...args, ...change });
        if (near.cards?.kind === "listings" && near.cards.total) {
          const said = loosened.length > 1 ? `${loosened.slice(0, -1).join(", ")} and ${loosened[loosened.length - 1]}` : loosened[0];
          const note = `No exact match right now — closest options with ${said}.`;
          return { forModel: { ...(near.forModel as object), exactMatches: 0, relaxed: s.note }, cards: { ...near.cards, note, q: { ...(near.cards.q || {}), wanted: args } } };
        }
      }
      return r;
    }
    case "contact_support": {
      return {
        forModel: { shown: "The team's WhatsApp and call buttons are on screen. Say one short, warm line; no phone numbers in text." },
        cards: { kind: "support", topic: String(a.topic || "").slice(0, 120) || undefined },
      };
    }
    case "show_search_form": {
      return {
        forModel: { shown: "A search form is now on screen, prefilled with what the user said. Say one short line inviting them to fill it in. Do not ask any questions." },
        cards: {
          kind: "form",
          form: "search",
          prefill: {
            purpose: "rent",
            city: a.city || undefined,
            location: a.location || undefined,
            type: a.type || undefined,
            marla: Number(a.marla) || undefined,
            maxPrice: Number(a.max_price) || undefined,
            beds: Number(a.beds) || undefined,
          },
        },
      };
    }
    case "find_agents": {
      // A name: look in every city (or the one they said) — never in a guessed one.
      if (String(a.name || "").trim()) {
        const name = String(a.name).trim().slice(0, 60);
        const city = String(a.city || "").trim();
        const r = await api<any>(`/dealers/search?q=${encodeURIComponent(name)}${city ? `&city=${encodeURIComponent(city)}` : ""}`).catch(() => null);
        const found: any[] = r?.dealers || [];
        const items = found.map((d: any) => ({
          name: d.name,
          url: dealerHref(d),
          avatar: d.avatarUrl || "",
          verified: !!d.verified,
          listings: d.listings || 0,
          years: d.experienceYears || 0,
          isAgency: !!d.isAgency,
          agency: d.agency?.name ? `${d.agency.name}` : "",
          plan: d.plan || "",
          city: d.city?.name || "",
        }));
        const exact = r?.exact ?? 0;
        return {
          forModel: {
            searchedFor: name,
            inCity: city || "all cities",
            exactMatches: exact,
            similarNames: exact ? [] : items.map((d) => d.name),
            matches: items.map((d) => ({ name: d.name, city: d.city, verified: d.verified, listings: d.listings })),
            shownAsCard: items.length > 0,
          },
          cards: {
            kind: "agents",
            q: { name, city: city || undefined },
            city: city || "",
            query: name,
            exact,
            total: r?.total ?? items.length,
            items,
            moreUrl: city ? dealersCityPath(CITY_SLUG(city)) : "/property-dealers",
          },
        };
      }
      const city = String(a.city || "").trim();
      if (!city) return { forModel: { needCity: "Ask which city in one short line (offer Lahore, Karachi, Islamabad, Rawalpindi)." } };
      const slug = CITY_SLUG(city);
      const r = await api<any>(`/dealers/city/${encodeURIComponent(slug)}?limit=60${a.name ? `&q=${encodeURIComponent(String(a.name).slice(0, 40))}` : ""}`).catch(() => null);
      if (!r) return { forModel: { error: `No dealer directory for ${city}` }, cards: { kind: "agents", q: { city }, city, total: 0, items: [], moreUrl: "/property-dealers" } };
      const all = [...(r.agencies || []), ...(r.agents || [])].sort(
        (x: any, y: any) => Number(y.verified) - Number(x.verified) || (y.rank || 0) - (x.rank || 0) || (y.listings || 0) - (x.listings || 0),
      );
      const items = all.slice(0, 6).map((d: any) => ({
        name: d.name,
        url: dealerHref(d),
        avatar: d.avatarUrl || "",
        verified: !!d.verified,
        listings: d.listings || 0,
        years: d.experienceYears || 0,
        isAgency: !!d.isAgency,
        agency: d.agency?.name || "",
        // No phone numbers here, on purpose: the assistant must not become a
        // way to collect dealers' numbers in bulk. Contact is on the profile.
        plan: d.plan || "",
      }));
      const cityName = r.city?.name || city;
      const total = (r.found?.agencies ?? 0) + (r.found?.agents ?? 0);
      return {
        forModel: { city: cityName, total, shownAsCard: true, top: items.map((d) => ({ name: d.name, verified: d.verified, listings: d.listings, agency: d.isAgency })) },
        cards: { kind: "agents", q: { city: cityName, name: a.name }, city: cityName, total, items, moreUrl: dealersCityPath(r.city?.slug || slug) },
      };
    }
    case "site_guides": {
      const r = await api<any>(`/assistant/guides?q=${encodeURIComponent(String(a.query || ""))}`).catch(() => ({ guides: [] }));
      const items = r.guides || [];
      return { forModel: { articles: items.map((g: any) => ({ title: g.title, url: g.url, summary: g.excerpt })), shownAsCard: items.length > 0 }, cards: items.length ? { kind: "guides", items } : undefined };
    }
    default:
      return { forModel: { error: `Unknown tool ${name}` } };
  }
}
