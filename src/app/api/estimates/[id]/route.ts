import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

async function getOwnedEstimate(id: string, userId: string) {
  const estimate = await prisma.estimate.findUnique({
    where: { id },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!estimate) return { estimate: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (estimate.userId !== userId) return { estimate: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { estimate, error: null };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthUser();
  if (authError) return authError;

  const { id } = await params;
  const { estimate, error } = await getOwnedEstimate(id, user!.id);
  if (error) return error;

  return NextResponse.json(estimate);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthUser();
  if (authError) return authError;

  const { id } = await params;
  const { error } = await getOwnedEstimate(id, user!.id);
  if (error) return error;

  const body = await req.json();
  const { customerName, jobName, address, notes, description, clientId, projectId, lineItems } = body;

  await prisma.lineItem.deleteMany({ where: { estimateId: id } });

  const estimate = await prisma.estimate.update({
    where: { id },
    data: {
      customerName,
      jobName,
      address: address || "",
      notes: notes || "",
      description: description || "",
      clientId: clientId || null,
      projectId: projectId || null,
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

  return NextResponse.json(estimate);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthUser();
  if (authError) return authError;

  const { id } = await params;
  const { error } = await getOwnedEstimate(id, user!.id);
  if (error) return error;

  await prisma.estimate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
