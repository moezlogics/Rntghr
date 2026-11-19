 import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, Open_Sans, Poppins, Roboto } from "next/font/google";
import "./globals.css";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "./providers";
import { AuthProvider } from "@/context/auth-context";
import StructuredData from "@/components/StructuredData";
import ChunkReloadGuard from "@/components/ChunkReloadGuard";
import ScrollRestorer from "@/components/ScrollRestorer";
import { SiteSettingsProvider } from "@/components/SiteSettingsProvider";
import PushPrompt from "@/components/push/PushPrompt";
import { getSiteSettings } from "@/lib/site-settings.server";
import { isHex, themeStyle } from "@/lib/site-settings";

// Rent Ghar's own type: Plus Jakarta Sans (served through the same
// --font-geist-sans variable the stylesheet already reads).
const geistSans = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  // ✅ Sirf zaruri weights load karo
  weight: ["400", "500", "600", "700"],
  display: "swap", // ✅ Font load hone tak system font dikhao
});

/*
 * The other fonts the admin can pick in Settings → Appearance. Declaring them
 * costs nothing until one is chosen: preload is off, and a browser only
 * downloads a font file when some text is actually set in it.
 */
// next/font needs literal options here, so each one is spelled out.
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", preload: false, variable: "--font-inter" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", preload: false, variable: "--font-poppins" });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", preload: false, variable: "--font-roboto" });
const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", preload: false, variable: "--font-open-sans" });

const metadataBase: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://rentghar.pk'),
  title: {
    default: "Rent Ghar | Houses, Flats & Rooms for Rent in Pakistan",
    // Pages write their own full titles.
    template: "%s"
  },
  description: "Rent Ghar is Pakistan's rental property portal. Find houses, upper and lower portions, flats, rooms, hostels, shops and offices for rent — and contact owners and dealers directly.",
  keywords: ["rent ghar", "house for rent", "houses for rent in lahore", "upper portion for rent", "lower portion for rent", "flat for rent islamabad", "room for rent karachi", "rental property pakistan"],
  authors: [{ name: "Rent Ghar Team" }],
  creator: "Rent Ghar",
  publisher: "Rent Ghar",
  formatDetection: {
    email: false,
    address: true,
    telephone: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://rentghar.pk',
    siteName: 'Rent Ghar',
    title: 'Rent Ghar | Houses, Flats & Rooms for Rent in Pakistan',
    description: "Rent Ghar is Pakistan's rental property portal. Find houses, upper and lower portions, flats, rooms, hostels, shops and offices for rent — and contact owners and dealers directly.",
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Rent Ghar — homes for rent in Pakistan',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rent Ghar — Homes for Rent in Pakistan',
    description: 'Houses, portions, flats, rooms and shops for rent across Pakistan.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

/*
 * The defaults above, with whatever the admin has set in Settings → General
 * (default title and description, share image, Search Console verification)
 * and Settings → Appearance (favicon). Empty settings leave the built-in
 * values alone — these pages are ranked, so nothing changes unless someone
 * changes it on purpose.
 */
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  const meta: Metadata = { ...metadataBase };
  if (s.seoTitle) {
    meta.title = { default: s.seoTitle, template: "%s" };
    meta.openGraph = { ...meta.openGraph, title: s.seoTitle };
  }
  if (s.seoDescription) {
    meta.description = s.seoDescription;
    meta.openGraph = { ...meta.openGraph, description: s.seoDescription };
  }
  if (s.ogImageUrl) {
    meta.openGraph = { ...meta.openGraph, images: [{ url: s.ogImageUrl, width: 1200, height: 630 }] };
    meta.twitter = { ...meta.twitter, images: [s.ogImageUrl] };
  }
  if (s.siteName) {
    meta.openGraph = { ...meta.openGraph, siteName: s.siteName };
    meta.authors = [{ name: `${s.siteName} Team` }];
    meta.creator = s.siteName;
    meta.publisher = s.siteName;
  }
  if (s.googleVerification) meta.verification = { google: s.googleVerification };
  /*
   * The favicon from Settings → Appearance, and only that one: the built-in
   * favicon.ico now lives in public/ (still served at /favicon.ico) instead
   * of app/, where Next added it to every page ahead of the admin's — so
   * browsers kept showing the old one. A PNG made from the same picture
   * (/api/push/icon.png) is listed too, for browsers and iPhones that don't
   * take .webp or .svg icons.
   */
  if (s.faviconUrl) {
    const v = encodeURIComponent((s.faviconUrl.split('/').pop() || '1').slice(0, 60));
    const png = `/api/push/icon.png?v=${v}`;
    meta.icons = {
      icon: [{ url: png, type: 'image/png', sizes: '192x192' }, { url: s.faviconUrl }],
      shortcut: png,
      apple: [{ url: png, sizes: '192x192' }],
    };
  } else {
    meta.icons = { icon: '/favicon.ico', shortcut: '/favicon.ico', apple: '/apple-touch-icon.png' };
  }
  return meta;
}

/*
 * The address-bar colour phone browsers (Chrome on Android, Safari on iPhone)
 * paint around the page — Settings → Appearance. White matches the header.
 */
export async function generateViewport(): Promise<Viewport> {
  const s = await getSiteSettings();
  return { themeColor: isHex(s.browserBarColor) ? s.browserBarColor : "#ffffff" };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const fontVariables = [geistSans, inter, poppins, roboto, openSans].map((f) => f.variable).join(" ");

  return (
    // Colours, radius and font from Settings → Appearance, as CSS variables:
    // every component reads them through the Tailwind tokens.
    <html lang="en" className={fontVariables} style={themeStyle(settings)}>
      <body className="antialiased">
        {/* First, and outside the providers: a stale document that cannot load
            its chunks must still be able to rescue itself. */}
        <ChunkReloadGuard />
        <ScrollRestorer />
        <Providers>
          <AuthProvider>
            <TooltipProvider>
              <SiteSettingsProvider value={settings}>
                <StructuredData />
                {children}
              </SiteSettingsProvider>
              <PushPrompt />
              <Sonner />
            </TooltipProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}