import Link from "next/link";
import { Building2, ClipboardList, UserRound } from "lucide-react";
import { describeActivity } from "@/lib/portal/activity";
import type { ActivityLog } from "@/lib/portal/domain";
import { dayKey, dayLabel, formatTime } from "@/lib/portal/format";

const icons = { PROFILE: UserRound, PROPERTY: Building2, SERVICE_REQUEST: ClipboardList } as const;

/**
 * Activity entries grouped by day, in the customer's time zone. Day headings
 * are h3 inside a titled panel; pass headingLevel="h2" directly under a page h1.
 */
export function ActivityFeed({
  entries,
  timezone,
  grouped = true,
  headingLevel: DayHeading = "h3",
}: {
  entries: ActivityLog[];
  timezone: string | null;
  grouped?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const groups: { key: string; label: string; items: ActivityLog[] }[] = [];
  for (const entry of entries) {
    const key = grouped ? dayKey(entry.created_at, timezone) : "all";
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, label: grouped ? dayLabel(entry.created_at, timezone) : "", items: [] };
      groups.push(group);
    }
    group.items.push(entry);
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label || undefined}>
          {grouped ? <DayHeading className="text-label mb-3 text-ink-subtle">{group.label}</DayHeading> : null}
          <ol className="space-y-1">
            {group.items.map((entry) => {
              const line = describeActivity(entry);
              const Icon = icons[entry.entity_type] ?? ClipboardList;
              const content = (
                <>
                  <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-subtle text-ink-muted">
                    <Icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{line.title}</span>
                    {line.detail ? <span className="block truncate text-sm text-ink-muted">{line.detail}</span> : null}
                  </span>
                  <time dateTime={entry.created_at} className="shrink-0 pt-0.5 text-xs text-ink-subtle tabular-nums">
                    {grouped ? formatTime(entry.created_at, timezone) : dayLabel(entry.created_at, timezone)}
                  </time>
                </>
              );
              return (
                <li key={entry.id}>
                  {line.href ? (
                    <Link href={line.href} className="-mx-2 flex items-start gap-3 rounded-control px-2 py-2 hover:bg-subtle/70">
                      {content}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 py-2">{content}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
