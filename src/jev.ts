import { MODERATION_QUESTIONS, type ModerationState } from "./questions.js";
import { mockEvaluate, type JevResponse } from "./mock.js";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";

export async function evaluatePost(
  text: string,
  opts: { author?: string; context?: string } = {},
): Promise<{ response: JevResponse; mocked: boolean }> {
  const key = process.env.TYPESAFE_API_KEY?.trim();
  if (!key) return { response: mockEvaluate(text), mocked: true };

  const state: ModerationState = {
    post: { text, ...(opts.author ? { author: opts.author } : {}) },
  };
  if (opts.context) state.post.context = opts.context;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.JEV_MODEL ?? "jev-latest",
      state,
      questions: MODERATION_QUESTIONS,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jev ${res.status}: ${body.slice(0, 500)}`);
  }
  const response = (await res.json()) as JevResponse;
  return { response, mocked: false };
}
