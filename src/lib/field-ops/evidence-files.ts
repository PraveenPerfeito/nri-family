import "server-only";
import type { PortalClient } from "@/lib/supabase/server";
import { EVIDENCE_BUCKET, evidenceLinkSeconds, type EvidenceKind } from "./domain";

/*
 * Evidence files are served through the app's own URLs
 * (/app/requests/[id]/evidence/[evidenceId] for customers,
 * /admin/requests/[id]/evidence/[evidenceId] for admins). Every request is
 * authorised first (who is signed in, that the evidence belongs to that
 * request, and for customers that it is theirs and published), and only
 * then is a short-lived signed link created, as the viewer, so the Storage
 * policies decide again. The browser is redirected to it; pages never
 * contain signed links, and nothing here is cached.
 */

const privateHeaders = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };

/** The answer to anyone who may not see a file, or when there is none: indistinguishable on purpose. */
export function evidenceNotFound(): Response {
  return new Response("Not found", { status: 404, headers: { ...privateHeaders, "content-type": "text/plain; charset=utf-8" } });
}

/** Redirect to a signed link for an authorised file; "not found" if Storage refuses. */
export async function evidenceFileRedirect(client: PortalClient, file: { path: string; kind: EvidenceKind } | null): Promise<Response> {
  if (!file) return evidenceNotFound();
  const { data, error } = await client.storage.from(EVIDENCE_BUCKET).createSignedUrl(file.path, evidenceLinkSeconds[file.kind]);
  if (error || !data?.signedUrl) return evidenceNotFound();
  return new Response(null, { status: 302, headers: { ...privateHeaders, location: data.signedUrl, "referrer-policy": "no-referrer" } });
}
