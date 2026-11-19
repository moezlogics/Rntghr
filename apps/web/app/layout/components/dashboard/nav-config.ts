import {
  Banknote,
  Megaphone,
  BellRing,
  Calculator,
  BarChart3,
  BookOpen,
  Flag,
  Building2,
  CreditCard,
  FileText,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  Layers,
  MapPin,
  Map as MapIcon,
  Package2,
  Palette,
  ShoppingBag,
  Store,
  Tags,
  Settings,
  Users,
  Wallet,
  Star,
  Bell,
  HousePlus,
} from "lucide-react";
import type { ComponentType } from "react";

export interface NavLeaf {
  title: string;
  /** Shown instead of title to non-admins, where the admin wording would mislead. */
  agentTitle?: string;
  href: string;
  /** Match the href exactly. Use for index routes whose children are separate entries. */
  exact?: boolean;
  adminOnly?: boolean;
  /** Hidden from admins — for agent-side screens. */
  agentOnly?: boolean;
  /** Hidden from an agency's own agents — the plan and the team are the agency owner's. */
  notForTeamAgents?: boolean;
  /** Extra words the sidebar filter should match against. */
  keywords?: string[];
}

export interface NavGroup {
  /** Stable id used as the collapsible key. */
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  /** Path prefixes that belong to this group, used for active and auto-open state. */
  matches: string[];
  items: NavLeaf[];
  adminOnly?: boolean;
}

export interface NavSection {
  /** Section heading, or null for the ungrouped top block. */
  label: string | null;
  entries: (NavGroup | NavLeaf)[];
}

