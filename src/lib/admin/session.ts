import "server-only";
import { notFound, redirect } from "next/navigation";
import { adminRoutes, routes } from "@/config/routes";
import { getViewer, isActiveAdmin, type Viewer } from "@/lib/portal/session";

/*
 * Data Access Layer for the admin console. Every admin layout, page and
 * Server Action starts with `requireAdmin()`. It verifies the session with
 * Supabase (getClaims), loads the profile through Row Level Security and
 * requires role ADMIN plus an active team membership. The database checks
 * the same thing again (app.is_admin()) on every admin read and write, so
 * hiding navigation, the proxy or the client are never the boundary.
 */

/** A signed-in, active admin. Same shape as a customer viewer; different rights in the database. */
export type AdminViewer = Viewer;

/** The signed-in active admin, or null. */
export async function getAdmin(): Promise<AdminViewer | null> {
  const viewer = await getViewer();
  return viewer && (await isActiveAdmin(viewer)) ? viewer : null;
}

/**
 * The signed-in active admin. Signed out: a redirect to sign in, coming back
 * to `returnTo` afterwards. Signed in without admin rights (customers,
 * operations staff, inactive admins): the ordinary "page not found", so the
 * console is not even confirmed to exist.
 */
export async function requireAdmin(returnTo: string = adminRoutes.dashboard): Promise<AdminViewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`${routes.login}?next=${encodeURIComponent(returnTo)}`);
  if (!(await isActiveAdmin(viewer))) notFound();
  return viewer;
}

/**
 * Server-side error log for the admin console. Only stable identifiers and
 * error codes are logged, never names, emails, note text or tokens.
 */
export function logAdminError(operation: string, error: unknown, ids: Record<string, string | undefined> = {}) {
  const detail =
    error && typeof error === "object"
      ? { code: (error as { code?: string }).code, status: (error as { status?: number }).status, name: (error as { name?: string }).name }
      : {};
  console.error(`[admin] ${operation} failed`, { ...ids, ...detail });
}
