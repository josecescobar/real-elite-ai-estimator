import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthUser();
  if (authError) return authError;

  const { id } = await params;
  const estimate = await prisma.estimate.findUnique({ where: { id } });

  if (!estimate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (estimate.userId !== user!.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // If already has a share token, return it
  if (estimate.shareToken) {
    return NextResponse.json({ shareToken: estimate.shareToken });
  }

  const shareToken = crypto.randomBytes(16).toString("hex");

  await prisma.estimate.update({
    where: { id },
    data: {
      shareToken,
      status: estimate.status === "draft" ? "sent" : estimate.status,
    },
  });

  return NextResponse.json({ shareToken });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthUser();
  if (authError) return authError;

  const { id } = await params;
  const estimate = await prisma.estimate.findUnique({ where: { id } });

  if (!estimate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (estimate.userId !== user!.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.estimate.update({
    where: { id },
    data: { shareToken: null },
  });

  return NextResponse.json({ ok: true });
}
