import Link from "next/link";
import { AuthCard, authNotices } from "@/components/portal/auth/auth-card";
import { ForgotPasswordForm } from "@/components/portal/auth/auth-forms";
import { ButtonLink } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { pageMetadata } from "@/lib/seo/metadata";
import { isPortalConfigured } from "@/lib/supabase/config";

export const metadata = pageMetadata({
  title: "Reset Password",
  description: "Reset the password for your private Family Office workspace. We'll email you a secure link.",
  path: routes.forgotPassword,
  noIndex: true,
});

export default async function ForgotPasswordPage(props: PageProps<"/forgot-password">) {
  const { notice } = await props.searchParams;
  const footer = (
    <p className="text-sm text-ink-muted">
      Remembered it?{" "}
      <Link href={routes.login} className="font-medium text-brand underline-offset-4 hover:underline">
        Sign in
      </Link>
    </p>
  );

  if (!isPortalConfigured()) {
    return (
      <AuthCard title="Reset your password" lead="Password reset will be available when customer accounts open." footer={footer}>
        <ButtonLink href={routes.getStarted} className="w-full" size="lg" arrow>
          Get Started with our team
        </ButtonLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      lead="Enter the email you signed up with. We'll send you a secure link to choose a new password."
      notice={notice === "link-expired" ? "That reset link has expired or was already used. Ask for a new one below." : typeof notice === "string" ? authNotices[notice] : undefined}
      footer={footer}
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
