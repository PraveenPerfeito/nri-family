import { siteConfig } from "@/config/site";

export type SupabaseConfig = { url: string; publishableKey: string };

/**
 * The Supabase project the portal uses, or null when none is connected yet
 * (then /login and /register show the honest "coming soon" state and /app
 * sends visitors there). Only the public URL and publishable key are ever
 * read; the app has no use for the service-role key.
 */
export function supabaseConfig(): SupabaseConfig | null {
  const { supabaseUrl, supabasePublishableKey } = siteConfig.portal;
  if (!supabaseUrl || !supabasePublishableKey) return null;
  return { url: supabaseUrl, publishableKey: supabasePublishableKey };
}

export const isPortalConfigured = () => supabaseConfig() !== null;

/**
 * Session cookie flags. HttpOnly: only the server reads the session (the app
 * has no browser Supabase client), so a script on the page can never read the
 * tokens. SameSite=Lax, and Secure whenever the site is served over HTTPS.
 */
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: siteConfig.url.startsWith("https://"),
} as const;

/** Whether visitors may create customer accounts themselves (see site.ts). */
export const areSignupsOpen = () => isPortalConfigured() && siteConfig.portal.signupsOpen;
