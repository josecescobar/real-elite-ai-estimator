import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { status, message, shareToken } = await req.json();

  if (!status || !["approved", "changes_requested"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  if (!shareToken) {
    return NextResponse.json({ error: "Share token required" }, { status: 400 });
  }

  const estimate = await prisma.estimate.findUnique({ where: { id } });

  if (!estimate || estimate.shareToken !== shareToken) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Create the customer response
  await prisma.customerResponse.create({
    data: {
      estimateId: id,
      status,
      message: message || "",
    },
  });

  // Update the estimate status
  await prisma.estimate.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ ok: true });
}
