import { z } from "zod";
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
