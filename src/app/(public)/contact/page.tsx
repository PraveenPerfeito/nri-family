import { Clock, Lock, Mail, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/forms/contact-form";
import { PageHero } from "@/components/marketing/page-hero";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Contact Us",
  description: "Contact our team about property care, property management, transactions, documents or family assistance in Tamil Nadu.",
  path: routes.contact,
});

export default function ContactPage() {
  const { email, whatsapp } = siteConfig.contact;
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Talk to us."
        lead="Have a question about a property, a service or how we work? Send us a message and our team will get back to you."
        breadcrumb={{ name: "Contact", path: routes.contact }}
      />
      <div className="container-page grid gap-10 py-14 sm:py-16 lg:grid-cols-[1.6fr_1fr] lg:gap-16">
        <section aria-labelledby="contact-form-title" className="rounded-panel border border-line bg-surface p-6 shadow-card sm:p-8">
          <h2 id="contact-form-title" className="text-xl font-semibold text-ink">
            Send a message
          </h2>
          <p className="mt-1 text-sm text-ink-muted">All fields are required.</p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </section>

        <aside className="space-y-6" aria-label="Other ways to reach us">
          {email || whatsapp ? (
            <div className="rounded-card border border-line bg-surface p-6">
              <h2 className="text-base font-semibold text-ink">Reach us directly</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {email ? (
                  <li className="flex items-center gap-3">
                    <Mail aria-hidden className="size-4 text-brand" />
                    <a href={`mailto:${email}`} className="text-ink underline-offset-4 hover:underline">
                      {email}
                    </a>
                  </li>
                ) : null}
                {whatsapp ? (
                  <li className="flex items-center gap-3">
                    <MessageCircle aria-hidden className="size-4 text-brand" />
                    <span className="text-ink">WhatsApp: {whatsapp}</span>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
          <div className="rounded-card border border-line bg-canvas p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <Clock aria-hidden className="size-4 text-brand" />
              What happens next
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              A member of our team reads every message and replies personally. We may ask a few questions to understand your
              situation before suggesting next steps.
            </p>
          </div>
          <div className="rounded-card border border-line bg-canvas p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <Lock aria-hidden className="size-4 text-brand" />
              Your details stay private
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              We use your details only to respond to you. Please don&apos;t send documents or ID numbers through this form.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
