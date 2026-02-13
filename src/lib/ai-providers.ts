import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ProviderInfo {
  id: string;
  name: string;
  model: string;
}

export interface ProviderResult {
  content: string | null;
}

interface ProviderConfig {
  id: string;
  name: string;
  model: string;
  envKey: string;
  call: (prompt: string, apiKey: string) => Promise<ProviderResult>;
}

// ---------------------------------------------------------------------------
// OpenAI-compatible helper (reused by OpenAI, Groq, Gemini, OpenRouter)
// ---------------------------------------------------------------------------
async function callOpenAICompatible(
  prompt: string,
  apiKey: string,
  baseURL: string | undefined,
  model: string
): Promise<ProviderResult> {
  const client = new OpenAI({ apiKey, baseURL });
  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    top_p: 0.9,
    max_tokens: 4096,
  });
  const content = completion.choices[0]?.message?.content?.trim() ?? null;
  return { content };
}

// ---------------------------------------------------------------------------
// Provider definitions
// ---------------------------------------------------------------------------
const PROVIDERS: ProviderConfig[] = [
  {
    id: "anthropic",
    name: "Claude Sonnet 4.5 (Anthropic)",
    model: "claude-sonnet-4-5-20250929",
    envKey: "ANTHROPIC_API_KEY",
    async call(prompt, apiKey) {
      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4096,
        temperature: 0.2,
        top_p: 0.9,
        messages: [{ role: "user", content: prompt }],
      });
      const textBlock = message.content.find((b) => b.type === "text");
      return { content: textBlock?.text?.trim() ?? null };
    },
  },
  {
    id: "openai",
    name: "GPT-4o Mini (OpenAI)",
    model: "gpt-4o-mini",
    envKey: "OPENAI_API_KEY",
    call: (prompt, apiKey) =>
      callOpenAICompatible(prompt, apiKey, undefined, "gpt-4o-mini"),
  },
  {
    id: "groq",
    name: "Llama 3.3 70B (Groq)",
    model: "llama-3.3-70b-versatile",
    envKey: "GROQ_API_KEY",
    call: (prompt, apiKey) =>
      callOpenAICompatible(
        prompt,
        apiKey,
        "https://api.groq.com/openai/v1",
        "llama-3.3-70b-versatile"
      ),
  },
  {
    id: "gemini",
    name: "Gemini 2.5 Flash (Google)",
    model: "gemini-2.5-flash",
    envKey: "GEMINI_API_KEY",
    call: (prompt, apiKey) =>
      callOpenAICompatible(
        prompt,
        apiKey,
        "https://generativelanguage.googleapis.com/v1beta/openai/",
        "gemini-2.5-flash"
      ),
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Return info for all providers that have their API key set in env. */
export function getAvailableProviders(): ProviderInfo[] {
  return PROVIDERS.filter((p) => !!process.env[p.envKey]).map((p) => ({
    id: p.id,
    name: p.name,
    model: p.model,
  }));
}

/** Call a provider by id. Falls back to first available if id is invalid. */
export async function callProvider(
  providerId: string,
  prompt: string
): Promise<{ content: string | null; provider: string }> {
  // Find requested provider (must have key set)
  let provider = PROVIDERS.find(
    (p) => p.id === providerId && !!process.env[p.envKey]
  );

  // Fallback to first available
  if (!provider) {
    provider = PROVIDERS.find((p) => !!process.env[p.envKey]);
  }

  if (!provider) {
    throw new Error("No AI provider configured. Add at least one API key to .env");
  }

  const apiKey = process.env[provider.envKey]!;
  const result = await provider.call(prompt, apiKey);
  return { content: result.content, provider: provider.id };
}
