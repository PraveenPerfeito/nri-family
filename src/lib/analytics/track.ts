import { sanitizeProps, type AnalyticsEvent, type AnalyticsProps } from "./events";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

/**
 * Provider-agnostic tracking. No analytics vendor is loaded in Phase 1.
 * Events are pushed to `window.dataLayer` (so a consent-aware tag manager or
 * a privacy-friendly tool can be attached later) and echoed in development.
 */
export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  if (typeof window === "undefined") return;
  const payload = { event, ...sanitizeProps(props), path: window.location.pathname };
  (window.dataLayer ??= []).push(payload);
  if (process.env.NODE_ENV === "development") {
    console.debug("[analytics]", payload);
  }
}
