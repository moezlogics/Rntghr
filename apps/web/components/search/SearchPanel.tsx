'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { areaApi, cityApi, propertyApi } from '@/lib/api';
import { CityPicker } from '@/components/ui/city-picker';
import { sortCitiesByPopularity } from '@/lib/pk';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn, toTitleCase } from '@/lib/utils';
import {
  BEDS,
  EMPTY_SEARCH,
  MARLA_SIZES,
  NO_BEDS,
  RENT_PRICES,
  TYPE_LABELS,
  KNOWN_TYPES,
  extraCount,
  marlaLabel,
  priceLabel,
  rangeLabel,
  searchUrl,
  toSlug,
  type SearchState,
} from '@/lib/search';

/*
 * The property search — one panel for the homepage and the top of every
 * results page (city, area, type): city, location, rental type, monthly rent,
 * size, beds and a keyword.
 *
 * hero: the homepage card. bar: the strip above the results — one row on a
 * desktop; on a phone a short row (where, Filters) that opens
 * the whole form in a sheet. Both lead to the same addresses (lib/search).
 */

type City = { _id: string; name: string };
type Place = { id: string; name: string; slug: string; count: number };

const field =
  'h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-9 text-[14px] text-slate-900 outline-none transition-colors hover:border-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

function Select({ label, value, onChange, children, className, disabled }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string; disabled?: boolean }) {
  return (
    <label className={cn('relative block', className)}>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={field} disabled={disabled} aria-label={label}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

/** Min and max from the same list — a min above the max swaps them. */
function Range({
  label,
  options,
  fmt,
  min,
  max,
  onChange,
}: {
  label: string;
  options: number[];
  fmt: (n: number) => string;
  min?: number;
  max?: number;
  onChange: (min?: number, max?: number) => void;
}) {
  const set = (a?: number, b?: number) => (a && b && a > b ? onChange(b, a) : onChange(a, b));
  return (
    <div>
      <p className="mb-1.5 text-[12.5px] font-semibold text-slate-700">{label}</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Select label={`${label} from`} value={min ? String(min) : ''} onChange={(v) => set(v ? Number(v) : undefined, max)}>
          <option value="">Min</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {fmt(o)}
            </option>
          ))}
        </Select>
        <span className="text-[13px] text-slate-400">to</span>
        <Select label={`${label} to`} value={max ? String(max) : ''} onChange={(v) => set(min, v ? Number(v) : undefined)}>
          <option value="">Max</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {fmt(o)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

function Beds({ value, onChange }: { value?: number; onChange: (v?: number) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-[12.5px] font-semibold text-slate-700">Bedrooms</p>
      <div className="flex gap-1.5">
        {[undefined, ...BEDS].map((b) => (
          <button
            key={b ?? 'any'}
            type="button"
            onClick={() => onChange(b)}
            className={cn(
              'h-10 min-w-10 flex-1 rounded-lg border px-2 text-[13.5px] font-semibold transition-colors',
              value === b ? 'border-primary bg-primary text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400',
            )}
          >
            {b === undefined ? 'Any' : b === 5 ? '5+' : b}
          </button>
        ))}
      </div>
    </div>
  );
}

/** One tap per choice — the phone sheet's way of picking type, budget and size. */
function Chips<T extends string>({
  label,
  options,
  isOn,
  onPick,
}: {
  label: string;
  options: { key: T; label: string }[];
  isOn: (key: T) => boolean;
  onPick: (key: T) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[12.5px] font-semibold text-slate-700">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            aria-pressed={isOn(o.key)}
            onClick={() => onPick(o.key)}
            className={cn(
              'h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors',
              isOn(o.key) ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Monthly budgets people actually search by. */
const BUDGET_CHIPS: { key: string; label: string; min?: number; max?: number }[] = [
  { key: 'any', label: 'Any' },
  { key: 'u25', label: 'Under 25k', max: 25_000 },
  { key: '25-50', label: '25k – 50k', min: 25_000, max: 50_000 },
  { key: '50-100', label: '50k – 1 Lakh', min: 50_000, max: 100_000 },
  { key: '100-200', label: '1 – 2 Lakh', min: 100_000, max: 200_000 },
  { key: '200+', label: '2 Lakh+', min: 200_000 },
];
const SIZE_CHIPS: { key: string; label: string; marla?: number }[] = [
  { key: 'any', label: 'Any' },
  { key: '3', label: '3 Marla', marla: 3 },
  { key: '5', label: '5 Marla', marla: 5 },
  { key: '7', label: '7 Marla', marla: 7 },
  { key: '10', label: '10 Marla', marla: 10 },
  { key: '20', label: '1 Kanal', marla: 20 },
];

/** Where: an area of the chosen city — typed or picked. */
function LocationPicker({
  places,
  value,
  onChange,
  disabled,
  loading,
}: {
  places: Place[];
  value: string;
  onChange: (slug: string) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const chosen = places.find((p) => p.slug === value);

  useEffect(() => {
    const close = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return places
      .filter((p) => !term || p.name.toLowerCase().includes(term))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { numeric: true }));
  }, [places, q]);

  const pick = (slug: string) => {
    onChange(slug);
    setQ('');
    setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={open ? q : chosen ? toTitleCase(chosen.name) : ''}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        placeholder={disabled ? 'Choose a city first' : loading ? 'Loading locations…' : 'Area or neighbourhood'}
        aria-label="Location"
        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-9 text-[14px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-slate-50"
      />
      {value && !open && (
        <button type="button" aria-label="Clear location" onClick={() => pick('')} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      )}
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-[80] max-h-[320px] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl sm:min-w-[320px]">
          {value && (
            <button type="button" onClick={() => pick('')} className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13.5px] text-primary hover:bg-slate-50">
              All of the city
            </button>
          )}
          {rows.length === 0 && <p className="px-3 py-4 text-center text-[13px] text-slate-400">{loading ? 'Loading…' : 'No area found'}</p>}
          {rows.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p.slug)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-300" />
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-slate-700">{toTitleCase(p.name)}</span>
              {p.count > 0 && <span className="shrink-0 text-[11.5px] tabular-nums text-slate-400">{p.count}</span>}
              {p.slug === value && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPanel({
  variant,
  initialCities,
  initialTypes,
  defaultCity,
  current,
}: {
  variant: 'hero' | 'bar';
  /** Bar: what the results page shows (read from its address by ArchiveSearchBar). */
  current?: SearchState;
  initialCities?: City[];
  initialTypes?: string[];
  /** Hero: the city to start on (Settings → General → Default city). */
  defaultCity?: string;
}) {
  const router = useRouter();
  const fromUrl = variant === 'bar' ? current ?? null : null;

  const [cities, setCities] = useState<City[]>(initialCities ?? []);
  const [types, setTypes] = useState<string[]>((initialTypes ?? []).map((t) => t.toLowerCase()));
  const [places, setPlaces] = useState<Place[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [s, setS] = useState<SearchState>(() => fromUrl ?? { ...EMPTY_SEARCH, citySlug: defaultCity ? toSlug(defaultCity) : '' });
  const [sheet, setSheet] = useState(false);
  const [more, setMore] = useState(false);

  // A new results page: the panel shows what it shows.
  const urlKey = fromUrl ? searchUrl(fromUrl) : '';
  useEffect(() => {
    if (fromUrl) setS(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlKey]);

  useEffect(() => {
    if (initialCities?.length && initialTypes?.length) return;
    Promise.all([cities.length ? Promise.resolve(cities) : cityApi.getNames(), types.length ? Promise.resolve(types) : propertyApi.getTypes()])
      .then(([c, t]) => {
        setCities(sortCitiesByPopularity((c as City[]).map((x) => ({ _id: x._id, name: x.name }))));
        setTypes(((t as string[]) ?? []).map((x) => String(x).toLowerCase()));
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const city = cities.find((c) => toSlug(c.name) === s.citySlug);

  // The city's areas, with how many listings each has.
  useEffect(() => {
    if (!city) {
      setPlaces([]);
      return;
    }
    let off = false;
    setLoadingPlaces(true);
    Promise.all([
      areaApi.getNames(city._id),
      propertyApi.getLocationStats(city.name).catch(() => null),
    ])
      .then(([names, stats]) => {
        if (off) return;
        const rows = ((stats as { locations?: { id: string; count: number }[] } | null)?.locations ?? []);
        const counts = new Map<string, number>(rows.map((l) => [String(l.id), Number(l.count) || 0]));
        setPlaces(
          names.map((a) => ({
            id: a._id,
            name: a.name,
            slug: a.areaSlug || toSlug(a.name),
            count: counts.get(a._id) ?? 0,
          })),
        );
      })
      .catch(() => !off && setPlaces([]))
      .finally(() => !off && setLoadingPlaces(false));
    return () => {
      off = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city?._id, city?.name]);

  const set = (patch: Partial<SearchState>) => setS((prev) => ({ ...prev, ...patch }));
  const go = (next: SearchState = s) => {
    setSheet(false);
    router.push(searchUrl(next));
  };

  const prices = RENT_PRICES;
  const typeOptions = useMemo(() => {
    const order = KNOWN_TYPES;
    // Every rental type, whether or not it has listings yet — and nothing that is not a rental type.
    const list = [...new Set([...KNOWN_TYPES, ...types.map((t) => String(t).toLowerCase())])].filter((t) => KNOWN_TYPES.includes(t));
    return list.sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  }, [types]);
  const showBeds = !NO_BEDS.includes(s.type);
  const extras = extraCount(s);

  // Typed or picked: "mul" finds Multan.
  const citySelect = (
    <CityPicker
      options={cities.map((c) => ({ value: toSlug(c.name), label: toTitleCase(c.name) }))}
      value={s.citySlug}
      onChange={(v) => set({ citySlug: v, areaSlug: '' })}
      allLabel="All cities"
      placeholder="Search city"
    />
  );
  const location = (
    <LocationPicker places={places} value={s.areaSlug} onChange={(v) => set({ areaSlug: v })} disabled={!s.citySlug} loading={loadingPlaces} />
  );
  const typeSelect = (
    <Select label="Property type" value={s.type} onChange={(v) => set({ type: v, ...(NO_BEDS.includes(v) ? { beds: undefined } : {}) })}>
      <option value="">All types</option>
      {typeOptions.map((t) => (
        <option key={t} value={t}>
          {TYPE_LABELS[t] ?? toTitleCase(t)}
        </option>
      ))}
    </Select>
  );
  const priceRange = (
    <Range label="Rent (PKR / month)" options={prices} fmt={priceLabel} min={s.priceMin} max={s.priceMax} onChange={(a, b) => set({ priceMin: a, priceMax: b })} />
  );
  const sizeRange = <Range label="Area (Marla)" options={MARLA_SIZES} fmt={marlaLabel} min={s.marlaMin} max={s.marlaMax} onChange={(a, b) => set({ marlaMin: a, marlaMax: b })} />;
  const keyword = (
    <div>
      <p className="mb-1.5 text-[12.5px] font-semibold text-slate-700">Keyword</p>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={s.search ?? ''}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Corner, park facing, furnished…"
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-[14px] outline-none placeholder:text-slate-400 hover:border-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>
    </div>
  );
  const findButton = (label = 'Find', className = '') => (
    <button type="submit" className={cn('inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-[15px] font-semibold text-white transition-colors hover:bg-primary/90', className)}>
      <Search className="h-4 w-4" />
      {label}
    </button>
  );
  const clearExtras = () => set({ priceMin: undefined, priceMax: undefined, marlaMin: undefined, marlaMax: undefined, beds: undefined, search: undefined });

  /** Every field, stacked — the phone sheet. Choices are tap chips, not dropdowns. */
  const budgetKey = BUDGET_CHIPS.find((c) => (c.min ?? undefined) === s.priceMin && (c.max ?? undefined) === s.priceMax)?.key ?? (s.priceMin || s.priceMax ? '' : 'any');
  const sizeKey = s.marlaMin && s.marlaMin === s.marlaMax ? SIZE_CHIPS.find((c) => c.marla === s.marlaMin)?.key ?? '' : s.marlaMin || s.marlaMax ? '' : 'any';
  const fullForm = (
    <div className="space-y-5">
      <div className="grid gap-3">
        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold text-slate-700">City</p>
          {citySelect}
        </div>
        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold text-slate-700">Area</p>
          {location}
        </div>
      </div>
      <Chips
        label="What to rent"
        options={[{ key: '', label: 'All' }, ...typeOptions.map((t) => ({ key: t, label: TYPE_LABELS[t] ?? toTitleCase(t) }))]}
        isOn={(k) => (s.type || '') === k}
        onPick={(k) => set({ type: k, ...(NO_BEDS.includes(k) ? { beds: undefined } : {}) })}
      />
      <Chips
        label="Monthly budget"
        options={BUDGET_CHIPS.map(({ key, label }) => ({ key, label }))}
        isOn={(k) => budgetKey === k}
        onPick={(k) => {
          const c = BUDGET_CHIPS.find((x) => x.key === k)!;
          set({ priceMin: c.min, priceMax: c.max });
        }}
      />
      <Chips
        label="Size"
        options={SIZE_CHIPS.map(({ key, label }) => ({ key, label }))}
        isOn={(k) => sizeKey === k}
        onPick={(k) => {
          const c = SIZE_CHIPS.find((x) => x.key === k)!;
          set({ marlaMin: c.marla, marlaMax: c.marla });
        }}
      />
      {showBeds && <Beds value={s.beds} onChange={(b) => set({ beds: b })} />}
      <details className="group rounded-xl border border-slate-200 px-3 py-2">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-semibold text-slate-700">
          Exact rent, size or a keyword
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-4 pb-1">
          {priceRange}
          {sizeRange}
          {keyword}
        </div>
      </details>
    </div>
  );

  const where = [s.areaSlug ? toTitleCase(places.find((p) => p.slug === s.areaSlug)?.name ?? s.areaSlug.replace(/-/g, ' ')) : '', city ? toTitleCase(city.name) : ''].filter(Boolean).join(', ');

  /** The phone sheet, shared by the homepage and the results pages. */
  const sheetEl = (
    <Sheet open={sheet} onOpenChange={setSheet}>
      <SheetContent side="bottom" className="z-[80] flex h-[90dvh] flex-col gap-0 rounded-t-3xl p-0 lg:hidden [&>button.absolute]:hidden">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-slate-200" aria-hidden />
        <div className="flex items-center justify-between px-4 pb-2 pt-2">
          <SheetTitle className="text-[17px] font-bold">Find a rental</SheetTitle>
          <button type="button" onClick={() => setSheet(false)} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form
          id="search-sheet"
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
          className="flex-1 overflow-y-auto px-4 pb-4 pt-1"
        >
          {fullForm}
        </form>
        <div className="flex gap-2 border-t bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button type="button" onClick={() => setS({ ...EMPTY_SEARCH, purpose: s.purpose, citySlug: s.citySlug })} className="h-12 flex-1 rounded-2xl border border-slate-200 text-[14px] font-semibold text-slate-700">
            Clear
          </button>
          <button type="submit" form="search-sheet" className="inline-flex h-12 flex-[2] items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-bold text-white">
            <Search className="h-4 w-4" /> Show rentals
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );

  // ── Homepage card ──
  if (variant === 'hero') {
    return (
      <>
      {/* Phones: quick types, then one search bar that opens the sheet. */}
      <div className="mt-4 rounded-3xl bg-white p-2 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.5)] lg:hidden">
        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto pb-2">
          {([['', 'All'], ['house', 'House'], ['upper-portion', 'Upper portion'], ['lower-portion', 'Lower portion'], ['flat', 'Flat'], ['room', 'Room'], ['shop', 'Shop']] as [string, string][]).map(([v, label]) => (
            <button
              key={v || 'all'}
              type="button"
              aria-pressed={(s.type || '') === v}
              onClick={() => set({ type: v })}
              className={cn('h-8 shrink-0 whitespace-nowrap rounded-full px-3 text-[12.5px] font-semibold', (s.type || '') === v ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600')}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setSheet(true)} className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-2xl bg-slate-100 px-3.5 text-left">
            <MapPin className="h-[18px] w-[18px] shrink-0 text-primary" />
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold text-slate-900">{where || 'Choose a city'}</span>
              <span className="block truncate text-[11.5px] text-slate-500">
                {[s.type ? TYPE_LABELS[s.type] ?? toTitleCase(s.type) : 'Any type', extras ? `${extras} filter${extras > 1 ? 's' : ''}` : 'Area, budget, size'].join(' · ')}
              </span>
            </span>
            <SlidersHorizontal className="ml-auto h-4 w-4 shrink-0 text-slate-500" />
          </button>
          <button type="button" onClick={() => go()} aria-label="Search" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-white">
            <Search className="h-5 w-5" />
          </button>
        </div>
      </div>
      {sheetEl}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
        className="mx-auto mt-7 hidden max-w-5xl rounded-3xl bg-white p-1.5 text-left shadow-[0_24px_60px_-24px_rgba(0,0,0,0.5)] lg:block"
      >
        {/* Rentals only — quick picks for the commonest types instead of Buy / Rent tabs. */}
        <div className="flex gap-1.5 overflow-x-auto px-1.5 pb-1 pt-1.5 [scrollbar-width:none]">
          {(
            [
              ['', 'All rentals'],
              ['house', 'House'],
              ['upper-portion', 'Upper portion'],
              ['lower-portion', 'Lower portion'],
              ['flat', 'Flat'],
              ['room', 'Room'],
              ['shop', 'Shop'],
            ] as [string, string][]
          ).map(([v, label]) => (
            <button
              key={v || 'all'}
              type="button"
              aria-pressed={(s.type || '') === v}
              onClick={() => set({ type: v })}
              className={cn('h-8 shrink-0 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition-colors', (s.type || '') === v ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900')}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 p-1.5 sm:p-2 lg:grid-cols-[1fr_1.4fr_1fr_auto] lg:gap-2">
          <div className="col-span-1">{citySelect}</div>
          <div className="col-span-1 lg:col-span-1">{typeSelect}</div>
          <div className="col-span-2 lg:order-none lg:col-span-1 lg:row-start-1 lg:col-start-2">{location}</div>
          {findButton('Find', 'col-span-2 lg:col-span-1')}
        </div>
        {/* Price, size, beds — open on a desktop, one tap away on a phone. */}
        <div className="border-t border-slate-100 px-2.5 pb-2 sm:px-3">
          <button type="button" onClick={() => setMore((v) => !v)} className="flex w-full items-center gap-1.5 py-2.5 text-[13.5px] font-semibold text-primary lg:hidden">
            <SlidersHorizontal className="h-4 w-4" />
            {more ? 'Fewer options' : 'Price, size & more'}
            {extras > 0 && <span className="rounded-full bg-primary px-1.5 text-[11px] text-white">{extras}</span>}
            <ChevronDown className={cn('ml-auto h-4 w-4 transition-transform', more && 'rotate-180')} />
          </button>
          <div className={cn('grid gap-3 pt-1 sm:grid-cols-2 lg:grid-cols-[1.25fr_1.25fr_0.7fr_1fr] lg:pt-3', !more && 'hidden lg:grid')}>
            {priceRange}
            {sizeRange}
            {showBeds && (
              <div>
                <p className="mb-1.5 text-[12.5px] font-semibold text-slate-700">Bedrooms</p>
                <Select label="Bedrooms" value={s.beds ? String(s.beds) : ''} onChange={(v) => set({ beds: v ? Number(v) : undefined })}>
                  <option value="">Any</option>
                  {BEDS.map((b) => (
                    <option key={b} value={b}>
                      {b === 5 ? '5+' : b} {b === 1 ? 'bed' : 'beds'}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {keyword}
          </div>
        </div>
      </form>
      </>
    );
  }

  // ── Results pages ──

  return (
    <section className="relative z-40 border-b border-slate-200/70 bg-white lg:sticky lg:top-14">
      {/* Phone & tablet: where, Filters. */}
      <div className="container mx-auto flex items-center gap-2 px-[var(--gutter)] py-2 sm:px-4 lg:hidden">
        <button type="button" onClick={() => setSheet(true)} className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-2xl bg-slate-100 px-3.5 text-left">
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="min-w-0">
            <span className={cn('block truncate text-[13.5px] leading-tight', where ? 'font-semibold text-slate-900' : 'text-slate-500')}>{where || 'City or area'}</span>
            <span className="block truncate text-[11px] leading-tight text-slate-500">
              {[s.type ? TYPE_LABELS[s.type] ?? toTitleCase(s.type) : 'Any type', s.priceMin || s.priceMax ? rangeLabel(s.priceMin, s.priceMax, priceLabel) : 'Any rent'].join(' · ')}
            </span>
          </span>
        </button>
        <button type="button" onClick={() => setSheet(true)} className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-white" aria-label="Filters">
          <SlidersHorizontal className="h-[18px] w-[18px]" />
          {extras + (s.type ? 1 : 0) > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-slate-900 px-1 text-[11px] font-bold text-white ring-2 ring-white">{extras + (s.type ? 1 : 0)}</span>}
        </button>
      </div>

      {sheetEl}

      {/* Desktop: one row. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
        className="container mx-auto hidden items-center gap-2 px-4 py-2 lg:flex"
      >
        <div className="w-40 shrink-0 xl:w-44">{citySelect}</div>
        <div className="min-w-0 flex-1">{location}</div>
        <div className="w-36 shrink-0 xl:w-40">{typeSelect}</div>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={cn(field, 'w-auto max-w-[200px] truncate pr-8 text-left', (s.priceMin || s.priceMax) && 'border-primary text-primary')}>
              {rangeLabel(s.priceMin, s.priceMax, priceLabel, 'Price')}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[340px]">
            {priceRange}
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={cn(field, 'w-auto max-w-[180px] truncate pr-8 text-left', (s.marlaMin || s.marlaMax) && 'border-primary text-primary')}>
              {rangeLabel(s.marlaMin, s.marlaMax, marlaLabel, 'Area')}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[320px]">
            {sizeRange}
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className={cn(field, 'relative w-auto pr-8 text-left', (s.beds || s.search) && 'border-primary text-primary')}>
              More
              {(s.beds || s.search) && <span className="ml-1.5 rounded-full bg-primary px-1.5 text-[11px] text-white">{[s.beds, s.search].filter(Boolean).length}</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[340px] space-y-4">
            {showBeds && <Beds value={s.beds} onChange={(b) => set({ beds: b })} />}
            {keyword}
            {extras > 0 && (
              <button type="button" onClick={clearExtras} className="text-[13px] font-semibold text-slate-500 hover:text-slate-900">
                Clear price, size & more
              </button>
            )}
          </PopoverContent>
        </Popover>
        {findButton('Search', 'shrink-0 px-5')}
      </form>
    </section>
  );
}
