import { DEFAULT_TIMEZONE, isTimeZone } from "./places";

/*
 * Dates in the portal are shown in the customer's own time zone (they live
 * abroad), falling back to India time when none is set.
 */

export const zoneOf = (timezone: string | null | undefined) => (timezone && isTimeZone(timezone) ? timezone : DEFAULT_TIMEZONE);

export function formatDate(value: string | Date, timezone?: string | null): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: zoneOf(timezone) }).format(new Date(value));
}

export function formatTime(value: string | Date, timezone?: string | null): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: zoneOf(timezone) }).format(new Date(value));
}

export function formatDateTime(value: string | Date, timezone?: string | null): string {
  return `${formatDate(value, timezone)}, ${formatTime(value, timezone)}`;
}

/** Calendar day key (YYYY-MM-DD) in the given zone, for grouping. */
export function dayKey(value: string | Date, timezone?: string | null): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: zoneOf(timezone) }).format(new Date(value));
}

/** "Today", "Yesterday" or a date, relative to `now` in the customer's zone. */
export function dayLabel(value: string | Date, timezone?: string | null, now: Date = new Date()): string {
  const key = dayKey(value, timezone);
  if (key === dayKey(now, timezone)) return "Today";
  if (key === dayKey(new Date(now.getTime() - 86_400_000), timezone)) return "Yesterday";
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: zoneOf(timezone) }).format(new Date(value));
}

/** "Good morning" / "Good afternoon" / "Good evening" where the customer is. */
export function greeting(timezone?: string | null, now: Date = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: zoneOf(timezone) }).format(now)) % 24;
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] ?? fullName;

export const initials = (fullName: string) =>
  fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";
