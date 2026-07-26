import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user: session.user as { id: string; email: string; name: string }, error: null };
}

/**
 * Verify that any clientId/projectId being linked to an estimate actually
 * belongs to the requesting user. Returns an error response to send back, or
 * null when the relations are valid (or absent).
 */
export async function validateRelationOwnership(
  userId: string,
  clientId: unknown,
  projectId: unknown
): Promise<NextResponse | null> {
  if (clientId) {
    const client = await prisma.client.findUnique({
      where: { id: String(clientId) },
      select: { userId: true },
    });
    if (!client || client.userId !== userId) {
      return NextResponse.json({ error: "Invalid client" }, { status: 400 });
    }
  }
  if (projectId) {
    const project = await prisma.project.findUnique({
      where: { id: String(projectId) },
      select: { userId: true },
    });
    if (!project || project.userId !== userId) {
      return NextResponse.json({ error: "Invalid project" }, { status: 400 });
    }
  }
  return null;
}
