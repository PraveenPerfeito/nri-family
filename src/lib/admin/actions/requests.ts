"use server";

import { revalidatePath } from "next/cache";
import { adminRoutes } from "@/config/routes";
import { CHECK_FIELDS, TRY_AGAIN, type ActionState } from "@/lib/portal/form-state";
import { formFields } from "@/lib/portal/validation";
import { toFieldErrors } from "@/lib/validation/leads";
import type { AdminFunctionName } from "@/types/database";
import { adminStatusLabels, canAdminTransition } from "../domain";
import { logAdminError, requireAdmin, type AdminViewer } from "../session";
import { statusChangeSchema } from "../validation";

/*
 * Request operations for the admin console. Each action:
 *  1. calls requireAdmin() itself (never trusting the page or the proxy);
 *  2. validates the form on the server;
 *  3. calls one admin database function, which checks admin rights again,
 *     applies the change and writes the timeline event, activity entry and
 *     notification in the same transaction (see the Phase 2B migration).
 * The browser only says which request and what change. The acting admin
 * comes from the session; the customer comes from the request row.
 * Errors are mapped to plain English; database details never reach the page.
 */

const messages: Record<string, string> = {
  not_authorized: "You don't have permission to do that.",
  request_not_found: "This request could not be found.",
  stale_status: "Someone updated this request a moment ago. The page now shows its latest status. Please check it and try again.",
  invalid_transition: "That status change isn't allowed from the current status.",
  assignment_required: "Assign a team member first. Requests that are Assigned or In progress always need someone responsible.",
  request_closed: "This request is closed, so its assignment can't change.",
  invalid_assignee: "Please choose an active team member.",
  invalid_text: "Please write between 1 and 2,000 characters.",
};

type RpcArgs = Record<string, string>;

/** Run one admin database function; returns an error state, or null when it worked. */
async function run(admin: AdminViewer, fn: AdminFunctionName, args: RpcArgs, requestId: string): Promise<ActionState | null> {
  const { error } = await admin.supabase.rpc(fn, args as never);
  if (!error) return null;
  const key = typeof error.message === "string" ? error.message : "";
  const known = messages[key];
  if (!known) logAdminError(fn, error, { profileId: admin.profile.id, requestId });
  if (key === "stale_status") revalidatePath(adminRoutes.request(requestId));
  return { status: "error", message: known ?? TRY_AGAIN };
}

function saved(requestId: string, message: string): ActionState {
  revalidatePath(adminRoutes.dashboard, "layout");
  revalidatePath(adminRoutes.request(requestId));
  return { status: "success", message };
}

export async function changeRequestStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin(adminRoutes.requests);
  const parsed = statusChangeSchema.safeParse(formFields(formData, ["requestId", "expectedStatus", "newStatus"]));
  if (!parsed.success) return { status: "error", message: CHECK_FIELDS, fieldErrors: toFieldErrors(parsed.error) };
  const { requestId, expectedStatus, newStatus } = parsed.data;
  if (!canAdminTransition(expectedStatus, newStatus)) return { status: "error", message: messages.invalid_transition };

  const failed = await run(admin, "admin_change_request_status", { p_request_id: requestId, p_expected_status: expectedStatus, p_new_status: newStatus }, requestId);
  return failed ?? saved(requestId, `Status changed to ${adminStatusLabels[newStatus]}. The customer can see the update and has been notified.`);
}