export function isGroup(entry: NavGroup | NavLeaf): entry is NavGroup {
  return "items" in entry;
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    entries: [
      {
        title: "Overview",
        href: "/dashboard",
        exact: true,
        keywords: ["home", "stats", "dashboard"],
      },
      {
        // An agent's second-most-visited screen after their listings: "is
        // anybody looking at them?". Not admin-only — the numbers are scoped
        // to whoever is asking.
        title: "Insights",
        href: "/dashboard/insights",
        keywords: ["analytics", "views", "performance", "stats", "enquiries"],
      },
      {
        // An agency owner's agent accounts (the agency plans); explains the plans to everyone else.
        title: "My Team",
        href: "/dashboard/team",
        agentOnly: true,
        notForTeamAgents: true,
        keywords: ["agents", "team", "agency", "staff"],
      },
      {
        // Top level, the way WordPress puts Media — and deliberately NOT
        // admin-only: agents upload property photos, and the API scopes the
        // library so each one only ever sees their own uploads.
        title: "Media Library",
        href: "/dashboard/images-gallery",
        keywords: ["images", "gallery", "photos", "uploads", "media"],
      },
    ],
  },
  {
    label: "Real Estate",
    entries: [
      {
        id: "properties",
        title: "Properties",
        icon: Building2,
        matches: [
          "/dashboard/property",
          "/dashboard/import",
          "/dashboard/listed-properties",
        ],
        items: [
          {
            title: "All Properties",
            // An agent only ever sees their own rows here (the API scopes the
            // list by owner), so "All" would be a lie.
            agentTitle: "My Properties",
            href: "/dashboard/property",
            exact: true,
            keywords: ["listings"],
          },
          {
            title: "Add Property",
            href: "/dashboard/property/add-property",
            keywords: ["new", "create"],
          },
          {
            title: "Bulk Import",
            href: "/dashboard/import",
            adminOnly: true,
            keywords: ["csv", "excel", "upload"],
          },
        ],
      },
      {
        id: "locations",
        title: "Locations",
        icon: MapPin,
        // Cities and areas are ADMIN-only on the API (city.controller.ts /
        // area.controller.ts guard every write with AdminGuard). Agents used to
        // see these four links and get a 403 on save.
        adminOnly: true,
        matches: ["/dashboard/city", "/dashboard/area", "/dashboard/property-dealers"],
        items: [
          { title: "Cities", href: "/dashboard/city", exact: true },
          { title: "Add City", href: "/dashboard/city/add-city" },
          {
            title: "Areas",
            href: "/dashboard/area",
            exact: true,
            keywords: ["mohalla", "sector", "locality"],
          },
          { title: "Add Area", href: "/dashboard/area/add-area" },
          // Each city's /property-dealers-in-<city> page: its SEO and text.
          { title: "Property Dealers Pages", href: "/dashboard/property-dealers", keywords: ["agents", "agencies", "dealers", "city", "seo", "directory"] },
        ],
      },
    ],
  },
  {
    label: "Content",
    entries: [
      {
        id: "blog",
        title: "Blog",
        icon: BookOpen,
        adminOnly: true,
        // Ordered longest-first so /dashboard/blog-category never resolves as
        // a child of /dashboard/blog.
        matches: ["/dashboard/blog-category", "/dashboard/blog"],
        items: [
          {
            title: "All Posts",
            href: "/dashboard/blog",
            exact: true,
            keywords: ["articles"],
          },
          {
            title: "Write New Post",
            href: "/dashboard/blog/add-blog",
            keywords: ["create", "draft"],
          },
          {
            title: "Categories",
            href: "/dashboard/blog-category",
            exact: true,
            keywords: ["taxonomy", "tags"],
          },
          {
            title: "Add Category",
            href: "/dashboard/blog-category/add-category",
          },
        ],
      },
      {
        id: "pages",
        title: "Static Pages",
        icon: FileText,
        adminOnly: true,
        matches: ["/dashboard/pages"],
        items: [
          {
            title: "All Pages",
            href: "/dashboard/pages",
            exact: true,
            keywords: ["seo", "cms", "landing"],
          },
          { title: "Add Page", href: "/dashboard/pages/add-page" },
        ],
      },
    ],
  },
  {
    label: "Billing",
    entries: [
      {
        id: "packages",
        title: "Packages",
        icon: Package2,
        adminOnly: true,
        matches: ["/dashboard/packages"],
        items: [
          {
            title: "All Packages",
            href: "/dashboard/packages",
            exact: true,
            keywords: ["plans", "pricing"],
          },
          { title: "Add Package", href: "/dashboard/packages/add" },
        ],
      },
      {
        title: "Subscriptions",
        href: "/dashboard/subscriptions",
        adminOnly: true,
        keywords: ["billing", "payments", "plans", "invoices", "verify"],
      },
      {
        title: "Payment Methods",
        href: "/dashboard/payment-methods",
        adminOnly: true,
        keywords: ["jazzcash", "easypaisa", "bank", "account", "checkout"],
      },
      {
        title: "My Subscription",
        href: "/dashboard/my-subscription",
        keywords: ["plan", "billing", "upgrade"],
      },
      {
        title: "Notifications",
        href: "/dashboard/push-settings",
        keywords: ["push", "notifications", "alerts", "phone", "devices"],
      },
      {
        /*
         * The one billing entry an agent can see.
         *
         * Packages, Subscriptions and Payment Methods are all adminOnly, so
         * the only way to buy anything was a "View Packages" button on the My
         * Subscription page — one click deeper than anyone looks. An agent
         * who wants to pay should never have to hunt for where.
         */
        title: "Buy a Plan",
        href: "/dashboard/purchase-package",
        notForTeamAgents: true,
        keywords: ["package", "packages", "upgrade", "subscribe", "checkout", "pay"],
      },
    ],
  },
  {
    label: "Administration",
    entries: [
      {
        title: "Property Requests",
        href: "/dashboard/property-requests",
        adminOnly: true,
        keywords: ["find property for me", "leads", "requests", "tenants", "tenants", "enquiries"],
      },
      {
        title: "Reports",
        href: "/dashboard/reports",
        adminOnly: true,
        keywords: ["flag", "scam", "fraud", "complaints", "abuse"],
      },
      {
        title: "Push Notifications",
        href: "/dashboard/push",
        adminOnly: true,
        keywords: ["push", "campaign", "broadcast", "subscribers", "notify", "send notification"],
      },
      {
        title: "Reviews",
        href: "/dashboard/reviews",
        adminOnly: true,
        keywords: ["review", "rating", "stars", "approve", "approval", "agent reviews"],
      },
      {
        title: "Users",
        href: "/dashboard/users",
        exact: true,
        adminOnly: true,
        keywords: ["accounts", "agents", "roles", "permissions"],
      },
      {
        title: "General Settings",
        href: "/dashboard/settings",
        adminOnly: true,
        keywords: ["settings", "contact", "phone", "whatsapp", "email", "social", "footer", "seo", "analytics", "announcement", "homepage"],
      },
      {
        title: "Appearance",
        href: "/dashboard/appearance",
        adminOnly: true,
        keywords: ["theme", "colour", "color", "brand", "logo", "font", "favicon", "design", "hero", "background"],
      },
      {
        title: "Notifications",
        href: "/dashboard/notifications",
        adminOnly: true,
        keywords: ["discord", "alerts", "notify", "daily report", "digest"],
      },
      {
        title: "Ads",
        href: "/dashboard/ads",
        adminOnly: true,
        keywords: ["adsense", "google ads", "advertisement", "monetize", "ad slot", "publisher"],
      },
    ],
  },
];

