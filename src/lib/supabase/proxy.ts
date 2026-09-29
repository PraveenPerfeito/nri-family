import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routes } from "@/config/routes";
import { isAdminPath, isPortalPath } from "@/lib/portal/redirects";
import type { Database } from "@/types/database";
import { sessionCookieOptions, supabaseConfig } from "./config";

/**
 * Runs in the proxy for portal, admin and account routes:
 * 1. refreshes the Supabase session so cookies stay valid;
 * 2. sends signed-out visitors from /app and /admin pages to /login?next=…
 *    (an optimistic check only — every page and Server Action verifies the
 *    session and role again through requireCustomer / requireAdmin).
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const config = supabaseConfig();
  const { pathname, search } = request.nextUrl;
  const isPrivate = isPortalPath(pathname) || isAdminPath(pathname);

  if (!config) {
    // No project connected: the portal is closed, so /app and /admin go to the login page that says so.
    return isPrivate && request.method === "GET" ? NextResponse.redirect(new URL(routes.login, request.url)) : response;
  }

  const supabase = createServerClient<Database>(config.url, config.publishableKey, {
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
      },
    },
  });

  // Validates the access token (and refreshes it when it has expired).
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  // Only page loads are redirected; Server Actions answer for themselves.
  if (!signedIn && isPrivate && request.method === "GET") {
    const url = new URL(routes.login, request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  if (isPrivate) response.headers.set("Cache-Control", "private, no-store");
  return response;
}
