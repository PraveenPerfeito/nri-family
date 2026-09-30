"use server";

import { randomUUID } from "node:crypto";
import { adminRoutes } from "@/config/routes";
import { EVIDENCE_BUCKET, evidenceObjectPath, type EvidenceMime, type UploadTicket } from "@/lib/field-ops/domain";
import { SNIFF_BYTES, sniffEvidenceMime } from "@/lib/field-ops/files";
import { CHECK_FIELDS, TRY_AGAIN, type ActionState } from "@/lib/portal/form-state";
import { formFields } from "@/lib/portal/validation";
import { supabaseConfig } from "@/lib/supabase/config";
import { toFieldErrors } from "@/lib/validation/leads";
import { isFinalStatus } from "../domain";
import { callAdminFunction, changed } from "../operations";
import { logAdminError, requireAdmin, type AdminViewer } from "../session";
import { evidenceRefSchema, finishUploadSchema, prepareUploadSchema, rejectEvidenceSchema } from "../validation";

/*
 * Evidence (Phase 2C) for the admin console. Uploading is two steps, so large
 * files go straight to the private bucket instead of through this server:
 *   1. prepareEvidenceUpload: the server picks the evidence id and file name
 *      and asks Supabase for a one-time upload link. Supabase signs it only if
 *      the Storage policy allows (an active admin, an open request, an unused
 *      evidence id, an accepted file name).
 *   2. finishEvidenceUpload: the server reads the stored file's first bytes to
 *      check it really is the type it claims, then registers it. The database
 *      reads the file's real type and size from Storage; the uploader is the
 *      signed-in admin. New evidence waits for review and is internal.
 * Approving, rejecting and publishing are single database functions. Every
 * action calls requireAdmin() itself.
 */

const messages: Record<string, string> = {
  not_authorized: "You don't have permission to do that.",
  request_not_found: "This request could not be found.",
  request_closed: "This request is closed, so its evidence can no longer be changed.",
  evidence_not_found: "This evidence could not be found.",
  evidence_exists: "This upload has already been used. Please upload the file again.",
  evidence_changed: "This evidence was reviewed a moment ago. The page now shows its latest state.",
  evidence_published: "This evidence has been shared with the customer, so it can't be rejected.",
  evidence_not_approved: "Approve the evidence before sharing it with the customer.",
  evidence_file_changed: "This file changed after it was added, so it can't be approved or shared. Reject it and add the file again.",
  upload_missing: "The file didn't finish uploading. Please try again.",
  file_not_allowed: "This file can't be added. Use a JPEG, PNG or WebP photo, an MP4 video or a PDF.",
  file_mismatch: "This file isn't the kind of file its name says. Please choose the original photo, video or PDF.",
  file_too_large: "This file is too large. Photos can be up to 10 MB, videos 50 MB and PDFs 20 MB.",
  invalid_title: "Please give it a title of 3 to 120 characters.",
  invalid_stage: "Please choose when it was taken.",
  invalid_capture_time: "The date saved in this photo doesn't look right. Please try again.",
  invalid_text: "That text is too long. Please shorten it and try again.",
};

/** What the stored file really is, from its first bytes. */
async function storedFileType(admin: AdminViewer, path: string): Promise<EvidenceMime | "other" | "missing" | "unreadable"> {
  const signed = await admin.supabase.storage.from(EVIDENCE_BUCKET).createSignedUrl(path, 60);
  if (signed.error || !signed.data?.signedUrl) return "missing";
  try {
    const response = await fetch(signed.data.signedUrl, { headers: { range: `bytes=0-${SNIFF_BYTES - 1}` }, cache: "no-store" });
    if (response.status === 400 || response.status === 404) return "missing";
    if (!response.ok || !response.body) return "unreadable";
    // Only the first bytes are needed (the Range request asks for no more). If more arrive, stop
    // reading and let go of the rest without waiting: Next wraps fetch bodies in a tee, and waiting
    // for one branch's cancel would wait for the other branch too.
    const reader = response.body.getReader();
    const bytes = new Uint8Array(SNIFF_BYTES);
    let filled = 0;
    let done = false;
    while (!done && filled < SNIFF_BYTES) {
      const chunk = await reader.read();
      done = chunk.done;
      if (chunk.value) {
        const take = chunk.value.subarray(0, SNIFF_BYTES - filled);
        bytes.set(take, filled);
        filled += take.length;
      }
    }
    if (!done) void reader.cancel().catch(() => undefined);
    return sniffEvidenceMime(bytes.subarray(0, filled)) ?? "other";
  } catch {
    return "unreadable";
  }
}

/** Remove an upload that will not become evidence (Storage lets admins delete only unregistered files). */
async function discardUpload(admin: AdminViewer, path: string, requestId: string) {
  const { error } = await admin.supabase.storage.from(EVIDENCE_BUCKET).remove([path]);
  if (error) logAdminError("discard evidence upload", error, { profileId: admin.profile.id, requestId });
}

