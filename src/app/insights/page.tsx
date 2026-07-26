import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { computeInsights, needsFollowUp, type KnownStatus } from "@/lib/insights";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmt0(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

const statusMeta: Record<KnownStatus, { label: string; bar: string }> = {
  draft: { label: "Draft", bar: "bg-gray-400" },
  sent: { label: "Sent", bar: "bg-blue-500" },
  approved: { label: "Approved", bar: "bg-green-500" },
  changes_requested: { label: "Changes requested", bar: "bg-yellow-500" },
};

export default async function InsightsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const estimates = await prisma.estimate.findMany({
    where: { userId: session.user.id },
    include: { lineItems: true },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const insights = computeInsights(estimates, now);
  const followUps = needsFollowUp(estimates, now, 7);

  const winRatePct = insights.winRate === null ? "—" : `${Math.round(insights.winRate * 100)}%`;
  const maxTrend = Math.max(1, ...insights.monthlyTrend.map((m) => m.value));
  const maxStatus = Math.max(1, ...(Object.keys(statusMeta) as KnownStatus[]).map((s) => insights.byStatus[s].value));
  const dayMs = 24 * 60 * 60 * 1000;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Insights</h1>

      {insights.total.count === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No data yet — create an estimate to see your numbers.</p>
          <Link href="/estimates/new" className="text-blue-600 hover:underline mt-2 inline-block">
            Create your first estimate
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi label="Revenue won" value={`$${fmt(insights.wonValue)}`} sub={`${insights.byStatus.approved.count} approved`} color="text-green-700" />
            <Kpi label="Win rate" value={winRatePct} sub="approved of sent" color="text-blue-700" />
            <Kpi label="Open pipeline" value={`$${fmt(insights.openPipelineValue)}`} sub="awaiting customer" color="text-indigo-700" />
            <Kpi label="Avg estimate" value={`$${fmt(insights.avgEstimateValue)}`} sub={`${insights.total.count} total`} color="text-gray-800" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly trend */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-lg font-semibold mb-1">Estimate activity</h2>
              <p className="text-xs text-gray-400 mb-4">Total value of estimates created, last 6 months</p>
              <div className="flex items-end gap-3" style={{ height: 160 }}>
                {insights.monthlyTrend.map((m) => (
                  <div key={m.key} className="flex-1 flex flex-col items-center justify-end">
                    <span className="text-[10px] text-gray-500 mb-1 h-3">{m.value > 0 ? `$${fmt0(m.value)}` : ""}</span>
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: Math.max(m.value > 0 ? 4 : 0, Math.round((m.value / maxTrend) * 110)) }}
                      title={`${m.label}: ${m.count} estimate${m.count !== 1 ? "s" : ""}, $${fmt(m.value)}`}
                    />
                    <span className="text-xs text-gray-500 mt-1">{m.label.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="text-lg font-semibold mb-4">Pipeline by status</h2>
              <div className="space-y-3">
                {(Object.keys(statusMeta) as KnownStatus[]).map((s) => {
                  const b = insights.byStatus[s];
                  return (
                    <div key={s} className="flex items-center gap-3 text-sm">
                      <span className="w-32 text-gray-600">{statusMeta[s].label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full ${statusMeta[s].bar}`} style={{ width: `${(b.value / maxStatus) * 100}%` }} />
                      </div>
                      <span className="w-10 text-right text-gray-500">{b.count}</span>
                      <span className="w-24 text-right font-medium text-gray-800">${fmt0(b.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Needs follow-up */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="text-lg font-semibold mb-1">Needs follow-up</h2>
            <p className="text-xs text-gray-400 mb-4">Sent estimates with no customer response in 7+ days</p>
            {followUps.length === 0 ? (
              <p className="text-gray-500 text-sm">Nothing waiting — you&apos;re all caught up. 🎉</p>
            ) : (
              <div className="grid gap-2">
                {followUps.map((est) => {
                  const days = Math.floor((now.getTime() - est.createdAt.getTime()) / dayMs);
                  return (
                    <Link
                      key={est.id}
                      href={`/estimates/${est.id}`}
                      className="flex items-center justify-between bg-gray-50 hover:bg-yellow-50 border border-gray-100 hover:border-yellow-300 rounded-lg p-3 transition-colors"
                    >
                      <div>
                        <span className="font-medium text-gray-900">{est.jobName || "Untitled"}</span>
                        <span className="text-gray-500 text-sm"> · {est.customerName || "No customer"}</span>
                      </div>
                      <span className="text-xs font-medium text-yellow-700 whitespace-nowrap">{days} days waiting</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
