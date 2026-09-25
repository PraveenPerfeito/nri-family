import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description: `How ${siteConfig.name} collects, uses and protects the personal information you share through this website.`,
  path: routes.privacy,
});

export default function PrivacyPage() {
  const operator = siteConfig.company.legalName ?? siteConfig.name;
  const email = siteConfig.contact.email;
  return (
    <LegalPage title="Privacy Policy" path={routes.privacy} breadcrumb="Privacy" updated="24 September 2026">
      <p>
        This policy explains how {operator} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) handles personal information submitted through this
        website. Privacy is central to what we do: we collect only what we need, and we never display customer information publicly.
      </p>

      <h2>Information we collect</h2>
      <p>When you use our contact or Get Started forms, we collect the information you choose to provide:</p>
      <ul>
        <li>Your name, country of residence, email address and phone or WhatsApp number</li>
        <li>The type of help you are interested in, and whether you own property in Tamil Nadu</li>
        <li>Anything you write in the message field</li>
      </ul>
      <p>
        Please do not include property documents, identity numbers, financial details or other sensitive information in these forms.
        Secure document handling will be provided through the private customer workspace when it launches.
      </p>

      <h2>Information collected automatically</h2>
      <p>
        Our servers and hosting provider may process standard technical data (such as IP address, browser type and pages requested)
        to deliver the site, keep it secure and prevent abuse such as spam. This website does not currently use advertising cookies
        or third-party analytics trackers. If we introduce analytics, we will update this policy and, where required, ask for your
        consent first.
      </p>

      <h2>How we use your information</h2>
      <ul>
        <li>To respond to your enquiry and discuss the services you asked about</li>
        <li>To arrange services you request, with your agreement</li>
        <li>To keep the website secure and prevent misuse</li>
        <li>To meet legal obligations that apply to us</li>
      </ul>
      <p>We do not sell your personal information, and we do not use it for unrelated marketing without your permission.</p>

      <h2>Who we share it with</h2>
      <p>
        We share information only where it is needed to help you — for example, with a local service provider assigned to a job you
        approved, or with a qualified professional you asked us to coordinate with — and only the details needed for that task. We
        may also use trusted technology providers (such as hosting and email) who process data on our behalf. For example, website enquiries are currently delivered to our inbox by email through a form-delivery service.
      </p>

      <h2>Retention</h2>
      <p>
        We keep enquiry information for as long as needed to respond and, if you become a customer, to provide the service. You can
        ask us to delete your enquiry at any time.
      </p>

      <h2>Your choices and rights</h2>
      <p>
        You can ask to access, correct or delete the personal information we hold about you, or withdraw consent for us to contact
        you. We intend to handle personal data in line with applicable data protection laws, including India&apos;s Digital Personal
        Data Protection Act, 2023, and the laws of the country where you live where they apply.
      </p>

      <h2>Security</h2>
      <p>
        We use reasonable technical and organisational measures to protect your information, including encrypted connections (HTTPS)
        and restricted access. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.
      </p>

      <h2>Contact</h2>
      <p>
        For privacy questions or requests,{" "}
        {email ? (
          <>
            email <a href={`mailto:${email}`}>{email}</a>
          </>
        ) : (
          <>
            use our <Link href={routes.contact}>contact form</Link>
          </>
        )}
        .
      </p>

      <h2>Changes</h2>
      <p>We will update this page when our practices change, and revise the date above.</p>
    </LegalPage>
  );
}
