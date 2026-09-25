import type { FieldErrors } from "@/lib/validation/leads";

/**
 * "relay": the server accepted the submission (validated, spam-checked,
 * rate-limited) and the browser should now hand it to the email relay.
 */
export type FormStatus = "idle" | "success" | "error" | "relay";

/** What the browser posts to the email relay: the endpoint and a server-built body. */
export type RelayInstruction = { endpoint: string; body: Record<string, string> };

export type FormState = {
  status: FormStatus;
  message?: string;
  fieldErrors?: FieldErrors;
  /** status "relay" only. */
  relay?: RelayInstruction;
  /** Shown if the relay step fails; points to the direct email / WhatsApp. */
  fallbackMessage?: string;
  /** True when a server-side channel (webhook) already delivered the lead. */
  deliveredServerSide?: boolean;
};

export const initialFormState: FormState = { status: "idle" };

/** Hidden anti-spam field names. Humans never see or fill these. */
export const HONEYPOT_FIELD = "company_website";
export const STARTED_AT_FIELD = "form_started_at";

/** Submissions faster than this are almost certainly automated. */
export const MIN_FILL_TIME_MS = 2500;
