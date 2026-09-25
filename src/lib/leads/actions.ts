"use server";

import { headers } from "next/headers";
import { siteConfig } from "@/config/site";
import { createRateLimiter } from "@/lib/security/rate-limit";
import { contactSchema, getStartedSchema, toFieldErrors } from "@/lib/validation/leads";
import { deliverLead, emailRelayFor, type LeadKind } from "./delivery";
import { HONEYPOT_FIELD, MIN_FILL_TIME_MS, STARTED_AT_FIELD, type FormState } from "./types";

/*
 * Server Actions for public enquiry forms.
 * - Next.js Server Actions reject cross-origin POSTs (Origin/Host check),
 *   which covers CSRF for these endpoints.
 * - All input is re-validated here; client validation is only for UX.
 * - Personal details are never logged.
 */

const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 });

const SUCCESS_MESSAGE = "Thank you. We've received your request. Our team will review it and contact you.";

/** "email us at … or message us on WhatsApp at …", from whichever channels are configured. */
function directContact(): string | undefined {
  const { email, whatsapp } = siteConfig.contact;
  if (email && whatsapp) return `email us at ${email} or message us on WhatsApp at ${whatsapp}`;
  if (email) return `email us at ${email}`;
  if (whatsapp) return `message us on WhatsApp at ${whatsapp}`;
  return undefined;
}

function unavailableMessage(): string {
  const direct = directContact();
  return direct ? `Online submissions are not enabled yet. Please ${direct}.` : "Online submissions are not enabled yet. Please try again soon.";
}

function failedMessage(): string {
  const direct = directContact();
  return direct
    ? `We couldn't send your request just now. Please try again, or ${direct}.`
    : "Something went wrong while sending your request. Please try again.";
}

async function clientKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}

type Guard = { blocked: true; state: FormState } | { blocked: false };

async function guard(formData: FormData): Promise<Guard> {
  // Honeypot filled or submitted impossibly fast: pretend success, store nothing.
  const honeypot = formData.get(HONEYPOT_FIELD);
  const startedAt = Number(formData.get(STARTED_AT_FIELD));
  const tooFast = Number.isFinite(startedAt) && startedAt > 0 && Date.now() - startedAt < MIN_FILL_TIME_MS;
  if ((typeof honeypot === "string" && honeypot.length > 0) || tooFast) {
    return { blocked: true, state: { status: "success", message: SUCCESS_MESSAGE } };
  }

  const { allowed } = limiter.check(await clientKey());
  if (!allowed) {
    return {
      blocked: true,
      state: { status: "error", message: "Too many submissions from this connection. Please wait a few minutes and try again." },
    };
  }
  return { blocked: false };
}

async function finish(kind: LeadKind, data: Record<string, unknown>): Promise<FormState> {
  const payload = { kind, submittedAt: new Date().toISOString(), data };
  const result = await deliverLead(payload);

  // No email went out server-side (Resend not configured or failed): if the
  // relay is active (on Vercel), hand the validated enquiry to the browser.
  const relay = result.ok && result.emailed ? null : emailRelayFor(payload);
  if (relay) {
    return {
      status: "relay",
      relay,
      message: SUCCESS_MESSAGE,
      fallbackMessage: failedMessage(),
      // Only a real delivery counts (the dev-mode log does not).
      deliveredServerSide: result.ok && result.delivered,
    };
  }

  if (result.ok) return { status: "success", message: SUCCESS_MESSAGE };
  if (result.reason === "not-configured") return { status: "error", message: unavailableMessage() };
  return { status: "error", message: failedMessage() };
}

export async function submitContact(_prev: FormState, formData: FormData): Promise<FormState> {
  const g = await guard(formData);
  if (g.blocked) return g.state;

  const parsed = contactSchema.safeParse({
    name: formData.get("name") ?? "",
    country: formData.get("country") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    category: formData.get("category") ?? "",
    message: formData.get("message") ?? "",
    consent: formData.get("consent") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) };
  }

  return finish("contact", { ...parsed.data, consent: true });
}

export async function submitGetStarted(_prev: FormState, formData: FormData): Promise<FormState> {
  const g = await guard(formData);
  if (g.blocked) return g.state;

  const parsed = getStartedSchema.safeParse({
    name: formData.get("name") ?? "",
    country: formData.get("country") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    ownsProperty: formData.get("ownsProperty") ?? "",
    topics: formData.getAll("topics"),
    details: formData.get("details") ?? "",
    consent: formData.get("consent") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors: toFieldErrors(parsed.error) };
  }

  return finish("get-started", { ...parsed.data, consent: true });
}
