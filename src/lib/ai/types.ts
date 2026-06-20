/**
 * Provider abstraction (PRD §10). Every AI call lives behind one of these thin
 * interfaces with a `primary` (free) and `fallback` (OpenAI) implementation.
 * Failover = catch error/timeout on primary → call fallback. No feature card
 * knows or cares which provider answered.
 */

export interface SttProvider {
  name: string;
  /** Transcribe an audio buffer (voice note) to text. */
  transcribe(audio: Buffer, mimeType: string): Promise<string>;
}

/** Shape the classifier must return for a capture (PRD §7.8 / §8.2). */
export interface Classification {
  type: "task" | "note" | "journal" | "habit" | "event" | "idea";
  category: "Work" | "Learning" | "Personal" | "Business" | "Fitness";
  urgency: "today" | "week" | "month" | "someday";
  title: string;
  tags: string[];
  effort_score: number; // 1..5
  confidence: number; // 0..1
}

export interface LlmProvider {
  name: string;
  /** Cheap structured classification of a capture. Smallest/fastest model. */
  classify(text: string): Promise<Classification>;
  /** General reasoning (brief generation, Brain answers). Mid-tier model. */
  complete(opts: {
    system?: string;
    prompt: string;
    json?: boolean;
    maxTokens?: number;
  }): Promise<string>;
}

export interface EmbedProvider {
  name: string;
  /** Canonical embedder is fixed-dimension (768). Never hot-swap mid-corpus. */
  readonly dimensions: number;
  embed(text: string): Promise<number[]>;
}
