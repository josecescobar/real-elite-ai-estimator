import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

async function getOwnedProject(id: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: { estimates: { include: { lineItems: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!project) return { project: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (project.userId !== userId) return { project: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { project, error: null };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthUser();
  if (authError) return authError;

  const { id } = await params;
  const { project, error } = await getOwnedProject(id, user!.id);
  if (error) return error;

  return NextResponse.json(project);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthUser();
  if (authError) return authError;

  const { id } = await params;
  const { error } = await getOwnedProject(id, user!.id);
  if (error) return error;

  const body = await req.json();
  const { name, description, address, status } = body;

  const project = await prisma.project.update({
    where: { id },
    data: {
      name: name?.trim() || undefined,
      description: description ?? undefined,
      address: address ?? undefined,
      status: status ?? undefined,
    },
  });

  return NextResponse.json(project);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthUser();
  if (authError) return authError;

  const { id } = await params;
  const { error } = await getOwnedProject(id, user!.id);
  if (error) return error;

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
