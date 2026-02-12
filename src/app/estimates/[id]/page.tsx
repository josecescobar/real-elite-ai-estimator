import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import EstimateForm from "../EstimateForm";

export default async function EditEstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  if (!estimate) {
    notFound();
  }

  if (estimate.userId !== session.user.id) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edit Estimate</h1>
      <EstimateForm
        initial={{
          id: estimate.id,
          customerName: estimate.customerName,
          jobName: estimate.jobName,
          address: estimate.address,
          notes: estimate.notes,
          status: estimate.status,
          shareToken: estimate.shareToken,
          lineItems: estimate.lineItems.map((li) => ({
            name: li.name,
            unit: li.unit,
            qty: li.qty,
            unitCost: li.unitCost,
            laborHours: li.laborHours,
            laborRate: li.laborRate,
            markupPct: li.markupPct,
          })),
        }}
      />
    </div>
  );
}