/** Icons for the flat (non-group) leaves, keyed by href. */
export const LEAF_ICONS: Record<
  string,
  ComponentType<{ className?: string }>
> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/insights": BarChart3,
  "/dashboard/reports": Flag,
  "/dashboard/property-requests": HousePlus,
  "/dashboard/reviews": Star,
  "/dashboard/push": BellRing,
  "/dashboard/push-settings": Bell,
  "/dashboard/payment-methods": Banknote,
  "/dashboard/images-gallery": ImageIcon,
  "/dashboard/subscriptions": CreditCard,
  "/dashboard/my-subscription": Wallet,
  "/dashboard/purchase-package": Package2,
  "/dashboard/users": Users,
  "/dashboard/appearance": Palette,
  "/dashboard/settings": Settings,
  "/dashboard/ads": Megaphone,
  "/dashboard/notifications": BellRing,
};

/**
 * Every dashboard route that requires ADMIN, derived from the nav tree so the
 * layout guard and the sidebar can never disagree about who may see what.
 */
export function collectAdminRoutes(): string[] {
  const routes = new Set<string>();
  for (const section of NAV_SECTIONS) {
    for (const entry of section.entries) {
      if (isGroup(entry)) {
        if (entry.adminOnly) {
          for (const match of entry.matches) routes.add(match);
          for (const item of entry.items) routes.add(item.href);
        } else {
          for (const item of entry.items) {
            if (item.adminOnly) routes.add(item.href);
          }
        }
      } else if (entry.adminOnly) {
        routes.add(entry.href);
      }
    }
  }
  return [...routes];
}

/** Human labels for breadcrumbs, keyed by path segment. */
export const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  insights: "Insights",
  reports: "Reports",
  "property-requests": "Property Requests",
  property: "Properties",
  "add-property": "Add Property",
  "listed-properties": "Listed Properties",
  import: "Bulk Import",
  city: "Cities",
  "add-city": "Add City",
  "property-dealers": "Property Dealers Pages",
  area: "Areas",
  "add-area": "Add Area",
  blog: "Blog",
  "add-blog": "New Post",
  "blog-category": "Blog Categories",
  "add-category": "Add Category",
  pages: "Static Pages",
  "add-page": "Add Page",
  "images-gallery": "Media Library",
  packages: "Packages",
  subscriptions: "Subscriptions",
  "payment-methods": "Payment Methods",
  "my-subscription": "My Subscription",
  push: "Push Notifications",
  "push-settings": "Notifications",
  compose: "New campaign",
  reviews: "Reviews",
  "purchase-package": "Purchase Package",
  users: "Users",
  appearance: "Appearance",
  settings: "General Settings",
  account: "My Account",
  add: "Add",
  edit: "Edit",
};
