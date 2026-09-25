import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { AnalyticsListener } from "@/components/shared/analytics-listener";
import { homeTitle, siteConfig } from "@/config/site";
import "./globals.css";

/** One variable sans for UI, body and display headings (UI V2). Preloaded: the hero headline is the LCP element. */
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: homeTitle,
    template: `%s | ${siteConfig.brand.name}`,
  },
  description: siteConfig.brand.description,
  applicationName: siteConfig.brand.name,
  // The favicon comes from the app/icon.svg file convention (siteConfig.brand.favicon).
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#f6f5f1",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${geistSans.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col">
        {children}
        <AnalyticsListener />
      </body>
    </html>
  );
}
