import { EMAIL_QUESTIONS, buildEmailState } from "./emailQuestions.js";
import { mockEvaluateEmail, type EmailJevResponse } from "./emailMock.js";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";

export async function evaluateEmail(
  from: string,
  subject: string,
  body: string,
): Promise<{ response: EmailJevResponse; mocked: boolean }> {
  const key = process.env.TYPESAFE_API_KEY?.trim();
  if (!key) return { response: mockEvaluateEmail(from, subject, body), mocked: true };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.JEV_MODEL ?? "jev-latest",
      state: buildEmailState(from, subject, body),
      questions: EMAIL_QUESTIONS,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Jev ${res.status}: ${text.slice(0, 500)}`);
  }
  return { response: (await res.json()) as EmailJevResponse, mocked: false };
}

// Inbox-zero view: only needs_reply sorted by urgency desc is "the inbox".
// Everything else is filed. Corrections-welcome: caller stores tray vs override.
export function inboxRank(
  rows: { id: string; tray: string; urgency1to5: number; confidence: number }[],
): typeof rows {
  return [...rows].sort((a, b) => b.urgency1to5 - a.urgency1to5);
}
