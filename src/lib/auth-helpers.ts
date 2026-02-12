import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function getAuthUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user: session.user as { id: string; email: string; name: string }, error: null };
}
