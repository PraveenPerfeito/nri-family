import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, X } from "lucide-react";
import { RequestTable } from "@/components/admin/lists";
import { AdminPagination, FilterBar, FilterSelect, ResultSummary } from "@/components/admin/ui";
import { EmptyState, PageHeader } from "@/components/portal/ui/primitives";
import { adminRoutes } from "@/config/routes";
import { filterLabels, listAdminRequests, listTeam } from "@/lib/admin/data";
import { adminStatusLabels, requestStatuses, teamRoleLabels, type TeamRole } from "@/lib/admin/domain";
import { ADMIN_PAGE_SIZE, hasRequestFilters, parseRequestParams, requestListHref, requestSorts } from "@/lib/admin/search";
import { requireAdmin } from "@/lib/admin/session";
import { requestCategories } from "@/lib/portal/domain";

export const metadata: Metadata = { title: "Requests" };

export default async function AdminRequestsPage(props: PageProps<"/admin/requests">) {
  const admin = await requireAdmin(adminRoutes.requests);
  const params = parseRequestParams(await props.searchParams);
  const [{ rows, total }, team, labels] = await Promise.all([
    listAdminRequests(admin, params),
    listTeam(admin),
    filterLabels(admin, { customer: params.customer, property: params.property }),
  ]);
  const tz = admin.profile.timezone;
  const filtered = hasRequestFilters(params);

  const scoped = [
    params.customer ? { label: `Customer: ${labels.customer ?? "unknown"}`, clear: requestListHref({ ...params, customer: undefined, page: 1 }) } : null,
    params.property ? { label: `Property: ${labels.property ?? "unknown"}`, clear: requestListHref({ ...params, property: undefined, page: 1 }) } : null,
  ].filter((chip) => chip !== null);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Operations" title="Requests" description="Every service request from every customer. Search, filter and open one to review, assign and update it." />

      <FilterBar
        action={adminRoutes.requests}
        search={{ label: "Search", placeholder: "Request number, title, customer or property", value: params.q }}
        clearHref={adminRoutes.requests}
        active={filtered || params.sort !== "newest"}
      >
        <FilterSelect
          name="status"
          label="Status"
          value={params.status}
          anyLabel="All statuses"
          options={[{ value: "open", label: "Open (not completed or cancelled)" }, ...requestStatuses.map((s) => ({ value: s, label: adminStatusLabels[s] }))]}
        />
        <FilterSelect
          name="priority"
          label="Priority"
          value={params.priority}
          anyLabel="Any priority"
          options={[
            { value: "URGENT", label: "Urgent" },
            { value: "NORMAL", label: "Normal" },
          ]}
        />
        <FilterSelect name="category" label="Service" value={params.category} anyLabel="All services" options={requestCategories.map((c) => ({ value: c.value, label: c.label }))} />
        <FilterSelect
          name="assignee"
          label="Assigned to"
          value={params.assignee}
          anyLabel="Anyone"
          options={[
            { value: "unassigned", label: "Nobody (unassigned)" },
            ...team.map((m) => ({ value: m.profile_id, label: `${m.full_name} (${teamRoleLabels[m.role as TeamRole]}${m.is_active ? "" : ", inactive"})` })),
          ]}
        />
        <FilterSelect name="sort" label="Sort" value={params.sort} options={requestSorts} wide />
        {params.customer ? <input type="hidden" name="customer" value={params.customer} /> : null}
        {params.property ? <input type="hidden" name="property" value={params.property} /> : null}
      </FilterBar>

      {scoped.length > 0 ? (
        <ul aria-label="Showing requests for" className="flex flex-wrap gap-2">
          {scoped.map((chip) => (
            <li key={chip.label}>
              <Link href={chip.clear} className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1 text-sm text-ink hover:border-ink/40">
                {chip.label}
                <X aria-hidden className="size-3.5" />
                <span className="sr-only">(remove this filter)</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <ResultSummary page={params.page} pageSize={ADMIN_PAGE_SIZE} total={total} noun={["request", "requests"]} />

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={filtered ? "No requests match" : "No requests yet"}
          body={filtered ? "Try another search or clear the filters." : "When a customer submits a service request, it appears here."}
          action={filtered ? { href: adminRoutes.requests, label: "Clear filters" } : undefined}
        />
      ) : (
        <RequestTable rows={rows} timezone={tz} />
      )}

      <AdminPagination page={params.page} total={total} pageSize={ADMIN_PAGE_SIZE} href={(page) => requestListHref({ ...params, page })} />
    </div>
  );
}
