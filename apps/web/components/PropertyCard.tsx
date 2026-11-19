'use client'
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { photoLoader } from '@/lib/img';
import { Bath, BedDouble, Camera, MapPin, Phone, Play, Ruler } from 'lucide-react';
import { Property } from '@/lib/data';
import { cn, toTitleCase } from '@/lib/utils';
import { amountShort } from '@/lib/pk';
import { useSize } from '@/components/area-unit/AreaUnitProvider';
import { useImpression } from '@/components/analytics/impression';
import VerifiedBadge from '@/components/VerifiedBadge';
import { RentTag } from '@/components/RentTag';
import { trackContact } from '@/lib/analytics';
import { useSiteSettings } from '@/components/SiteSettingsProvider';
import { resolved, waDigits } from '@/lib/site-settings';

/*
 * The one listing card — results, homepage, an agent's profile.
 *
 * Photo first, the way rental apps show a place: a 4:3 photo with the monthly
 * rent hanging on it as a key tag, then the title, the area, three facts and
 * Call / WhatsApp. Compact enough for two columns on a phone. The card is one
 * real <Link>; the two contact buttons sit above it and count the enquiry.
 *
 * `variant` / `hideActions` are accepted for older call sites and ignored.
 */

interface PropertyCardProps {
  property: Property;
  /** @deprecated */
  hideActions?: boolean;
  /** @deprecated */
  variant?: 'list' | 'grid';
  className?: string;
  /** Load the photo eagerly (first cards above the fold). */
  priority?: boolean;
}

function postedAgo(iso?: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const hours = Math.floor((Date.now() - then) / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

const PropertyCard = ({ property, className, priority }: PropertyCardProps) => {
  const ref = useImpression<HTMLElement>(property.id);
  const href = `/properties/${property.slug}`;

  const hasVideo = Boolean(property.videoUrl || property.videoPosterUrl);
  const realImage =
    property.image && !property.image.includes('images.unsplash.com') ? property.image : '';
  // A photo whose file is missing on the server shows the "No photo" tile, not a broken image.
  const [broken, setBroken] = useState(false);
  const poster = broken ? '' : property.videoPosterUrl || realImage;
  const isVideoPrimary = Boolean(property.isVideoThumbnail || (hasVideo && !realImage));
  const rawVideoUrl = property.videoUrl || '';

  // Rented: stays in the lists for a while, but must not look available.
  const closed = property.availability === 'rented';

  // Rents read best in full below a lakh ("85,000"), then short ("1.5 Lakh").
  const price = property.price < 100_000 ? property.price.toLocaleString('en-PK') : amountShort(property.price) || property.price.toLocaleString('en-PK');
  const place = [property.areaName || property.location, property.city]
    .filter(Boolean)
    .map((part) => toTitleCase(String(part)))
    .filter((part, i, all) => all.findIndex((p) => p.toLowerCase() === part.toLowerCase()) === i)
    .join(', ');
  const size = useSize({ marla: property.marla, kanal: property.kanal, areaSize: Number(property.area), marlaSqft: property.marlaSqft });
  const photos = property.photoCount ?? 0;
  const ago = postedAgo(property.postedAt);

  const site = resolved(useSiteSettings());
  const phone = property.contactNumber || site.phone;
  const rawWhatsApp = property.whatsappNumber || property.contactNumber || site.whatsapp;
  const whatsapp = rawWhatsApp ? waDigits(rawWhatsApp) : '';
  const phoneHref = phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '';
  const waText = encodeURIComponent(
    `Hi, I am interested in: ${property.name} (${process.env.NEXT_PUBLIC_BASE_URL || 'https://rentghar.pk'}${href})`,
  );
  const waUrl = whatsapp ? `https://wa.me/${whatsapp}?text=${waText}` : '';

  return (
    <article
      ref={ref}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.25)]',
        closed && 'opacity-75',
        className,
      )}
    >
      <Link href={href} className="absolute inset-0 z-10 rounded-2xl" aria-label={property.name} />

      {/* ── Photo ── */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {poster ? (
          <Image
            src={poster}
            loader={photoLoader}
            alt={property.name}
            fill
            priority={priority}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
            onError={() => setBroken(true)}
          />
        ) : isVideoPrimary && rawVideoUrl ? (
          <video
            src={`${rawVideoUrl}#t=0.5`}
            preload="metadata"
            muted
            playsInline
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-[11px] text-slate-400">No photo</div>
        )}

        {/* Rent on the photo, as a key tag */}
        <RentTag amount={price} muted={closed} className="absolute bottom-2 left-2" />

        {(closed || property.isFeatured) && (
          <span
            className={cn(
              'pointer-events-none absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
              closed ? 'bg-slate-900 text-white' : 'bg-[var(--price-tag)] text-white',
            )}
          >
            {closed ? 'Rented' : 'Featured'}
          </span>
        )}

        {isVideoPrimary ? (
          <span className="pointer-events-none absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white">
            <Play className="ml-0.5 h-3 w-3 fill-current" />
          </span>
        ) : (photos > 1 || hasVideo) && (
          <span className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {photos > 1 ? <><Camera className="h-3 w-3" />{photos}</> : <><Play className="h-2.5 w-2.5 fill-current" />Video</>}
          </span>
        )}
      </div>

      {/* ── Details ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-2.5 sm:p-3">
        <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-primary">
          <span className="truncate">{property.type}</span>
          {property.ownerVerified && <VerifiedBadge className="ml-auto shrink-0 px-1.5 text-[10px]" />}
        </div>

        <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900 group-hover:text-primary sm:text-[14px]">
          {property.name}
        </h3>

        {place && (
          <p className="flex items-center gap-1 text-[11.5px] text-slate-500 sm:text-[12px]">
            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{place}</span>
          </p>
        )}

        <div className="mt-auto flex items-center gap-2.5 border-t border-slate-100 pt-2 text-[11px] text-slate-600 sm:text-[12px]">
          {property.bedrooms > 0 && (
            <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5 text-slate-400" />{property.bedrooms}</span>
          )}
          {property.bathrooms > 0 && (
            <span className="inline-flex items-center gap-1"><Bath className="h-3.5 w-3.5 text-slate-400" />{property.bathrooms}</span>
          )}
          {size && size !== '—' && (
            <span className="inline-flex min-w-0 items-center gap-1"><Ruler className="h-3.5 w-3.5 shrink-0 text-slate-400" /><span className="truncate">{size}</span></span>
          )}
          {ago && <span className="ml-auto shrink-0 text-[10.5px] text-slate-400">{ago}</span>}
        </div>

        {!closed && (phone || whatsapp) && (
          <div className="relative z-20 mt-1 grid grid-cols-2 gap-1.5">
            {phone && (
              <a
                href={phoneHref}
                onClick={() => trackContact(property.id, 'phone')}
                className={cn('inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-accent text-[12px] font-bold text-primary transition-colors hover:bg-primary hover:text-white', !whatsapp && 'col-span-2')}
                aria-label={`Call about ${property.name}`}
              >
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
            )}
            {whatsapp && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackContact(property.id, 'whatsapp')}
                className={cn('inline-flex h-8 items-center justify-center gap-1 rounded-lg bg-[#25D366] text-[12px] font-bold text-white transition-colors hover:bg-[#1ebe5b]', !phone && 'col-span-2')}
                aria-label={`WhatsApp about ${property.name}`}
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
                  <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.79a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.83 9.83 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88zm8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.42z" />
                </svg>
                <span className="min-[420px]:hidden">Chat</span>
                <span className="hidden min-[420px]:inline">WhatsApp</span>
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default PropertyCard;
