import { whatsappLink } from "@/config/site";

/**
 * The enquiry notification email we control end to end (sent through Resend
 * once RESEND_API_KEY is set): branded header, one-tap actions to reply by
 * email, chat on WhatsApp or call, the enquiry details, and a signature.
 * No images, so nothing can show as broken; inline styles for email clients.
 * Every value from the visitor is HTML-escaped.
 */

export type NotificationInput = {
  kind: "contact" | "get-started";
  submittedAt: string;
  data: Record<string, unknown>;
};

export type NotificationContext = { brand: string; siteUrl: string };

export type NotificationEmail = { subject: string; html: string; text: string; replyTo?: string };

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

const FIELD_ORDER = ["name", "country", "email", "phone", "category", "ownsProperty", "topics", "message", "details", "consent"];

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  const text = String(value ?? "").trim();
  return text || "—";
}

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

function oneLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/**
 * A WhatsApp chat link for the visitor's number, when it can be determined:
 * numbers with a country code (+ or 00), or 10-digit numbers from India.
 */
export function customerWhatsappLink(phone: unknown, country: unknown, text?: string): string | undefined {
  if (typeof phone !== "string") return undefined;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") || trimmed.startsWith("00")) return whatsappLink(trimmed, text);
  if (digits.length === 10 && typeof country === "string" && /india/i.test(country)) return whatsappLink(`+91${digits}`, text);
  return undefined;
}

function telLink(phone: unknown): string | undefined {
  if (typeof phone !== "string") return undefined;
  const trimmed = phone.trim();
  if (!trimmed.startsWith("+") && !trimmed.startsWith("00")) return undefined;
  return `tel:+${trimmed.replace(/\D/g, "").replace(/^00/, "")}`;
}

function formatSubmittedAt(iso: string): string {
  return `${new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST`;
}

const FONT = "Arial, Helvetica, sans-serif";

/** Inline-block links wrap onto a new line on narrow screens instead of squeezing. */
function button(href: string, label: string, color: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:0 8px 8px 0;background:${color};color:#ffffff;font-family:${FONT};font-size:14px;font-weight:bold;line-height:20px;padding:10px 16px;border-radius:8px;text-decoration:none;white-space:nowrap;">${escapeHtml(label)}</a>`;
}

export function buildNotificationEmail(input: NotificationInput, ctx: NotificationContext): NotificationEmail {
  const { data } = input;
  const title = input.kind === "contact" ? "New contact enquiry" : "New Get Started request";
  const name = oneLine(formatValue(data.name));
  const firstName = name.split(" ")[0] || name;
  const country = oneLine(formatValue(data.country));
  const email = typeof data.email === "string" ? data.email : undefined;
  const host = ctx.siteUrl.replace(/^https?:\/\//, "");

  const replyHref = email ? `mailto:${email}?subject=${encodeURIComponent(`Re: your enquiry to ${ctx.brand}`)}` : undefined;
  const whatsappHref = customerWhatsappLink(data.phone, data.country, `Hi ${firstName}, thank you for contacting ${ctx.brand}.`);
  const callHref = telLink(data.phone);

  const keys = [...FIELD_ORDER.filter((k) => k in data), ...Object.keys(data).filter((k) => !FIELD_ORDER.includes(k))];
  const rows = keys
    .map((key) => {
      const value = formatValue(data[key]);
      const multiline = key === "message" || key === "details";
      return `<tr>
<td style="padding:10px 12px;border-top:1px solid #e3e0d7;font-family:${FONT};font-size:13px;color:#5d6776;vertical-align:top;width:38%;">${escapeHtml(fieldLabel(key))}</td>
<td style="padding:10px 12px;border-top:1px solid #e3e0d7;font-family:${FONT};font-size:14px;color:#0e1a2b;vertical-align:top;${multiline ? "white-space:pre-wrap;" : ""}">${escapeHtml(value)}</td>
</tr>`;
    })
    .join("\n");

  const buttons = [
    replyHref ? button(replyHref, "Reply by email", "#0f5a4f") : "",
    whatsappHref ? button(whatsappHref, "Chat on WhatsApp", "#1f7a47") : "",
    callHref ? button(callHref, "Call", "#45505f") : "",
  ].join("");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f7f6f2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f2;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e3e0d7;border-radius:12px;">
<tr><td style="padding:20px 24px;background:#0f5a4f;border-radius:12px 12px 0 0;font-family:${FONT};color:#ffffff;">
<div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#cfe4dd;">${escapeHtml(ctx.brand)} · Website enquiry</div>
<div style="font-size:20px;font-weight:bold;margin-top:6px;">${escapeHtml(title)}</div>
</td></tr>
<tr><td style="padding:20px 24px 8px;font-family:${FONT};font-size:15px;line-height:22px;color:#0e1a2b;">
<p style="margin:0 0 16px;"><strong>${escapeHtml(name)}</strong>${country !== "—" ? ` from ${escapeHtml(country)}` : ""} sent this on ${escapeHtml(formatSubmittedAt(input.submittedAt))}.</p>
${buttons ? `<div style="margin:0 0 8px;">${buttons}</div>` : ""}
</td></tr>
<tr><td style="padding:8px 24px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e3e0d7;border-radius:8px;border-collapse:separate;">
${rows}
</table>
</td></tr>
<tr><td style="padding:16px 24px 20px;border-top:1px solid #e3e0d7;font-family:${FONT};font-size:13px;line-height:20px;color:#45505f;">
Regards,<br><strong style="color:#0e1a2b;">${escapeHtml(ctx.brand)} website</strong><br>
<span style="font-size:12px;color:#5d6776;">Sent automatically from the enquiry form at <a href="${escapeHtml(ctx.siteUrl)}" style="color:#0f5a4f;">${escapeHtml(host)}</a>. Reply to this email to respond to ${escapeHtml(name)} directly.</span>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const text = [
    `${title} — ${ctx.brand}`,
    "",
    ...keys.map((key) => `${fieldLabel(key)}: ${formatValue(data[key])}`),
    `Submitted: ${formatSubmittedAt(input.submittedAt)}`,
    "",
    ...(replyHref ? [`Reply by email: ${email}`] : []),
    ...(whatsappHref ? [`Chat on WhatsApp: ${whatsappHref}`] : []),
    ...(callHref ? [`Call: ${callHref.replace("tel:", "")}`] : []),
    "",
    "Regards,",
    `${ctx.brand} website`,
    `Sent automatically from the enquiry form at ${host}.`,
  ].join("\n");

  return { subject: `${title} from ${name} — ${ctx.brand}`, html, text, replyTo: email };
}
