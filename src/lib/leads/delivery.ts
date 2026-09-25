import "server-only";
import { siteConfig } from "@/config/site";
import type { RelayInstruction } from "./types";

/**
 * Where enquiries go. Two channels; when both are configured a lead counts as
 * delivered if at least one succeeds.
 *
 * 1. Email to `leadsEmail` (src/config/site.ts) through FormSubmit
 *    (formsubmit.co), a free relay that needs no account or API key. The first
 *    message triggers a one-time "Activate Form" email to that inbox.
 *    FormSubmit refuses requests from cloud servers (such as Vercel's), so the
 *    server builds the email here and the visitor's browser hands it over
 *    (src/lib/leads/browser-relay.ts) — only after the server has validated,
 *    spam-checked and rate-limited the submission. It is active only on
 *    deployed Vercel environments (VERCEL_ENV is set), or with
 *    LEADS_EMAIL_RELAY=true elsewhere, so local development and automated QA
 *    never email the owner. FormSubmit keeps submissions for 30 days.
 * 2. Webhook, server-side (CRM, automation tool, future internal API):
 *      LEADS_WEBHOOK_URL     — HTTPS endpoint that receives a JSON POST.
 *      LEADS_WEBHOOK_SECRET  — optional; sent as a Bearer token.
 *
 * The Admin ERP (Layer 3) will replace both with a first-party leads table.
 * Nothing here logs personal data.
 */
export type LeadKind = "contact" | "get-started";

export type LeadPayload = {
  kind: LeadKind;
  submittedAt: string;
  data: Record<string, unknown>;
};

/** `delivered` is false for the development-only log, which accepts but delivers nothing. */
export type DeliveryResult = { ok: true; delivered: boolean } | { ok: false; reason: "not-configured" | "failed" };

export const EMAIL_RELAY_ENDPOINT = "https://formsubmit.co/ajax/";

const TIMEOUT_MS = 8000;

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  country: "Country",
  email: "Email",
  phone: "Phone / WhatsApp",
  category: "Service category",
  ownsProperty: "Owns property in Tamil Nadu",
  topics: "Needs help with",
  message: "Message",
  details: "Details",
  consent: "Agreed to be contacted",
};

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  const text = String(value ?? "").trim();
  return text || "—";
}

function emailRelayEnabled(): boolean {
  return Boolean(siteConfig.leadsEmail) && (Boolean(process.env.VERCEL_ENV) || process.env.LEADS_EMAIL_RELAY === "true");
}

/** Human-readable email body: labelled fields plus FormSubmit control fields. */
export function buildEmailBody(payload: LeadPayload): Record<string, string> {
  const title = payload.kind === "contact" ? "Contact enquiry" : "Get Started request";
  const body: Record<string, string> = {
    _subject: `New ${title.toLowerCase()} — ${siteConfig.name} website`,
    _template: "table",
    _captcha: "false",
    Form: title,
  };
  for (const [key, value] of Object.entries(payload.data)) {
    body[FIELD_LABELS[key] ?? key] = formatValue(value);
  }
  body["Submitted at"] = new Date(payload.submittedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST";
  if (typeof payload.data.email === "string") body._replyto = payload.data.email;
  return body;
}

/** The email hand-off for the visitor's browser, or null when the relay is not active here. */
export function emailRelayFor(payload: LeadPayload): RelayInstruction | null {
  if (!emailRelayEnabled()) return null;
  return {
    endpoint: `${EMAIL_RELAY_ENDPOINT}${encodeURIComponent(siteConfig.leadsEmail!)}`,
    body: buildEmailBody(payload),
  };
}

async function sendToWebhook(url: string, payload: LeadPayload): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.LEADS_WEBHOOK_SECRET ? { authorization: `Bearer ${process.env.LEADS_WEBHOOK_SECRET}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) console.error(`[leads] webhook delivery failed with status ${res.status}`);
    return res.ok;
  } catch {
    console.error("[leads] webhook delivery failed (network error)");
    return false;
  }
}

/** Server-side delivery (the webhook). The email relay is completed by the browser. */
export async function deliverLead(payload: LeadPayload): Promise<DeliveryResult> {
  const webhookUrl = process.env.LEADS_WEBHOOK_URL;
  if (!webhookUrl) {
    if (process.env.NODE_ENV !== "production") {
      // Development only: log that a lead arrived, without personal details.
      console.info(`[leads] ${payload.kind} enquiry received (dev mode, not delivered). Fields: ${Object.keys(payload.data).join(", ")}`);
      return { ok: true, delivered: false };
    }
    return { ok: false, reason: "not-configured" };
  }
  return (await sendToWebhook(webhookUrl, payload)) ? { ok: true, delivered: true } : { ok: false, reason: "failed" };
}
