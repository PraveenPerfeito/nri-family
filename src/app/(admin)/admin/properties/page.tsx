import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { PropertyTable } from "@/components/admin/lists";
import { AdminPagination, FilterBar, FilterSelect, ResultSummary } from "@/components/admin/ui";
import { EmptyState, PageHeader } from "@/components/portal/ui/primitives";
import { adminRoutes } from "@/config/routes";
import { listAdminProperties } from "@/lib/admin/data";
import { ADMIN_PAGE_SIZE, parsePropertyParams, propertyListHref } from "@/lib/admin/search";
import { requireAdmin } from "@/lib/admin/session";
import { propertyStatusLabels, propertyTypes, type PropertyStatus } from "@/lib/portal/domain";

export const metadata: Metadata = { title: "Properties" };

export default async function AdminPropertiesPage(props: PageProps<"/admin/properties">) {
  const admin = await requireAdmin(adminRoutes.properties);
  const params = parsePropertyParams(await props.searchParams);
  const { rows, total } = await listAdminProperties(admin, params);
  const filtered = Boolean(params.q || params.type || params.status);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Properties"
        description="Every property customers have added. Owners manage their property details; the team can view them here but not change or remove them."
      />

      <FilterBar action={adminRoutes.properties} search={{ label: "Search", placeholder: "Property name, city, district or owner", value: params.q }} clearHref={adminRoutes.properties} active={filtered}>
        <FilterSelect name="type" label="Type" value={params.type} anyLabel="All types" options={propertyTypes} />
        <FilterSelect
          name="status"
          label="Status"
          value={params.status}
          anyLabel="Any status"
          options={(Object.keys(propertyStatusLabels) as PropertyStatus[]).map((s) => ({ value: s, label: propertyStatusLabels[s] }))}
        />
      </FilterBar>

      <ResultSummary page={params.page} pageSize={ADMIN_PAGE_SIZE} total={total} noun={["property", "properties"]} />

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={filtered ? "No properties match" : "No properties yet"}
          body={filtered ? "Try another search or clear the filters." : "Properties appear here when customers add them to their workspace."}
          action={filtered ? { href: adminRoutes.properties, label: "Clear filters" } : undefined}
        />
      ) : (
        <PropertyTable rows={rows} timezone={admin.profile.timezone} />
      )}

      <AdminPagination page={params.page} total={total} pageSize={ADMIN_PAGE_SIZE} href={(page) => propertyListHref({ ...params, page })} />
    </div>
  );
}
