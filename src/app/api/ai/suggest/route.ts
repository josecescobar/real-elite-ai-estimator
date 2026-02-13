import { getAuthUser } from "@/lib/auth-helpers";
import {
  validateAndNormalizeLineItems,
  calculateLineItemTotals,
  type AILineItem,
} from "@/lib/estimate-calculations";
import { callProvider, getAvailableProviders } from "@/lib/ai-providers";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Rate limiter (in-memory, per-user, resets on server restart)
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5; // max requests per window

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------
function buildPrompt(jobType: string | undefined, description: string): string {
  const jobContext = jobType ? `\nJob Type: ${jobType}` : "";
  return `You are a senior U.S. construction cost estimator with 20+ years of field experience.

Your job is to convert a short job description into a professional estimate breakdown.

You MUST return STRICT JSON only.
No markdown.
No commentary.
No explanations.
No backticks.
No text before or after the JSON.

OUTPUT REQUIREMENTS:

Return a JSON array of 4 to 8 line item objects.

Each object MUST contain exactly these fields:

- name (string)
- description (string)
- unit (string: one of "ea","sqft","lnft","job","hr","ton","gal")
- qty (number > 0)
- unitCost (number >= 0)
- laborHours (number >= 0)
- laborRate (number between 45 and 95)
- markupPct (number between 10 and 25)

DO NOT include totalCost.
Totals will be calculated server-side.

PRICING RULES:

- Assume United States residential pricing.
- Use realistic material pricing.
- Use realistic labor hours for scope.
- If dimensions are provided, calculate reasonable quantities.
- Do NOT inflate pricing.
- Do NOT use placeholder values.
- Avoid round numbers when unrealistic (e.g., 1000, 5000).
- Prefer practical field logic (waste factor, hardware, fasteners).

STRUCTURE RULES:

- Return valid JSON.
- No trailing commas.
- Use double quotes only.
- Ensure all numbers are actual numbers (not strings).

If the job description is vague, make reasonable professional assumptions.
${jobContext}
JOB DESCRIPTION:
"${description}"`;
}

// ---------------------------------------------------------------------------
// Parse + validate AI response
// ---------------------------------------------------------------------------
function parseAIResponse(content: string): { items: AILineItem[] | null; error: string | null } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Fallback: extract JSON array from surrounding text
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) {
      return { items: null, error: "AI response contains no JSON array" };
    }
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return { items: null, error: "AI response contains malformed JSON" };
    }
  }

  return validateAndNormalizeLineItems(parsed);
}

// ---------------------------------------------------------------------------
// Generate with retry (one automatic retry on validation failure)
// ---------------------------------------------------------------------------
async function generateLineItems(
  providerId: string,
  jobType: string | undefined,
  description: string
): Promise<{ items: AILineItem[] | null; error: string | null; provider: string }> {
  const prompt = buildPrompt(jobType, description);

  let usedProvider = providerId;

  for (let attempt = 0; attempt < 2; attempt++) {
    const { content, provider } = await callProvider(providerId, prompt);
    usedProvider = provider;

    if (!content) {
      if (attempt === 0) continue;
      return { items: null, error: "No response from AI", provider: usedProvider };
    }

    const result = parseAIResponse(content);

    if (result.items) {
      // Recalculate totals server-side to prevent hallucinated math
      const itemsWithTotals = result.items.map((item) => ({
        ...item,
        ...calculateLineItemTotals(item),
      }));
      return { items: itemsWithTotals, error: null, provider: usedProvider };
    }

    if (attempt === 0) {
      console.warn(`AI suggest attempt 1 (${usedProvider}) failed validation: ${result.error}. Retrying...`);
      continue;
    }

    return {
      items: null,
      error: `AI output failed validation after retry: ${result.error}`,
      provider: usedProvider,
    };
  }

  return { items: null, error: "AI generation failed", provider: usedProvider };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // Auth
  const { user, error: authError } = await getAuthUser();
  if (authError) return authError;

  // Check at least one provider is available
  if (getAvailableProviders().length === 0) {
    return NextResponse.json(
      { success: false, error: "No AI providers configured. Add at least one API key to .env" },
      { status: 500 }
    );
  }

  // Rate limit
  if (!checkRateLimit(user!.id)) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded. Please wait a minute before trying again." },
      { status: 429 }
    );
  }

  // Parse body
  let body: { jobType?: string; description?: string; provider?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { jobType, description, provider: requestedProvider } = body;

  if (!description || typeof description !== "string" || !description.trim()) {
    return NextResponse.json(
      { success: false, error: "Description is required" },
      { status: 400 }
    );
  }

  // Generate
  try {
    const { items, error, provider } = await generateLineItems(
      requestedProvider || "",
      jobType,
      description.trim()
    );

    if (!items) {
      return NextResponse.json(
        { success: false, error: error || "Failed to generate suggestions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, lineItems: items, provider });
  } catch (err) {
    console.error("AI suggest error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate suggestions";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
