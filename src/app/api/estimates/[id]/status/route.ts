import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";
import { isValidStatus } from "@/lib/estimate-status";

// Owner-only status change (e.g. record a phone approval). Only the status
// column is touched, so it's independent of the full estimate save.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthUser();
  if (authError) return authError;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const status = body?.status;

  if (!isValidStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const estimate = await prisma.estimate.findUnique({ where: { id }, select: { userId: true } });
  if (!estimate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (estimate.userId !== user!.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.estimate.update({
    where: { id },
    data: { status },
    select: { id: true, status: true },
  });

  return NextResponse.json(updated);
}
