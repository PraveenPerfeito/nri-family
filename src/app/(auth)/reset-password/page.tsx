import Link from "next/link";
import { AuthCard } from "@/components/portal/auth/auth-card";
import { ResetPasswordForm } from "@/components/portal/auth/auth-forms";
import { ButtonLink } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { getViewer } from "@/lib/portal/session";
import { pageMetadata } from "@/lib/seo/metadata";
import { isPortalConfigured } from "@/lib/supabase/config";

export const metadata = pageMetadata({
  title: "Choose a New Password",
  description: "Choose a new password for your private Family Office workspace.",
  path: routes.resetPassword,
  noIndex: true,
});

/** Reached from the recovery email link (/auth/confirm signs the visitor in first). */
export default async function ResetPasswordPage() {
  if (!isPortalConfigured()) {
    return (
      <AuthCard
        title="Choose a new password"
        lead="Password reset will be available when customer accounts open."
        footer={
          <p className="text-sm text-ink-muted">
            <Link href={routes.login} className="font-medium text-brand underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        }
      >
        <ButtonLink href={routes.getStarted} className="w-full" size="lg" arrow>
          Get Started with our team
        </ButtonLink>
      </AuthCard>
    );
  }

  const viewer = await getViewer();
  if (!viewer) {
    return (
      <AuthCard
        title="Choose a new password"
        lead="Open this page from the link in your password reset email. The link works once and expires soon."
        footer={
          <p className="text-sm text-ink-muted">
            <Link href={routes.login} className="font-medium text-brand underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </p>
        }
      >
        <ButtonLink href={routes.forgotPassword} className="w-full" size="lg" variant="secondary">
          Send a new reset link
        </ButtonLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" lead={`For ${viewer.email}. You'll stay signed in on this device.`}>
      <ResetPasswordForm />
    </AuthCard>
  );
}
