import type { RequestStatus } from "@/lib/portal/domain";
import type { Row } from "@/types/database";

/*
 * Field operations vocabulary (Phase 2C): visits ("field work") and the
 * evidence that proves the work was done. It mirrors the Phase 2C migration,
 * which is the authority; database tests compare the two value by value.
 * Shared by the admin console, the customer portal and the browser, so it
 * has no server-only imports.
 */

export type FieldWork = Row<"field_work">;
export type FieldWorkInternal = Row<"field_work_internal">;
export type Evidence = Row<"request_evidence">;
export type EvidenceInternal = Row<"request_evidence_internal">;

export type FieldWorkStatus = FieldWork["status"];
/** A request with no visit yet is NOT_SCHEDULED: there is no row for it. */
export type VisitState = "NOT_SCHEDULED" | FieldWorkStatus;
export type EvidenceKind = Evidence["kind"];
export type EvidenceStage = Evidence["stage"];
export type EvidenceReviewStatus = Evidence["review_status"];
export type EvidenceVisibility = Evidence["visibility"];

// ── Visits ───────────────────────────────────────────────────────────────────

export const visitStates: VisitState[] = ["NOT_SCHEDULED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

/**
 * Where a visit may go next (mirrors app.field_work_transition_allowed()).
 * SCHEDULED -> SCHEDULED is a reschedule. COMPLETED and CANCELLED are final;
 * after a cancelled visit a new one can be scheduled.
 */
export const fieldWorkTransitions: Record<VisitState, VisitState[]> = {
  NOT_SCHEDULED: ["SCHEDULED"],
  SCHEDULED: ["SCHEDULED", "IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const canMoveVisit = (from: VisitState, to: VisitState) => fieldWorkTransitions[from]?.includes(to) ?? false;

/** Request statuses in which a visit can be scheduled or started (with an active assignee). */
export const fieldWorkRequestStatuses: RequestStatus[] = ["ASSIGNED", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"];

/** The team's words for a visit's state. */
export const visitStatusLabels: Record<VisitState, string> = {
  NOT_SCHEDULED: "Not scheduled",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** The customer's words for a visit's state. */
export const customerVisitLabels: Record<FieldWorkStatus, string> = {
  SCHEDULED: "Visit scheduled",
  IN_PROGRESS: "Visit in progress",
  COMPLETED: "Visit completed",
  CANCELLED: "Visit cancelled",
};

/** The visit that counts for a request: the one that is not cancelled, else the latest. */
export function currentVisit<T extends Pick<FieldWork, "status" | "created_at">>(visits: T[]): T | null {
  const active = visits.find((v) => v.status !== "CANCELLED");
  if (active) return active;
  return [...visits].sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

// ── Evidence ─────────────────────────────────────────────────────────────────

export const EVIDENCE_BUCKET = "request-evidence";

export const evidenceMimeTypes = ["image/jpeg", "image/png", "image/webp", "video/mp4", "application/pdf"] as const;
export type EvidenceMime = (typeof evidenceMimeTypes)[number];

/** Accepted files (mirrors app.evidence_kind() and app.evidence_extension()). */
export const evidenceFileTypes: Record<EvidenceMime, { kind: EvidenceKind; extension: string; label: string }> = {
  "image/jpeg": { kind: "PHOTO", extension: "jpg", label: "JPEG photo" },
  "image/png": { kind: "PHOTO", extension: "png", label: "PNG image" },
  "image/webp": { kind: "PHOTO", extension: "webp", label: "WebP image" },
  "video/mp4": { kind: "VIDEO", extension: "mp4", label: "MP4 video" },
  "application/pdf": { kind: "DOCUMENT", extension: "pdf", label: "PDF document" },
};

/** Largest file per kind, in bytes (mirrors app.evidence_max_bytes()). Photos are resized in the browser first. */
export const evidenceMaxBytes: Record<EvidenceKind, number> = {
  PHOTO: 10 * 1024 * 1024,
  VIDEO: 50 * 1024 * 1024,
  DOCUMENT: 20 * 1024 * 1024,
};

export const isEvidenceMime = (value: unknown): value is EvidenceMime => typeof value === "string" && (evidenceMimeTypes as readonly string[]).includes(value);

/**
 * Where a file is kept in the private bucket: <request id>/<evidence id>/original.<ext>
 * (mirrors app.evidence_object_path()). Built from ids and the file type only.
 */
export function evidenceObjectPath(requestId: string, evidenceId: string, mime: EvidenceMime): string {
  return `${requestId.toLowerCase()}/${evidenceId.toLowerCase()}/original.${evidenceFileTypes[mime].extension}`;
}

export const evidenceKindLabels: Record<EvidenceKind, string> = { PHOTO: "Photo", VIDEO: "Video", DOCUMENT: "Document" };

export const evidenceStages: { value: EvidenceStage; label: string; hint: string }[] = [
  { value: "BEFORE", label: "Before", hint: "How things looked before the work." },
  { value: "DURING", label: "During", hint: "Work in progress." },
  { value: "AFTER", label: "After", hint: "The finished result." },
  { value: "GENERAL", label: "General", hint: "Anything else, such as a receipt or a report." },
];
export const evidenceStageLabels = Object.fromEntries(evidenceStages.map((s) => [s.value, s.label])) as Record<EvidenceStage, string>;

export const evidenceReviewLabels: Record<EvidenceReviewStatus, string> = {
  PENDING_REVIEW: "Waiting for review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

/** How long a signed file link lasts once the viewer has been authorised, in seconds. */
export const evidenceLinkSeconds: Record<EvidenceKind, number> = { PHOTO: 300, DOCUMENT: 300, VIDEO: 1800 };

/**
 * The answer to "may I upload this file?": a one-time upload link for one
 * file name in the private bucket (Supabase signs it after checking the
 * Storage policies), or the reason why not.
 */
export type UploadTicket = { ok: true; evidenceId: string; uploadUrl: string; apiKey: string } | { ok: false; message: string };

// ── Limits (the database checks the same) ──────────────────────────────────

export const EVIDENCE_TITLE_MIN = 3;
export const EVIDENCE_TITLE_MAX = 120;
export const EVIDENCE_DESCRIPTION_MAX = 1000;
export const REVIEW_NOTE_MAX = 1000;
export const INSTRUCTIONS_MAX = 2000;
export const EXECUTION_NOTES_MAX = 4000;
export const SUMMARY_MAX = 2000;

// ── Completing a request that had field work ────────────────────────────────

export type CompletionBlocker = "field_work_open" | "evidence_pending" | "evidence_required";

/**
 * Why a request can't be completed yet (mirrors the checks in
 * admin_change_request_status). A request with field work needs the visit
 * completed, every piece of evidence reviewed, and at least one published.
 * A request without field work completes as it always has.
 */
export function completionBlocker(
  visits: Pick<FieldWork, "status">[],
  evidence: Pick<Evidence, "review_status" | "visibility">[],
): CompletionBlocker | null {
  if (visits.some((v) => v.status === "SCHEDULED" || v.status === "IN_PROGRESS")) return "field_work_open";
  if (evidence.some((e) => e.review_status === "PENDING_REVIEW")) return "evidence_pending";
  if (visits.some((v) => v.status === "COMPLETED") && !evidence.some((e) => e.visibility === "CUSTOMER_VISIBLE")) return "evidence_required";
  return null;
}

export const completionBlockerMessages: Record<CompletionBlocker, string> = {
  field_work_open: "Finish or cancel the field work first.",
  evidence_pending: "Review every piece of evidence first.",
  evidence_required: "Share at least one piece of evidence with the customer first.",
};
