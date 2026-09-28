import Link from "next/link";
import { Building2, ClipboardList, Plus } from "lucide-react";
import { ActivityFeed } from "@/components/portal/activity/activity-feed";
import { PropertyList, RequestList } from "@/components/portal/lists";
import { EmptyState, PageHeader, Panel, SavedNotice, StatCard } from "@/components/portal/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { portalRoutes } from "@/config/routes";
import { getDashboard } from "@/lib/portal/data";
import { firstName, greeting } from "@/lib/portal/format";
import { requireCustomer } from "@/lib/portal/session";

export const metadata = { title: "Dashboard" };

const saved: Record<string, string> = { password: "Your new password is set." };

export default async function DashboardPage(props: PageProps<"/app">) {
  const viewer = await requireCustomer(portalRoutes.dashboard);
  const { saved: savedKey } = await props.searchParams;
  const data = await getDashboard(viewer);
  const tz = viewer.profile.timezone;
  const isNew = data.propertyCount === 0 && data.openRequests.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Your Family Office"
        title={`${greeting(tz)}, ${firstName(viewer.profile.full_name)}`}
        description={
          isNew
            ? "Your private workspace is ready. Start by adding a property you'd like us to look after."
            : data.openRequests.length > 0
              ? "Here's what needs your attention in Tamil Nadu."
              : "Nothing needs your attention right now."
        }
        actions={
          isNew ? null : (
            <ButtonLink href={portalRoutes.newRequest} className="sm:hidden">
              <Plus aria-hidden className="size-4" />
              Request a service
            </ButtonLink>
          )
        }
      />
      <SavedNotice message={typeof savedKey === "string" ? saved[savedKey] : undefined} />

      {isNew ? (
        <section aria-labelledby="setup-title" className="rounded-card border border-line bg-surface p-5 sm:p-6">
          <h2 id="setup-title" className="text-label text-ink">
            Set up your workspace
          </h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            <li className="rounded-control border border-line-subtle bg-canvas p-4">
              <p className="text-xs font-semibold text-brand tabular-nums">01</p>
              <p className="mt-1 font-semibold tracking-tight text-ink">Add your first property</p>
              <p className="mt-1 text-sm text-ink-muted">A house, apartment or plot in Tamil Nadu. Its details stay private to you.</p>
              <ButtonLink href={portalRoutes.newProperty} className="mt-4" arrow>
                Add property
              </ButtonLink>
            </li>
            <li className="rounded-control border border-line-subtle bg-canvas p-4">
              <p className="text-xs font-semibold text-brand tabular-nums">02</p>
              <p className="mt-1 font-semibold tracking-tight text-ink">Request a service</p>
              <p className="mt-1 text-sm text-ink-muted">An inspection, a repair or help for family. You can follow every step here.</p>
              <ButtonLink href={portalRoutes.newRequest} variant="secondary" className="mt-4">
                Request a service
              </ButtonLink>
            </li>
          </ol>
        </section>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatCard label="Properties" value={data.propertyCount} href={portalRoutes.properties} />
          <StatCard label="Open requests" value={data.openRequests.length} href={`${portalRoutes.requests}?status=open`} />
          <StatCard label="Waiting for you" value={data.waitingForYou} tone="attention" hint={data.waitingForYou === 0 ? "Nothing to do" : undefined} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Panel
          title="My properties"
          labelledBy="dash-properties"
          bodyClassName="p-0"
          action={
            data.propertyCount > 0 ? (
              <Link href={portalRoutes.properties} className="text-sm font-medium text-brand hover:text-brand-strong">
                View all
              </Link>
            ) : null
          }
        >
          {data.properties.length > 0 ? (
            <div className="[&>ul]:rounded-none [&>ul]:border-0">
              <PropertyList properties={data.properties} timezone={tz} />
            </div>
          ) : (
            <EmptyState
              compact
              icon={Building2}
              title="No properties yet"
              body="Add your first property to start managing your Tamil Nadu assets."
              // A new workspace already shows these steps in "Set up your workspace".
              action={isNew ? undefined : { href: portalRoutes.newProperty, label: "Add your first property" }}
            />
          )}
        </Panel>

        <Panel title="Needs your attention" labelledBy="dash-attention" bodyClassName="p-0">
          {data.openRequests.length > 0 ? (
            <div className="[&>ul]:rounded-none [&>ul]:border-0">
              <RequestList requests={data.openRequests.slice(0, 4)} timezone={tz} />
            </div>
          ) : (
            <EmptyState
              compact
              icon={ClipboardList}
              title="Nothing needs your attention"
              body="When you need help locally, you can request a service here."
              action={isNew ? undefined : { href: portalRoutes.newRequest, label: "Request a service" }}
            />
          )}
        </Panel>
      </div>

      <Panel
        title="Recent activity"
        labelledBy="dash-activity"
        action={
          <Link href={portalRoutes.activity} className="text-sm font-medium text-brand hover:text-brand-strong">
            All activity
          </Link>
        }
      >
        <ActivityFeed entries={data.activity} timezone={tz} />
      </Panel>
    </div>
  );
}
