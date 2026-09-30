import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircleQuestion, XCircle } from "lucide-react";
import { EvidenceGallery } from "@/components/portal/requests/evidence-gallery";
import { RequestTimeline } from "@/components/portal/requests/request-timeline";
import { ServiceVisit } from "@/components/portal/requests/service-visit";
import { ConfirmAction } from "@/components/portal/ui/confirm-action";
import { DetailList, PageHeader, Panel, PriorityBadge, RequestStatusBadge, SavedNotice } from "@/components/portal/ui/primitives";
import { portalRoutes } from "@/config/routes";
import { cancelRequestAction } from "@/lib/portal/actions/requests";
import { currentVisit } from "@/lib/field-ops/domain";
import { getRequest, getRequestFieldOps } from "@/lib/portal/data";
import { canCancelRequest, labelOf, requestCategories } from "@/lib/portal/domain";
import { formatDate } from "@/lib/portal/format";
import { requireCustomer } from "@/lib/portal/session";

export const metadata = { title: "Service request" };

const savedMessages: Record<string, string> = {
  created: "Your request has been submitted. We've added it to your timeline and notifications.",
  cancelled: "Your request has been cancelled.",
};

export default async function RequestPage(props: PageProps<"/app/requests/[id]">) {
  const { id } = await props.params;
  const viewer = await requireCustomer(portalRoutes.request(id));
  const [request, fieldOps] = await Promise.all([getRequest(viewer, id), getRequestFieldOps(viewer, id)]);
  if (!request) notFound();
  const visit = currentVisit(fieldOps.visits);
  const { saved } = await props.searchParams;
  const tz = viewer.profile.timezone;

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: portalRoutes.requests, label: "Service requests" }}
        eyebrow={`Service request · ${request.request_number}`}
        title={request.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <RequestStatusBadge status={request.status} />
            <PriorityBadge priority={request.priority} />
          </span>
        }
      />
      <SavedNotice message={typeof saved === "string" ? savedMessages[saved] : undefined} />
      {request.status === "WAITING_FOR_CUSTOMER" ? (
        <section aria-labelledby="waiting-title" className="rounded-card border border-attention/25 bg-attention-soft px-5 py-4">
          <h2 id="waiting-title" className="flex items-center gap-2 text-sm font-semibold text-ink">
            <MessageCircleQuestion aria-hidden className="size-4 text-attention" />
            We need something from you
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Our team will contact you using the email or phone number in your profile.{" "}
            <Link href={portalRoutes.profile} className="font-medium text-brand underline-offset-4 hover:underline">
              Check your contact details
            </Link>
            . Replying to a request here is coming to the platform.
          </p>
        </section>
      ) : null}

      {fieldOps.evidence.length > 0 ? (
        <Panel title="Evidence" labelledBy="request-evidence">
          <p className="mb-5 text-sm text-ink-muted">Photos and documents from our team, checked before they were shared with you.</p>
          <EvidenceGallery evidence={fieldOps.evidence} timezone={tz} />
        </Panel>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 space-y-6">
          {visit ? (
            <Panel title="Service visit" labelledBy="service-visit">
              <ServiceVisit visit={visit} timezone={tz} awaitingEvidence={visit.status === "COMPLETED" && fieldOps.evidence.length === 0} />
            </Panel>
          ) : null}
        <Panel title="Details" labelledBy="request-details">
          <DetailList
            items={[
              { label: "Request number", value: <span className="tabular-nums">{request.request_number}</span> },
              { label: "Service", value: labelOf(requestCategories, request.category) },
              {
                label: "Property",
                value: request.property ? (
                  <Link href={portalRoutes.property(request.property.id)} className="text-brand underline-offset-4 hover:underline">
                    {request.property.name}
                  </Link>
                ) : (
                  "Not linked to a property"
                ),
              },
              { label: "Created", value: formatDate(request.created_at, tz) },
              { label: "Description", value: request.description ? <span className="font-normal whitespace-pre-line">{request.description}</span> : "—" },
            ]}
          />
        </Panel>
        </div>

        <Panel title="Timeline" labelledBy="request-timeline">
          <RequestTimeline events={request.events} status={request.status} timezone={tz} />
        </Panel>
      </div>

      {canCancelRequest(request.status) ? (
        <section aria-labelledby="cancel-title" className="border-t border-line-subtle pt-6">
          <h2 id="cancel-title" className="text-label text-ink">
            Changed your mind?
          </h2>
          <p className="mt-2 mb-4 text-sm text-ink-muted">You can cancel this request until our team starts on it.</p>
          <ConfirmAction
            action={cancelRequestAction.bind(null, request.id)}
            triggerLabel="Cancel request"
            icon={<XCircle aria-hidden className="size-4" />}
            title={`Cancel ${request.request_number}?`}
            body="The request stays in your history, marked as cancelled."
            confirmLabel="Cancel request"
            pendingLabel="Cancelling…"
          />
        </section>
      ) : null}
    </div>
  );
}
