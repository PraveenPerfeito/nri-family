import type { Metadata } from "next";
import { Users } from "lucide-react";
import { CustomerTable } from "@/components/admin/lists";
import { AdminPagination, FilterBar, FilterSelect, ResultSummary } from "@/components/admin/ui";
import { EmptyState, PageHeader } from "@/components/portal/ui/primitives";
import { adminRoutes } from "@/config/routes";
import { listAdminCustomers } from "@/lib/admin/data";
import { ADMIN_PAGE_SIZE, customerListHref, customerShowOptions, parseCustomerParams } from "@/lib/admin/search";
import { requireAdmin } from "@/lib/admin/session";
import { countryOptions } from "@/lib/portal/places";

export const metadata: Metadata = { title: "Customers" };

export default async function AdminCustomersPage(props: PageProps<"/admin/customers">) {
  const admin = await requireAdmin(adminRoutes.customers);
  const params = parseCustomerParams(await props.searchParams);
  const { rows, total } = await listAdminCustomers(admin, params);
  const filtered = Boolean(params.q || params.country || params.show);
  const countries = countryOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Customers"
        description="Everyone with a customer account. Customers keep their own details up to date in their workspace; the team can view them here but not change them."
      />

      <FilterBar action={adminRoutes.customers} search={{ label: "Search", placeholder: "Name, email or phone", value: params.q }} clearHref={adminRoutes.customers} active={filtered}>
        <FilterSelect name="country" label="Lives in" value={params.country} anyLabel="Any country" options={[...countries.common, ...countries.all.filter((c) => !countries.common.some((x) => x.value === c.value))]} />
        <FilterSelect name="show" label="Show" value={params.show} anyLabel="All customers" options={customerShowOptions} />
      </FilterBar>

      <ResultSummary page={params.page} pageSize={ADMIN_PAGE_SIZE} total={total} noun={["customer", "customers"]} />

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filtered ? "No customers match" : "No customers yet"}
          body={filtered ? "Try another search or clear the filters." : "Customer accounts appear here once they are created."}
          action={filtered ? { href: adminRoutes.customers, label: "Clear filters" } : undefined}
        />
      ) : (
        <CustomerTable rows={rows} timezone={admin.profile.timezone} />
      )}

      <AdminPagination page={params.page} total={total} pageSize={ADMIN_PAGE_SIZE} href={(page) => customerListHref({ ...params, page })} />
    </div>
  );
}
