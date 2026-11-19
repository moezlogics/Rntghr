// /sitemap-pages.xml — the site's own pages, then each city's archive pages
// (city, and city + property type) — only those with listings.

import { getSitemapData, sitemapXml, xmlResponse, SITE_URL } from '@/lib/sitemap-data';
import { getDealerCities } from '@/lib/server-api';
import { dealersCityPath, hasDealers } from '@/lib/dealers';

const STATIC_PAGES = [
  { url: '/',                                      priority: '1.0', changefreq: 'daily'   },
  { url: '/about',                                 priority: '0.6', changefreq: 'monthly' },
  { url: '/blog',                                  priority: '0.8', changefreq: 'daily'   },
  { url: '/contact',                               priority: '0.5', changefreq: 'monthly' },
  { url: '/find-property-for-me',                  priority: '0.7', changefreq: 'monthly' },
  { url: '/privacy-policy',                        priority: '0.3', changefreq: 'yearly'  },
  { url: '/terms',                                 priority: '0.3', changefreq: 'yearly'  },
  { url: '/properties/rent',                       priority: '0.9', changefreq: 'daily'   },
  { url: '/packages',                              priority: '0.6', changefreq: 'weekly'  },
  // Every rental type's nationwide page.
  ...['house', 'upper-portion', 'lower-portion', 'flat', 'apartment', 'room', 'hostel', 'shop', 'office', 'warehouse', 'commercial'].map((t) => ({
    url: `/properties/rent/${t}`,
    priority: '0.8',
    changefreq: 'daily',
  })),
];

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const rows: Parameters<typeof sitemapXml>[0] = STATIC_PAGES.map((p) => ({ loc: `${SITE_URL}${p.url}`, lastmod: today, changefreq: p.changefreq, priority: p.priority }));
  try {
    const data = await getSitemapData();
    for (const a of data.archives) {
      // /properties/rent/<city> and /properties/rent/<city>/<type>; areas are in sitemap-areas.
      if (a.depth > 4) continue;
      const isType = a.depth === 4 && /\/(house|upper-portion|lower-portion|flat|apartment|room|hostel|shop|office|warehouse|commercial)$/.test(a.path);
      if (a.depth === 4 && !isType) continue;
      rows.push({ loc: `${SITE_URL}${a.path}`, lastmod: a.lastmod, changefreq: 'daily', priority: a.depth === 3 ? '0.8' : '0.6' });
    }
  } catch (err) {
    console.error('[sitemap-pages]', err);
  }
  // Property dealers: the list of cities, and only the cities that have a dealer
  // (no page exists for the others). Refreshed by the API when one joins.
  const dealerCities = (await getDealerCities()).filter(hasDealers);
  for (const c of dealerCities) {
    rows.push({ loc: `${SITE_URL}${dealersCityPath(c.slug)}`, lastmod: today, changefreq: 'daily', priority: '0.7' });
  }
  return xmlResponse(sitemapXml(rows));
}
