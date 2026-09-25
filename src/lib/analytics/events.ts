/**
 * Analytics event catalogue. Events carry only non-personal context
 * (which CTA, which page, which service) — never form values, names,
 * emails, phone numbers or free text.
 */
export const analyticsEvents = [
  "hero_get_started_clicked",
  "hero_explore_services_clicked",
  "service_viewed",
  "service_cta_clicked",
  "property_cta_clicked",
  "cta_clicked",
  "contact_submitted",
  "get_started_submitted",
  "login_clicked",
  "register_clicked",
  "faq_opened",
] as const;

export type AnalyticsEvent = (typeof analyticsEvents)[number];

export type AnalyticsProps = Record<string, string | number | boolean | undefined>;

export function isAnalyticsEvent(value: unknown): value is AnalyticsEvent {
  return typeof value === "string" && (analyticsEvents as readonly string[]).includes(value);
}

/** Only these keys may be sent. Anything else is dropped. */
const ALLOWED_PROP_KEYS = new Set(["location", "label", "service", "href", "question", "path", "topics_count", "category"]);

export function sanitizeProps(props: AnalyticsProps = {}): AnalyticsProps {
  const out: AnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (!ALLOWED_PROP_KEYS.has(key) || value === undefined) continue;
    out[key] = typeof value === "string" ? value.slice(0, 120) : value;
  }
  return out;
}
