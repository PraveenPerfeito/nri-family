import type { FormState } from "./types";

const TIMEOUT_MS = 15000;

/**
 * Completes a "relay" result in the visitor's browser by posting the
 * server-built email body to the relay (FormSubmit).
 *
 * Why the browser: FormSubmit refuses requests from cloud servers such as
 * Vercel's, but accepts them from browsers (it allows any origin). The server
 * has already validated, spam-checked and rate-limited the submission before
 * returning the relay instruction.
 */
export async function completeRelay(state: FormState, fetchImpl: typeof fetch = fetch): Promise<FormState> {
  if (state.status !== "relay" || !state.relay) return state;
  const success: FormState = { status: "success", message: state.message };
  try {
    const res = await fetchImpl(state.relay.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(state.relay.body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = (await res.json().catch(() => null)) as { success?: unknown } | null;
    if (res.ok && (json?.success === true || json?.success === "true")) return success;
  } catch {
    // Network error or timeout: fall through to the fallback below.
  }
  return state.deliveredServerSide ? success : { status: "error", message: state.fallbackMessage };
}
