import type { Metadata } from "next";
import { UserRoundCog } from "lucide-react";
import { TeamTable } from "@/components/admin/lists";
import { EmptyState, PageHeader, Panel } from "@/components/portal/ui/primitives";
import { adminRoutes } from "@/config/routes";
import { listTeam } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/admin/session";

export const metadata: Metadata = { title: "Team" };

export default async function AdminTeamPage() {
  const admin = await requireAdmin(adminRoutes.team);
  const team = await listTeam(admin);
  const active = team.filter((m) => m.is_active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Team"
        description={`${active} active ${active === 1 ? "member" : "members"}. Everyone here can be made responsible for a request; only active admins can use this console.`}
      />

      {team.length === 0 ? (
        <EmptyState icon={UserRoundCog} title="No team members yet" body="Team members are added by the account owner in the database." />
      ) : (
        <TeamTable rows={team} timezone={admin.profile.timezone} />
      )}

      <Panel title="Roles" labelledBy="roles">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-ink">Admin</dt>
            <dd className="text-ink-muted">Uses this console: reviews, assigns and updates requests, and writes internal notes and customer updates.</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Operations</dt>
            <dd className="text-ink-muted">Can be made responsible for requests. There is no operations workspace yet, so they don&apos;t sign in here.</dd>
          </div>
          <div>
            <dt className="font-medium text-ink">Inactive</dt>
            <dd className="text-ink-muted">No console access and can&apos;t be assigned new work. Their past work stays in the audit trail.</dd>
          </div>
        </dl>
        <p className="mt-4 border-t border-line-subtle pt-3 text-xs text-ink-subtle">
          Adding, deactivating or changing the role of a team member is done by the account owner in the database, not from this console.
        </p>
      </Panel>
    </div>
  );
}
