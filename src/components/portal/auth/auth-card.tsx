import type { ReactNode } from "react";
import { Info } from "lucide-react";

/** The card used by every account page. */
export function AuthCard({ title, lead, notice, children, footer }: { title: string; lead?: ReactNode; notice?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-panel border border-line bg-surface p-6 shadow-raised sm:p-8">
      <h1 className="text-display text-3xl text-ink">{title}</h1>
      {lead ? <p className="mt-2 text-sm text-ink-muted">{lead}</p> : null}
      {notice ? (
        <p role="status" className="mt-5 flex items-start gap-2.5 rounded-control border border-info/15 bg-info-soft px-4 py-3 text-sm text-ink">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-info" />
          {notice}
        </p>
      ) : null}
      <div className="mt-6">{children}</div>
      {footer ? <div className="mt-8 border-t border-line pt-6 text-center">{footer}</div> : null}
    </div>
  );
}

export const authNotices: Record<string, string> = {
  "signed-out": "You've signed out of your workspace.",
  confirmed: "If you've just confirmed your email, sign in to continue.",
  "link-expired": "That link has expired or was already used. Sign in, or ask for a new link.",
  "workspace-unavailable": "This sign-in is for customer workspaces. Team workspaces are coming to the platform.",
};
