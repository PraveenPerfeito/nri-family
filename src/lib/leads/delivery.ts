import "server-only";
import { siteConfig } from "@/config/site";
import { buildNotificationEmail, customerWhatsappLink, fieldLabel, formatValue } from "./notification-email";
import type { RelayInstruction } from "./types";

/**
 * Where enquiries go. Server-side channels run first; the browser relay is the
 * email fallback. A lead counts as delivered if any channel succeeds.
 *
 * 1. Resend (preferred email), server-side — active when RESEND_API_KEY is set
 *    in Vercel. We control the whole email (src/lib/leads/notification-email.ts):
 *    branded, no ads or images, reply / WhatsApp / call buttons, signature.
 *    Until a domain is verified in Resend, its shared sender can only deliver
 *    to the Resend account's own address, which is the leads inbox.
 * 2. Webhook, server-side (CRM, automation tool, future internal API):
 *      LEADS_WEBHOOK_URL     — HTTPS endpoint that receives a JSON POST.
 *      LEADS_WEBHOOK_SECRET  — optional; sent as a Bearer token.
 * 3. FormSubmit (formsubmit.co), completed by the visitor's browser — used
 *    when no email was sent server-side (Resend not configured, or it failed).
 *    FormSubmit refuses requests from cloud servers such as Vercel's, so the
 *    server builds the email and the browser hands it over
 *    (src/lib/leads/browser-relay.ts), only after the server has validated,
 *    spam-checked and rate-limited the submission. Its free emails carry
 *    FormSubmit's own sponsor block and sign-off, which cannot be removed.
 *    FormSubmit keeps submissions for 30 days.
 *
 * Email channels are active only on deployed Vercel environments (VERCEL_ENV
 * is set), or with LEADS_EMAIL_RELAY=true elsewhere, so local development and
 * automated QA never email the owner. Nothing here logs personal data.
 * The Admin ERP (Layer 3) will replace all of this with a first-party leads table.
 */
export type LeadKind = "contact" | "get-started";

export type LeadPayload = {
  kind: LeadKind;
  submittedAt: string;
  data: Record<string, unknown>;
};

/**
 * `delivered`: a real channel accepted the lead (false for the development-only
 * log). `emailed`: an email notification already went out server-side.
 */
export type DeliveryResult =
  | { ok: true; delivered: boolean; emailed: boolean }
  | { ok: false; reason: "not-configured" | "failed" };

export const EMAIL_RELAY_ENDPOINT = "https://formsubmit.co/ajax/";
export const RESEND_ENDPOINT = "https://api.resend.com/emails";
/** Resend's shared sender, usable before a domain is verified. */
export const RESEND_DEFAULT_SENDER = "onboarding@resend.dev";

const TIMEOUT_MS = 8000;

function emailChannelsActive(): boolean {
  return Boolean(siteConfig.leadsEmail) && (Boolean(process.env.VERCEL_ENV) || process.env.LEADS_EMAIL_RELAY === "true");
}

function resendKey(): string | undefined {
  const key = process.env.RESEND_API_KEY?.trim();
  return key && emailChannelsActive() ? key : undefined;
}

/** FormSubmit body: labelled fields plus FormSubmit control fields. */
export function buildEmailBody(payload: LeadPayload): Record<string, string> {
  const title = payload.kind === "contact" ? "Contact enquiry" : "Get Started request";
  const body: Record<string, string> = {
    _subject: `New ${title.toLowerCase()} — ${siteConfig.name} website`,
    _template: "table",
    _captcha: "false",
    Form: title,
  };
  for (const [key, value] of Object.entries(payload.data)) {
    body[fieldLabel(key)] = formatValue(value);
  }
  const chat = customerWhatsappLink(payload.data.phone, payload.data.country);
  if (chat) body["WhatsApp chat"] = chat;
  body["Submitted at"] = new Date(payload.submittedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST";
  if (typeof payload.data.email === "string") body._replyto = payload.data.email;
  return body;
}

/** The email hand-off for the visitor's browser, or null when email is not active here. */
export function emailRelayFor(payload: LeadPayload): RelayInstruction | null {
  if (!emailChannelsActive()) return null;
  return {
    endpoint: `${EMAIL_RELAY_ENDPOINT}${encodeURIComponent(siteConfig.leadsEmail!)}`,
    body: buildEmailBody(payload),
  };
}

async function sendWithResend(key: string, payload: LeadPayload): Promise<boolean> {
  const email = buildNotificationEmail(payload, { brand: siteConfig.name, siteUrl: siteConfig.url });
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: siteConfig.leadsEmailFrom ?? `${siteConfig.name} Website <${RESEND_DEFAULT_SENDER}>`,
        to: [siteConfig.leadsEmail],
        subject: email.subject,
        html: email.html,
        text: email.text,
        ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) console.error(`[leads] Resend delivery failed with status ${res.status}`);
    return res.ok;
  } catch {
    console.error("[leads] Resend delivery failed (network error)");
    return false;
  }
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

/** Server-side delivery: Resend and/or the webhook. The FormSubmit fallback is completed by the browser. */
export async function deliverLead(payload: LeadPayload): Promise<DeliveryResult> {
  const webhookUrl = process.env.LEADS_WEBHOOK_URL;
  const key = resendKey();

  if (!webhookUrl && !key) {
    if (process.env.NODE_ENV !== "production") {
      // Development only: log that a lead arrived, without personal details.
      console.info(`[leads] ${payload.kind} enquiry received (dev mode, not delivered). Fields: ${Object.keys(payload.data).join(", ")}`);
      return { ok: true, delivered: false, emailed: false };
    }
    return { ok: false, reason: "not-configured" };
  }

  const [emailed, webhooked] = await Promise.all([
    key ? sendWithResend(key, payload) : Promise.resolve(false),
    webhookUrl ? sendToWebhook(webhookUrl, payload) : Promise.resolve(false),
  ]);
  return emailed || webhooked ? { ok: true, delivered: true, emailed } : { ok: false, reason: "failed" };
}
