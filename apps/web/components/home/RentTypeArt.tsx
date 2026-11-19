/*
 * Small building drawings, one per rental type, with the part you would rent
 * lit up in the rent colour: the top floor for an upper portion, the ground
 * floor for a lower portion, one window for a room, a unit in a block for a
 * flat. Drawn with `currentColor` for the outline so a tile can tint them.
 */

const LIT = 'var(--price-tag, #ea580c)';
const WALL = '#ffffff';

type Props = { className?: string };

function Frame({ children, className }: Props & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 64 56" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden className={className}>
      {/* ground line */}
      <path d="M4 52h56" strokeLinecap="round" opacity=".35" />
      {children}
    </svg>
  );
}

export function HouseArt({ className }: Props) {
  return (
    <Frame className={className}>
      <path d="M14 26 32 12l18 14v26H14z" fill={LIT} stroke={LIT} />
      <path d="M10 28 32 10l22 18" strokeLinecap="round" />
      <rect x="27" y="38" width="10" height="14" rx="1.5" fill={WALL} />
      <rect x="18" y="31" width="7" height="6" rx="1" fill={WALL} />
      <rect x="39" y="31" width="7" height="6" rx="1" fill={WALL} />
    </Frame>
  );
}

export function UpperPortionArt({ className }: Props) {
  return (
    <Frame className={className}>
      <path d="M10 20 32 8l22 12" strokeLinecap="round" />
      <rect x="14" y="20" width="36" height="15" fill={LIT} stroke={LIT} />
      <rect x="14" y="35" width="36" height="17" fill={WALL} />
      <rect x="19" y="24" width="7" height="6" rx="1" fill={WALL} />
      <rect x="38" y="24" width="7" height="6" rx="1" fill={WALL} />
      <rect x="27" y="40" width="10" height="12" rx="1.5" />
      <path d="M50 26h6v26" strokeLinecap="round" />
    </Frame>
  );
}

export function LowerPortionArt({ className }: Props) {
  return (
    <Frame className={className}>
      <path d="M10 20 32 8l22 12" strokeLinecap="round" />
      <rect x="14" y="20" width="36" height="15" fill={WALL} />
      <rect x="14" y="35" width="36" height="17" fill={LIT} stroke={LIT} />
      <rect x="19" y="24" width="7" height="6" rx="1" />
      <rect x="38" y="24" width="7" height="6" rx="1" />
      <rect x="27" y="40" width="10" height="12" rx="1.5" fill={WALL} />
    </Frame>
  );
}

export function FlatArt({ className }: Props) {
  const cells = [0, 1, 2, 3].flatMap((r) => [0, 1].map((c) => ({ r, c })));
  return (
    <Frame className={className}>
      <rect x="20" y="6" width="24" height="46" rx="1.5" fill={WALL} />
      {cells.map(({ r, c }) => (
        <rect
          key={`${r}${c}`}
          x={24 + c * 9}
          y={10 + r * 10}
          width="7"
          height="6"
          rx="1"
          fill={r === 1 && c === 1 ? LIT : 'none'}
          stroke={r === 1 && c === 1 ? LIT : 'currentColor'}
        />
      ))}
    </Frame>
  );
}

export function RoomArt({ className }: Props) {
  return (
    <Frame className={className}>
      <path d="M12 24 32 10l20 14" strokeLinecap="round" />
      <rect x="16" y="24" width="32" height="28" fill={WALL} />
      <rect x="20" y="29" width="9" height="8" rx="1" fill={LIT} stroke={LIT} />
      <rect x="35" y="29" width="9" height="8" rx="1" />
      <rect x="28" y="41" width="8" height="11" rx="1.5" />
    </Frame>
  );
}

export function HostelArt({ className }: Props) {
  const lit = new Set(['0-0', '1-2', '2-1']);
  return (
    <Frame className={className}>
      <rect x="10" y="12" width="44" height="40" rx="1.5" fill={WALL} />
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => {
          const on = lit.has(`${r}-${c}`);
          return <rect key={`${r}${c}`} x={15 + c * 13} y={17 + r * 11} width="8" height="6" rx="1" fill={on ? LIT : 'none'} stroke={on ? LIT : 'currentColor'} />;
        }),
      )}
    </Frame>
  );
}

export function ShopArt({ className }: Props) {
  return (
    <Frame className={className}>
      <rect x="12" y="22" width="40" height="30" fill={WALL} />
      <path d="M10 22h44l-3-9H13z" fill={LIT} stroke={LIT} />
      <path d="M17 22v3a3.5 3.5 0 0 0 7 0v-3m0 3a3.5 3.5 0 0 0 7 0v-3m0 3a3.5 3.5 0 0 0 7 0v-3m0 3a3.5 3.5 0 0 0 7 0v-3" />
      <rect x="17" y="32" width="16" height="12" rx="1" />
      <rect x="37" y="32" width="10" height="20" rx="1" />
    </Frame>
  );
}

export function OfficeArt({ className }: Props) {
  return (
    <Frame className={className}>
      <rect x="18" y="8" width="28" height="44" rx="1.5" fill={WALL} />
      {[0, 1, 2, 3].map((r) => (
        <path key={r} d={`M22 ${15 + r * 9}h20`} strokeLinecap="round" opacity={r === 2 ? 0 : 1} />
      ))}
      <rect x="21" y="29" width="22" height="7" rx="1" fill={LIT} stroke={LIT} />
      <rect x="28" y="44" width="8" height="8" rx="1" />
    </Frame>
  );
}

export function WarehouseArt({ className }: Props) {
  return (
    <Frame className={className}>
      <path d="M6 26 32 14l26 12v26H6z" fill={WALL} />
      <rect x="20" y="32" width="24" height="20" rx="1" fill={LIT} stroke={LIT} />
      <path d="M20 38h24M20 44h24" stroke={WALL} />
    </Frame>
  );
}

export const RENT_TYPE_ART: Record<string, (p: Props) => React.ReactElement> = {
  house: HouseArt,
  'upper-portion': UpperPortionArt,
  'lower-portion': LowerPortionArt,
  flat: FlatArt,
  apartment: FlatArt,
  room: RoomArt,
  hostel: HostelArt,
  shop: ShopArt,
  office: OfficeArt,
  warehouse: WarehouseArt,
  commercial: ShopArt,
};
