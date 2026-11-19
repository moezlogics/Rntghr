/**
 * What the assistant offers next, worked out from what is on screen — the
 * place, size, type, prices and options of the card just shown — so every
 * suggestion names the exact thing ("10 Marla houses under PKR 80,000",
 * "Rooms for rent in Johar Town"), never a vague "Rents in Lahore".
 *
 * Also answers the plainest typed questions (a rental search, dealers in a
 * city) straight away, without the model: instant and free.
 *
 * No model and no network here; it is all plain rules over the card's data.
 */
import type { QuickRequest, SearchPrefill, Visual } from "@/lib/assistant/types";
import { moneyText, sizeLabel } from "./AssistantCards";

export type Action =
  | { type: "send"; text: string }
  | { type: "quick"; req: QuickRequest; say: string }
  | { type: "form"; card: Visual; say: string; intro: string }
  | { type: "link"; href: string }
  | { type: "support"; topic?: string };

/** Hand over to a person (WhatsApp first). */
export const TALK_TO_TEAM: Chip = { label: "Talk to our team", action: { type: "support" } };

/** "I want to talk to a person", "helpline", "apka number", "contact"… */
export function wantsPerson(text: string): boolean {
  const t = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ")} `;
  return (
    /\b(human|insaan|insan|banda|bande|person|real person|representative|customer care|customer support|support|helpline|help line|call center|operator|team se|aap ka number|apka number|aapka number|your number|contact number|contact you|contact karna|baat karni|baat krni|baat karna|baat krna|rabta|raabta)\b/.test(t) &&
    !/\b(dealer|dealers|agent|agents|owner|owners|seller|sellers)\b/.test(t)
  );
}

/** The page where the team searches for them. */
export const FIND_FOR_ME: Chip = { label: "Let our team find it for you", action: { type: "link", href: "/find-property-for-me" } };
export type Chip = { label: string; action: Action };

export const SEARCH_INTRO = "Fill in what you know — leave the rest on Any.";
export const searchForm = (prefill?: SearchPrefill): Visual => ({ kind: "form", form: "search", prefill });

/** For reading typed messages only; the pickers load the site's own list. */
const KNOWN_CITIES = [
  "Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Gujranwala", "Sialkot", "Bahawalpur", "Hyderabad", "Quetta",
  "Sargodha", "Sahiwal", "Okara", "Kasur", "Sheikhupura", "Gujrat", "Jhelum", "Jhang", "Chiniot", "Hafizabad", "Kamoke", "Khanewal", "Burewala",
  "Dera Ghazi Khan", "Rahim Yar Khan", "Sadiqabad", "Larkana", "Sukkur", "Sakrand", "Wah Cantt", "Wah Cant", "Wah", "Mardan", "Abbottabad",
  "Bahawalnagar", "Mandi Bahauddin", "Attock", "Chakwal", "Mirpur", "Muzaffarabad", "Gwadar", "Nawabshah", "Vehari", "Pakpattan", "Toba Tek Singh",
];
const DEALER_CITIES = KNOWN_CITIES;

const quick = (label: string, tool: QuickRequest["tool"], args: Record<string, unknown>, say = label): Chip => ({ label, action: { type: "quick", req: { tool, args }, say } });

/** "houses", "portions", "flats", "rooms", "properties". */
function typeWord(types: unknown, plural = true): string {
  const t = Array.isArray(types) && types.length === 1 ? String(types[0]) : "";
  const one = t === "house" ? "house" : t === "upper-portion" ? "upper portion" : t === "lower-portion" ? "lower portion" : t === "flat" || t === "apartment" ? "flat" : t === "room" ? "room" : t === "hostel" ? "hostel" : t === "warehouse" ? "warehouse" : t === "commercial" ? "commercial property" : t === "shop" ? "shop" : t === "office" ? "office" : "property";
  if (!plural) return one;
  return one === "property" ? "properties" : one === "commercial property" ? "commercial properties" : `${one}s`;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "10 Marla" / "1 Kanal" → marla. */
function marlaOf(size: string): number {
  const m = /([\d.]+)\s*(marla|kanal)/i.exec(size || "");
  if (!m) return 0;
  return m[2]!.toLowerCase() === "kanal" ? Number(m[1]) * 20 : Number(m[1]);
}

/** A round budget a person would say: 3 Crore, 2.5 Crore, 85 Lakh, 60,000. */
function niceBudget(v: number): number {
  if (v >= 1e7) return Math.ceil(v / 5e6) * 5e6;
  if (v >= 1e6) return Math.ceil(v / 5e5) * 5e5;
  if (v >= 1e5) return Math.ceil(v / 5e4) * 5e4;
  return Math.ceil(v / 5e3) * 5e3;
}

function mostCommon<T>(list: T[]): { v: T; n: number } | null {
  const m = new Map<T, number>();
  for (const x of list) if (x) m.set(x, (m.get(x) || 0) + 1);
  let best: { v: T; n: number } | null = null;
  for (const [v, n] of m) if (!best || n > best.n) best = { v, n };
  return best;
}

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)]! : 0;
};


