import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/shell/admin-shell";
import { siteConfig } from "@/config/site";
import { getAdmin, requireAdmin } from "@/lib/admin/session";

/*
 * The admin operations console (Phase 2B). Only active admins get past
 * requireAdmin(); everyone else sees the ordinary "page not found" (or is
 * sent to sign in). Every page and Server Action below checks again itself:
 * layouts don't re-run on client navigation, so this is for the shell, not
 * the security boundary.
 */

const robots: Metadata["robots"] = { index: false, follow: false, nocache: true };

/**
 * Page titles would otherwise name the admin page even when the visitor gets
 * "not found" (Next resolves page metadata separately from rendering). For
 * anyone but an active admin, every admin URL has the not-found title, so
 * nothing confirms that the console exists.
 */
export async function generateMetadata(): Promise<Metadata> {
  const notFoundTitle = `Page not found | ${siteConfig.brand.name}`;
  return (await getAdmin())
    ? { title: { default: "Admin console", template: `%s · Admin | ${siteConfig.brand.name}` }, robots }
    : { title: { default: notFoundTitle, template: notFoundTitle }, robots };
}

// Always rendered per request for the signed-in admin, never prerendered.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  return <AdminShell fullName={admin.profile.full_name}>{children}</AdminShell>;
}
