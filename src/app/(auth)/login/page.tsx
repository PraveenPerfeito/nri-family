import Link from "next/link";
import { AuthPreview } from "@/components/forms/auth-preview";
import { ButtonLink } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Sign In",
  description: "Sign in to your private Family Office workspace. Customer accounts open in a later phase.",
  path: routes.login,
  noIndex: true,
});

export default function LoginPage() {
  return (
    <div className="w-full max-w-md rounded-panel border border-line bg-surface p-6 shadow-raised sm:p-8">
      <h1 className="text-display text-3xl text-ink">Sign in</h1>
      <p className="mt-2 text-sm text-ink-muted">Access your private Family Office workspace.</p>
      <div className="mt-6">
        <AuthPreview
          submitLabel="Sign In"
          fields={[
            { id: "email", label: "Email", type: "email", autoComplete: "email" },
            { id: "password", label: "Password", type: "password", autoComplete: "current-password" },
          ]}
        >
          <p className="mt-3 text-center text-sm text-ink-subtle">
            <span className="font-medium text-ink-muted">Forgot password?</span> Password reset will be available when accounts open.
          </p>
        </AuthPreview>
      </div>
      <div className="mt-8 border-t border-line pt-6 text-center">
        <p className="text-sm text-ink-muted">New here?</p>
        <p className="mt-1">
          <Link href={routes.register} className="text-sm font-medium text-brand underline-offset-4 hover:underline" data-track="register_clicked" data-track-location="login">
            Create your Family Office
          </Link>
        </p>
        <ButtonLink href={routes.getStarted} className="mt-5 w-full" size="lg" arrow track="cta_clicked" trackProps={{ label: "get_started", location: "login" }}>
          Get Started with our team
        </ButtonLink>
      </div>
    </div>
  );
}