/** Follow-ups for a card. At most four, most useful first. */
export function chipsFor(card: Visual | null | undefined): Chip[] {
  if (!card) return [];
  const a: Record<string, any> = card.q || {};
  const scope = { place_ids: a.place_ids, city_id: a.city_id, location: a.location, city: a.city };
  const out: Chip[] = [];
  const push = (c: Chip | null | false | undefined) => {
    if (c && out.length < 4 && !out.some((x) => x.label === c.label)) out.push(c);
  };

  switch (card.kind) {
    case "listings": {
      const [place = "", city = a.city || ""] = (card.label || "").split(", ");
      const where = place || city;
      const T = typeWord(a.types);
      const prefill: SearchPrefill = {
        purpose: "rent",
        city: city || a.city,
        location: place || undefined,
        placeId: Array.isArray(a.place_ids) && a.place_ids.length === 1 ? a.place_ids[0] : undefined,
        type: Array.isArray(a.types) ? a.types[0] : undefined,
        marla: a.min_marla,
        maxPrice: a.max_price,
        beds: a.min_beds,
      };
      const edit: Chip = { label: "Edit search", action: { type: "form", card: searchForm(prefill), say: "Edit search", intro: SEARCH_INTRO } };

      if (!card.total) {
        push(FIND_FOR_ME);
        push(TALK_TO_TEAM);
        if (a.max_price) push(quick(`${cap(T)} at any budget${where ? ` in ${where}` : ""}`, "search_listings", { ...a, max_price: undefined }));
        if (a.min_marla) push(quick(`Any size ${T}${where ? ` in ${where}` : ""}`, "search_listings", { ...a, min_marla: undefined, max_marla: undefined }));
        if (place && city) push(quick(`${cap(T)} anywhere in ${city}`, "search_listings", { ...a, place_ids: undefined, location: undefined, city }));
        if (a.min_beds) push(quick(`Any bedrooms${where ? ` in ${where}` : ""}`, "search_listings", { ...a, min_beds: undefined }));
        push(edit);
        return out;
      }

      const items = card.items || [];
      // A size most of these are.
      if (!a.min_marla) {
        const s = mostCommon(items.map((i) => i.size).filter(Boolean));
        if (s && s.n >= 2 && marlaOf(s.v)) push(quick(`Only ${s.v} ${T}`, "search_listings", { ...a, min_marla: marlaOf(s.v), max_marla: marlaOf(s.v) }, `${s.v} ${T} for rent${where ? ` in ${where}` : ""}`));
      }
      // A budget a little under the middle of these.
      if (!a.max_price && items.length >= 3) {
        const prices = items.map((i: any) => Number(i.price) || 0).filter((n) => n > 0);
        if (prices.length >= 3) {
          const b = niceBudget(median(prices));
          if (b < Math.max(...prices)) push(quick(`${cap(T)} under PKR ${moneyText(b)}`, "search_listings", { ...a, max_price: b }, `${cap(T)} under PKR ${moneyText(b)}${where ? ` in ${where}` : ""}`));
        }
      }
      // Several areas under one name: the part most of these are in.
      if (Array.isArray(a.place_ids) && a.place_ids.length > 1) {
        const sub = mostCommon(items.map((i) => (i.place || "").split(",")[0]!.trim()).filter((p) => p && p.toLowerCase() !== place.toLowerCase()));
        if (sub && sub.n >= 2) push(quick(`Only in ${sub.v}`, "search_listings", { ...a, place_ids: undefined, city_id: undefined, location: sub.v, city }, `${cap(T)} in ${sub.v}`));
      }
      // What these cost there, for exactly this size and type.
      if (where) {
        const size = a.min_marla && a.min_marla === a.max_marla ? `${sizeLabel(a.min_marla)} ` : "";
        push(quick(cap(`${size}${typeWord(a.types, false)} rent in ${where}`), "market_prices", { ...scope, purpose: "rent", types: a.types, min_marla: a.min_marla, max_marla: a.max_marla }));
      }
      if (card.total > items.length && a.sort !== "cheapest") push(quick(`Cheapest ${T} first`, "search_listings", { ...a, sort: "cheapest" }));
      if (where && !(Array.isArray(a.types) && a.types[0] === "room")) push(quick(`Rooms for rent in ${where}`, "search_listings", { ...a, types: ["room"], min_marla: undefined, max_marla: undefined, min_beds: undefined, sort: "best" }));
      if (out.length < 4) push(edit);
      out.push(FIND_FOR_ME);
      return out;
    }

    case "market": {
      const m = card.market.find((x) => x.listings > 0);
      const place = card.place.split(", ")[0] || card.place;
      const city = card.place.split(", ")[1] || a.city || "";
      if (!m) {
        if (city && city !== place) push(quick(`Rents in all of ${city}`, "market_prices", { city }));
        push({ label: "Check another area", action: { type: "form", card: { kind: "form", form: "market", prefill: { city } }, say: "Check another area", intro: "Which area would you like to check?" } });
        return out;
      }
      const T = typeWord(a.types);
      const sizes = (m.bySize || []).slice(0, 2);
      for (const s of sizes) {
        const mm = marlaOf(s.size);
        if (mm) push(quick(`${s.size} ${T} for rent here`, "search_listings", { ...scope, purpose: "rent", types: a.types, min_marla: mm, max_marla: mm }, `${s.size} ${T} for rent in ${place}`));
      }
      push({ label: "Compare another area", action: { type: "form", card: { kind: "form", form: "market", prefill: { city } }, say: "Compare another area", intro: "Which area would you like to compare?" } });
      return out;
    }

    case "agents": {
      const city = card.city;
      push(quick(`Houses for rent in ${city}`, "search_listings", { purpose: "rent", city, location: city, types: ["house"] }));
      push(quick(`Portions for rent in ${city}`, "search_listings", { purpose: "rent", city, location: city, types: ["upper-portion", "lower-portion"] }));
      push(quick(`Typical rents in ${city}`, "market_prices", { city, location: city }));
      return out;
    }

    default:
      return [];
  }
}

