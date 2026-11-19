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
 * Cities as a row of rounded photo tiles (once round "story" shortcuts — a photo in a ring of the
 * theme colour, the name underneath — the way apps show categories you can
 * tap through. Four fit across a phone and the rest scroll; a desktop shows
 * more. Sorted by popularity (major cities first), then live listings count.
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

  const arrow = 'absolute top-[42px] z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-900 shadow-[0_2px_10px_rgba(15,23,42,0.18)] ring-1 ring-slate-200 transition-opacity hover:bg-slate-50 sm:top-[48px] sm:h-9 sm:w-9';

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
    <div ref={scroller} onScroll={measure} className={cn('hide-scrollbar -mx-[var(--gutter)] flex snap-x gap-2 overflow-x-auto scroll-smooth px-[var(--gutter)] sm:mx-0 sm:px-0', className)}>
      {shown.map((city, i) => {
        const active = currentCity === city.slug;
        const src = imageFor(city);
        return (
          <Link
            key={city._id}
            href={hrefFor(city.slug)}
            className={cn(
              'group relative block h-[84px] w-[112px] shrink-0 snap-start overflow-hidden rounded-2xl bg-primary/10 sm:h-[96px] sm:w-[136px]',
              active && 'ring-2 ring-primary ring-offset-2',
            )}
          >
            {src ? (
              <Image src={src} loader={photoLoader} alt={toTitleCase(city.name)} fill sizes="136px" className="object-cover transition-transform duration-300 group-hover:scale-105" priority={i < 4} />
            ) : (
              <span className="absolute inset-0 bg-gradient-to-br from-primary to-navy" />
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <span className="absolute inset-x-2 bottom-1.5 line-clamp-1 text-left text-[13px] font-bold text-white sm:text-[14px]">
              {toTitleCase(city.name)}
            </span>
          </Link>
        );
      })}

      {viewAllHref && (
        <Link href={viewAllHref} className="grid h-[84px] w-[96px] shrink-0 snap-start place-items-center rounded-2xl border border-dashed border-primary/40 bg-white text-[12.5px] font-semibold text-primary sm:h-[96px]">
          <span className="flex flex-col items-center gap-1"><ArrowRight className="h-5 w-5" />View all</span>
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
