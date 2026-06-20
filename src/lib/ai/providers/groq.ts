import "server-only";
import Groq from "groq-sdk";
import { env } from "@/lib/env";
import type { LlmProvider, SttProvider, Classification } from "@/lib/ai/types";
import { CLASSIFY_SYSTEM, classifyUserPrompt } from "@/lib/ai/prompts";
import { parseClassification } from "@/lib/ai/parse";

function client(): Groq {
  return new Groq({ apiKey: env("GROQ_API_KEY") });
}

/** Groq Whisper-large-v3 — free-tier STT (PRD §10). */
export const groqStt: SttProvider = {
  name: "groq:whisper-large-v3",
  async transcribe(audio: Buffer, mimeType: string): Promise<string> {
    const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp3") ? "mp3" : "m4a";
    const file = new File([new Uint8Array(audio)], `voice.${ext}`, { type: mimeType });
    const res = await client().audio.transcriptions.create({
      file,
      model: "whisper-large-v3",
    });
    return res.text.trim();
  },
};

/** Groq Llama 3.x — cheap/fast classify (PRD §8.4). */
export const groqLlm: LlmProvider = {
  name: "groq:llama-3.1-8b-instant",
  async classify(text: string): Promise<Classification> {
    const res = await client().chat.completions.create({
      model: "llama-3.1-8b-instant",
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
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
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
