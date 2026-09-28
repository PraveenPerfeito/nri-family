"use server";

import type { AuthError } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authCallbackPath, portalRoutes, routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { areSignupsOpen, isPortalConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toFieldErrors } from "@/lib/validation/leads";
import { CHECK_FIELDS, TRY_AGAIN, type ActionState } from "../form-state";
import { safeNextPath } from "../redirects";
import { logPortalError, requireCustomer } from "../session";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  formFields,
  newPasswordSchema,
  signInSchema,
  signUpSchema,
} from "../validation";

/*
 * Account Server Actions on Supabase Auth. Passwords are never stored or
 * logged by us; Supabase holds them (bcrypt). Messages never reveal whether
 * an email address has an account.
 */

const limits = {
  signIn: createRateLimiter({ limit: 10, windowMs: 10 * 60 * 1000 }),
  signUp: createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 }),
  email: createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 }),
};

const NOT_OPEN: ActionState = { status: "error", message: "Customer accounts are not open yet." };
const TOO_MANY: ActionState = { status: "error", message: "Too many attempts from this connection. Please wait a few minutes and try again." };

async function clientKey(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** This site's origin for email links (Supabase only honours URLs on its allow list). */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin && /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(origin)) return origin;
  return siteConfig.url;
}

function authMessage(error: AuthError): string {
  switch (error.code) {
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "We've had too many requests just now. Please wait a few minutes and try again.";
    case "weak_password":
      return "Please choose a stronger password: at least 10 characters that aren't easy to guess.";
    case "same_password":
      return "Please choose a password you haven't used here before.";
    case "email_address_invalid":
      return "Please use a different email address.";
    case "email_address_not_authorized":
      return "We can't send email to this address yet. Please try again later.";
    case "signup_disabled":
      return NOT_OPEN.message!;
    default:
      return TRY_AGAIN;
  }
}

// ── Sign in / out ────────────────────────────────────────────────────────────

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isPortalConfigured()) return NOT_OPEN;
  if (!limits.signIn.check(`signin:${await clientKey()}`).allowed) return TOO_MANY;
  const parsed = signInSchema.safeParse(formFields(formData, ["email", "password"]));
  if (!parsed.success) return { status: "error", message: CHECK_FIELDS, fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { status: "error", needsConfirmation: true, message: "Please confirm your email address first. We can send the confirmation link again." };
    }
    if (error.code === "invalid_credentials") return { status: "error", message: "The email or password is incorrect." };
    logPortalError("sign in", error);
    return { status: "error", message: authMessage(error) };
  }
  redirect(safeNextPath(formData.get("next")));
}

export async function signOutAction(): Promise<void> {
  if (isPortalConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) logPortalError("sign out", error);
  }
  redirect(`${routes.login}?notice=signed-out`);
}

// ── Registration ─────────────────────────────────────────────────────────────

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!areSignupsOpen()) return NOT_OPEN;
  if (!limits.signUp.check(`signup:${await clientKey()}`).allowed) return TOO_MANY;
  const parsed = signUpSchema.safeParse(formFields(formData, ["fullName", "email", "password", "country", "timezone", "consent"]));
  if (!parsed.success) return { status: "error", message: CHECK_FIELDS, fieldErrors: toFieldErrors(parsed.error) };
  const { fullName, email, password, country, timezone } = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Stored as user metadata and copied into the profile by a database trigger.
      data: { full_name: fullName, country, timezone },
      emailRedirectTo: `${await siteOrigin()}${authCallbackPath}?next=${encodeURIComponent(portalRoutes.dashboard)}`,
    },
  });
  if (error) {
    logPortalError("sign up", error);
    return { status: "error", message: authMessage(error) };
  }
  // Email confirmation switched off in Supabase: the account is ready now.
  if (data.session) redirect(portalRoutes.dashboard);
  // Same answer whether or not the address already had an account.
  return { status: "success", message: `We've sent a confirmation link to ${email}. Open it on any device to finish creating your account.` };
}

export async function resendConfirmationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isPortalConfigured()) return NOT_OPEN;
  if (!limits.email.check(`resend:${await clientKey()}`).allowed) return TOO_MANY;
  const parsed = forgotPasswordSchema.safeParse(formFields(formData, ["email"]));
  if (!parsed.success) return { status: "error", message: CHECK_FIELDS, fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${await siteOrigin()}${authCallbackPath}?next=${encodeURIComponent(portalRoutes.dashboard)}` },
  });
  if (error && error.code !== "user_not_found") {
    logPortalError("resend confirmation", error);
    return { status: "error", message: authMessage(error) };
  }
  return { status: "success", message: "If that address is waiting for confirmation, a new link is on its way." };
}

// ── Passwords ────────────────────────────────────────────────────────────────

export async function forgotPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isPortalConfigured()) return NOT_OPEN;
  if (!limits.email.check(`reset:${await clientKey()}`).allowed) return TOO_MANY;
  const parsed = forgotPasswordSchema.safeParse(formFields(formData, ["email"]));
  if (!parsed.success) return { status: "error", message: CHECK_FIELDS, fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteOrigin()}${authCallbackPath}?next=${encodeURIComponent(routes.resetPassword)}`,
  });
  if (error && error.code !== "user_not_found") {
    logPortalError("request password reset", error);
    if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") return { status: "error", message: authMessage(error) };
  }
  // Never reveal whether an account exists.
  return { status: "success", message: "If an account exists for that address, we've sent a link to reset the password. It works once and expires soon." };
}

/** Sets a new password in the session created by a recovery email link. */
export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!isPortalConfigured()) return NOT_OPEN;
  const parsed = newPasswordSchema.safeParse(formFields(formData, ["password", "confirmPassword"]));
  if (!parsed.success) return { status: "error", message: CHECK_FIELDS, fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { status: "error", message: "This reset link has expired. Please ask for a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    logPortalError("reset password", error);
    return { status: "error", message: authMessage(error) };
  }
  redirect(`${portalRoutes.dashboard}?saved=password`);
}

/** Change password from Settings: the current password is checked first. */
export async function changePasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await requireCustomer(portalRoutes.settings);
  if (!limits.signIn.check(`change:${await clientKey()}`).allowed) return TOO_MANY;
  const parsed = changePasswordSchema.safeParse(formFields(formData, ["currentPassword", "password", "confirmPassword"]));
  if (!parsed.success) return { status: "error", message: CHECK_FIELDS, fieldErrors: toFieldErrors(parsed.error) };

  const { error: checkError } = await viewer.supabase.auth.signInWithPassword({ email: viewer.email, password: parsed.data.currentPassword });
  if (checkError) {
    return { status: "error", message: CHECK_FIELDS, fieldErrors: { currentPassword: "Your current password is not correct." } };
  }
  const { error } = await viewer.supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    logPortalError("change password", error, { profileId: viewer.profile.id });
    return { status: "error", message: authMessage(error) };
  }
  return { status: "success", message: "Your password has been changed." };
}
