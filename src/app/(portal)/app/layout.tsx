import type { Metadata } from "next";
import { AppShell } from "@/components/portal/shell/app-shell";
import { siteConfig } from "@/config/site";
import { countUnreadNotifications } from "@/lib/portal/data";
import { requireCustomer } from "@/lib/portal/session";

/*
 * The private customer workspace (Layer 2). Every page below also calls
 * requireCustomer() itself: layouts don't re-run on client navigation, so
 * this check is for the shell, not the security boundary.
 */

export const metadata: Metadata = {
  title: { default: "Your workspace", template: `%s · Workspace | ${siteConfig.brand.name}` },
  robots: { index: false, follow: false, nocache: true },
};

// Always rendered per request for the signed-in customer, never prerendered
// (even while no Supabase project is connected and every page just redirects).
export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: LayoutProps<"/app">) {
  const viewer = await requireCustomer("/app");
  const unread = await countUnreadNotifications(viewer);
  return (
    <AppShell fullName={viewer.profile.full_name} unread={unread}>
      {children}
    </AppShell>
  );
}
