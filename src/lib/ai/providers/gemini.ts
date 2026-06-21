import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/lib/env";
import type { EmbedProvider, LlmProvider, Classification } from "@/lib/ai/types";
import { CLASSIFY_SYSTEM, classifyUserPrompt } from "@/lib/ai/prompts";
import { parseClassification } from "@/lib/ai/parse";

function genai(): GoogleGenerativeAI {
  return new GoogleGenerativeAI(env("GEMINI_API_KEY") ?? "");
}

/** Gemini 2.x Flash — brief/Brain reasoning + Flash-Lite classify (PRD §8.4). */
export const geminiLlm: LlmProvider = {
  name: "gemini:flash",
  async classify(text: string): Promise<Classification> {
    const model = genai().getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
      systemInstruction: CLASSIFY_SYSTEM,
    });
    const res = await model.generateContent(classifyUserPrompt(text));
    return parseClassification(res.response.text(), text);
  },
  async complete({ system, prompt, json, maxTokens }): Promise<string> {
    const model = genai().getGenerativeModel({
      model: "gemini-2.0-flash",
      ...(system ? { systemInstruction: system } : {}),
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: maxTokens ?? 1024,
        ...(json ? { responseMimeType: "application/json" } : {}),
      },
    });
    const res = await model.generateContent(prompt);
    return res.response.text();
  },
};

/**
 * Gemini text-embedding-004 — CANONICAL embedder, 768 dims (PRD §10).
 * The pgvector column is locked to this dimension; do not hot-swap mid-corpus.
 */
export const geminiEmbed: EmbedProvider = {
  name: "gemini:text-embedding-004",
  dimensions: 768,
  async embed(text: string): Promise<number[]> {
    const model = genai().getGenerativeModel({ model: "text-embedding-004" });
    const res = await model.embedContent(text);
    return res.embedding.values;
  },
};
