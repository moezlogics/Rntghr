'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Property } from '@/lib/data';
import { cn } from '@/lib/utils';
import PropertyCard from '@/components/PropertyCard';

/*
 * Similar listings at the foot of a property page, as one row that scrolls
 * sideways: two cards across a phone, three on a tablet, four on a desktop.
 * Uses the same PropertyCard as the rest of the site.
 */

export default function RelatedCarousel({ items }: { items: Property[] }) {
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
  }, [measure, items.length]);

  const go = (dir: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  const arrow = 'absolute top-[32%] z-20 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-md transition hover:bg-slate-50 sm:grid';

  return (
    <div className="relative">
      {canPrev && (
        <button type="button" onClick={() => go(-1)} aria-label="Previous" className={cn(arrow, '-left-3')}>
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canNext && (
        <button type="button" onClick={() => go(1)} aria-label="Next" className={cn(arrow, '-right-3')}>
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
      <div ref={scroller} onScroll={measure} className="hide-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth sm:gap-3">
        {items.map((item) => (
          <div key={item.id} className="w-[calc((100%-0.5rem)/2)] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/3)] lg:w-[calc((100%-2.25rem)/4)]">
            <PropertyCard property={item} className="h-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
