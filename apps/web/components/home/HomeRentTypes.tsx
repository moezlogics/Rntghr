import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp, BedDouble, Briefcase, Building, Building2, Home, Store, Warehouse } from 'lucide-react';

/*
 * "What are you looking to rent?" — the rental types as a compact category
 * row, the way modern apps list categories: a thin-line icon in a soft round
 * tile with the name under it. Scrolls sideways on a phone, one even row on a
 * desktop. Each item is a real landing page (/properties/rent/<type>), so this
 * also gives search engines a clean path to every type.
 */

type Item = { slug: string; label: string; icon: LucideIcon; badge?: LucideIcon };

const TYPES: Item[] = [
  { slug: 'house', label: 'House', icon: Home },
  { slug: 'upper-portion', label: 'Upper portion', icon: Home, badge: ArrowUp },
  { slug: 'lower-portion', label: 'Lower portion', icon: Home, badge: ArrowDown },
  { slug: 'flat', label: 'Flat', icon: Building },
  { slug: 'room', label: 'Room', icon: BedDouble },
  { slug: 'hostel', label: 'Hostel', icon: Building2 },
  { slug: 'shop', label: 'Shop', icon: Store },
  { slug: 'office', label: 'Office', icon: Briefcase },
  { slug: 'warehouse', label: 'Warehouse', icon: Warehouse },
];

export default function HomeRentTypes() {
  return (
    <section className="pt-5 sm:pt-8" aria-labelledby="rent-types-heading">
      <div className="container mx-auto px-3 sm:px-4">
        <h2 id="rent-types-heading" className="mb-2 text-[18px] font-bold tracking-tight text-slate-900 sm:mb-3 sm:text-[22px]">
          What are you looking to rent?
        </h2>
        <ul className="hide-scrollbar -mx-[var(--gutter)] flex gap-0.5 overflow-x-auto px-[var(--gutter)] sm:mx-0 sm:grid sm:grid-cols-9 sm:gap-2 sm:px-0">
          {TYPES.map(({ slug, label, icon: Icon, badge: Badge }) => (
            <li key={slug} className="shrink-0">
              <Link
                href={`/properties/rent/${slug}`}
                className="group flex w-[70px] flex-col items-center gap-1.5 rounded-2xl px-0.5 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-primary sm:w-full sm:hover:bg-white"
              >
                <span className="relative grid h-12 w-12 place-items-center rounded-full bg-white text-primary shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80 transition-colors group-hover:bg-primary group-hover:text-white group-hover:ring-primary sm:h-14 sm:w-14">
                  <Icon className="h-[22px] w-[22px] sm:h-6 sm:w-6" strokeWidth={1.6} aria-hidden />
                  {Badge && (
                    <span className="absolute -right-0.5 -top-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-primary text-white ring-2 ring-white transition-colors group-hover:bg-white group-hover:text-primary">
                      <Badge className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                    </span>
                  )}
                </span>
                <span className="text-[11.5px] font-medium leading-tight text-slate-700 group-hover:text-slate-900 sm:text-[12.5px]">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
