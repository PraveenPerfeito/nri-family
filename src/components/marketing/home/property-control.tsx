import { EyeOff, Globe2, Lock, MapPin, MessageSquareLock, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { DemoLabel } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/section";
import { routes } from "@/config/routes";
import { visibilityLevels } from "@/components/trust/visibility";
import { cn } from "@/lib/utils/cn";

/* Same wording as the visibility levels on /property and /trust. */
const ladder: { label: string; who: string; note: string; icon: LucideIcon; current?: boolean }[] = [
  { label: "Private", who: visibilityLevels.private.short, note: "Every property starts here.", icon: Lock },
  {
    label: "Verified network",
    who: visibilityLevels["verified-network"].short,
    note: "Shared only with verified parties. Your contact details stay hidden.",
    icon: Users,
    current: true,
  },
  { label: "Public", who: visibilityLevels.public.short, note: "Enquiries still come through the platform, not to you directly.", icon: Globe2 },
];

/** Sell / rent: a controlled marketplace — privacy first, listing second. */
export function PropertyControl() {
  return (
    <section aria-labelledby="list-title" className="border-y border-line-subtle bg-surface py-20 sm:py-28 lg:py-36">
      <div className="container-page grid gap-16 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-24">
        <div>
          <Eyebrow>Selling or renting</Eyebrow>
          <h2 id="list-title" className="text-display mt-5 text-[2rem] leading-[1.08] sm:text-[2.5rem] lg:text-5xl">
            Want to sell or rent your property?
          </h2>
          <p className="mt-6 max-w-xl text-lg text-ink-muted">
            Manage the process from abroad while keeping control over who can see your property and how enquiries reach you.
          </p>

          <ol aria-label="Listing visibility, from private to public" className="relative mt-10">
            {ladder.map(({ label, who, note, icon: Icon, current }, i) => (
              <li key={label} className={cn("relative grid grid-cols-[2.25rem_1fr] gap-4", i < ladder.length - 1 && "pb-7")}>
                {i < ladder.length - 1 ? <span aria-hidden className="absolute top-10 bottom-1 left-[1.125rem] w-px bg-line-strong" /> : null}
                <span
                  aria-hidden
                  className={cn(
                    "relative flex size-9 items-center justify-center rounded-full border",
                    current ? "border-brand bg-brand text-white shadow-[0_0_0_6px_rgb(15_90_79/0.1)]" : "border-line-strong bg-surface text-brand",
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                <div className="pt-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-label text-ink">{label}</span>
                    {i === 0 ? <span className="rounded-full bg-subtle px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide text-ink-muted uppercase">Default</span> : null}
                    {current ? (
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide text-brand-strong uppercase">This listing</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-lg font-medium tracking-tight text-ink">{who}</p>
                  <p className="mt-1 text-[0.9375rem] text-ink-muted">{note}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <ButtonLink href={routes.getStarted} size="lg" arrow track="property_cta_clicked" trackProps={{ location: "home_list" }}>
              List My Property
            </ButtonLink>
            <Link href={routes.propertyTransactions} className="text-sm font-medium text-brand underline-offset-4 hover:underline">
              How property transactions work
            </Link>
          </div>
          <p className="mt-5 max-w-xl text-sm text-ink-subtle">
            Transactions are coordinated with qualified property and legal professionals where required.
          </p>
        </div>

        {/* Sample listing, as a verified buyer would see it */}
        <figure aria-labelledby="listing-caption" className="mx-auto w-full max-w-md lg:mx-0">
          <div className="relative">
          <div aria-hidden className="absolute inset-x-8 -bottom-3 top-8 rounded-panel border border-line bg-canvas" />
          <article className="relative overflow-hidden rounded-panel border border-line bg-surface shadow-float">
            <div aria-hidden className="relative h-40 border-b border-line-subtle bg-canvas">
              <div className="absolute inset-0 bg-[radial-gradient(circle,rgb(14_26_43/0.13)_1px,transparent_1.2px)] bg-[length:10px_10px] [mask-image:radial-gradient(ellipse_at_60%_55%,black_30%,transparent_75%)]" />
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 160" preserveAspectRatio="none">
                <path d="M-10 118 C 80 96, 150 132, 230 104 S 360 70, 410 86" fill="none" stroke="rgb(14 26 43 / 0.12)" strokeWidth="1.5" />
                <path d="M120 -10 C 136 50, 128 110, 150 170" fill="none" stroke="rgb(14 26 43 / 0.08)" strokeWidth="1" />
              </svg>
              <span className="absolute top-[46%] left-[60%] flex -translate-x-1/2 -translate-y-full flex-col items-center">
                <span className="flex size-8 items-center justify-center rounded-full bg-night text-white shadow-raised">
                  <MapPin className="size-4" strokeWidth={2} />
                </span>
                <span className="mt-1 size-1.5 rounded-full bg-night/40" />
              </span>
              <DemoLabel className="absolute top-3 left-3" />
            </div>
            <div className="p-5 sm:p-6">
              <p className="text-label text-ink-subtle">Chennai · For sale</p>
              <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-ink">Independent Residence</h3>
              <p className="mt-1 text-sm text-ink-muted">2,400 sq.ft · 4 bedrooms</p>

              <dl className="mt-5 divide-y divide-line-subtle border-y border-line-subtle text-sm">
                <div className="flex items-center justify-between gap-3 py-3">
                  <dt className="text-ink-subtle">Visibility</dt>
                  <dd className="text-label inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand-soft px-2.5 py-1 text-brand-strong">
                    <Users aria-hidden className="size-3.5" strokeWidth={2} />
                    Verified network
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-3">
                  <dt className="text-ink-subtle">Owner details</dt>
                  <dd className="flex items-center gap-1.5 font-medium text-ink">
                    <EyeOff aria-hidden className="size-3.5 text-ink-subtle" />
                    Hidden
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-3">
                  <dt className="text-ink-subtle">Location shown</dt>
                  <dd className="font-medium text-ink">City only</dd>
                </div>
              </dl>

              <p className="mt-5 flex items-center gap-3 text-sm">
                <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <MessageSquareLock className="size-4" strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block font-medium text-ink">Contact through platform</span>
                  <span className="block text-xs text-ink-subtle">Enquiries reach our team, not you directly.</span>
                </span>
              </p>
            </div>
          </article>
          </div>
          <figcaption id="listing-caption" className="sr-only">
            Sample listing with illustrative details. Listings never show the owner’s name, phone number, email or exact address.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
