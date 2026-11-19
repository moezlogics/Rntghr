import { cn } from '@/lib/utils';

/*
 * The rent, as a key tag hanging on the photo: an orange tag with a punched
 * hole and a pointed end, so it reads on any picture. `size="lg"` is the
 * listing page's; the default is the card's.
 */
export function RentTag({
  amount,
  size = 'md',
  muted,
  className,
}: {
  /** Already formatted, e.g. "85,000" or "1.5 Lakh". */
  amount: string;
  size?: 'md' | 'lg';
  /** Rented / expired: dark instead of orange. */
  muted?: boolean;
  className?: string;
}) {
  const lg = size === 'lg';
  return (
    <span
      className={cn('pointer-events-none inline-flex drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]', className)}
    >
      <span
        className={cn(
          'relative inline-flex items-baseline gap-1 text-white',
          muted ? 'bg-slate-900' : 'bg-[var(--price-tag)]',
          lg ? 'py-2 pl-7 pr-4' : 'py-1 pl-5 pr-2.5',
        )}
        style={{
          clipPath: lg
            ? 'polygon(16px 0, 100% 0, 100% 100%, 16px 100%, 0 50%)'
            : 'polygon(11px 0, 100% 0, 100% 100%, 11px 100%, 0 50%)',
          borderTopRightRadius: lg ? 12 : 8,
          borderBottomRightRadius: lg ? 12 : 8,
        }}
      >
        {/* the punched hole */}
        <span
          aria-hidden
          className={cn('absolute top-1/2 -translate-y-1/2 rounded-full bg-white/95', lg ? 'left-[13px] h-2.5 w-2.5' : 'left-[9px] h-1.5 w-1.5')}
        />
        <span className={cn('font-semibold opacity-90', lg ? 'text-[13px]' : 'text-[10px]')}>Rs</span>
        <span className={cn('font-extrabold leading-none tracking-tight', lg ? 'text-[24px] sm:text-[28px]' : 'text-[14px] sm:text-[15px]')}>{amount}</span>
        <span className={cn('font-medium opacity-85', lg ? 'text-[13px]' : 'text-[10px]')}>/mo</span>
      </span>
    </span>
  );
}
