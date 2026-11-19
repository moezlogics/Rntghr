import Link from 'next/link';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import PlanCards from '@/components/plans/PlanCards';
import type { Plan } from '@/lib/plans';

/* Homepage: the agent plans — the same cards, with the same benefits, as /packages and the dashboard. */
export default function HomePlans({ plans }: { plans: Plan[] }) {
  if (!plans.length) return null;
  return (
    <section className="container mx-auto overflow-x-hidden px-3 py-5 sm:px-4 sm:py-8">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-[19px] font-bold tracking-tight text-slate-900 sm:text-[24px]">Plans for dealers</h2>
          <p className="mt-0.5 text-[13px] text-slate-500 sm:text-[14px]">
            Start free. Upgrade for more listings, featured placement, the
            <span className="mx-1 inline-flex items-center gap-0.5 font-semibold text-primary">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified
            </span>
            badge and agent accounts for your team.
          </p>
        </div>
        <Link href="/packages" className="inline-flex h-8 items-center gap-1 rounded-full bg-white px-3 text-[12.5px] font-semibold text-primary ring-1 ring-slate-200 hover:bg-accent">
          Compare plans <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <PlanCards plans={plans} />
    </section>
  );
}
