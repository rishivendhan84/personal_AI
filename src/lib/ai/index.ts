import "server-only";
import { env, configured } from "@/lib/env";
import type { EmbedProvider, LlmProvider, SttProvider } from "@/lib/ai/types";
import { groqStt, groqLlm } from "@/lib/ai/providers/groq";
import { geminiLlm, geminiEmbed } from "@/lib/ai/providers/gemini";
import { openaiStt, openaiLlm, openaiEmbed } from "@/lib/ai/providers/openai";

export type { Classification } from "@/lib/ai/types";

const DEFAULT_TIMEOUT_MS = 20_000;

/** Race a promise against a timeout so a hung provider triggers failover. */
function withTimeout<T>(p: Promise<T>, ms = DEFAULT_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error("provider timeout")), ms)
    ),
  ]);
}

/**
 * Try primary, fall back on error/timeout. This is the ONLY place provider
 * failover is implemented (PRD §10). Throws only if both fail (or neither is
 * configured) so callers can decide whether to drop or retry the job.
 */
async function failover<P, R>(
  label: string,
  primary: P | null,
  fallback: P | null,
  run: (p: P) => Promise<R>
): Promise<R> {
  if (primary) {
    try {
      return await withTimeout(run(primary));
    } catch (e) {
      console.warn(`[PAIOS:ai] ${label} primary failed, trying fallback:`, e);
    }
  }
  if (fallback) return await withTimeout(run(fallback));
  throw new Error(`[PAIOS:ai] ${label}: no provider configured.`);
}

// --- STT: Groq primary, OpenAI fallback ---
export function transcribe(audio: Buffer, mimeType: string): Promise<string> {
  const primary: SttProvider | null = configured.groq() ? groqStt : null;
  const fallback: SttProvider | null = configured.openai() ? openaiStt : null;
  return failover("stt", primary, fallback, (p) => p.transcribe(audio, mimeType));
}

// --- LLM provider chain: try the preferred provider, then EVERY other
// configured one (Gemini → Groq → OpenAI). This is why a broken/disabled
// Gemini still answers via Groq instead of failing the whole request. ---
function llmChain(): LlmProvider[] {
  const choice = env("AI_LLM_PRIMARY") ?? "gemini";
  const entries: { name: string; provider: LlmProvider; ok: boolean }[] = [
    { name: "gemini", provider: geminiLlm, ok: configured.gemini() },
    { name: "groq", provider: groqLlm, ok: configured.groq() },
    { name: "openai", provider: openaiLlm, ok: configured.openai() },
  ];
  const enabled = entries.filter((e) => e.ok);
  // Preferred provider first; the rest keep their natural order.
  enabled.sort((a, b) => Number(b.name === choice) - Number(a.name === choice));
  return enabled.map((e) => e.provider);
}

/** Try each provider in order until one succeeds; throw only if all fail. */
async function tryChain<R>(
  label: string,
  providers: LlmProvider[],
  run: (p: LlmProvider) => Promise<R>
): Promise<R> {
  if (providers.length === 0) throw new Error(`[PAIOS:ai] ${label}: no provider configured.`);
  let lastErr: unknown;
  for (const p of providers) {
    try {
      return await withTimeout(run(p));
    } catch (e) {
      lastErr = e;
      console.warn(`[PAIOS:ai] ${label} via ${p.name} failed, trying next:`, e);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`[PAIOS:ai] ${label}: all providers failed`);
}

export function classify(text: string) {
  return tryChain("classify", llmChain(), (p) => p.classify(text));
}

// --- LLM reason (brief / Brain): preferred model, then every configured one ---
export function reason(opts: {
  system?: string;
  prompt: string;
  json?: boolean;
  maxTokens?: number;
}): Promise<string> {
  return tryChain("reason", llmChain(), (p) => p.complete(opts));
}

// --- Embeddings: canonical Gemini (768d). OpenAI differs in dimension; see §10 ---
export const CANONICAL_EMBED_DIMS = geminiEmbed.dimensions; // 768

export function embed(text: string): Promise<number[]> {
  const primary: EmbedProvider | null = configured.gemini() ? geminiEmbed : null;
  // Intentionally no cross-dimension fallback for stored vectors.
  return failover("embed", primary, null, (p) => p.embed(text));
}

/** Exposed so the Brain can decide SQL-only vs vector search at runtime. */
export const aiAvailable = {
  stt: () => configured.groq() || configured.openai(),
  llm: () => configured.gemini() || configured.groq() || configured.openai(),
  embed: () => configured.gemini(),
};

export { openaiEmbed };
