import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthPreview } from "@/components/forms/auth-preview";
import { AuthCard } from "@/components/portal/auth/auth-card";
import { RegisterForm } from "@/components/portal/auth/auth-forms";
import { ButtonLink } from "@/components/ui/button";
import { portalRoutes, routes } from "@/config/routes";
import { countryOptions } from "@/lib/portal/places";
import { getViewer } from "@/lib/portal/session";
import { pageMetadata } from "@/lib/seo/metadata";
import { areSignupsOpen, isPortalConfigured } from "@/lib/supabase/config";

export const metadata = pageMetadata({
  title: "Create Account",
  description: "Create your private Family Office workspace for your property, requests and documents in Tamil Nadu.",
  path: routes.register,
  noIndex: true,
});

const signInLink = (
  <p className="text-sm text-ink-muted">
    Already have an account?{" "}
    <Link href={routes.login} className="font-medium text-brand underline-offset-4 hover:underline" data-track="login_clicked" data-track-location="register">
      Sign in
    </Link>
  </p>
);

export default async function RegisterPage() {
  if (!isPortalConfigured()) return <RegisterPlaceholder />;
  if (await getViewer()) redirect(portalRoutes.dashboard);

  if (!areSignupsOpen()) {
    return (
      <AuthCard
        title="Create your Family Office"
        lead="One private workspace for your property, requests and updates in Tamil Nadu."
        notice="During early access, customer accounts are set up by our team. Tell us what you need and we'll get in touch."
        footer={signInLink}
      >
        <ButtonLink href={routes.getStarted} className="w-full" size="lg" arrow track="cta_clicked" trackProps={{ label: "get_started", location: "register" }}>
          Get Started
        </ButtonLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create your Family Office" lead="One private workspace for your property, requests and updates in Tamil Nadu." footer={signInLink}>
      <RegisterForm countries={countryOptions()} />
    </AuthCard>
  );
}

/** Before a Supabase project is connected: honest placeholder, no fake account creation. */
function RegisterPlaceholder() {
  return (
    <AuthCard
      title="Create your Family Office"
      lead="One private workspace for your property, requests and documents in Tamil Nadu."
      footer={
        <>
          <p className="text-sm text-ink-muted">Want help now? Tell us what you need and our team will get in touch.</p>
          <ButtonLink href={routes.getStarted} className="mt-4 w-full" size="lg" arrow track="cta_clicked" trackProps={{ label: "get_started", location: "register" }}>
            Get Started
          </ButtonLink>
          <div className="mt-5">{signInLink}</div>
        </>
      }
    >
      <AuthPreview
        submitLabel="Create Account"
        fields={[
          { id: "name", label: "Name", autoComplete: "name" },
          { id: "email", label: "Email", type: "email", autoComplete: "email" },
          { id: "country", label: "Country", autoComplete: "country-name" },
          { id: "phone", label: "Phone", type: "tel", autoComplete: "tel" },
          { id: "password", label: "Password", type: "password", autoComplete: "new-password" },
        ]}
      />
    </AuthCard>
  );
}
