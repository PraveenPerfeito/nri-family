import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { sessionCookieOptions, supabaseConfig } from "./config";

export type PortalClient = SupabaseClient<Database>;

/**
 * A Supabase client bound to the signed-in visitor's session cookie. Every
 * query runs as that user, so Row Level Security decides what they can see.
 * Create one per request; never share it.
 */
export async function createSupabaseServerClient(): Promise<PortalClient> {
  const config = supabaseConfig();
  if (!config) throw new Error("The customer portal is not connected to a Supabase project.");
  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.publishableKey, {
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy (src/proxy.ts) refreshes the session on the next request.
        }
      },
    },
  });
}
