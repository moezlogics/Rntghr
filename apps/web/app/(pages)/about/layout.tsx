import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/page-seo";
import { getSiteName } from "@/lib/site-settings.server";

/*
 * The page's metadata lives here (it was a client component when this was
 * written). Without it the route inherited the root layout's, which is the
 * home page's title and description word for word.
 *
 * Editable from Static Pages: create a page with the slug "about" and its
 * Meta Title / Meta Description win over the fallback below.
 */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteName();
  return pageMetadata("about", {
    title: `About ${site} — Pakistan's Rental Property Portal`,
    description:
      "Who we are: a Pakistani portal for rentals only, where tenants find houses, portions, flats, rooms and shops for rent and landlords and dealers fill them faster.",
    path: "/about",
    keywords: ["about rent ghar", "rental portal pakistan", "houses for rent pakistan"],
  });
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
