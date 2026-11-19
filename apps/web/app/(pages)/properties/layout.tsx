import type { Metadata } from "next";
import NavBar from "@/components/NavBar";
import Footer from "@/components/Footer";
import ArchiveSearchBar from "@/components/search/ArchiveSearchBar";
import { Suspense } from "react";
import { pageMetadata } from "@/lib/seo/page-seo";

/*
 * The search page's own metadata — and the fallback for everything under it.
 *
 * /properties is a client component, so this layout is the only place it can
 * declare any, and without it the busiest landing page on the site was going
 * out with the home page's title and description. Two near-identical pages
 * competing for the same queries is the worst case: the one that wins is
 * whichever Google picks, and the other is written off as a duplicate.
 *
 * Children (/properties/[slug], /properties/rent/...)
 * all generate their own, which takes precedence over this.
 *
 * Editable from Static Pages under the slug "properties".
 */
export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata("properties", {
    title: "Houses, Portions, Flats & Rooms for Rent in Pakistan | Rent Ghar",
    description:
      "Browse houses, upper and lower portions, flats, rooms, hostels, shops and offices for rent across Pakistan. Filter by city, area, size and monthly rent, and contact the owner or dealer directly.",
    path: "/properties",
    keywords: [
      "house for rent in pakistan",
      "upper portion for rent",
      "lower portion for rent",
      "flat for rent",
      "room for rent",
      "shop for rent",
    ],
  });
}

export default function PropertiesLayout({ children }: { children: React.ReactNode }) {
    // The search (as on the homepage) above every results page. The cities are on the homepage only.
    return (
        <>
            <Suspense fallback={<div className="h-[60px] border-b border-slate-200 bg-white" />}>
                <ArchiveSearchBar />
            </Suspense>
            {children}
        </>
    )
}
