import Link from "next/link";
import { LogOut } from "lucide-react";
import { ChangePasswordForm } from "@/components/portal/profile/password-form";
import { DetailList, PageHeader, Panel } from "@/components/portal/ui/primitives";
import { Button } from "@/components/ui/button";
import { portalRoutes, routes } from "@/config/routes";
import { signOutAction } from "@/lib/portal/actions/auth";
import { requireCustomer } from "@/lib/portal/session";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const viewer = await requireCustomer(portalRoutes.settings);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Account" title="Settings" description="Sign-in and security for your workspace." />

      <Panel title="Sign-in" labelledBy="settings-signin">
        <DetailList items={[{ label: "Email", value: viewer.email }]} />
      </Panel>

      <Panel title="Password" labelledBy="settings-password">
        <ChangePasswordForm />
      </Panel>

      <Panel title="Session" labelledBy="settings-session">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-muted">Sign out of your workspace on this device.</p>
          <form action={signOutAction}>
            <Button type="submit" variant="secondary">
              <LogOut aria-hidden className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </Panel>

      <p className="text-sm text-ink-subtle">
        Notification preferences and family access are coming to the platform. To close your account, contact our team through{" "}
        <Link href={routes.contact} className="font-medium text-brand underline-offset-4 hover:underline">
          the contact page
        </Link>
        .
      </p>
    </div>
  );
}
