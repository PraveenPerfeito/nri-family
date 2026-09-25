import Link from "next/link";
import { AuthPreview } from "@/components/forms/auth-preview";
import { ButtonLink } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Create Account",
  description: "Create your private Family Office workspace. Customer accounts open in a later phase.",
  path: routes.register,
  noIndex: true,
});

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md rounded-panel border border-line bg-surface p-6 shadow-raised sm:p-8">
      <h1 className="text-display text-3xl text-ink">Create your Family Office</h1>
      <p className="mt-2 text-sm text-ink-muted">One private workspace for your property, requests and documents in Tamil Nadu.</p>
      <div className="mt-6">
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
      </div>
      <div className="mt-8 border-t border-line pt-6 text-center">
        <p className="text-sm text-ink-muted">Want help now? Tell us what you need and our team will get in touch.</p>
        <ButtonLink href={routes.getStarted} className="mt-4 w-full" size="lg" arrow track="cta_clicked" trackProps={{ label: "get_started", location: "register" }}>
          Get Started
        </ButtonLink>
        <p className="mt-5 text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href={routes.login} className="font-medium text-brand underline-offset-4 hover:underline" data-track="login_clicked" data-track-location="register">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
