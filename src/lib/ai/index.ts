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

// --- LLM classify: cheapest model, Groq/Gemini primary, OpenAI fallback ---
function llmPrimary(): LlmProvider | null {
  const choice = env("AI_LLM_PRIMARY") ?? "gemini";
  if (choice === "groq" && configured.groq()) return groqLlm;
  if (configured.gemini()) return geminiLlm;
  if (configured.groq()) return groqLlm;
  return null;
}

export function classify(text: string) {
  return failover(
    "classify",
    llmPrimary(),
    configured.openai() ? openaiLlm : null,
    (p) => p.classify(text)
  );
}

// --- LLM reason (brief / Brain): mid-tier primary, OpenAI fallback ---
export function reason(opts: {
  system?: string;
  prompt: string;
  json?: boolean;
  maxTokens?: number;
}): Promise<string> {
  return failover(
    "reason",
    llmPrimary(),
    configured.openai() ? openaiLlm : null,
    (p) => p.complete(opts)
  );
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
