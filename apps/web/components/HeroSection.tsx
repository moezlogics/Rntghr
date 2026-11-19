'use client'
import { sortCitiesByPopularity } from '@/lib/pk';
import SearchPanel from '@/components/search/SearchPanel';
import { useSiteSettings } from '@/components/SiteSettingsProvider';
import { resolved } from '@/lib/site-settings';
import Image from 'next/image';
import { Check, KeyRound } from 'lucide-react';

/*
 * The search band at the top of the homepage.
 *
 * Portals open with one job: pick buy or rent, a city, maybe an area and a
 * type, and go. The old hero wrapped that in a 400px canvas of three pastel
 * radial gradients over a grid pattern, a 60px black headline with an
 * animated underline, and a frosted card with 24px corners and a hover
 * shadow — and on phones a separate layout with a hand-drawn wave and two
 * full-screen modals just to choose a city. Everything a search needs fits in
 * one compact panel that works the same way at every width; native selects
 * already give phones a proper picker.
 */

interface HeroSectionProps {
  initialCities?: { _id: string; name: string }[];
  /** No longer used: the search suggests places, not listings. */
  initialProperties?: unknown[];
  initialTypes?: string[];
}

const HeroSection: React.FC<HeroSectionProps> = ({ initialCities, initialTypes }) => {
  const settings = useSiteSettings();
  const { heroTitle, heroSubtitle, heroImage } = resolved(settings);
  // 0–95: how much of the dark brand colour sits over the photo.
  const overlay = Math.min(95, Math.max(0, settings.heroOverlay ?? 50)) / 100;
  const cityList = sortCitiesByPopularity((initialCities ?? []).map((c) => ({ _id: c._id, name: c.name })));

  return (
    <section className="relative z-10 px-3 pt-3 sm:px-4 sm:pt-4">
      {/*
        A rounded card rather than a full-width band: the photo (Settings →
        Appearance → Hero background) under the brand's dark colour, the
        headline on the left, and the search panel underneath it.
      */}
      <div className="container relative isolate mx-auto rounded-[28px] bg-navy px-3.5 pb-3.5 pt-5 sm:px-8 sm:pb-6 sm:pt-12 lg:pt-16">
        {heroImage && (
          <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden rounded-[28px]">
            <Image
              src={heroImage}
              alt=""
              fill
              priority
              sizes="100vw"
              // Hosts outside next.config's image list are shown as-is.
              unoptimized={!heroImage.startsWith('/') && !heroImage.includes('images.unsplash.com') && !heroImage.includes('rentghar.pk')}
              className="object-cover"
            />
            <div className="absolute inset-0 bg-navy" style={{ opacity: overlay }} />
            <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-transparent" />
          </div>
        )}
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-semibold text-white backdrop-blur">
            <KeyRound className="h-3.5 w-3.5" /> Rentals only
          </p>
          <h1 className="mt-2.5 text-[24px] font-extrabold leading-[1.1] tracking-tight text-white sm:text-[40px] lg:text-[48px]">
            {heroTitle}
          </h1>
          <p className="mt-1.5 line-clamp-2 max-w-xl text-[13px] leading-relaxed text-white/85 sm:line-clamp-none sm:text-[16px]">
            {heroSubtitle}
          </p>
          <ul className="mt-3 hidden flex-wrap gap-x-4 gap-y-1 text-[12px] font-medium text-white/80 sm:flex">
            {['Verified dealers', 'Direct WhatsApp', 'Free to list'].map((t) => (
              <li key={t} className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[var(--price-tag)]" strokeWidth={3} /> {t}
              </li>
            ))}
          </ul>
        </div>

        {/* City, area, type — then price, size, beds. Same panel as the results pages. */}
        <SearchPanel
          variant="hero"
          initialCities={cityList}
          initialTypes={initialTypes}
          defaultCity={settings.defaultCity || 'lahore'}
        />
      </div>
    </section>
  );
};

export default HeroSection;
