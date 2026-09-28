import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { routes } from "@/config/routes";
import { safeNextPath } from "@/lib/portal/redirects";
import { logPortalError } from "@/lib/portal/session";
import { isPortalConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/*
 * Landing point for Supabase Auth email links (confirm sign-up, reset
 * password). Two link styles are accepted:
 *  - token_hash + type (recommended email templates; works on any device)
 *  - code (Supabase's default PKCE links; works in the browser that asked)
 * On success the session cookie is set and the visitor continues to `next`
 * (portal paths only). Otherwise they land on sign-in with a clear message.
 */

const OTP_TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "email_change"];

export async function GET(request: NextRequest) {
  if (!isPortalConfigured()) redirect(routes.login);
  const params = request.nextUrl.searchParams;
  const type = params.get("type");
  const tokenHash = params.get("token_hash");
  const code = params.get("code");
  const next = safeNextPath(params.get("next"), type === "recovery" ? routes.resetPassword : "/app");
  const isRecovery = type === "recovery" || next === routes.resetPassword;

  const supabase = await createSupabaseServerClient();
  if (tokenHash && type && (OTP_TYPES as string[]).includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash });
    if (!error) redirect(next);
    logPortalError("verify email link", error);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
    logPortalError("exchange email link code", error);
    // Opened in a different browser: the email is confirmed, but this browser can't sign in from the link.
    if (!isRecovery) redirect(`${routes.login}?notice=confirmed`);
  }
  redirect(isRecovery ? `${routes.forgotPassword}?notice=link-expired` : `${routes.login}?notice=link-expired`);
}
