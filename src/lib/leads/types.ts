import type { FieldErrors } from "@/lib/validation/leads";

export type FormStatus = "idle" | "success" | "error";

export type FormState = {
  status: FormStatus;
  message?: string;
  fieldErrors?: FieldErrors;
};

export const initialFormState: FormState = { status: "idle" };

/** Hidden anti-spam field names. Humans never see or fill these. */
export const HONEYPOT_FIELD = "company_website";
export const STARTED_AT_FIELD = "form_started_at";

/** Submissions faster than this are almost certainly automated. */
export const MIN_FILL_TIME_MS = 2500;
