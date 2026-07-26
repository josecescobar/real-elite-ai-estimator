import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

// Clone an existing estimate into a fresh draft — handy for repeat jobs and
// revised quotes. Copies details + line items; the copy starts as a draft with
// no share link.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthUser();
  if (authError) return authError;

  const { id } = await params;
  const source = await prisma.estimate.findUnique({
    where: { id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (source.userId !== user!.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const copy = await prisma.estimate.create({
    data: {
      customerName: source.customerName,
      jobName: source.jobName ? `Copy of ${source.jobName}` : "Copy",
      address: source.address,
      notes: source.notes,
      description: source.description,
      status: "draft",
      // shareToken intentionally omitted — the copy has no live share link.
      clientId: source.clientId,
      projectId: source.projectId,
      userId: user!.id,
      lineItems: {
        create: source.lineItems.map((li) => ({
          name: li.name,
          unit: li.unit,
          qty: li.qty,
          unitCost: li.unitCost,
          laborHours: li.laborHours,
          laborRate: li.laborRate,
          markupPct: li.markupPct,
          sortOrder: li.sortOrder,
        })),
      },
    },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(copy, { status: 201 });
}
