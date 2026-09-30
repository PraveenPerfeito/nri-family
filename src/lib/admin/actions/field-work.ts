"use server";

import { adminRoutes } from "@/config/routes";
import { CHECK_FIELDS, type ActionState } from "@/lib/portal/form-state";
import { formFields } from "@/lib/portal/validation";
import { toFieldErrors } from "@/lib/validation/leads";
import { callAdminFunction, changed } from "../operations";
import { requireAdmin } from "../session";
import { cancelFieldWorkSchema, completeFieldWorkSchema, fieldWorkNotesSchema, fieldWorkRefSchema, rescheduleSchema, scheduleSchema } from "../validation";

/*
 * Field work (Phase 2C) for the admin console. Each action calls
 * requireAdmin() itself, validates the form on the server, and calls one
 * admin database function. The database checks admin rights again, the
 * request's status, the active assignee (the Phase 2B assignment) and the
 * visit's lifecycle, and writes the timeline event, internal activity and
 * customer notification in the same transaction. The browser only names the
 * request or visit and sends the admin's choices.
 */

const messages: Record<string, string> = {
  not_authorized: "You don't have permission to do that.",
  request_not_found: "This request could not be found.",
  request_closed: "This request is closed, so it can no longer be changed.",
  request_not_ready: "Field work can be scheduled or started once the request is Assigned, In progress or Awaiting customer.",
  assignment_required: "This request needs an active team member responsible first. Assign or reassign it, then try again.",
  field_work_exists: "This request already has a visit. The page now shows it.",
  field_work_not_found: "This visit could not be found.",
  field_work_changed: "This visit was updated a moment ago. The page now shows its latest state. Please check it and try again.",
  invalid_schedule: "Please choose a start from today onwards (India time), and an end time after the start on the same day.",
  invalid_text: "That text is too long. Please shorten it and try again.",
};

const invalid = (error: Parameters<typeof toFieldErrors>[0]): ActionState => ({ status: "error", message: CHECK_FIELDS, fieldErrors: toFieldErrors(error) });

export async function scheduleFieldWorkAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin(adminRoutes.requests);
  const parsed = scheduleSchema.safeParse(formFields(formData, ["requestId", "date", "startTime", "endTime", "instructions"]));
  if (!parsed.success) return invalid(parsed.error);
  const { requestId, start, end, instructions } = parsed.data;

  const result = await callAdminFunction(
    admin,
    "admin_schedule_field_work",
    { p_request_id: requestId, p_scheduled_start: start, p_scheduled_end: end, p_instructions: instructions },
    messages,
    requestId,
  );
  return result.ok ? changed(requestId, "Visit scheduled. The customer can see the date and time and has been notified.") : result.state;
}

export async function rescheduleFieldWorkAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin(adminRoutes.requests);
  const parsed = rescheduleSchema.safeParse(formFields(formData, ["requestId", "fieldWorkId", "date", "startTime", "endTime", "instructions"]));
  if (!parsed.success) return invalid(parsed.error);
  const { requestId, fieldWorkId, start, end, instructions } = parsed.data;

  const result = await callAdminFunction(
    admin,
    "admin_reschedule_field_work",
    { p_field_work_id: fieldWorkId, p_scheduled_start: start, p_scheduled_end: end, p_instructions: instructions },
    messages,
    requestId,
  );
  return result.ok ? changed(requestId, "Visit updated. If the time changed, the customer can see the new time and has been notified.") : result.state;
}

export async function startFieldWorkAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin(adminRoutes.requests);
  const parsed = fieldWorkRefSchema.safeParse(formFields(formData, ["requestId", "fieldWorkId"]));
  if (!parsed.success) return { status: "error", message: messages.field_work_not_found };
  const { requestId, fieldWorkId } = parsed.data;

  const result = await callAdminFunction(admin, "admin_start_field_work", { p_field_work_id: fieldWorkId }, messages, requestId);
  return result.ok ? changed(requestId, "Work started. The request is now In progress, and the customer can see that.") : result.state;
}

export async function recordFieldWorkNotesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin(adminRoutes.requests);
  const parsed = fieldWorkNotesSchema.safeParse(formFields(formData, ["requestId", "fieldWorkId", "notes"]));
  if (!parsed.success) return invalid(parsed.error);
  const { requestId, fieldWorkId, notes } = parsed.data;

  const result = await callAdminFunction(admin, "admin_record_field_work_notes", { p_field_work_id: fieldWorkId, p_execution_notes: notes }, messages, requestId);
  return result.ok ? changed(requestId, "Notes saved. Only the team can see them.") : result.state;
}

export async function completeFieldWorkAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin(adminRoutes.requests);
  const parsed = completeFieldWorkSchema.safeParse(formFields(formData, ["requestId", "fieldWorkId", "summary", "notes"]));
  if (!parsed.success) return invalid(parsed.error);
  const { requestId, fieldWorkId, summary, notes } = parsed.data;

  const result = await callAdminFunction(
    admin,
    "admin_complete_field_work",
    { p_field_work_id: fieldWorkId, p_summary: summary, p_execution_notes: notes },
    messages,
    requestId,
  );
  return result.ok ? changed(requestId, "Visit marked complete. The customer has been told; review and share the evidence before completing the request.") : result.state;
}

export async function cancelFieldWorkAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin(adminRoutes.requests);
  const parsed = cancelFieldWorkSchema.safeParse(formFields(formData, ["requestId", "fieldWorkId", "expectedStatus"]));
  if (!parsed.success) return { status: "error", message: messages.field_work_not_found };
  const { requestId, fieldWorkId, expectedStatus } = parsed.data;

  const result = await callAdminFunction(admin, "admin_cancel_field_work", { p_field_work_id: fieldWorkId, p_expected_status: expectedStatus }, messages, requestId);
  return result.ok ? changed(requestId, "Visit cancelled. The customer has been told. You can schedule a new visit.") : result.state;
}
