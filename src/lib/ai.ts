import { z } from "zod";

/**
 * Provider-agnostic AI layer.
 * Switch providers with AI_PROVIDER = anthropic | openai | openai-compatible.
 * Uses plain fetch, so there are no vendor SDKs to maintain.
 */

type Provider = "anthropic" | "openai" | "openai-compatible";

function getProvider(): Provider {
  const p = (process.env.AI_PROVIDER || "anthropic").toLowerCase();
  if (p === "anthropic" || p === "openai" || p === "openai-compatible") return p;
  throw new Error(`Unknown AI_PROVIDER "${p}". Use anthropic, openai or openai-compatible.`);
}

async function callModel(system: string, prompt: string, maxTokens: number): Promise<string> {
  const provider = getProvider();

  if (provider === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
    const base = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
    const res = await fetch(`${base}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(110_000),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    return (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
  }

  // OpenAI and OpenAI-compatible servers share the chat completions format
  const isOpenAI = provider === "openai";
  const base = isOpenAI ? "https://api.openai.com/v1" : process.env.OPENAI_COMPATIBLE_BASE_URL;
  const key = isOpenAI ? process.env.OPENAI_API_KEY : process.env.OPENAI_COMPATIBLE_API_KEY;
  const model = isOpenAI
    ? process.env.OPENAI_MODEL || "gpt-4o-mini"
    : process.env.OPENAI_COMPATIBLE_MODEL;
  if (!base) throw new Error("OPENAI_COMPATIBLE_BASE_URL is not set");
  if (!model) throw new Error("OPENAI_COMPATIBLE_MODEL is not set");
  if (isOpenAI && !key) throw new Error("OPENAI_API_KEY is not set");

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  };
  if (isOpenAI) body.response_format = { type: "json_object" };

  const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(key ? { authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(110_000),
  });
  if (!res.ok) throw new Error(`${provider} API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("Model reply contained no JSON object");
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Calls the model, parses JSON, validates with zod. Retries once with the error fed back. */
export async function generateJSON<T>(opts: {
  system: string;
  prompt: string;
  schema: z.ZodType<T, z.ZodTypeDef, unknown>;
  maxTokens?: number;
}): Promise<T> {
  let prompt = opts.prompt;
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const reply = await callModel(opts.system, prompt, opts.maxTokens ?? 8000);
    try {
      return opts.schema.parse(extractJson(reply));
    } catch (e) {
      lastError = e instanceof Error ? e.message.slice(0, 400) : "invalid JSON";
      prompt = `${opts.prompt}\n\nYour previous reply was rejected: ${lastError}\nReturn ONLY one valid JSON object that matches the requested shape. No commentary.`;
    }
  }
  throw new Error(`The AI returned an invalid response twice (${lastError})`);
}
