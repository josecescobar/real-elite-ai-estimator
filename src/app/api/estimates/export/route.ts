import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { NextResponse } from "next/server";
import { estimatesToCsv } from "@/lib/csv-export";

export async function GET() {
  const { user, error: authError } = await getAuthUser();
  if (authError) return authError;

  const estimates = await prisma.estimate.findMany({
    where: { userId: user!.id },
    include: {
      lineItems: true,
      client: { select: { name: true } },
      project: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const csv = estimatesToCsv(
    estimates.map((e) => ({
      createdAt: e.createdAt,
      jobName: e.jobName,
      customerName: e.customerName,
      address: e.address,
      status: e.status,
      clientName: e.client?.name,
      projectName: e.project?.name,
      lineItems: e.lineItems,
    }))
  );

  // Prepend a UTF-8 BOM so Excel opens the file with the correct encoding.
  const body = "\uFEFF" + csv;
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="estimates-${today}.csv"`,
    },
  });
}
