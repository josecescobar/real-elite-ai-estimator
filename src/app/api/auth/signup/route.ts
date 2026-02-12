import { prisma } from "@/lib/prisma";
import { hashSync } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { email, name, password } = await req.json();

  if (!email || !name || !password) {
    return NextResponse.json({ error: "Email, name, and password are required" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashSync(password, 10),
    },
  });

  return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
}
