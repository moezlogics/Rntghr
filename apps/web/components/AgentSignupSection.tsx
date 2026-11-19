import Link from 'next/link';
import { Plus } from 'lucide-react';

/*
 * The landlord's invitation, drawn as the "To-Let" board every Pakistani
 * street knows: an orange sign hanging from a nail by two strings, "Kiraye ke
 * liye khali hai" under it. Beside it, the real offer — the first listing is
 * free — and one button.
 */

const ADD = '/register?next=/dashboard/property/add-property';

export default function AgentSignupSection() {
  return (
    <section className="py-6 sm:py-10">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="grid items-center gap-5 overflow-hidden rounded-[28px] bg-accent px-5 py-6 ring-1 ring-primary/15 sm:grid-cols-[auto_1fr] sm:gap-10 sm:px-10 sm:py-8">
          {/* The board */}
          <div className="relative mx-auto w-[220px] pt-9 sm:mx-0 sm:w-[250px]" aria-hidden>
            {/* nail + strings */}
            <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-slate-700 shadow" />
            <svg className="absolute left-0 top-1 h-10 w-full text-slate-500" viewBox="0 0 250 40" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M125 6 40 38M125 6l85 32" />
            </svg>
            <div className="relative origin-top rotate-[-2deg] rounded-xl bg-[var(--price-tag)] px-4 pb-4 pt-3 text-center text-white shadow-[0_18px_30px_-16px_rgba(15,23,42,0.35)]">
              <span className="absolute left-7 top-2 h-2 w-2 rounded-full bg-white/80" />
              <span className="absolute right-7 top-2 h-2 w-2 rounded-full bg-white/80" />
              <p className="text-[38px] font-black leading-none tracking-[0.06em] sm:text-[44px]">TO LET</p>
              <p className="mt-1 text-[13px] font-semibold text-white/90">Kiraye ke liye khali hai</p>
              <p className="mt-2 rounded-md bg-white/15 py-1 text-[12px] font-bold tracking-wide">rentghar.pk</p>
            </div>
          </div>

          <div className="text-center sm:text-left">
            <h2 className="text-[21px] font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[28px]">
              Put your board up online
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-[14px] leading-relaxed text-slate-600 sm:mx-0 sm:text-[15px]">
              Have a house, portion, room or shop sitting empty? List it in two minutes — the first listing is free,
              and tenants call or WhatsApp you directly.
            </p>
            <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row">
              <Link
                href={ADD}
                className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-[14px] font-bold text-white transition-colors hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> List my place free
              </Link>
              <Link href="/packages" className="inline-flex h-11 items-center px-3 text-[13.5px] font-semibold text-primary hover:underline">
                Plans for dealers
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
