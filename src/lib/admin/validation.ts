import { z } from "zod";
import {
  EVIDENCE_DESCRIPTION_MAX,
  EVIDENCE_TITLE_MAX,
  EVIDENCE_TITLE_MIN,
  EXECUTION_NOTES_MAX,
  INSTRUCTIONS_MAX,
  REVIEW_NOTE_MAX,
  SUMMARY_MAX,
  evidenceFileTypes,
  evidenceKindLabels,
  evidenceMaxBytes,
  evidenceMimeTypes,
} from "@/lib/field-ops/domain";
import { cleanOriginalName } from "@/lib/field-ops/files";
import { indiaInstant, indiaToday, isCalendarDate, isClockTime } from "@/lib/field-ops/schedule";
import type { RequestStatus } from "@/lib/portal/domain";
import { cleanText } from "@/lib/validation/leads";
import { NOTE_MAX, requestStatuses } from "./domain";

/*
 * Server-side validation for the admin forms. The database functions check
 * the same rules again (admin rights, allowed transitions, active assignee,
 * text length), so these are for clear messages, not the last line.
 * Only references and the admin's own choices come from the browser: which
 * request, which status, which team member, what text. Who is acting and
 * whose request it is always come from the session and the database.
 */

const requestId = z.uuid({ error: "This request could not be found." });
const status = z.enum(requestStatuses as [RequestStatus, ...RequestStatus[]], { error: "Please choose a status." });

/** Multi-line text: control characters removed (line breaks kept), CRLF normalised, trimmed. */
const body = (label: string) =>
  z
    .string({ error: `Please write ${label}.` })
    .transform((v) => cleanText(v.replace(/\r\n?/g, "\n")))
    .pipe(z.string().min(1, `Please write ${label}.`).max(NOTE_MAX, `Please keep ${label} to 2,000 characters or fewer.`));

export const statusChangeSchema = z.object({ requestId, expectedStatus: status, newStatus: status });
export const assignSchema = z.object({ requestId, assigneeId: z.uuid({ error: "Please choose a team member." }) });
export const requestRefSchema = z.object({ requestId });
export const internalNoteSchema = z.object({ requestId, body: body("the note") });
export const customerUpdateSchema = z.object({ requestId, body: body("the update") });

// ── Phase 2C: field work and evidence ───────────────────────────────────────
// The browser names the request, the visit or the piece of evidence, and the
// admin's own choices. The request a visit or piece of evidence belongs to,
// the customer, the uploader and every review or visibility state come from
// the database (the admin functions ignore anything else).

const fieldWorkId = z.uuid({ error: "This visit could not be found." });
const evidenceId = z.uuid({ error: "This evidence could not be found." });
const lower = (v: string) => v.toLowerCase();

const formatMax = (max: number) => max.toLocaleString("en-GB");

/** Required multi-line text up to `max` characters. */
const longText = (label: string, max: number) =>
  z
    .string({ error: `Please write ${label}.` })
    .transform((v) => cleanText(v.replace(/\r\n?/g, "\n")))
    .pipe(z.string().min(1, `Please write ${label}.`).max(max, `Please keep ${label} to ${formatMax(max)} characters or fewer.`));

/** Optional multi-line text up to `max` characters; empty becomes null. */
const optionalText = (label: string, max: number) =>
  z
    .string()
    .optional()
    .transform((v) => cleanText((v ?? "").replace(/\r\n?/g, "\n")))
    .pipe(z.string().max(max, `Please keep ${label} to ${formatMax(max)} characters or fewer.`))
    .transform((v) => (v.length > 0 ? v : null));

const visitDate = z.string({ error: "Please choose a date." }).refine(isCalendarDate, "Please choose a date.");
const clock = (label: string) => z.string({ error: `Please choose ${label}.` }).refine(isClockTime, `Please choose ${label}.`);
const optionalClock = z
  .string()
  .optional()
  .transform((v) => (v ?? "").trim())
  .refine((v) => v === "" || isClockTime(v), "Please choose an end time, or leave it empty.");

/** The date and times of a visit as the admin enters them: India time. */
const visitFields = { date: visitDate, startTime: clock("a start time"), endTime: optionalClock };
type VisitFields = { date: string; startTime: string; endTime: string };

