import type { FieldErrors } from "@/lib/validation/leads";

/** Result of a portal form's Server Action. */
export type ActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: FieldErrors;
  /** Set by sign-in when the account exists but the email is not confirmed yet. */
  needsConfirmation?: boolean;
};

export const idleState: ActionState = { status: "idle" };

export const CHECK_FIELDS = "Please check the highlighted fields.";
export const TRY_AGAIN = "Something went wrong on our side. Please try again in a moment.";
