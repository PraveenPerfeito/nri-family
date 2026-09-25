"use client";

import { useEffect } from "react";
import { isAnalyticsEvent } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

/**
 * One delegated listener for the whole site, so server-rendered links and
 * FAQ items can be tracked declaratively:
 *
 *   <a data-track="service_cta_clicked" data-track-service="property-care">
 *   <details data-track="faq_opened" data-track-question="...">
 */
function propsFrom(el: HTMLElement) {
  const props: Record<string, string> = {};
  for (const [key, value] of Object.entries(el.dataset)) {
    if (key.startsWith("track") && key !== "track" && value) {
      const name = key.slice(5).replace(/^[A-Z]/, (c) => c.toLowerCase());
      props[name] = value;
    }
  }
  return props;
}

export function AnalyticsListener() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as Element | null)?.closest<HTMLElement>("a[data-track],button[data-track]");
      if (!el || !isAnalyticsEvent(el.dataset.track)) return;
      track(el.dataset.track, { ...propsFrom(el), href: el.getAttribute("href") ?? undefined });
    }
    // `toggle` does not bubble, so listen in the capture phase.
    function onToggle(e: Event) {
      const el = e.target as HTMLElement;
      if (!(el instanceof HTMLDetailsElement) || !el.open || !isAnalyticsEvent(el.dataset.track)) return;
      track(el.dataset.track, propsFrom(el));
    }
    document.addEventListener("click", onClick);
    document.addEventListener("toggle", onToggle, true);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("toggle", onToggle, true);
    };
  }, []);

  return null;
}
