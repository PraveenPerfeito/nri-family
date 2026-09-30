import "server-only";
import { revalidatePath } from "next/cache";
import { adminRoutes } from "@/config/routes";
import { TRY_AGAIN, type ActionState } from "@/lib/portal/form-state";
import type { AdminFunctionName } from "@/types/database";
import { logAdminError, type AdminViewer } from "./session";

/*
 * Shared by the Phase 2C admin Server Actions (field work and evidence).
 * Each action calls one admin database function, which checks admin rights
 * again and applies the whole change in one transaction. Errors come back
 * as stable keys; only known keys become messages, everything else is
 * "something went wrong" and is logged with codes and ids only.
 */

export type AdminCallResult<T = unknown> = { ok: true; data: T } | { ok: false; key: string; state: ActionState };

/** Keys that mean the page is out of date: refresh it so the admin sees the latest state. */
const staleKeys = new Set(["field_work_changed", "field_work_exists", "evidence_changed", "request_closed", "stale_status"]);

export async function callAdminFunction<T = unknown>(
  admin: AdminViewer,
  fn: AdminFunctionName,
  args: Record<string, string | null>,
  messages: Record<string, string>,
  requestId: string,
): Promise<AdminCallResult<T>> {
  const { data, error } = await admin.supabase.rpc(fn, args as never);
  if (!error) return { ok: true, data: data as T };
  const key = typeof error.message === "string" ? error.message : "";
  const known = messages[key];
  if (!known) logAdminError(fn, error, { profileId: admin.profile.id, requestId });
  const refreshed = staleKeys.has(key);
  if (refreshed) revalidatePath(adminRoutes.request(requestId));
  return { ok: false, key, state: { status: "error", message: known ?? TRY_AGAIN, ...(refreshed ? { refreshed: true } : {}) } };
}

/** A successful change: refresh the console's pages for this request, and say what happened. */
export function changed(requestId: string, message: string): ActionState {
  revalidatePath(adminRoutes.dashboard, "layout");
  revalidatePath(adminRoutes.request(requestId));
  return { status: "success", message };
}
