import { getAuthUser } from "@/lib/auth-helpers";
import { callProvider } from "@/lib/ai-providers";
import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter: 15 requests/min per user
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT = 15;
const WINDOW_MS = 60_000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  rateLimitMap.set(userId, recent);
  return true;
}

export async function POST(req: NextRequest) {
  const { user, error } = await getAuthUser();
  if (error) return error;

  if (!checkRateLimit(user!.id)) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });
  }

  const body = await req.json();
  const { description } = body;

  if (!description?.trim()) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  const prompt = `You are helping a contractor write a better project description for a construction/home improvement estimate. Evaluate the following description and return a JSON object with:
- "score": a number from 0 to 10 rating how complete and detailed the description is for generating an accurate cost estimate
- "tips": an array of 2-4 short, specific tips to improve the description (each tip should be a single sentence)

Focus on: specificity of measurements, materials mentioned, scope clarity, and whether it has enough detail for accurate pricing.

Description: "${description.trim()}"

Return ONLY valid JSON, no other text.`;

  try {
    const result = await callProvider("", prompt);
    if (!result.content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = result.content;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1];

    const parsed = JSON.parse(jsonStr.trim());
    return NextResponse.json({
      score: Math.min(10, Math.max(0, Number(parsed.score) || 0)),
      tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 4) : [],
    });
  } catch {
    return NextResponse.json({ error: "Failed to analyze description" }, { status: 500 });
  }
}
