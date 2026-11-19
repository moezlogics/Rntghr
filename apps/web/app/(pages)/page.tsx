 import HeroSection from "@/components/HeroSection";
import FeaturedSection from "@/components/FeaturedSection";
import BlogSection from "@/components/BlogSection";
import CityStories from "@/components/CityStories";
import AgentSignupSection from "@/components/AgentSignupSection";
import FAQSection from "@/components/FAQSection";
import { serverApi, getCityStories, getPlans, getSpotlightAgencies } from "@/lib/server-api";
import HomePlans from "@/components/home/HomePlans";
import HomeRentTypes from "@/components/home/HomeRentTypes";
import HomeHowItWorks from "@/components/home/HomeHowItWorks";
import { AdZone } from "@/components/ads/AdSlot";
import VerifiedAgencies from "@/components/home/VerifiedAgencies";
import { mainDealersPath } from "@/lib/dealers.server";
import { getSiteSettings } from "@/lib/site-settings.server";
import { mapBackendToFrontendProperty, sortPropertyTypes } from "@/lib/types/property-utils";
import { transformBlogsToPosts } from "@/lib/utils/blog-utils";
import { sortCitiesByPopularity } from "@/lib/pk";
import { Metadata } from "next";
import { SectionHeading } from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Rent Ghar | Houses, Portions, Flats & Rooms for Rent in Pakistan",
  description: "Find houses, upper and lower portions, flats, rooms, hostels, shops and offices for rent in Lahore, Islamabad, Karachi and across Pakistan. Contact owners and dealers directly on Rent Ghar.",
  alternates: {
    canonical: "/",
  },
};

