import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

async function getOwnedClient(id: string, userId: string) {
  const client = await prisma.client.findUnique({
    where: { id },
    include: { estimates: { include: { lineItems: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!client) return { client: null, error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (client.userId !== userId) return { client: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { client, error: null };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthUser();
  if (authError) return authError;

  const { id } = await params;
  const { client, error } = await getOwnedClient(id, user!.id);
  if (error) return error;

  return NextResponse.json(client);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthUser();
  if (authError) return authError;

  const { id } = await params;
  const { error } = await getOwnedClient(id, user!.id);
  if (error) return error;

  const body = await req.json();
  const { name, email, phone, company, address, notes } = body;

  const client = await prisma.client.update({
    where: { id },
    data: {
      name: name?.trim() || undefined,
      email: email ?? undefined,
      phone: phone ?? undefined,
      company: company ?? undefined,
      address: address ?? undefined,
      notes: notes ?? undefined,
    },
  });

  return NextResponse.json(client);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getAuthUser();
  if (authError) return authError;

  const { id } = await params;
  const { error } = await getOwnedClient(id, user!.id);
  if (error) return error;

  await prisma.client.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
