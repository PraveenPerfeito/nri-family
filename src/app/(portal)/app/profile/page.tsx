import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { ProfileForm } from "@/components/portal/profile/profile-form";
import { PageHeader, Panel } from "@/components/portal/ui/primitives";
import { Button } from "@/components/ui/button";
import { portalRoutes } from "@/config/routes";
import { signOutAction } from "@/lib/portal/actions/auth";
import { formatDate } from "@/lib/portal/format";
import { countryOptions, timeZoneGroups } from "@/lib/portal/places";
import { requireCustomer } from "@/lib/portal/session";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const viewer = await requireCustomer(portalRoutes.profile);
  const { profile } = viewer;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Account" title="Your profile" description={`Member since ${formatDate(profile.created_at, profile.timezone)}. Only you and our team can see these details.`} />
      <Panel>
        <ProfileForm profile={profile} email={viewer.email} countries={countryOptions()} timeZones={timeZoneGroups(profile.timezone)} />
      </Panel>
      <div className="flex flex-col gap-3 sm:flex-row lg:hidden">
        <Link href={portalRoutes.settings} className="inline-flex h-11 items-center gap-2 rounded-control border border-line bg-surface px-4 text-sm font-medium text-ink hover:border-line-strong">
          <Settings aria-hidden className="size-4 text-ink-subtle" />
          Settings and password
        </Link>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary" className="max-sm:w-full">
            <LogOut aria-hidden className="size-4" />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
