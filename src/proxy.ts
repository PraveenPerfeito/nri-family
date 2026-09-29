import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Keeps sessions fresh on the portal, admin and account routes only, so the
 * public marketing pages stay fully static. Authorization itself is enforced
 * in every page and Server Action (requireCustomer / requireAdmin) and by the
 * database's Row Level Security, never by this proxy alone.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/app", "/app/:path*", "/admin", "/admin/:path*", "/login", "/register", "/forgot-password", "/reset-password", "/auth/:path*"],
};