/* ── plain questions answered without the model ─────────────────────────── */

/** Anything that needs thinking, comparing or explaining goes to the model. */

/** "I want / show me a house / portion / room … in X, N marla, Y thousand": a search, answered with rental cards. */
const SEARCH_THING = /\b(ghar|house|houses|home|makan|makaan|flat|flats|apartment|apartments|room|rooms|kamra|hostel|shop|shops|dukan|office|warehouse|godown|portion|bungalow|property|properties)\b/;
const SEARCH_DETAIL = /\b(marla|marle|kanal|crore|cr|karor|lakh|lac|budget|rent|kiraya|kiraye|kiraye par|lena|leni|chahiye|chahye|chahiyay|dikhao|dikhayen|show|find|dhoond|dhundo|available|mein|main|in|tak|under|upto)\b/;
const NOT_A_SEARCH = /\b(compare|vs|versus|difference|farq|fark|why|kyun|kyon|kaise|how|should|better|behtar|investment|invest|return|profit|agreement|police|registration|documents|legal|notice)\b/;

/** A typed message the app can answer itself, or null to ask the model. */
export function localRoute(text: string): QuickRequest | null {
  const t = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}\s.]/gu, " ").replace(/\s+/g, " ")} `;
  if (t.length < 160 && SEARCH_THING.test(t) && SEARCH_DETAIL.test(t) && !NOT_A_SEARCH.test(t) && !/\?.*\?/.test(t)) {
    return { tool: "smart_search", args: { text: text.slice(0, 300) } };
  }
  if (t.length > 90) return null;

  // "moez naam ka koi dealer hai?", "is there a dealer named Ali Estate", "agent Usman"
  const named =
    /\b([a-z][a-z.]{2,24}(?: [a-z][a-z.]{2,24}){0,2}) (?:name|naam|nam) (?:ka|ki|ke|wala|wali|waly|walay|wale|walay|se)\b/.exec(t) ||
    /\b(?:dealer|dealers|agent|agents|agency|estate|realtor)s? (?:named|called|name|naam|by the name of|ka naam) ([a-z][a-z.]{2,24}(?: [a-z][a-z.]{2,24}){0,2})/.exec(t) ||
    /\b(?:named|called) ([a-z][a-z.]{2,24}(?: [a-z][a-z.]{2,24}){0,2}) (?:dealer|agent|agency|estate)/.exec(t);
  if (named && /\b(dealer|dealers|agent|agents|agency|agencies|estate|realtor|broker|property)\b|ڈیلر/.test(t)) {
    // Only the name: no filler words, no city ("lahore mein usman" → "usman").
    const filler = new Set(["koi", "kya", "is", "the", "a", "any", "ek", "wo", "woh", "website", "site", "par", "pr", "pe", "per", "hai", "he", "mein", "main", "me", "in", "se", "ka", "ki", "ke", "yr", "yar", "yaar", "bhai", "property", "dealer", "agent", "of", "from", ...DEALER_CITIES.flatMap((c) => c.toLowerCase().split(" "))]);
    const name = named[1]!.split(" ").filter((w) => !filler.has(w)).join(" ").trim();
    if (name.length >= 3) {
      const city = DEALER_CITIES.find((c) => t.includes(` ${c.toLowerCase()} `));
      return { tool: "find_agents", args: { name, city } };
    }
  }

  // "dealers in lahore", "karachi property agent", "lahore ke dealer"
  if (/\b(dealer|dealers|agent|agents|agency|agencies|broker|brokers)\b|ڈیلر|ایجنٹ/.test(t) && !/\b(compare|best|why|kyun|fee|commission|how|kaise)\b/.test(t)) {
    const city = DEALER_CITIES.find((c) => t.includes(` ${c.toLowerCase()} `));
    if (city) return { tool: "find_agents", args: { city } };
  }
  return null;
}
