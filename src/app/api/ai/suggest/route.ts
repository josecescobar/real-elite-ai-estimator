import { getAuthUser } from "@/lib/auth-helpers";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export async function POST(req: NextRequest) {
  const { error: authError } = await getAuthUser();
  if (authError) return authError;

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
  }

  const { jobType, description } = await req.json();

  if (!description) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  const prompt = `You are a professional construction estimator. Given a job description, generate a detailed list of line items for a cost estimate.

${jobType ? `Job Type: ${jobType}` : ""}
Job Description: ${description}

Return a JSON array of line items. Each item must have these fields:
- name: string (item description)
- unit: string (one of: "ea", "sqft", "lnft", "job", "hr", "ton", "gal")
- qty: number (estimated quantity)
- unitCost: number (material cost per unit in USD)
- laborHours: number (estimated labor hours)
- laborRate: number (hourly labor rate in USD)
- markupPct: number (markup percentage, typically 10-20)

Be realistic with pricing. Include all major cost categories (materials, labor, demolition if needed, permits, etc.). Return 4-8 line items.

Return ONLY a valid JSON array, no markdown, no explanation.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 8000,
    });

    let content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Extract JSON array from response (handles markdown fences, thinking text, etc.)
    const arrayMatch = content.match(/\[[\s\S]*\]/);
    if (!arrayMatch) {
      console.error("AI response has no JSON array:", content);
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
    }

    const lineItems = JSON.parse(arrayMatch[0]);

    if (!Array.isArray(lineItems)) {
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
    }

    return NextResponse.json({ lineItems });
  } catch (err) {
    console.error("AI suggest error:", err);
    return NextResponse.json(
      { error: "Failed to generate suggestions" },
      { status: 500 }
    );
  }
}
