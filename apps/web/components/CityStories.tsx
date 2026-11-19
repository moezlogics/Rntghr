'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { photoLoader } from '@/lib/img';
import { isPropertyDetail } from '@/lib/routes';
import { cn, toTitleCase } from '@/lib/utils';

/*
 * Cities as round "story" shortcuts — a photo in a ring of the theme colour,
 * the name underneath — the way apps show categories you can tap through.
 * Five fit across a phone and the rest scroll; a desktop shows more. Sorted by popularity (major cities first), then live listings count.
 *
 * Homepage: the ten most popular and a "View all" circle. Results pages: all
 * of them, with the current city highlighted, linking within the same
 * rental search you are already browsing.
 */

export interface CityStory {
  _id: string;
  name: string;
  slug: string;
  thumbnail?: string;
  image?: string;
  count?: number;
}

const DEFAULT_CITY_IMAGES: Record<string, string> = {
  lahore: '/uploads/cities/lahore.jpg',
  karachi: '/uploads/cities/karachi.jpg',
  islamabad: '/uploads/cities/islamabad.jpg',
  rawalpindi: '/uploads/cities/rawalpindi.jpg',
  faisalabad: '/uploads/cities/faisalabad.jpg',
  faislabad: '/uploads/cities/faisalabad.jpg',
  multan: '/uploads/cities/multan.jpg',
  peshawar: '/uploads/cities/peshawar.jpg',
  quetta: '/uploads/cities/quetta.jpg',
  gujranwala: '/uploads/cities/gujranwala.jpg',
  sialkot: '/uploads/cities/sialkot.jpg',
  hyderabad: '/uploads/cities/hyderabad.jpg',
  bahawalpur: '/uploads/cities/bahawalpur.jpg',
  sargodha: '/uploads/cities/sargodha.jpg',
  sahiwal: '/uploads/cities/sahiwal.jpg',
  abbottabad: '/uploads/cities/abbottabad.jpg',
  sukkur: '/uploads/cities/sukkur.jpg',
};

const imageFor = (c: CityStory) => c.thumbnail || c.image || DEFAULT_CITY_IMAGES[c.name.trim().toLowerCase()] || '';

export default function CityStories({
  cities,
  limit,
  viewAllHref,
  className,
  linkMode = 'all',
}: {
  cities: CityStory[];
  limit?: number;
  viewAllHref?: string;
  className?: string;
  /** Links to /properties/rent/<city>. */
  linkMode?: 'all' | 'follow';
}) {
  const pathname = usePathname() || '';
  const scroller = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // Arrows appear only when there is more to scroll that way.
  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, cities.length]);

  const page = (dir: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  if (isPropertyDetail(pathname) || cities.length === 0) return null;

  const parts = pathname.split('/').filter(Boolean); // properties / rent / city / …
  const currentCity = parts[0] === 'properties' ? parts[2] : undefined;
  const shown = typeof limit === 'number' ? cities.slice(0, limit) : cities;
  const hrefFor = (slug: string) => `/properties/rent/${slug}`;

  const arrow = 'absolute top-[32px] z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.18)] ring-1 ring-slate-200 transition-opacity hover:bg-slate-50 sm:top-[40px] sm:h-9 sm:w-9';

  return (
    <div className="relative">
      {canPrev && (
        <button type="button" aria-label="Previous cities" onClick={() => page(-1)} className={cn(arrow, 'left-0 sm:-left-2')}>
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canNext && (
        <button type="button" aria-label="More cities" onClick={() => page(1)} className={cn(arrow, 'right-0 sm:-right-2')}>
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    <div ref={scroller} onScroll={measure} className={cn('hide-scrollbar -mx-[var(--gutter)] flex snap-x gap-1 overflow-x-auto sm:gap-2 scroll-smooth px-[var(--gutter)] sm:mx-0 sm:px-0', className)}>
      {shown.map((city, i) => {
        const active = currentCity === city.slug;
        const src = imageFor(city);
        return (
          <Link
            key={city._id}
            href={hrefFor(city.slug)}
            aria-current={active ? 'page' : undefined}
            className="group flex w-[68px] shrink-0 snap-start flex-col items-center gap-1.5 py-1 sm:w-[80px]"
          >
            <span
              className={cn(
                'rounded-full p-[2px] transition-colors',
                active ? 'bg-primary' : 'bg-slate-200 group-hover:bg-primary',
              )}
            >
              <span className="relative block h-[58px] w-[58px] overflow-hidden rounded-full bg-primary/10 ring-2 ring-white sm:h-[70px] sm:w-[70px]">
                {src ? (
                  <Image src={src} loader={photoLoader} alt="" fill sizes="72px" className="object-cover transition-transform duration-300 group-hover:scale-110" priority={i < 5} />
                ) : (
                  <span className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary to-navy text-[20px] font-bold text-white">
                    {city.name.trim().charAt(0).toUpperCase()}
                  </span>
                )}
              </span>
            </span>
            <span className={cn('line-clamp-1 max-w-full text-[11.5px] leading-tight sm:text-[12.5px]', active ? 'font-bold text-primary' : 'font-medium text-slate-700 group-hover:text-slate-900')}>
              {toTitleCase(city.name)}
            </span>
          </Link>
        );
      })}

      {viewAllHref && (
        <Link href={viewAllHref} className="group flex w-[68px] shrink-0 snap-start flex-col items-center gap-1.5 py-1 sm:w-[80px]">
          <span className="grid h-[62px] w-[62px] place-items-center rounded-full border border-dashed border-primary/50 bg-white text-primary transition-colors group-hover:bg-primary group-hover:text-white sm:h-[74px] sm:w-[74px]">
            <ArrowRight className="h-5 w-5" />
          </span>
          <span className="text-[11.5px] font-semibold leading-tight text-primary sm:text-[12.5px]">View all</span>
        </Link>
      )}
    </div>
    </div>
  );
}

/** The results pages' strip: every city, under the header, hidden on a listing's own page. */
export function CityStoriesBar({ cities }: { cities: CityStory[] }) {
  const pathname = usePathname() || '';
  if (isPropertyDetail(pathname) || cities.length === 0) return null;
  return (
    <div className="border-b border-slate-200/70 bg-white">
      <div className="container mx-auto px-4 py-2">
        <CityStories cities={cities} linkMode="follow" />
      </div>
    </div>
  );
}
