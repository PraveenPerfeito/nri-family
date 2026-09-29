import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthPreview } from "@/components/forms/auth-preview";
import { AuthCard, authNotices } from "@/components/portal/auth/auth-card";
import { LoginForm } from "@/components/portal/auth/auth-forms";
import { Button, ButtonLink } from "@/components/ui/button";
import { adminRoutes, portalRoutes, routes } from "@/config/routes";
import { signOutAction } from "@/lib/portal/actions/auth";
import { isAdminPath, safeNextPath } from "@/lib/portal/redirects";
import { getViewer, isActiveAdmin } from "@/lib/portal/session";
import { pageMetadata } from "@/lib/seo/metadata";
import { areSignupsOpen, isPortalConfigured } from "@/lib/supabase/config";

export const metadata = pageMetadata({
  title: "Sign In",
  description: "Sign in to your private Family Office workspace for your property and requests in Tamil Nadu.",
  path: routes.login,
  noIndex: true,
});

export default async function LoginPage(props: PageProps<"/login">) {
  const params = await props.searchParams;
  if (!isPortalConfigured()) return <LoginPlaceholder />;

  const next = safeNextPath(params.next);
  const viewer = await getViewer();
  // Already signed in: go to your own workspace, keeping `next` only when it belongs to it.
  if (viewer?.profile.role === "CUSTOMER") redirect(isAdminPath(next) ? portalRoutes.dashboard : next);
  if (viewer && (await isActiveAdmin(viewer))) redirect(isAdminPath(next) ? next : adminRoutes.dashboard);
  const notice = typeof params.notice === "string" ? authNotices[params.notice] : undefined;

  return (
    <AuthCard
      title="Sign in"
      lead="Your private workspace for everything you own in Tamil Nadu."
      notice={viewer ? authNotices["workspace-unavailable"] : notice}
      footer={
        viewer ? (
          <form action={signOutAction}>
            <Button type="submit" variant="secondary" className="w-full">
              Sign out
            </Button>
          </form>
        ) : areSignupsOpen() ? (
          <p className="text-sm text-ink-muted">
            New here?{" "}
            <Link href={routes.register} className="font-medium text-brand underline-offset-4 hover:underline" data-track="register_clicked" data-track-location="login">
              Create your Family Office
            </Link>
          </p>
        ) : (
          <>
            <p className="text-sm text-ink-muted">Customer accounts are by invitation during early access. Tell us what you need and our team will set you up.</p>
            <ButtonLink href={routes.getStarted} className="mt-4 w-full" size="lg" arrow track="cta_clicked" trackProps={{ label: "get_started", location: "login" }}>
              Get Started
            </ButtonLink>
          </>
        )
      }
    >
      {viewer ? null : <LoginForm next={next} />}
    </AuthCard>
  );
}

/** Before a Supabase project is connected: honest placeholder, no fake sign-in. */
function LoginPlaceholder() {
  return (
    <AuthCard
      title="Sign in"
      lead="Access your private Family Office workspace."
      footer={
        <>
          <p className="text-sm text-ink-muted">New here?</p>
          <p className="mt-1">
            <Link href={routes.register} className="text-sm font-medium text-brand underline-offset-4 hover:underline" data-track="register_clicked" data-track-location="login">
              Create your Family Office
            </Link>
          </p>
          <ButtonLink href={routes.getStarted} className="mt-5 w-full" size="lg" arrow track="cta_clicked" trackProps={{ label: "get_started", location: "login" }}>
            Get Started with our team
          </ButtonLink>
        </>
      }
    >
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
    </AuthCard>
  );
}
