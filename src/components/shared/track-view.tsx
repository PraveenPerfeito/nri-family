"use client";

import { useEffect } from "react";
import type { AnalyticsEvent } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";

/** Fires a single analytics event when a page mounts (e.g. `service_viewed`). */
export function TrackView({ event, service }: { event: AnalyticsEvent; service?: string }) {
  useEffect(() => {
    track(event, { service });
  }, [event, service]);
  return null;
}
