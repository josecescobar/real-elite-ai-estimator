import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import CustomerResponseForm from "./CustomerResponseForm";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const estimate = await prisma.estimate.findUnique({
    where: { shareToken: token },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      customerResponses: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!estimate) {
    notFound();
  }

  // Calculate totals
  let totalMaterials = 0;
  let totalLabor = 0;
  let totalMarkup = 0;

  for (const item of estimate.lineItems) {
    const materials = item.qty * item.unitCost;
    const labor = item.laborHours * item.laborRate;
    const subtotal = materials + labor;
    totalMaterials += materials;
    totalLabor += labor;
    totalMarkup += subtotal * (item.markupPct / 100);
  }

  const grandTotal = totalMaterials + totalLabor + totalMarkup;

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    changes_requested: "bg-yellow-100 text-yellow-700",
  };

  const latestResponse = estimate.customerResponses[0];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Estimate</h1>
        <p className="text-gray-500 mt-1">Real Elite AI Estimator</p>
      </div>

      {/* Estimate info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold">{estimate.jobName}</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[estimate.status] || statusColors.draft}`}>
            {estimate.status.replace("_", " ")}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="font-medium text-gray-500">Customer:</span>{" "}
            <span className="text-gray-900">{estimate.customerName}</span>
          </div>
          {estimate.address && (
            <div>
              <span className="font-medium text-gray-500">Address:</span>{" "}
              <span className="text-gray-900">{estimate.address}</span>
            </div>
          )}
          <div>
            <span className="font-medium text-gray-500">Date:</span>{" "}
            <span className="text-gray-900">
              {new Date(estimate.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
        {estimate.notes && (
          <div className="mt-3 text-sm">
            <span className="font-medium text-gray-500">Notes:</span>{" "}
            <span className="text-gray-900">{estimate.notes}</span>
          </div>
        )}
      </div>

      {/* Line items table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Line Items</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500 uppercase text-xs">
              <th className="pb-2 pr-4">Item</th>
              <th className="pb-2 pr-4">Qty</th>
              <th className="pb-2 pr-4">Unit</th>
              <th className="pb-2 pr-4 text-right">Materials</th>
              <th className="pb-2 pr-4 text-right">Labor</th>
              <th className="pb-2 text-right">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {estimate.lineItems.map((item) => {
              const materials = item.qty * item.unitCost;
              const labor = item.laborHours * item.laborRate;
              const subtotal = materials + labor;
              const markup = subtotal * (item.markupPct / 100);
              const lineTotal = subtotal + markup;

              return (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-medium">{item.name}</td>
                  <td className="py-2 pr-4">{item.qty}</td>
                  <td className="py-2 pr-4">{item.unit}</td>
                  <td className="py-2 pr-4 text-right">${fmt(materials)}</td>
                  <td className="py-2 pr-4 text-right">${fmt(labor)}</td>
                  <td className="py-2 text-right font-medium">${fmt(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="max-w-xs ml-auto space-y-2">
          <div className="flex justify-between text-gray-700">
            <span>Materials</span>
            <span>${fmt(totalMaterials)}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Labor</span>
            <span>${fmt(totalLabor)}</span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Markup</span>
            <span>${fmt(totalMarkup)}</span>
          </div>
          <hr />
          <div className="flex justify-between text-xl font-bold text-green-700">
            <span>Total</span>
            <span>${fmt(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Latest response */}
      {latestResponse && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-2">Latest Response</h2>
          <p className="text-sm text-gray-600">
            <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mr-2 ${statusColors[latestResponse.status]}`}>
              {latestResponse.status.replace("_", " ")}
            </span>
            {latestResponse.message && (
              <span className="italic">&quot;{latestResponse.message}&quot;</span>
            )}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(latestResponse.createdAt).toLocaleString()}
          </p>
        </div>
      )}

      {/* Customer response form */}
      {estimate.status !== "approved" && (
        <CustomerResponseForm estimateId={estimate.id} shareToken={token} />
      )}
    </div>
  );
}
