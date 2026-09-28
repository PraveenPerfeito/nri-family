import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { EmptyState, PageHeader, Panel } from "@/components/portal/ui/primitives";
import { Button } from "@/components/ui/button";
import { portalRoutes } from "@/config/routes";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/portal/actions/account";
import { listNotifications } from "@/lib/portal/data";
import type { Notification } from "@/lib/portal/domain";
import { formatDateTime } from "@/lib/portal/format";
import { requireCustomer } from "@/lib/portal/session";

export const metadata = { title: "Notifications" };

function NotificationItem({ notification, timezone }: { notification: Notification; timezone: string | null }) {
  const unread = notification.read_at === null;
  const href = notification.entity_type === "SERVICE_REQUEST" && notification.entity_id ? portalRoutes.request(notification.entity_id) : undefined;
  const when = formatDateTime(notification.created_at, timezone);
  return (
    <li className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
      <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${unread ? "bg-brand" : "bg-line-strong"}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold break-words text-ink">
          {unread ? <span className="sr-only">Unread: </span> : null}
          {notification.title}
        </p>
        <p className="mt-0.5 text-sm break-words text-ink-muted">{notification.message}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 text-xs text-ink-subtle">
          <time dateTime={notification.created_at}>{when}</time>
          {href ? (
            <Link href={href} className="inline-flex min-h-6 items-center font-medium text-brand hover:text-brand-strong">
              View request
            </Link>
          ) : null}
          {unread ? (
            <form action={markNotificationReadAction.bind(null, notification.id)}>
              <button type="submit" className="inline-flex min-h-6 cursor-pointer items-center font-medium text-ink-muted hover:text-ink">
                Mark as read<span className="sr-only">: {notification.title}, {when}</span>
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default async function NotificationsPage() {
  const viewer = await requireCustomer(portalRoutes.notifications);
  const notifications = await listNotifications(viewer);
  const unread = notifications.filter((n) => n.read_at === null);
  const read = notifications.filter((n) => n.read_at !== null);
  const tz = viewer.profile.timezone;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notifications"
        title="Notifications"
        description="Updates about your requests. In-app only for now; email and WhatsApp updates come later."
        actions={
          unread.length > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <Button type="submit" variant="secondary">
                <CheckCheck aria-hidden className="size-4" />
                Mark all as read
              </Button>
            </form>
          ) : null
        }
      />
      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" body="When you request a service, updates about it will appear here." />
      ) : (
        <>
          <Panel title={`Unread · ${unread.length}`} labelledBy="unread-title">
            {unread.length > 0 ? (
              <ul className="divide-y divide-line-subtle">
                {unread.map((n) => (
                  <NotificationItem key={n.id} notification={n} timezone={tz} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">You&apos;re all caught up.</p>
            )}
          </Panel>
          {read.length > 0 ? (
            <Panel title="Read" labelledBy="read-title">
              <ul className="divide-y divide-line-subtle">
                {read.map((n) => (
                  <NotificationItem key={n.id} notification={n} timezone={tz} />
                ))}
              </ul>
            </Panel>
          ) : null}
        </>
      )}
    </div>
  );
}
