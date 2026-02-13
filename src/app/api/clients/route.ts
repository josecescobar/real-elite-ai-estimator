import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { user, error } = await getAuthUser();
  if (error) return error;

  const clients = await prisma.client.findMany({
    where: { userId: user!.id },
    include: { estimates: { include: { lineItems: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser();
  if (error) return error;

  const body = await req.json();
  const { name, email, phone, company, address, notes } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: {
      name: name.trim(),
      email: email || "",
      phone: phone || "",
      company: company || "",
      address: address || "",
      notes: notes || "",
      userId: user!.id,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
