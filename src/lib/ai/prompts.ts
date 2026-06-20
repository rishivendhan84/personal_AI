/** Shared prompts so Groq and OpenAI classify identically (provider-agnostic). */

export const CLASSIFY_SYSTEM = `You are the filing engine of a personal productivity OS.
Classify the user's captured note into structured fields. Be decisive.
Return ONLY valid JSON matching this TypeScript type:
{
  "type": "task" | "note" | "journal" | "habit" | "event" | "idea",
  "category": "Work" | "Learning" | "Personal" | "Business" | "Fitness",
  "urgency": "today" | "week" | "month" | "someday",
  "title": string,        // a short imperative title, max ~8 words
  "tags": string[],       // 0-4 lowercase keyword tags
  "effort_score": number, // 1 (quick) to 5 (deep work)
  "confidence": number    // 0..1, your confidence in this classification
}
Rules:
- A reminder/todo/action is a "task". A reflection is "journal". A fact to remember is "note". A business/product thought is "idea".
- If no urgency is implied, default to "week".
- Never output anything except the JSON object.`;

export function classifyUserPrompt(text: string): string {
  return `Capture:\n"""\n${text.slice(0, 2000)}\n"""`;
}