function checkVisitTime(v: VisitFields, ctx: z.RefinementCtx) {
  if (v.date < indiaToday()) ctx.addIssue({ code: "custom", path: ["date"], message: "Please choose today or a later date." });
  if (v.date > indiaToday(new Date(Date.now() + 365 * 86_400_000))) ctx.addIssue({ code: "custom", path: ["date"], message: "Please choose a date within the next year." });
  if (v.endTime && v.endTime <= v.startTime) ctx.addIssue({ code: "custom", path: ["endTime"], message: "The end time must be after the start time." });
}

/** India date and clock times as instants (India is UTC+05:30 all year). */
const toInstants = (v: VisitFields) => ({
  start: indiaInstant(v.date, v.startTime).toISOString(),
  end: v.endTime ? indiaInstant(v.date, v.endTime).toISOString() : null,
});

export const scheduleSchema = z
  .object({ requestId, ...visitFields, instructions: optionalText("the instructions", INSTRUCTIONS_MAX) })
  .superRefine(checkVisitTime)
  .transform((v) => ({ requestId: v.requestId, instructions: v.instructions, ...toInstants(v) }));

export const rescheduleSchema = z
  .object({ requestId, fieldWorkId, ...visitFields, instructions: optionalText("the instructions", INSTRUCTIONS_MAX) })
  .superRefine(checkVisitTime)
  .transform((v) => ({ requestId: v.requestId, fieldWorkId: v.fieldWorkId, instructions: v.instructions, ...toInstants(v) }));

export const fieldWorkRefSchema = z.object({ requestId, fieldWorkId });
export const fieldWorkNotesSchema = z.object({ requestId, fieldWorkId, notes: longText("the notes", EXECUTION_NOTES_MAX) });
export const completeFieldWorkSchema = z.object({
  requestId,
  fieldWorkId,
  summary: optionalText("the service notes", SUMMARY_MAX),
  notes: optionalText("the notes", EXECUTION_NOTES_MAX),
});
export const cancelFieldWorkSchema = z.object({
  requestId,
  fieldWorkId,
  expectedStatus: z.enum(["SCHEDULED", "IN_PROGRESS"], { error: "This visit could not be found." }),
});

const evidenceMime = z.enum(evidenceMimeTypes, { error: "Use a JPEG, PNG or WebP photo, an MP4 video or a PDF." });

/** Asking for an upload link: which request, and the file's type and size (checked again by Storage and the database). */
export const prepareUploadSchema = z
  .object({ requestId: requestId.transform(lower), mimeType: evidenceMime, size: z.number({ error: "Please choose a file." }).int().positive("The file is empty.") })
  .superRefine((v, ctx) => {
    const kind = evidenceFileTypes[v.mimeType].kind;
    if (v.size > evidenceMaxBytes[kind]) {
      ctx.addIssue({ code: "custom", path: ["size"], message: `This file is too large. ${evidenceKindLabels[kind]}s can be up to ${evidenceMaxBytes[kind] / 1024 / 1024} MB.` });
    }
  });

/** One line of customer-safe text: control characters and line breaks removed, spaces collapsed. */
const line = (v: string) => cleanText(v.replace(/\s+/g, " "));

/** Registering an uploaded file as evidence. */
export const finishUploadSchema = z.object({
  requestId: requestId.transform(lower),
  evidenceId: evidenceId.transform(lower),
  mimeType: evidenceMime,
  stage: z.enum(["BEFORE", "DURING", "AFTER", "GENERAL"], { error: "Please choose when this was taken." }),
  title: z
    .string({ error: "Please give it a title." })
    .transform(line)
    .pipe(
      z
        .string()
        .min(EVIDENCE_TITLE_MIN, `Please give it a title of at least ${EVIDENCE_TITLE_MIN} characters.`)
        .max(EVIDENCE_TITLE_MAX, `Please keep the title to ${EVIDENCE_TITLE_MAX} characters or fewer.`),
    ),
  description: optionalText("the description", EVIDENCE_DESCRIPTION_MAX),
  /** From the photo's own EXIF data, read in the browser; dropped when implausible. */
  capturedAt: z
    .string()
    .nullish()
    .transform((v) => {
      const at = v ? new Date(v) : null;
      return at && !Number.isNaN(at.getTime()) && at.getTime() >= Date.UTC(2000, 0, 1) && at.getTime() <= Date.now() + 86_400_000 ? at.toISOString() : null;
    }),
  originalName: z.string().nullish().transform((v) => cleanOriginalName(v)),
});

export const evidenceRefSchema = z.object({ requestId, evidenceId });
export const rejectEvidenceSchema = z.object({ requestId, evidenceId, reason: optionalText("the reason", REVIEW_NOTE_MAX) });
