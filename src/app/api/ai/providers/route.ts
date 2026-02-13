import { getAuthUser } from "@/lib/auth-helpers";
import { getAvailableProviders } from "@/lib/ai-providers";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await getAuthUser();
  if (error) return error;

  const providers = getAvailableProviders();

  if (providers.length === 0) {
    return NextResponse.json(
      { success: false, error: "No AI providers configured" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, providers });
}
