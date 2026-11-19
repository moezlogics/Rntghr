'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Camera, Home, KeyRound, MessageCircle, PhoneCall, Search, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
 * How renting works, for whichever side you're on. A switch picks the
 * journey — "I need a place" or "I have a place" — and its three steps run
 * along a dashed path that ends at a key, the moment the rental is done.
 * Horizontal on a desktop, vertical on a phone.
 */

const JOURNEYS = {
  tenant: {
    label: 'I need a place',
    steps: [
      { icon: Search, title: 'Pick an area and a budget', text: 'Every listing is a rental, with the monthly rent shown up front.' },
      { icon: MessageCircle, title: 'Call or WhatsApp the owner', text: 'Straight from the listing. No account needed.' },
      { icon: Home, title: 'Visit, agree, move in', text: 'See it first and pay only against a signed agreement.' },
    ],
    end: 'Keys in hand',
    cta: { href: '/properties/rent', label: 'Find a rental' },
  },
  landlord: {
    label: 'I have a place',
    steps: [
      { icon: UserPlus, title: 'Make a free account', text: 'Owners and dealers — the first listing costs nothing.' },
      { icon: Camera, title: 'Add photos and the rent', text: 'A few photos, the area and the monthly rent. Two minutes.' },
      { icon: PhoneCall, title: 'Tenants call you', text: 'Mark it rented the day the keys change hands.' },
    ],
    end: 'Rented out',
    cta: { href: '/dashboard/property/add-property', label: 'List my place free' },
  },
} as const;

type Side = keyof typeof JOURNEYS;

export default function HomeHowItWorks() {
  const [side, setSide] = useState<Side>('tenant');
  const j = JOURNEYS[side];

  return (
    <section className="py-6 sm:py-10" aria-labelledby="how-heading">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="relative overflow-hidden rounded-[28px] bg-navy px-4 py-6 text-white sm:px-8 sm:py-9">
          {/* faint roofline pattern */}
          <svg aria-hidden className="pointer-events-none absolute -right-10 -top-6 h-48 w-72 text-white/[0.06]" viewBox="0 0 200 120" fill="none" stroke="currentColor" strokeWidth="6">
            <path d="M10 80 60 35l50 45M80 80l50-45 50 45" />
          </svg>

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 id="how-heading" className="max-w-md text-[22px] font-extrabold leading-tight tracking-tight sm:text-[30px]">
              Renting, in three easy steps
            </h2>
            <div role="tablist" aria-label="Choose your side" className="inline-flex w-full rounded-full bg-white/10 p-1 sm:w-auto">
              {(Object.keys(JOURNEYS) as Side[]).map((k) => (
                <button
                  key={k}
                  role="tab"
                  type="button"
                  aria-selected={side === k}
                  onClick={() => setSide(k)}
                  className={cn(
                    'h-9 flex-1 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:flex-none',
                    side === k ? 'bg-white text-navy' : 'text-white/80 hover:text-white',
                  )}
                >
                  {JOURNEYS[k].label}
                </button>
              ))}
            </div>
          </div>

          <ol key={side} className="relative mt-6 grid gap-0 sm:mt-8 sm:grid-cols-4 sm:gap-4">
            {j.steps.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative flex gap-3.5 pb-5 sm:flex-col sm:gap-3 sm:pb-0">
                {/* the path: down the left on a phone, across on a desktop */}
                <span aria-hidden className="absolute left-[19px] top-11 h-[calc(100%-2.75rem)] border-l-2 border-dashed border-white/25 sm:left-12 sm:right-[-1rem] sm:top-5 sm:h-0 sm:border-l-0 sm:border-t-2" />
                <span className="relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-primary shadow-[0_0_0_6px_rgba(255,255,255,0.08)]">
                  <Icon className="h-5 w-5" />
                  <span className="absolute -bottom-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--price-tag)] text-[10.5px] font-bold text-white ring-2 ring-navy">
                    {i + 1}
                  </span>
                </span>
                <span>
                  <span className="block text-[15px] font-bold leading-snug">{title}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-white/70">{text}</span>
                </span>
              </li>
            ))}
            {/* the end of the path: the key */}
            <li className="flex items-center gap-3.5 sm:flex-col sm:items-start sm:gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[var(--price-tag)] text-white shadow-[0_0_0_6px_rgba(255,255,255,0.12)]">
                <KeyRound className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-[15px] font-bold leading-snug">{j.end}</span>
                <Link
                  href={j.cta.href}
                  className="mt-2 inline-flex h-9 items-center rounded-full bg-white px-4 text-[13px] font-bold text-navy transition-colors hover:bg-accent"
                >
                  {j.cta.label}
                </Link>
              </span>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
