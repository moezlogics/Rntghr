'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useSiteSettings } from '@/components/SiteSettingsProvider';
import { resolved } from '@/lib/site-settings';

/**
 * Component for injecting JSON-LD Structured Data for SEO
 */
export default function StructuredData() {
  const pathname = usePathname();
  // Contact details, socials and the Analytics id come from Settings → General.
  const r = resolved(useSiteSettings());
  const GA_MEASUREMENT_ID = r.gaId;
  const phone = r.phone.replace(/[^\d+]/g, '');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rentghar.pk';
  const siteUrlWithSlash = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;

  // Home Page Specific Schema Graph
  const homePageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrlWithSlash}#organization`,
        'name': 'Rent Ghar',
        'url': siteUrlWithSlash,
        'logo': {
          '@type': 'ImageObject',
          'url': `${siteUrlWithSlash}logo.png`
        },
        'email': r.email,
        'telephone': phone,
        'sameAs': r.socials.map(([, url]) => url),
        'description': "Rent Ghar is Pakistan's rentals-only property portal: houses, upper and lower portions, flats, rooms, hostels, shops and offices for rent, with direct contact to owners and dealers."
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrlWithSlash}#website`,
        'url': siteUrlWithSlash,
        'name': 'Rent Ghar',
        'publisher': {
          '@id': `${siteUrlWithSlash}#organization`
        },
        'potentialAction': {
          '@type': 'SearchAction',
          'target': `${siteUrlWithSlash}properties/rent?search={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'RealEstateAgent',
        '@id': `${siteUrlWithSlash}#realestateagent`,
        'name': 'Rent Ghar',
        'url': siteUrlWithSlash,
        'image': `${siteUrlWithSlash}logo.png`,
        'telephone': phone,
        'email': r.email,
        'address': {
          '@type': 'PostalAddress',
          'addressLocality': 'Multan',
          'addressCountry': 'PK'
        },
        'areaServed': [
          { '@type': 'Country', 'name': 'Pakistan' },
          { '@type': 'City', 'name': 'Lahore' },
          { '@type': 'City', 'name': 'Islamabad' },
          { '@type': 'City', 'name': 'Karachi' },
          { '@type': 'City', 'name': 'Multan' },
          { '@type': 'City', 'name': 'Gujranwala' },
          { '@type': 'City', 'name': 'Faisalabad' }
        ],
        'parentOrganization': {
          '@id': `${siteUrlWithSlash}#organization`
        }
      }
    ]
  };

  // General organization data for other pages
  const organizationData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrlWithSlash}#organization`,
    name: 'Rent Ghar',
    url: siteUrlWithSlash,
    logo: `${siteUrlWithSlash}logo.png`,
    description: "Rent Ghar is Pakistan's rentals-only property portal: houses, upper and lower portions, flats, rooms, hostels, shops and offices for rent, with direct contact to owners and dealers.",
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'PK',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: phone,
      contactType: 'customer service',
    },
  };

  return (
    <>
      {pathname === '/' ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(homePageSchema) }}
        />
      ) : (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
        />
      )}

      {/* Google tag (gtag.js) */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="lazyOnload"
      />
      <Script id="google-analytics" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
