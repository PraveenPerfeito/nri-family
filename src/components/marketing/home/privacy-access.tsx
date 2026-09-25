import { Globe2, House, Lock, UserRound, Users, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { visibilityLevels } from "@/components/trust/visibility";
import { DemoLabel } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

type Role = { who: string; icon: LucideIcon; access: string; sees: string; hidden?: string; owner?: boolean };

/* How access is designed: each role sees only what its part of the work requires (see /trust). */
const roles: Role[] = [
  { who: "Owner", icon: UserRound, access: "Full access", sees: "Documents, reports, costs and visibility settings", owner: true },
  { who: "Team", icon: Users, access: "Required data", sees: "Request details, property location and reports", hidden: "Unrelated documents" },
  { who: "Partner", icon: Wrench, access: "Assigned data", sees: "The assigned task and visit time", hidden: "Your documents and other properties" },
];

const levels: { key: keyof typeof visibilityLevels; label: string; icon: LucideIcon }[] = [
  { key: "private", label: "Private", icon: Lock },
  { key: "verified-network", label: "Verified network", icon: Users },
  { key: "public", label: "Public", icon: Globe2 },
];

const summary =
  "Concept preview of the access settings for Chennai House. Visibility: Private. " +
  "Owner: full access to documents, reports, costs and visibility settings. " +
  "Team: required data only — request details, property location and reports. " +
  "Partner: assigned data only — the task and visit time, not your documents or other properties. " +
  "Visibility can be changed to Verified network or Public only by the owner.";

/** Privacy as a permission interface: one property, three roles, and the visibility switch. */
export function PrivacyAccess() {
  return (
    <figure aria-label="Concept preview of property access settings" className="min-w-0">
      <div role="img" aria-label={summary} className="overflow-hidden rounded-panel border border-line bg-surface shadow-raised">
        {/* Property */}
        <div className="flex items-center justify-between gap-3 border-b border-line-subtle px-5 py-4 sm:px-6">
          <span className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-control bg-night text-white">
              <House className="size-4" strokeWidth={1.75} />
            </span>
            <span>
              <span className="text-label block text-ink-subtle">Property</span>
              <span className="mt-0.5 block text-[0.9375rem] font-semibold tracking-tight text-ink">Chennai House</span>
            </span>
          </span>
          <DemoLabel kind="concept" />
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-line-subtle bg-canvas/60 px-5 py-3 sm:px-6">
          <span className="text-sm text-ink-muted">Visibility</span>
          <span className="text-label inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-ink">
            <Lock className="size-3 text-brand" strokeWidth={2.25} />
            Private
          </span>
        </div>

        {/* Roles */}
        <div className="px-5 pt-5 sm:px-6">
          <p className="text-label text-ink-subtle">Who can see what</p>
        </div>
        <ul className="px-3 pt-2 pb-3 sm:px-4">
          {roles.map(({ who, icon: Icon, access, sees, hidden, owner }) => (
            <li key={who} className="flex items-start gap-3 rounded-control px-2 py-3 sm:gap-4">
              <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", owner ? "bg-brand text-white" : "bg-subtle text-ink-muted")}>
                <Icon className="size-4" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-label text-ink">{who}</span>
                  <span
                    className={cn(
                      "rounded-md border px-2 py-0.5 text-xs font-medium",
                      owner ? "border-brand/30 bg-brand-soft text-brand-strong" : "border-line bg-surface text-ink",
                    )}
                  >
                    {access}
                  </span>
                </span>
                <span className="mt-1 block text-[0.8125rem] leading-relaxed text-ink-muted">{sees}</span>
                {hidden ? <span className="block text-xs text-ink-subtle">Never: {hidden.charAt(0).toLowerCase() + hidden.slice(1)}</span> : null}
              </span>
            </li>
          ))}
        </ul>

        {/* Visibility switch */}
        <div className="border-t border-line-subtle bg-canvas/60 px-5 py-5 sm:px-6">
          <p className="text-label text-ink-subtle">Change visibility</p>
          <div className="mt-3 grid grid-cols-3 gap-1 rounded-control border border-line bg-subtle/70 p-1">
            {levels.map(({ key, label, icon: Icon }) => (
              <span
                key={key}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-center text-xs font-medium sm:text-[0.8125rem]",
                  key === "private" ? "bg-surface text-ink shadow-card ring-1 ring-line" : "text-ink-muted",
                )}
              >
                <Icon className="size-3.5 shrink-0 max-sm:hidden" strokeWidth={2} />
                {label}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-subtle">{visibilityLevels.private.short}. Only the owner can change this.</p>
        </div>
      </div>
    </figure>
  );
}
