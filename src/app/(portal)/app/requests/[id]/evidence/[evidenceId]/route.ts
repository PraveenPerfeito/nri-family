import { isEvidenceMime, evidenceObjectPath } from "@/lib/field-ops/domain";
import { evidenceFileRedirect, evidenceNotFound } from "@/lib/field-ops/evidence-files";
import { getPublishedEvidence } from "@/lib/portal/data";
import { getCustomer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

/**
 * A published evidence file on one of the signed-in customer's own requests.
 * Anyone else, any other evidence (someone else's, waiting for review,
 * rejected or only approved internally) and any malformed id get the same
 * "not found". The signed link is created only after these checks.
 */
export async function GET(_request: Request, ctx: RouteContext<"/app/requests/[id]/evidence/[evidenceId]">) {
  const { id, evidenceId } = await ctx.params;
  const viewer = await getCustomer();
  if (!viewer) return evidenceNotFound();
  const evidence = await getPublishedEvidence(viewer, id, evidenceId);
  if (!evidence || !isEvidenceMime(evidence.mime_type)) return evidenceNotFound();
  return evidenceFileRedirect(viewer.supabase, { path: evidenceObjectPath(evidence.request_id, evidence.id, evidence.mime_type), kind: evidence.kind });
}
