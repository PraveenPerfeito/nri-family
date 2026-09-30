import type { RequestStatus } from "@/lib/portal/domain";
import { openRequestStatuses, requestStatusLabels } from "@/lib/portal/domain";

/*
 * Admin operations vocabulary. The status transitions mirror
 * app.admin_status_transition_allowed() in the Phase 2B migration, which is
 * the authority; a database test keeps the two identical. Shared by server
 * and client code, so no server-only imports.
 */

export const requestStatuses: RequestStatus[] = ["SUBMITTED", "UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "COMPLETED", "CANCELLED"];

/** Where the team may move a request next. COMPLETED and CANCELLED are final. */
export const adminStatusTransitions: Record<RequestStatus, RequestStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["ASSIGNED", "WAITING_FOR_CUSTOMER", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "UNDER_REVIEW", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_CUSTOMER", "COMPLETED", "CANCELLED"],
  WAITING_FOR_CUSTOMER: ["UNDER_REVIEW", "ASSIGNED", "IN_PROGRESS", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

/** These statuses need someone responsible, so an assignment must exist first. */
export const statusesNeedingAssignee: RequestStatus[] = ["ASSIGNED", "IN_PROGRESS"];

export const canAdminTransition = (from: RequestStatus, to: RequestStatus) => adminStatusTransitions[from]?.includes(to) ?? false;
export const needsAssignee = (status: RequestStatus) => statusesNeedingAssignee.includes(status);
export const isFinalStatus = (status: RequestStatus) => status === "COMPLETED" || status === "CANCELLED";
export const adminOpenStatuses = openRequestStatuses;

/** The team's wording for statuses (customers see "Submitted" and "Waiting for you"). */
export const adminStatusLabels: Record<RequestStatus, string> = {
  ...requestStatusLabels,
  SUBMITTED: "New",
  WAITING_FOR_CUSTOMER: "Awaiting customer",
};

/** What each move means, shown next to the choice in the status form. */
export const transitionHints: Partial<Record<RequestStatus, string>> = {
  UNDER_REVIEW: "The team is looking at it.",
  ASSIGNED: "A team member is responsible. Needs an assignee.",
  IN_PROGRESS: "The visit or work has started. Needs an assignee.",
  WAITING_FOR_CUSTOMER: "Paused until the customer replies.",
  COMPLETED: "The work is done. This is final.",
  CANCELLED: "The request will not go ahead. This is final.",
};

export type TeamRole = "ADMIN" | "OPERATIONS";
export const teamRoleLabels: Record<TeamRole, string> = { ADMIN: "Admin", OPERATIONS: "Operations" };

export const adminActivityLabels: Record<string, string> = {
  ACCOUNT_CREATED: "Account created",
  PROFILE_UPDATED: "Profile updated",
  PROPERTY_CREATED: "Property added",
  PROPERTY_UPDATED: "Property updated",
  PROPERTY_DELETED: "Property removed",
  REQUEST_CREATED: "Request created",
  REQUEST_CANCELLED: "Request cancelled",
  REQUEST_STATUS_CHANGED: "Status changed",
  REQUEST_ASSIGNED: "Request assigned",
  REQUEST_REASSIGNED: "Request reassigned",
  REQUEST_UNASSIGNED: "Assignment removed",
  INTERNAL_NOTE_ADDED: "Internal note added",
  TEAM_UPDATE_POSTED: "Update sent to customer",
  FIELD_WORK_SCHEDULED: "Visit scheduled",
  FIELD_WORK_RESCHEDULED: "Visit rescheduled",
  FIELD_WORK_UPDATED: "Visit instructions changed",
  FIELD_WORK_STARTED: "Work started",
  FIELD_WORK_NOTES_RECORDED: "Execution notes saved",
  FIELD_WORK_COMPLETED: "Visit completed",
  FIELD_WORK_CANCELLED: "Visit cancelled",
  EVIDENCE_UPLOADED: "Evidence added",
  EVIDENCE_APPROVED: "Evidence approved",
  EVIDENCE_REJECTED: "Evidence rejected",
  EVIDENCE_PUBLISHED: "Evidence shared with customer",
};

/** Longest internal note or customer update, in characters (the database checks the same). */
export const NOTE_MAX = 2000;
