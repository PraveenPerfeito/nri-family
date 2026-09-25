import type { Metadata, Viewport } from "next";
import { Geist, Newsreader } from "next/font/google";
import { AnalyticsListener } from "@/components/shared/analytics-listener";
import { homeTitle, siteConfig } from "@/config/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
/** Display serif for headings (weight 500 only). Preloaded: the hero headline is the LCP element. */
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], display: "swap", weight: ["500"], style: ["normal"] });
/** Display italic, used only below the fold, so it is fetched on demand instead of competing with the hero fonts. */
const newsreaderItalic = Newsreader({
  variable: "--font-newsreader-italic",
  subsets: ["latin"],
  display: "swap",
  weight: ["500"],
  style: ["italic"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: homeTitle,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f6f2",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${geistSans.variable} ${newsreader.variable} ${newsreaderItalic.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        {children}
        <AnalyticsListener />
      </body>
    </html>
  );
}