export default async function Home() {
  // Settings → General → Homepage sections.
  const settings = await getSiteSettings();
  // ✅ Sab kuch ek saath fetch — parallel requests
  const [citiesResult, propertiesResult, typesResult, blogsResult, cityStoriesResult, plansResult, agenciesResult] =
    await Promise.allSettled([
      serverApi.getCityNames(),
      serverApi.getProperties(`limit=${settings.homeLatestCount || 8}`),
      serverApi.getTypes(),
      serverApi.getPublishedBlogs(),
      getCityStories(),
      settings.homeShowPlans ? getPlans() : Promise.resolve([]),
      settings.homeShowAgencies ? getSpotlightAgencies() : Promise.resolve([]),
    ]);
  const dealersHref = settings.homeShowAgencies ? await mainDealersPath().catch(() => null) : null;
  const cityStories = cityStoriesResult.status === "fulfilled" ? cityStoriesResult.value : [];
  const plans = plansResult.status === "fulfilled" ? plansResult.value : [];
  const agencies = agenciesResult.status === "fulfilled" ? agenciesResult.value : [];

  if (citiesResult.status === "rejected")
    console.error("❌ Cities fetch failed:", citiesResult.reason?.message || citiesResult.reason);
  if (propertiesResult.status === "rejected")
    console.error("❌ Properties fetch failed:", propertiesResult.reason?.message || propertiesResult.reason);
  if (typesResult.status === "rejected")
    console.error("❌ Types fetch failed:", typesResult.reason?.message || typesResult.reason);
  if (blogsResult.status === "rejected")
    console.error("❌ Blogs fetch failed:", blogsResult.reason?.message || blogsResult.reason);

  const citiesData: any[] = citiesResult.status === "fulfilled" ? citiesResult.value ?? [] : [];
  const propertiesData: any = propertiesResult.status === "fulfilled" ? propertiesResult.value : [];
  const typesData: any[] = typesResult.status === "fulfilled" ? typesResult.value ?? [] : [];
  const blogsData: any[] = blogsResult.status === "fulfilled" ? blogsResult.value ?? [] : [];

  // Properties
  const backendProperties = Array.isArray(propertiesData)
    ? propertiesData
    : (propertiesData as any)?.properties ?? [];

  const transformedProperties = backendProperties
    .map((p: any) => {
      // Cards need no description — it is the bulk of each listing's data.
      try { return { ...mapBackendToFrontendProperty(p), description: undefined }; }
      catch { return null; }
    })
    .filter(Boolean);

  const featuredProperties = transformedProperties.map((property: any) => ({
    id: property.id,
    image: property.image || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
    title: property.name,
    location: `${property.location ?? ""}, ${property.city ?? ""}`.replace(/^, |, $/g, ""),
    price: `Rs. ${(property.price ?? 0).toLocaleString("en-PK")}`,
    priceLabel: "Monthly Rent",
    beds: property.bedrooms ?? 0,
    baths: property.bathrooms ?? 0,
    marla: `${property.marla ?? 0} marla`,
    slug: property.slug,
  }));

  const processedTypes = typesData
    .filter((t: any) => typeof t === "string")
    .map((t: string) => t.charAt(0).toUpperCase() + t.slice(1));

  const sortedProcessedTypes = sortPropertyTypes(processedTypes, t => t);
  // Four cards with title and excerpt — not each article's full HTML, which
  // was most of the homepage's 1 MB.
  const processedBlogs = transformBlogsToPosts(blogsData)
    .slice(0, 4)
    .map((post) => ({ ...post, content: "" }));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://rentghar.pk';
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': 'Latest rentals',
    'description': 'The newest homes and commercial spaces for rent on Rent Ghar',
    'numberOfItems': featuredProperties.length,
    'itemListElement': featuredProperties.slice(0, 10).map((prop: any, index: number) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'item': {
        '@type': 'RealEstateListing',
        '@id': `${baseUrl}/properties/${prop.slug}`,
        'name': prop.title,
        'url': `${baseUrl}/properties/${prop.slug}`,
        'image': prop.image,
        'offers': {
          '@type': 'Offer',
          'price': prop.price.replace(/[^0-9]/g, ''),
          'priceCurrency': 'PKR',
          'businessFunction': 'http://purl.org/goodrelations/v1#LeaseOut',
          'priceSpecification': { '@type': 'UnitPriceSpecification', 'price': prop.price.replace(/[^0-9]/g, ''), 'priceCurrency': 'PKR', 'unitCode': 'MON' },
        },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <HeroSection
        initialCities={sortCitiesByPopularity(
          citiesData.map((c: any) => ({ _id: c._id, name: c.name }))
        )}
        initialProperties={transformedProperties}
        initialTypes={sortedProcessedTypes}
      />
      {/* Ads go between the sections, wherever the admin dragged them (Settings → Ads). */}
      <AdZone page="home" at="after:hero" className="my-4" wrap="container mx-auto px-[var(--gutter)] sm:px-4" />
      {/* Cities as photo tiles — the most popular first. */}
      {settings.homeShowCities && cityStories.length > 0 && (
        <section className="pt-5 sm:pt-8">
          <div className="container mx-auto px-3 sm:px-4">
            <SectionHeading title="Rent by city" />
            <CityStories cities={cityStories} />
          </div>
        </section>
      )}
      <AdZone page="home" at="after:cities" className="my-4" wrap="container mx-auto px-[var(--gutter)] sm:px-4" />
      {settings.homeShowLatest && (
        <FeaturedSection initialProperties={transformedProperties} count={settings.homeLatestCount} />
      )}
      <AdZone page="home" at="after:latest" className="my-6" wrap="container mx-auto px-[var(--gutter)] sm:px-4" />
      <HomeRentTypes />
      <AdZone page="home" at="after:types" className="my-4" wrap="container mx-auto px-[var(--gutter)] sm:px-4" />
      <HomeHowItWorks />
      <AdZone page="home" at="after:how" className="my-6" wrap="container mx-auto px-[var(--gutter)] sm:px-4" />
      {settings.homeShowAgencies && <VerifiedAgencies agencies={agencies} dealersHref={dealersHref} />}
      <AdZone page="home" at="after:agencies" className="my-6" wrap="container mx-auto px-[var(--gutter)] sm:px-4" />
      {settings.homeShowAgentBand && <AgentSignupSection />}
      <AdZone page="home" at="after:agentBand" className="my-6" wrap="container mx-auto px-[var(--gutter)] sm:px-4" />
      {settings.homeShowPlans && <HomePlans plans={plans} />}
      <AdZone page="home" at="after:plans" className="my-6" wrap="container mx-auto px-[var(--gutter)] sm:px-4" />
      {/*
        A testimonials section was removed: its four reviews (all five stars,
        from a "Marketing Director", a "Legal Consultant", a "Tech
        Entrepreneur" and a "Design Lead") read as template copy, and
        reviews a visitor cannot trace to a real customer do more harm than
        none. Add one back with real reviews — Google reviews, say.
      */}
      {settings.homeShowBlog && <BlogSection initialPosts={processedBlogs} />}
      <AdZone page="home" at="after:blog" className="my-6" wrap="container mx-auto px-[var(--gutter)] sm:px-4" />
      {settings.homeShowFaq && <FAQSection />}
      <AdZone page="home" at="after:faq" className="my-6" wrap="container mx-auto px-[var(--gutter)] sm:px-4" />
    </>
  );
}