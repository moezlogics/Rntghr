/**
 * What the assistant can show besides text — shared by the server (tools,
 * routes) and the chat window. Each kind is drawn as its own visual card.
 */

export type ListingCard = {
  id: string;
  title: string;
  url: string;
  priceText: string;
  size: string;
  beds: number;
  baths: number;
  place: string;
  photo: string | null;
  verified: boolean;
  featured: boolean;
  purpose: string;
};

export type SearchPrefill = {
  purpose?: "rent";
  city?: string;
  location?: string;
  placeId?: string;
  type?: string;
  marla?: number;
  maxPrice?: number;
  beds?: number;
};

/** Every card keeps the lookup behind it (`q`), so follow-up suggestions can name the exact place, size and item. */
export type Visual = { q?: Record<string, any> } & (
  | { kind: "listings"; total: number; items: ListingCard[]; moreUrl?: string; moreExact?: boolean; label?: string; priceRange?: { min: string; max: string } | null; note?: string }
  | {
      kind: "market";
      place: string;
      url?: string;
      market: {
        purpose: "rent";
        listings: number;
        median?: string;
        typicalRange?: string;
        cheapest?: string;
        highest?: string;
        perMarla?: string | null;
        bySize?: { size: string; listings: number; median: string }[];
      }[];
    }
  | {
      kind: "agents";
      city: string;
      /** A name search: what was searched, and how many matched exactly (the rest are close spellings). */
      query?: string;
      exact?: number;
      total: number;
      items: { name: string; url: string; avatar: string; verified: boolean; listings: number; years: number; isAgency: boolean; agency: string; plan: string; city?: string }[];
      moreUrl: string;
    }
  | { kind: "guides"; items: { title: string; url: string; excerpt: string; image: string }[] }
  /** Reach a person: WhatsApp first, then a call, then the "find it for me" request. */
  | { kind: "support"; topic?: string }
  | { kind: "form"; form: "search"; prefill?: SearchPrefill }
  | { kind: "form"; form: "market"; prefill?: { city?: string; location?: string } }
);

/** A request the chat window can run directly, with no model involved. */
export type QuickRequest = { tool: "search_listings" | "market_prices" | "find_agents" | "smart_search"; args: Record<string, unknown> };
