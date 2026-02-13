import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { user, error } = await getAuthUser();
  if (error) return error;

  const estimates = await prisma.estimate.findMany({
    where: { userId: user!.id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(estimates);
}

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser();
  if (error) return error;

  const body = await req.json();
  const { customerName, jobName, address, notes, description, clientId, projectId, lineItems } = body;

  const estimate = await prisma.estimate.create({
    data: {
      customerName: customerName || "",
      jobName: jobName || "",
      address: address || "",
      notes: notes || "",
      description: description || "",
      clientId: clientId || null,
      projectId: projectId || null,
      userId: user!.id,
      lineItems: {
        create: (lineItems || []).map(
          (
            item: {
              name: string;
              unit: string;
              qty: number;
              unitCost: number;
              laborHours: number;
              laborRate: number;
              markupPct: number;
            },
            i: number
          ) => ({
            name: item.name || "",
            unit: item.unit || "ea",
            qty: item.qty || 0,
            unitCost: item.unitCost || 0,
            laborHours: item.laborHours || 0,
            laborRate: item.laborRate || 0,
            markupPct: item.markupPct || 0,
            sortOrder: i,
          })
        ),
      },
    },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json(estimate, { status: 201 });
}
