import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

function calcTotal(lineItems: { qty: number; unitCost: number; laborHours: number; laborRate: number; markupPct: number }[]) {
  let total = 0;
  for (const item of lineItems) {
    const materials = item.qty * item.unitCost;
    const labor = item.laborHours * item.laborRate;
    const subtotal = materials + labor;
    total += subtotal + subtotal * (item.markupPct / 100);
  }
  return total;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  changes_requested: "bg-yellow-100 text-yellow-700",
};

export default async function EstimatesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const estimates = await prisma.estimate.findMany({
    where: { userId: session.user.id },
    include: { lineItems: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Estimates</h1>
        <Link
          href="/estimates/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
        >
          + New Estimate
        </Link>
      </div>

      {estimates.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No estimates yet.</p>
          <Link href="/estimates/new" className="text-blue-600 hover:underline mt-2 inline-block">
            Create your first estimate
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {estimates.map((est) => {
            const total = calcTotal(est.lineItems);
            return (
              <Link
                key={est.id}
                href={`/estimates/${est.id}`}
                className="bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all block"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold text-gray-900">{est.jobName}</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[est.status] || statusColors.draft}`}>
                        {est.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-gray-600">{est.customerName}</p>
                    {est.address && (
                      <p className="text-gray-400 text-sm">{est.address}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-700">
                      ${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {est.lineItems.length} item{est.lineItems.length !== 1 ? "s" : ""}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {new Date(est.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
