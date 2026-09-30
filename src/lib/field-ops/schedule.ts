import { zoneOf } from "@/lib/portal/format";

/*
 * Visit times. Field work happens in Tamil Nadu, so the team enters and reads
 * schedules in India time (Asia/Kolkata). India has one offset all year,
 * UTC+05:30, with no daylight saving, so a date and a clock time there map to
 * exactly one instant. Instants are stored as timestamptz (UTC). Customers
 * abroad see the India time and, beside it, their own local time.
 */

export const FIELD_TIMEZONE = "Asia/Kolkata";
const INDIA_OFFSET = "+05:30";

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** A real calendar date written YYYY-MM-DD. */
export function isCalendarDate(value: string): boolean {
  const m = DATE.exec(value);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** A 24-hour clock time written HH:MM. */
export const isClockTime = (value: string) => TIME.test(value);

/** A date and a clock time in India, as an instant. */
export function indiaInstant(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${INDIA_OFFSET}`);
}

/** Today's date in India, YYYY-MM-DD. */
export function indiaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FIELD_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** The India date and clock time of an instant, for pre-filling a form. */
export function indiaParts(value: string | Date): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: FIELD_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(value))
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

const dayFormat = (timezone: string) => new Intl.DateTimeFormat("en-GB", { timeZone: timezone, weekday: "short", day: "numeric", month: "short", year: "numeric" });
const clockFormat = (timezone: string) => new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** "Tue 6 Oct 2026, 10:00–12:00" in the given zone (both days are named if the window crosses midnight there). */
export function formatVisitWindow(start: string, end: string | null, timezone: string = FIELD_TIMEZONE): string {
  const zone = zoneOf(timezone);
  const day = dayFormat(zone);
  const clock = clockFormat(zone);
  const from = `${day.format(new Date(start))}, ${clock.format(new Date(start))}`;
  if (!end) return from;
  if (day.format(new Date(end)) === day.format(new Date(start))) return `${from}–${clock.format(new Date(end))}`;
  return `${from} – ${day.format(new Date(end))}, ${clock.format(new Date(end))}`;
}

/** "Dubai" for Asia/Dubai, "New York" for America/New_York. */
export const zoneCity = (timezone: string) => (zoneOf(timezone).split("/").pop() ?? timezone).replace(/_/g, " ");

/** Whether a zone keeps the same clock as India at this instant. */
function sameClockAsIndia(timezone: string, at: string): boolean {
  const zone = zoneOf(timezone);
  if (zone === FIELD_TIMEZONE) return true;
  const stamp = (tz: string) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, dateStyle: "short", timeStyle: "short", hourCycle: "h23" }).format(new Date(at));
  return stamp(zone) === stamp(FIELD_TIMEZONE);
}

/** The visit time recorded on a "visit scheduled / rescheduled" timeline event, or null. */
export function visitWindowOf(metadata: unknown): { start: string; end: string | null } | null {
  const m = (metadata ?? {}) as { scheduled_start?: unknown; scheduled_end?: unknown };
  const valid = (v: unknown): v is string => typeof v === "string" && !Number.isNaN(new Date(v).getTime());
  if (!valid(m.scheduled_start)) return null;
  return { start: m.scheduled_start, end: valid(m.scheduled_end) ? m.scheduled_end : null };
}

/**
 * A visit time for a customer: always in India time (where the visit
 * happens), plus the same window in their own zone when that differs.
 */
export function describeVisitTime(start: string, end: string | null, customerTimezone: string | null | undefined): { india: string; local: string | null } {
  const india = `${formatVisitWindow(start, end, FIELD_TIMEZONE)} India time`;
  if (!customerTimezone || sameClockAsIndia(customerTimezone, start)) return { india, local: null };
  return { india, local: `${formatVisitWindow(start, end, customerTimezone)} in ${zoneCity(customerTimezone)}` };
}
