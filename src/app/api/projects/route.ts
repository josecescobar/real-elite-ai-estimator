import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { user, error } = await getAuthUser();
  if (error) return error;

  const projects = await prisma.project.findMany({
    where: { userId: user!.id },
    include: { estimates: { include: { lineItems: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser();
  if (error) return error;

  const body = await req.json();
  const { name, description, address, status } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description || "",
      address: address || "",
      status: status || "active",
      userId: user!.id,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
