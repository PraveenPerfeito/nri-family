import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Terms of Use",
  description: `Terms for using the ${siteConfig.name} website, including the scope of our services and how illustrative content should be read.`,
  path: routes.terms,
});

export default function TermsPage() {
  const operator = siteConfig.company.legalName ?? siteConfig.name;
  return (
    <LegalPage title="Terms of Use" path={routes.terms} breadcrumb="Terms" updated="24 September 2026">
      <p>
        These terms apply to your use of this website, operated by {operator}. Specific services are provided under separate terms
        or agreements that we will share with you before any work begins.
      </p>

      <h2>About this website</h2>
      <p>
        This website describes the services we offer and the platform we are building for NRIs with property, assets and family in
        Tamil Nadu. Submitting a form is an enquiry, not a contract. We will contact you to discuss your needs before anything is
        agreed.
      </p>

      <h2>Illustrative content</h2>
      <p>
        Dashboards, reports, listings and examples shown on this site are illustrations using sample data. They do not represent
        real customers, properties or results. Features marked &ldquo;Coming to the platform&rdquo; are in development and are not
        yet available.
      </p>

      <h2>Scope of our services</h2>
      <p>
        We coordinate local services and, where required, appropriately qualified professionals. We do not provide legal, tax,
        financial, medical or other regulated professional advice or services, and nothing on this website is such advice. Where a
        matter requires a regulated professional, that professional is responsible for their own advice and work.
      </p>
      <p>In a medical or safety emergency, contact local emergency services first.</p>

      <h2>Accuracy</h2>
      <p>
        We work to keep this website accurate and up to date, but information may change. Plans, availability and service details
        will be confirmed with you directly.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not submit false information or information about other people without their permission.</li>
        <li>Do not attempt to disrupt, overload or gain unauthorised access to the website.</li>
        <li>Do not use automated tools to submit forms or collect content.</li>
      </ul>

      <h2>Intellectual property</h2>
      <p>The content, design and branding on this website belong to {operator} unless stated otherwise.</p>

      <h2>Liability</h2>
      <p>
        To the extent permitted by law, we are not liable for losses arising from use of this website or reliance on its general
        information. Nothing in these terms limits liability that cannot be limited by law.
      </p>

      <h2>Privacy</h2>
      <p>
        Our <Link href={routes.privacy}>Privacy Policy</Link> explains how we handle personal information.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms and will revise the date above when we do. Questions? <Link href={routes.contact}>Contact us</Link>.
      </p>
    </LegalPage>
  );
}
