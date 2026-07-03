import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/portal-shell";
import { Card } from "@/components/ui";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminActivityPage() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader
        title="Журнал активности"
        text="Последние 200 действий пользователей"
      />
      <Card>
        <ul className="divide-y divide-neutral-50">
          {logs.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-neutral-400">
              Журнал пуст
            </li>
          )}
          {logs.map((log) => (
            <li key={log.id} className="flex items-baseline gap-3 px-4 py-2.5">
              <span className="w-32 shrink-0 text-xs text-neutral-400">
                {formatDateTime(log.createdAt)}
              </span>
              <span className="shrink-0 text-sm font-medium text-neutral-800">
                @{log.username}
              </span>
              <span className="text-sm text-neutral-600">
                {log.action}
                {log.details && (
                  <span className="text-neutral-400"> — {log.details}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
