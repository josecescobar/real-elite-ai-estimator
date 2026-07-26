import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { estimateTotal } from "@/lib/estimate-calculations";
import EstimatesList, { type EstimateRow } from "./EstimatesList";

export default async function EstimatesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const estimates = await prisma.estimate.findMany({
    where: { userId: session.user.id },
    include: { lineItems: true },
    orderBy: { createdAt: "desc" },
  });

  const rows: EstimateRow[] = estimates.map((est) => ({
    id: est.id,
    jobName: est.jobName,
    customerName: est.customerName,
    address: est.address,
    status: est.status,
    total: estimateTotal(est.lineItems),
    itemCount: est.lineItems.length,
    createdAt: est.createdAt.toISOString(),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Estimates</h1>
        <div className="flex items-center gap-2">
          {rows.length > 0 && (
            // File-download endpoint, not a page — a plain anchor is correct here.
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a
              href="/api/estimates/export"
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium"
            >
              Export CSV
            </a>
          )}
          <Link
            href="/estimates/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            + New Estimate
          </Link>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No estimates yet.</p>
          <Link href="/estimates/new" className="text-blue-600 hover:underline mt-2 inline-block">
            Create your first estimate
          </Link>
        </div>
      ) : (
        <EstimatesList estimates={rows} />
      )}
    </div>
  );
}
