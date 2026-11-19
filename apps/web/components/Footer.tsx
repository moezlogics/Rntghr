import Link from 'next/link';
import { Facebook, Instagram, Linkedin, Mail, MessageCircle, Phone, Youtube } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { getSiteSettings } from '@/lib/site-settings.server';
import { mainDealersPath } from '@/lib/dealers.server';
import { DEFAULT_SOCIALS, resolved, waDigits } from '@/lib/site-settings';

/*
 * A minimal footer: the logo and one line about the site, the few links
 * people look for, the popular rental pages as one quiet line (useful
 * internal links for search engines), contact and socials, and the legal
 * line. Contact details come from Settings → General.
 */

const EXPLORE = [
  { name: 'All Rentals', href: '/properties/rent' },
  { name: 'Find a Rental for Me', href: '/find-property-for-me' },
  { name: 'Property Dealers', href: '/property-dealers' },
  { name: 'Dealer Packages', href: '/packages' },
  { name: 'Blog', href: '/blog' },
  { name: 'About Us', href: '/about' },
  { name: 'Contact Us', href: '/contact' },
];

const CITIES = ['Lahore', 'Islamabad', 'Karachi', 'Rawalpindi', 'Multan', 'Faisalabad', 'Gujranwala', 'Sahiwal'].map((name) => ({
  name: `Rent in ${name}`,
  href: `/properties/rent/${name.toLowerCase()}`,
}));

/** Every rental type's page. */
const TYPES = [
  { name: 'Houses for Rent', href: '/properties/rent/house' },
  { name: 'Upper Portions for Rent', href: '/properties/rent/upper-portion' },
  { name: 'Lower Portions for Rent', href: '/properties/rent/lower-portion' },
  { name: 'Flats for Rent', href: '/properties/rent/flat' },
  { name: 'Rooms for Rent', href: '/properties/rent/room' },
  { name: 'Hostels', href: '/properties/rent/hostel' },
  { name: 'Shops for Rent', href: '/properties/rent/shop' },
  { name: 'Offices for Rent', href: '/properties/rent/office' },
  { name: 'Warehouses for Rent', href: '/properties/rent/warehouse' },
];


function SocialIcon({ name }: { name: string }) {
  const cls = 'h-4 w-4';
  switch (name) {
    case 'Facebook':
      return <Facebook className={cls} />;
    case 'Instagram':
      return <Instagram className={cls} />;
    case 'YouTube':
      return <Youtube className={cls} />;
    case 'LinkedIn':
      return <Linkedin className={cls} />;
    case 'TikTok':
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden>
          <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1 0-5.18c.27 0 .53.04.77.12V9.66a5.73 5.73 0 0 0-.77-.05 5.68 5.68 0 1 0 5.68 5.68V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.24-1.48z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="currentColor" aria-hidden>
          <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64z" />
        </svg>
      );
  }
}

function Column({ title, links }: { title: string; links: { name: string; href: string }[] }) {
  return (
    <div>
      <h3 className="mb-2 text-[11.5px] font-bold uppercase tracking-wider text-slate-400">{title}</h3>
      <ul className="space-y-1.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-[13px] text-slate-600 transition-colors hover:text-primary">
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const Footer = async () => {
  const [settings, dealers] = await Promise.all([getSiteSettings(), mainDealersPath()]);
  const r = resolved(settings);
  const footerLogo = settings.footerLogoUrl || settings.logoUrl;
  const socials = r.socials.length ? r.socials : DEFAULT_SOCIALS;
  const year = new Date().getFullYear();

  const quick = EXPLORE.flatMap((l) => (l.href === '/property-dealers' ? (dealers ? [{ ...l, href: dealers }] : []) : [l]));
  const popular = [...TYPES.slice(0, 5), ...CITIES.slice(0, 5)];

  return (
    <footer className="mt-6 bg-white md:mt-10">
      <div className="container container-flush mx-auto px-4 md:px-6">
        <div className="flex flex-col gap-5 border-t border-slate-200/80 py-6 md:flex-row md:items-start md:justify-between md:py-8">
          <div className="max-w-xs">
            <Link href="/" aria-label={`${r.siteName} home`} className="inline-block">
              {footerLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={footerLogo} alt={r.siteName} className="h-[var(--logo-h)] w-auto max-w-[200px] object-contain" />
              ) : (
                <BrandLogo name={r.siteName} textClassName="text-slate-900" />
              )}
            </Link>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{r.footerAbout}</p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-3 md:max-w-md">
            {quick.map((l) => (
              <Link key={l.href} href={l.href} className="text-slate-600 hover:text-primary">{l.name}</Link>
            ))}
          </nav>

          <div className="flex flex-col gap-2 text-[13px]">
            <a href={r.phoneHref} className="inline-flex items-center gap-2 text-slate-600 hover:text-primary">
              <Phone className="h-4 w-4 text-slate-400" /> {r.phone}
            </a>
            <a href={`https://wa.me/${waDigits(r.whatsapp)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-slate-600 hover:text-primary">
              <MessageCircle className="h-4 w-4 text-slate-400" /> WhatsApp us
            </a>
            <a href={`mailto:${r.email}`} className="inline-flex items-center gap-2 break-all text-slate-600 hover:text-primary">
              <Mail className="h-4 w-4 shrink-0 text-slate-400" /> {r.email}
            </a>
            {socials.length > 0 && (
              <div className="mt-1 flex gap-1.5">
                {socials.map(([name, href]) => (
                  <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-600 hover:bg-primary hover:text-white">
                    <SocialIcon name={name} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 py-3 text-[12px] text-slate-400">
          {popular.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-primary">{l.name}</Link>
          ))}
        </p>

        <div className="flex flex-col gap-1 border-t border-slate-100 py-3 text-[12px] text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>{settings.copyrightText ? settings.copyrightText.replace('{year}', String(year)) : `© ${year} ${r.siteName}. All rights reserved.`}</p>
          <nav aria-label="Legal" className="flex gap-4">
            <Link href="/privacy-policy" className="hover:text-primary">Privacy</Link>
            <Link href="/terms" className="hover:text-primary">Terms</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
