import type { Row } from "@/types/database";

/*
 * Portal domain vocabulary: the values the database accepts (mirrors the
 * CHECK constraints in supabase/migrations) and the words customers see.
 * Shared by server and client code, so it has no server-only imports.
 */

export type Profile = Row<"profiles">;
export type Property = Row<"properties">;
export type ServiceRequest = Row<"service_requests">;
export type ServiceRequestEvent = Row<"service_request_events">;
export type ActivityLog = Row<"activity_logs">;
export type Notification = Row<"notifications">;

export type PropertyType = Property["property_type"];
export type OwnershipType = NonNullable<Property["ownership_type"]>;
export type PropertyStatus = Property["status"];
export type RequestCategory = ServiceRequest["category"];
export type RequestPriority = ServiceRequest["priority"];
export type RequestStatus = ServiceRequest["status"];

export const propertyTypes: { value: PropertyType; label: string }[] = [
  { value: "HOUSE", label: "Independent house" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "LAND", label: "Residential land" },
  { value: "AGRICULTURAL_LAND", label: "Agricultural land" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "OTHER", label: "Other" },
];

export const ownershipTypes: { value: OwnershipType; label: string }[] = [
  { value: "SOLE", label: "Sole owner" },
  { value: "JOINT", label: "Joint owner" },
  { value: "FAMILY", label: "Family property" },
  { value: "POWER_OF_ATTORNEY", label: "I hold power of attorney" },
  { value: "OTHER", label: "Other" },
];

export const propertyStatusLabels: Record<PropertyStatus, string> = {
  ACTIVE: "Active",
  UNDER_REVIEW: "Under review",
  INACTIVE: "Inactive",
};

export const requestCategories: { value: RequestCategory; label: string; hint: string }[] = [
  { value: "PROPERTY_INSPECTION", label: "Property inspection", hint: "A visit with photos and a written report." },
  { value: "MAINTENANCE", label: "Maintenance or repair", hint: "Plumbing, electrical, painting, fixing something." },
  { value: "CLEANING", label: "Cleaning", hint: "Before a visit, after tenants, or regular upkeep." },
  { value: "GARDEN_MAINTENANCE", label: "Garden maintenance", hint: "Trimming, clearing, watering." },
  { value: "SECURITY_CHECK", label: "Security check", hint: "Locks, gates, signs of entry." },
  { value: "DOCUMENT_ASSISTANCE", label: "Document assistance", hint: "Collecting, organising or renewing papers." },
  { value: "RENTAL_MANAGEMENT", label: "Rental management", hint: "Tenants, rent, move-in or move-out." },
  { value: "FAMILY_ASSISTANCE", label: "Family assistance", hint: "Practical help for family members locally." },
  { value: "OTHER", label: "Something else", hint: "Tell us in the description." },
];

export const requestPriorities: { value: RequestPriority; label: string; hint: string }[] = [
  { value: "NORMAL", label: "Normal", hint: "We'll plan it with you." },
  { value: "URGENT", label: "Urgent", hint: "Something needs attention soon, like a leak." },
];

export const requestStatusLabels: Record<RequestStatus, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  WAITING_FOR_CUSTOMER: "Waiting for you",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** Requests the team is still working on (the "Open" filter). */
export const openRequestStatuses: RequestStatus[] = ["SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"];

/** A customer can cancel only before the team has started (mirrors the RLS policy). */
export const cancellableRequestStatuses: RequestStatus[] = ["SUBMITTED", "UNDER_REVIEW"];

export const isOpenRequest = (status: RequestStatus) => openRequestStatuses.includes(status);
export const canCancelRequest = (status: RequestStatus) => cancellableRequestStatuses.includes(status);

/**
 * The stages every request moves through, for the "next steps" part of the
 * timeline. Only stages backed by a real event are ever shown as done.
 */
export const requestStages: { status: RequestStatus; label: string; description: string }[] = [
  { status: "SUBMITTED", label: "Request submitted", description: "We have your request." },
  { status: "UNDER_REVIEW", label: "Team review", description: "Our team reviews it and may ask you questions." },
  { status: "ASSIGNED", label: "Assignment", description: "A verified local person or partner is assigned." },
  { status: "IN_PROGRESS", label: "Work", description: "The visit or work takes place." },
  { status: "COMPLETED", label: "Completion", description: "Work is done and recorded." },
];

/**
 * Stages still ahead of a request. Its place is the current status when that is
 * a stage; otherwise (waiting for the customer) the furthest stage its real
 * history reached, so a pause never makes finished stages look undone.
 */
export function upcomingStages(status: RequestStatus, events: Pick<ServiceRequestEvent, "event_type" | "metadata">[]) {
  if (status === "COMPLETED" || status === "CANCELLED") return [];
  let place = requestStages.findIndex((s) => s.status === status);
  if (place < 0) {
    const reached = new Set(events.filter((e) => e.event_type === "STATUS_CHANGED").map((e) => (e.metadata as { to?: string } | null)?.to));
    place = requestStages.reduce((furthest, stage, i) => (reached.has(stage.status) ? i : furthest), 0);
  }
  return requestStages.slice(place + 1);
}

export const labelOf = (options: { value: string; label: string }[], value: string | null | undefined, fallback = "—") =>
  options.find((o) => o.value === value)?.label ?? fallback;

export const activityLabels: Record<string, string> = {
  ACCOUNT_CREATED: "Account created",
  PROFILE_UPDATED: "Profile updated",
  PROPERTY_CREATED: "Property added",
  PROPERTY_UPDATED: "Property updated",
  PROPERTY_DELETED: "Property removed",
  REQUEST_CREATED: "Service request created",
  REQUEST_CANCELLED: "Service request cancelled",
  REQUEST_STATUS_CHANGED: "Service request updated",
  TEAM_UPDATE_POSTED: "Update from our team",
};
