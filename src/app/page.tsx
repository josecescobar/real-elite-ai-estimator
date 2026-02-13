import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Dashboard from "./Dashboard";

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

export default async function Home() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Real Elite AI Estimator
        </h1>
        <p className="text-lg text-gray-600 mb-8 max-w-md">
          Create professional construction estimates with materials, labor, and markup calculations.
        </p>
        <div className="flex gap-4">
          <Link
            href="/estimates/new"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold text-lg"
          >
            Create New Estimate
          </Link>
          <Link
            href="/estimates"
            className="bg-white text-gray-700 px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 font-semibold text-lg"
          >
            View Estimates
          </Link>
        </div>
      </div>
    );
  }

  const estimates = await prisma.estimate.findMany({
    where: { userId: session.user.id },
    include: { lineItems: true },
    orderBy: { createdAt: "desc" },
  });

  const summaries = estimates.map((est) => ({
    id: est.id,
    jobName: est.jobName,
    customerName: est.customerName,
    status: est.status,
    total: calcTotal(est.lineItems),
    createdAt: est.createdAt.toISOString(),
  }));

  const stats = {
    all: { count: summaries.length, total: summaries.reduce((s, e) => s + e.total, 0) },
    draft: { count: 0, total: 0 },
    sent: { count: 0, total: 0 },
    approved: { count: 0, total: 0 },
  };
  for (const est of summaries) {
    const key = est.status as keyof typeof stats;
    if (key in stats && key !== "all") {
      stats[key].count++;
      stats[key].total += est.total;
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <Dashboard estimates={summaries} stats={stats} />
    </div>
  );
}
