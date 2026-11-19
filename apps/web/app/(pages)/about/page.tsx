import Link from 'next/link';
import StaticPageView from '@/components/StaticPageView';
import { getSiteName } from '@/lib/site-settings.server';

/*
 * About. The text is edited in Dashboard → Static Pages (slug "about"); the
 * copy below is shown only until that page exists, so /about is never empty.
 */

export default async function AboutPage() {
  const site = await getSiteName();
  return (
    <StaticPageView
      slug="about"
      title={`About ${site}`}
      fallback={
        <>
          <p className="mt-3 text-[17px] leading-relaxed text-slate-600">
            {site} is a Pakistani portal for rentals — and only rentals. Landlords and dealers list
            houses, upper and lower portions, flats, rooms, hostels, shops, offices and warehouses
            for rent, and tenants contact them directly — by phone or WhatsApp, without signing up.
          </p>

          <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-slate-700">
            <section>
              <h2 className="text-lg font-bold text-slate-900">What you will find here</h2>
              <p className="mt-2">
                Rentals across Lahore, Islamabad, Rawalpindi, Karachi, Multan, Faisalabad,
                Gujranwala, Sahiwal and other cities, searchable by city, area, rental type, size,
                bedrooms and monthly rent. Sizes are in marla and kanal, the way homes are rented here.
              </p>
              <p className="mt-3">
                Because we only do rentals, every page is built around what tenants ask: the monthly
                rent, which portion is available, the size and the area — with nothing for sale to
                scroll past.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">How listings work</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 marker:text-slate-400">
                <li>Every listing is reviewed before it goes live.</li>
                <li>
                  Each listing shows who posted it, with a link to their profile and their other
                  rentals.
                </li>
                <li>
                  When a property is rented out it is marked as such and its contact details are
                  hidden.
                </li>
                <li>
                  Anything that looks wrong can be reported from the listing page, and we look at
                  every report.
                </li>
              </ul>
              <p className="mt-3 text-slate-600">
                We are a listings platform, not a party to any rental agreement. Always visit the
                property and meet the owner before paying any advance or security.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">For landlords and dealers</h2>
              <p className="mt-2">
                Anyone can create an account and post a rental; the first listing is free.
                Dealers who list more can choose a{' '}
                <Link href="/packages" className="font-medium text-primary hover:underline">
                  monthly package
                </Link>{' '}
                for more listings and featured placement.
              </p>
            </section>
          </div>
        </>
      }
    />
  );
}
