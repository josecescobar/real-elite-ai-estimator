import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import ClientForm from "../ClientForm";
import { estimateTotal } from "@/lib/estimate-calculations";
import { computeInsights } from "@/lib/insights";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  changes_requested: "bg-yellow-100 text-yellow-700",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: { estimates: { include: { lineItems: true }, orderBy: { createdAt: "desc" } } },
  });

  if (!client || client.userId !== session.user.id) notFound();

  const insights = client.estimates.length ? computeInsights(client.estimates, new Date()) : null;
  const outstanding = insights
    ? insights.byStatus.sent.count + insights.byStatus.changes_requested.count
    : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Client</h1>
      <ClientForm initial={client} />

      {insights && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Client performance</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Estimates</p>
              <p className="text-2xl font-bold text-gray-900">{insights.total.count}</p>
              <p className="text-xs text-gray-400">${fmt(insights.total.value)} total</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Revenue won</p>
              <p className="text-2xl font-bold text-green-700">${fmt(insights.wonValue)}</p>
              <p className="text-xs text-gray-400">{insights.byStatus.approved.count} approved</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Open pipeline</p>
              <p className="text-2xl font-bold text-blue-700">${fmt(insights.openPipelineValue)}</p>
              <p className="text-xs text-gray-400">{outstanding} outstanding</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Win rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {insights.winRate == null ? "—" : `${Math.round(insights.winRate * 100)}%`}
              </p>
              <p className="text-xs text-gray-400">approved ÷ sent</p>
            </div>
          </div>
        </div>
      )}

      {client.estimates.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Linked Estimates</h2>
          <div className="grid gap-3">
            {client.estimates.map((est) => {
              const total = estimateTotal(est.lineItems);
              return (
                <Link
                  key={est.id}
                  href={`/estimates/${est.id}`}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all block"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{est.jobName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[est.status] || statusColors.draft}`}>
                          {est.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs">
                        {new Date(est.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-green-700">
                      ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
