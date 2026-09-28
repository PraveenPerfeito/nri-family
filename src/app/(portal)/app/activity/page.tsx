import { History } from "lucide-react";
import { ActivityFeed } from "@/components/portal/activity/activity-feed";
import { EmptyState, PageHeader, Pagination, Panel } from "@/components/portal/ui/primitives";
import { portalRoutes } from "@/config/routes";
import { listActivity, PAGE_SIZE, pageParam } from "@/lib/portal/data";
import { requireCustomer } from "@/lib/portal/session";

export const metadata = { title: "Activity" };

export default async function ActivityPage(props: PageProps<"/app/activity">) {
  const viewer = await requireCustomer(portalRoutes.activity);
  const page = pageParam((await props.searchParams).page);
  const { entries, total } = await listActivity(viewer, page);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Activity"
        title="Your activity"
        description="A record of every change in your workspace: who did what, and when. Times are shown in your time zone."
      />
      {entries.length > 0 ? (
        <Panel>
          <ActivityFeed entries={entries} timezone={viewer.profile.timezone} headingLevel="h2" />
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} href={(p) => (p > 1 ? `${portalRoutes.activity}?page=${p}` : portalRoutes.activity)} />
        </Panel>
      ) : (
        <EmptyState icon={History} title="No activity yet" body="Changes you and our team make will be recorded here." />
      )}
    </div>
  );
}
