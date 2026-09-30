import { getAdminEvidenceFile } from "@/lib/admin/data";
import { getAdmin } from "@/lib/admin/session";
import { evidenceFileRedirect, evidenceNotFound } from "@/lib/field-ops/evidence-files";

export const dynamic = "force-dynamic";

/**
 * An evidence file for the admin console, in any review state. Only an
 * active admin gets a signed link, and only for evidence that belongs to
 * this request; everyone else gets the same "not found".
 */
export async function GET(_request: Request, ctx: RouteContext<"/admin/requests/[id]/evidence/[evidenceId]">) {
  const { id, evidenceId } = await ctx.params;
  const admin = await getAdmin();
  if (!admin) return evidenceNotFound();
  return evidenceFileRedirect(admin.supabase, await getAdminEvidenceFile(admin, id, evidenceId));
}
