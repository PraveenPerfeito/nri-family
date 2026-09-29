import type { Metadata } from "next";
import Link from "next/link";
import { Activity, X } from "lucide-react";
import { AdminActivityList } from "@/components/admin/lists";
import { AdminPagination, FilterBar, FilterSelect, ResultSummary } from "@/components/admin/ui";
import { EmptyState, PageHeader, Panel } from "@/components/portal/ui/primitives";
import { adminRoutes } from "@/config/routes";
import { filterLabels, listAdminActivity, teamNames } from "@/lib/admin/data";
import { ADMIN_PAGE_SIZE, activityListHref, parseActivityParams } from "@/lib/admin/search";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Activity" };

export default async function AdminActivityPage(props: PageProps<"/admin/activity">) {
  const admin = await requireAdmin(adminRoutes.activity);
  const params = parseActivityParams(await props.searchParams);
  const [{ rows, total }, names, labels] = await Promise.all([listAdminActivity(admin, params), teamNames(admin), filterLabels(admin, { customer: params.customer })]);
  const filtered = Boolean(params.visibility || params.entity || params.customer);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Audit trail"
        title="Activity"
        description="Every change to accounts, properties and requests, by customers and by the team. Entries record what changed and who changed it, never the values themselves."
      />

      <FilterBar action={adminRoutes.activity} clearHref={adminRoutes.activity} active={filtered}>
        <FilterSelect
          name="visibility"
          label="Visible to"
          value={params.visibility}
          anyLabel="Everything"
          options={[
            { value: "CUSTOMER", label: "Customer visible" },
            { value: "INTERNAL", label: "Internal only" },
          ]}
        />
        <FilterSelect
          name="entity"
          label="About"
          value={params.entity}
          anyLabel="Anything"
          options={[
            { value: "SERVICE_REQUEST", label: "Requests" },
            { value: "PROPERTY", label: "Properties" },
            { value: "PROFILE", label: "Customer accounts" },
          ]}
        />
        {params.customer ? <input type="hidden" name="customer" value={params.customer} /> : null}
      </FilterBar>

      {params.customer ? (
        <p>
          <Link
            href={activityListHref({ ...params, customer: undefined, page: 1 })}
            className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1 text-sm text-ink hover:border-ink/40"
          >
            Customer: {labels.customer ?? "unknown"}
            <X aria-hidden className="size-3.5" />
            <span className="sr-only">(remove this filter)</span>
          </Link>
        </p>
      ) : null}

      <ResultSummary page={params.page} pageSize={ADMIN_PAGE_SIZE} total={total} noun={["entry", "entries"]} />

      {rows.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={filtered ? "No entries match" : "No activity yet"}
          body={filtered ? "Try other filters." : "Activity appears here as customers and the team make changes."}
          action={filtered ? { href: adminRoutes.activity, label: "Clear filters" } : undefined}
        />
      ) : (
        <Panel>
          <AdminActivityList rows={rows} timezone={admin.profile.timezone} teamNames={names} />
        </Panel>
      )}

      <AdminPagination page={params.page} total={total} pageSize={ADMIN_PAGE_SIZE} href={(page) => activityListHref({ ...params, page })} />
    </div>
  );
}
