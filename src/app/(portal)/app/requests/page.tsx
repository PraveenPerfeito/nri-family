import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { RequestList } from "@/components/portal/lists";
import { EmptyState, PageHeader, Pagination } from "@/components/portal/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { portalRoutes } from "@/config/routes";
import { listRequests, PAGE_SIZE, pageParam, type RequestFilter } from "@/lib/portal/data";
import { requireCustomer } from "@/lib/portal/session";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Service requests" };

const filters: { value: RequestFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "completed", label: "Completed" },
];

const empty: Record<RequestFilter, { title: string; body: string }> = {
  all: { title: "No service requests yet", body: "When you need help locally, you can request a service here." },
  open: { title: "Nothing open right now", body: "Requests our team is working on will appear here." },
  completed: { title: "No completed requests yet", body: "Once our team completes a request, you'll find it and its record here." },
};

export default async function RequestsPage(props: PageProps<"/app/requests">) {
  const viewer = await requireCustomer(portalRoutes.requests);
  const params = await props.searchParams;
  const filter: RequestFilter = params.status === "open" || params.status === "completed" ? params.status : "all";
  const page = pageParam(params.page);
  const { requests, total } = await listRequests(viewer, filter, page);
  const href = (f: RequestFilter, p = 1) => {
    const q = new URLSearchParams();
    if (f !== "all") q.set("status", f);
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${portalRoutes.requests}?${s}` : portalRoutes.requests;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Requests"
        title="Service requests"
        description="Every request you make, with its status and full timeline."
        actions={
          <ButtonLink href={portalRoutes.newRequest}>
            <Plus aria-hidden className="size-4" />
            Request a service
          </ButtonLink>
        }
      />

      <nav aria-label="Filter requests" className="flex gap-1 rounded-control border border-line bg-surface p-1 sm:w-fit">
        {filters.map((f) => (
          <Link
            key={f.value}
            href={href(f.value)}
            aria-current={filter === f.value ? "page" : undefined}
            className={cn(
              "flex-1 rounded-md px-4 py-1.5 text-center text-sm font-medium transition-colors sm:flex-none",
              filter === f.value ? "bg-night text-white" : "text-ink-muted hover:bg-subtle hover:text-ink",
            )}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {requests.length > 0 ? (
        <>
          <RequestList requests={requests} timezone={viewer.profile.timezone} />
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} href={(p) => href(filter, p)} />
        </>
      ) : (
        <EmptyState icon={ClipboardList} title={empty[filter].title} body={empty[filter].body} action={{ href: portalRoutes.newRequest, label: "Request a service" }} />
      )}
    </div>
  );
}