export async function prepareEvidenceUpload(input: { requestId: string; mimeType: string; size: number }): Promise<UploadTicket> {
  const admin = await requireAdmin(adminRoutes.requests);
  const parsed = prepareUploadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? messages.file_not_allowed };
  const { requestId, mimeType } = parsed.data;

  // A clear answer for a closed or unknown request. The Storage policy checks the same again.
  const request = await admin.supabase.from("service_requests").select("status").eq("id", requestId).maybeSingle();
  if (request.error) {
    logAdminError("prepare evidence upload", request.error, { profileId: admin.profile.id, requestId });
    return { ok: false, message: TRY_AGAIN };
  }
  if (!request.data) return { ok: false, message: messages.request_not_found };
  if (isFinalStatus(request.data.status)) return { ok: false, message: messages.request_closed };

  const evidenceId = randomUUID();
  const { data, error } = await admin.supabase.storage.from(EVIDENCE_BUCKET).createSignedUploadUrl(evidenceObjectPath(requestId, evidenceId, mimeType));
  if (error || !data?.signedUrl) {
    logAdminError("prepare evidence upload", error, { profileId: admin.profile.id, requestId });
    return { ok: false, message: TRY_AGAIN };
  }
  return { ok: true, evidenceId, uploadUrl: data.signedUrl, apiKey: supabaseConfig()?.publishableKey ?? "" };
}

export async function finishEvidenceUpload(input: {
  requestId: string;
  evidenceId: string;
  mimeType: string;
  stage: string;
  title: string;
  description?: string;
  capturedAt?: string | null;
  originalName?: string | null;
}): Promise<ActionState> {
  const admin = await requireAdmin(adminRoutes.requests);
  const parsed = finishUploadSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: CHECK_FIELDS, fieldErrors: toFieldErrors(parsed.error) };
  const v = parsed.data;
  const path = evidenceObjectPath(v.requestId, v.evidenceId, v.mimeType);

  const stored = await storedFileType(admin, path);
  if (stored === "missing") return { status: "error", message: messages.upload_missing };
  if (stored === "unreadable") return { status: "error", message: TRY_AGAIN };
  if (stored !== v.mimeType) {
    await discardUpload(admin, path, v.requestId);
    return { status: "error", message: messages.file_mismatch };
  }

  const result = await callAdminFunction(
    admin,
    "admin_add_evidence",
    {
      p_request_id: v.requestId,
      p_evidence_id: v.evidenceId,
      p_stage: v.stage,
      p_title: v.title,
      p_description: v.description,
      p_captured_at: v.capturedAt,
      p_original_name: v.originalName,
    },
    messages,
    v.requestId,
  );
  if (!result.ok) {
    if (result.key === "file_not_allowed" || result.key === "file_too_large") await discardUpload(admin, path, v.requestId);
    return result.state;
  }
  return changed(v.requestId, "Evidence added. It is waiting for review, and the customer can't see it yet.");
}

export async function approveEvidenceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin(adminRoutes.requests);
  const parsed = evidenceRefSchema.safeParse(formFields(formData, ["requestId", "evidenceId"]));
  if (!parsed.success) return { status: "error", message: messages.evidence_not_found };
  const { requestId, evidenceId } = parsed.data;

  const result = await callAdminFunction(admin, "admin_approve_evidence", { p_evidence_id: evidenceId }, messages, requestId);
  return result.ok ? changed(requestId, "Approved. It is still internal: share it with the customer when you're ready.") : result.state;
}

export async function rejectEvidenceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin(adminRoutes.requests);
  const parsed = rejectEvidenceSchema.safeParse(formFields(formData, ["requestId", "evidenceId", "reason"]));
  if (!parsed.success) return { status: "error", message: CHECK_FIELDS, fieldErrors: toFieldErrors(parsed.error) };
  const { requestId, evidenceId, reason } = parsed.data;

  const result = await callAdminFunction(admin, "admin_reject_evidence", { p_evidence_id: evidenceId, p_reason: reason }, messages, requestId);
  return result.ok ? changed(requestId, "Rejected. It stays on record for the team and is never shown to the customer.") : result.state;
}

export async function publishEvidenceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin(adminRoutes.requests);
  const parsed = evidenceRefSchema.safeParse(formFields(formData, ["requestId", "evidenceId"]));
  if (!parsed.success) return { status: "error", message: messages.evidence_not_found };
  const { requestId, evidenceId } = parsed.data;

  const result = await callAdminFunction(admin, "admin_publish_evidence", { p_evidence_id: evidenceId }, messages, requestId);
  return result.ok ? changed(requestId, "Shared with the customer. They can see it on their request and have been notified.") : result.state;
}
