import Link from "next/link";

export interface FollowUpItem {
  id: string;
  jobName: string;
  customerName: string;
  total: number;
  daysAgo: number;
}

export interface ResponseItem {
  id: string;
  status: string;
  message: string;
  createdAt: string; // ISO
  estimateId: string;
  jobName: string;
  customerName: string;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const statusColors: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  changes_requested: "bg-yellow-100 text-yellow-700",
  sent: "bg-blue-100 text-blue-700",
  draft: "bg-gray-100 text-gray-700",
};

/**
 * Owner "action center" on the dashboard: estimates that need a follow-up nudge
 * and the latest customer responses. Renders nothing when there's no activity,
 * so a brand-new account sees the plain dashboard.
 */
export default function DashboardActivity({
  followUps,
  recentResponses,
}: {
  followUps: FollowUpItem[];
  recentResponses: ResponseItem[];
}) {
  if (followUps.length === 0 && recentResponses.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 mb-8">
      {followUps.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Needs follow-up</h2>
            <span className="text-xs text-gray-400">sent &gt; 7 days ago</span>
          </div>
          <ul className="space-y-2">
            {followUps.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/estimates/${f.id}`}
                  className="flex items-center justify-between gap-3 group -mx-2 px-2 py-1 rounded hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate group-hover:text-blue-700">{f.jobName}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {f.customerName} · sent {f.daysAgo} day{f.daysAgo !== 1 ? "s" : ""} ago
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-green-700 shrink-0">${fmt(f.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recentResponses.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent customer activity</h2>
          <ul className="space-y-3">
            {recentResponses.map((r) => (
              <li key={r.id}>
                <Link href={`/estimates/${r.estimateId}`} className="block group -mx-2 px-2 py-1 rounded hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[r.status] || statusColors.draft}`}
                    >
                      {r.status.replace("_", " ")}
                    </span>
                    <span className="font-medium text-gray-900 truncate group-hover:text-blue-700">{r.jobName}</span>
                  </div>
                  {r.message && <p className="text-xs text-gray-600 mt-1 truncate">&ldquo;{r.message}&rdquo;</p>}
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {r.customerName} · {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
