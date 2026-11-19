import Link from 'next/link';
import { RENT_TYPE_ART } from '@/components/home/RentTypeArt';

/*
 * "What are you looking to rent?" — every rental type as a little building
 * with the part you'd rent lit up. On a phone the tiles scroll sideways; on a
 * desktop they sit in one row. Each tile is a real landing page
 * (/properties/rent/<type>), so this also gives search engines a clean path
 * to every type.
 */

const TYPES = [
  { slug: 'house', label: 'Whole house', note: 'For families' },
  { slug: 'upper-portion', label: 'Upper portion', note: 'Own floor, own gate' },
  { slug: 'lower-portion', label: 'Lower portion', note: 'Ground floor' },
  { slug: 'flat', label: 'Flat', note: 'In a building' },
  { slug: 'room', label: 'Room', note: 'Single or shared' },
  { slug: 'hostel', label: 'Hostel', note: 'Students & jobs' },
  { slug: 'shop', label: 'Shop', note: 'Market & plaza' },
  { slug: 'office', label: 'Office', note: 'Floor or suite' },
  { slug: 'warehouse', label: 'Warehouse', note: 'Godown & storage' },
] as const;

export default function HomeRentTypes() {
  return (
    <section className="pt-6 sm:pt-10" aria-labelledby="rent-types-heading">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
          <div>
            <h2 id="rent-types-heading" className="text-[19px] font-bold tracking-tight text-slate-900 sm:text-[24px]">
              What are you looking to rent?
            </h2>
            <p className="mt-0.5 text-[12.5px] text-slate-500 sm:text-[14px]">
              The part in <span className="font-semibold text-[var(--price-tag)]">orange</span> is what you get.
            </p>
          </div>
        </div>
        <div className="hide-scrollbar -mx-[var(--gutter)] flex snap-x gap-2.5 overflow-x-auto px-[var(--gutter)] pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:px-0 lg:grid-cols-9">
          {TYPES.map(({ slug, label, note }) => {
            const Art = RENT_TYPE_ART[slug]!;
            return (
              <Link
                key={slug}
                href={`/properties/rent/${slug}`}
                className="group relative flex w-[118px] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] bg-white ring-1 ring-slate-200/80 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgba(11,59,58,0.55)] hover:ring-primary/30 sm:w-auto"
              >
                <span className="relative grid h-[84px] place-items-center bg-[linear-gradient(180deg,#ecfdf8_0%,#ffffff_100%)] text-[#0b3b3a]">
                  <Art className="h-[60px] w-[68px] transition-transform duration-300 group-hover:scale-110" />
                </span>
                <span className="px-3 pb-3 pt-2">
                  <span className="block text-[13px] font-bold leading-tight text-slate-900">{label}</span>
                  <span className="mt-0.5 block text-[11px] leading-tight text-slate-500">{note}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
