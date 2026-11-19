import Link from 'next/link';
import { ArrowRight, BadgeCheck, Building2 } from 'lucide-react';
import { agentProfilePath } from '@/lib/agent';
import { getCityAgencies, getDealerCities, type SpotlightAgency } from '@/lib/server-api';
import { photo } from '@/lib/img';
import { dealersCityPath, hasDealers } from '@/lib/dealers';


const citySlugOf = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** The city's property dealers page — only when it has one (a dealer has joined). */
async function dealersPageOf(cityName: string): Promise<string | null> {
  const slug = citySlugOf(cityName);
  const c = (await getDealerCities()).find((x) => x.slug === slug);
  return c && hasDealers(c) ? dealersCityPath(slug) : null;
}

function AgencyRow({ a }: { a: SpotlightAgency }) {
  return (
    <Link href={agentProfilePath({ _id: a._id, name: a.name }) ?? '/agents'} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-100">
        {a.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo(a.avatarUrl, 96)} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Building2 className="h-5 w-5 text-slate-400" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-[14px] font-semibold text-slate-900">
          <span className="truncate">{a.name}</span>
          <BadgeCheck className="h-4 w-4 shrink-0 text-sky-500" aria-label="Verified" />
        </span>
        <span className="block truncate text-[12px] text-slate-500">{a.listings ? `${a.listings} ${a.listings === 1 ? 'listing' : 'listings'} here` : a.address || 'Verified agency'}</span>
      </span>
    </Link>
  );
}

/** Sidebar: the city's verified agencies. */
export async function CityAgenciesBox({ cityId, cityName }: { cityId?: string; cityName: string }) {
  if (!cityId) return null;
  const [agencies, dealersPage] = await Promise.all([getCityAgencies(cityId), dealersPageOf(cityName)]);
  if (!agencies.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <p className="flex items-center gap-1.5 px-2 pb-1 pt-1 text-[15px] font-bold text-slate-900">
        <BadgeCheck className="h-5 w-5 text-sky-500" /> Verified agencies in {cityName}
      </p>
      <div className="divide-y divide-slate-100">
        {agencies.slice(0, 6).map((a) => (
          <AgencyRow key={a._id} a={a} />
        ))}
      </div>
      {dealersPage && (
        <Link href={dealersPage} className="mt-1 flex items-center justify-center gap-1 rounded-xl py-2 text-[13px] font-semibold text-primary hover:bg-primary/5">
          All property dealers in {cityName} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}


/** Under a city's results: the city's verified agencies. */
export async function CityExtras({ cityId, cityName }: { citySlug?: string; cityId?: string; cityName: string }) {
  const [agencies, dealersPage] = await Promise.all([
    cityId ? getCityAgencies(cityId) : Promise.resolve([]),
    dealersPageOf(cityName),
  ]);
  if (!agencies.length) return null;

  return (
    <div className="border-t border-slate-200 bg-white">
      <div className="container mx-auto px-[var(--gutter)] py-8 sm:px-4 sm:py-10">
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="flex items-center gap-2 text-[21px] font-bold tracking-tight text-slate-900 sm:text-[24px]">
              <BadgeCheck className="h-6 w-6 text-sky-500" /> Verified agencies in {cityName}
            </h2>
            {dealersPage && (
              <Link href={dealersPage} className="shrink-0 text-[14px] font-semibold text-primary hover:underline">
                All dealers
              </Link>
            )}
          </div>
          <div className="grid gap-1 rounded-2xl border border-slate-200 p-2 sm:grid-cols-2 lg:grid-cols-3">
            {agencies.map((a) => (
              <AgencyRow key={a._id} a={a} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
