import "server-only";
import OpenAI from "openai";
import { env } from "@/lib/env";
import type {
  EmbedProvider,
  LlmProvider,
  SttProvider,
  Classification,
} from "@/lib/ai/types";
import { CLASSIFY_SYSTEM, classifyUserPrompt } from "@/lib/ai/prompts";
import { parseClassification } from "@/lib/ai/parse";

function client(): OpenAI {
  return new OpenAI({ apiKey: env("OPENAI_API_KEY") });
}

/** OpenAI whisper-1 — STT reliability fallback (~$0.006/min, PRD §10). */
export const openaiStt: SttProvider = {
  name: "openai:whisper-1",
  async transcribe(audio: Buffer, mimeType: string): Promise<string> {
    const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp3") ? "mp3" : "m4a";
    const file = new File([new Uint8Array(audio)], `voice.${ext}`, { type: mimeType });
    const res = await client().audio.transcriptions.create({ file, model: "whisper-1" });
    return res.text.trim();
  },
};

/** OpenAI gpt-4o-mini (classify) / gpt-4o (reason) — fallback only. */
export const openaiLlm: LlmProvider = {
  name: "openai:gpt-4o",
  async classify(text: string): Promise<Classification> {
    const res = await client().chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CLASSIFY_SYSTEM },
        { role: "user", content: classifyUserPrompt(text) },
      ],
    });
    return parseClassification(res.choices[0]?.message?.content ?? "", text);
  },
  async complete({ system, prompt, json, maxTokens }): Promise<string> {
    const res = await client().chat.completions.create({
      model: "gpt-4o",
      temperature: 0.4,
      max_tokens: maxTokens ?? 1024,
      ...(json ? { response_format: { type: "json_object" } } : {}),
      messages: [
        ...(system ? [{ role: "system" as const, content: system }] : []),
        { role: "user", content: prompt },
      ],
    });
    return res.choices[0]?.message?.content ?? "";
  },
};

/**
 * OpenAI text-embedding-3-small = 1536 dims. NOTE: different dimension from the
 * canonical Gemini embedder (768). Only usable as a *true* fallback if the
 * pgvector column matches; here it exists for completeness — prefer queue+retry
 * on the canonical embedder (PRD §10 caveat).
 */
export const openaiEmbed: EmbedProvider = {
  name: "openai:text-embedding-3-small",
  dimensions: 1536,
  async embed(text: string): Promise<number[]> {
    const res = await client().embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return res.data[0].embedding;
  },
};
