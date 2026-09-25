import "server-only";

/**
 * Where enquiries go. Phase 1 supports a webhook (CRM, automation tool or a
 * future internal API). The Admin ERP (Layer 3) will replace this with a
 * first-party leads table.
 *
 * Environment:
 *   LEADS_WEBHOOK_URL     — HTTPS endpoint that receives a JSON POST.
 *   LEADS_WEBHOOK_SECRET  — optional; sent as a Bearer token.
 */
export type LeadKind = "contact" | "get-started";

export type LeadPayload = {
  kind: LeadKind;
  submittedAt: string;
  data: Record<string, unknown>;
};

export type DeliveryResult = { ok: true } | { ok: false; reason: "not-configured" | "failed" };

export async function deliverLead(payload: LeadPayload): Promise<DeliveryResult> {
  const url = process.env.LEADS_WEBHOOK_URL;

  if (!url) {
    if (process.env.NODE_ENV !== "production") {
      // Development only: log that a lead arrived, without personal details.
      console.info(`[leads] ${payload.kind} enquiry received (dev mode, not delivered). Fields: ${Object.keys(payload.data).join(", ")}`);
      return { ok: true };
    }
    return { ok: false, reason: "not-configured" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.LEADS_WEBHOOK_SECRET ? { authorization: `Bearer ${process.env.LEADS_WEBHOOK_SECRET}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[leads] delivery failed with status ${res.status}`);
      return { ok: false, reason: "failed" };
    }
    return { ok: true };
  } catch {
    console.error("[leads] delivery failed (network error)");
    return { ok: false, reason: "failed" };
  }
}
