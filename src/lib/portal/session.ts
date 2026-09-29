import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { adminRoutes, routes } from "@/config/routes";
import { isPortalConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient, type PortalClient } from "@/lib/supabase/server";
import type { Profile } from "./domain";

/*
 * Data Access Layer for the customer portal. Every portal page and Server
 * Action starts with `requireCustomer()`: the session token is verified with
 * Supabase (signature and expiry, via getClaims), and the profile is loaded
 * through Row Level Security. Hiding UI is never the security boundary.
 */

export type Viewer = {
  supabase: PortalClient;
  authUserId: string;
  email: string;
  profile: Profile;
};

/** The signed-in person, or null. Memoised for the duration of one request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isPortalConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || typeof sub !== "string") return null;

  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("auth_user_id", sub).maybeSingle();
  if (profileError) {
    logPortalError("load profile", profileError, { authUserId: sub });
    return null;
  }
  if (!profile) return null;
  const email = typeof data?.claims?.email === "string" ? data.claims.email : (profile.email ?? "");
  return { supabase, authUserId: sub, email, profile };
});

/**
 * Whether the signed-in person is an active admin: role ADMIN and an active
 * team membership. The membership is read through Row Level Security, which
 * shows it only to active admins, so the role alone is never enough.
 * Memoised per request (the viewer object is itself memoised).
 */
export const isActiveAdmin = cache(async (viewer: Viewer): Promise<boolean> => {
  if (viewer.profile.role !== "ADMIN") return false;
  const { data, error } = await viewer.supabase.from("team_members").select("is_active").eq("profile_id", viewer.profile.id).maybeSingle();
  if (error) {
    logPortalError("load team membership", error, { profileId: viewer.profile.id });
    return false;
  }
  return data?.is_active === true;
});

/**
 * The signed-in customer, or a redirect to sign-in. `returnTo` is the portal
 * path to come back to afterwards. Active admins are sent to the admin
 * console; other roles (operations staff, vendor, partner) have no workspace
 * yet and are turned away here.
 */
export async function requireCustomer(returnTo?: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(returnTo ? `${routes.login}?next=${encodeURIComponent(returnTo)}` : routes.login);
  if (viewer.profile.role !== "CUSTOMER") redirect((await isActiveAdmin(viewer)) ? adminRoutes.dashboard : `${routes.login}?notice=workspace-unavailable`);
  return viewer;
}

/**
 * Server-side error log for the portal. Only stable identifiers and error
 * codes are logged — never names, emails, addresses, tokens or free text.
 */
export function logPortalError(operation: string, error: unknown, ids: Record<string, string | undefined> = {}) {
  const detail =
    error && typeof error === "object"
      ? { code: (error as { code?: string }).code, status: (error as { status?: number }).status, name: (error as { name?: string }).name }
      : {};
  console.error(`[portal] ${operation} failed`, { ...ids, ...detail });
}
