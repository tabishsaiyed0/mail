import type { EmailJevResponse } from "./emailMock.js";

export type EmailAction = "escalate" | "inbox" | "file" | "review" | "quarantine";

export type EmailPolicyConfig = {
  escalateAtUrgency1to5: number;
  reviewBelowConfidence: number;
  reviewMargin: number;
};

export const DEFAULT_EMAIL_POLICY: EmailPolicyConfig = {
  escalateAtUrgency1to5: Number(process.env.EMAIL_ESCALATE_AT_URGENCY ?? 4),
  reviewBelowConfidence: Number(process.env.EMAIL_REVIEW_BELOW_CONFIDENCE ?? 0.6),
  reviewMargin: Number(process.env.EMAIL_REVIEW_MARGIN ?? 0.15),
};

// Code owns the triage decision; Jev only supplies tray/urgency/human.
// Tune thresholds here — never rewrite the questions to shift a boundary.
export function decideEmail(
  r: EmailJevResponse,
  cfg: EmailPolicyConfig = DEFAULT_EMAIL_POLICY,
): { action: EmailAction; reasons: string[] } {
  const { tray, urgency, is_human } = r.answers;
  const urgency1to5 = Math.round(urgency.score) + 1;
  const reasons: string[] = [];

  // 1. Spam is quarantined outright — never inboxed, even if urgent.
  if (tray.choice === "spam") {
    reasons.push(`tray=spam`);
    reasons.push(`human=${is_human.noul.toFixed(2)}`);
    return { action: "quarantine", reasons };
  }

  // 2. Low confidence or close runner-up → human review.
  const sorted = Object.entries(tray.probabilities).sort(([, a], [, b]) => b - a);
  const margin = sorted.length > 1 ? sorted[0][1] - sorted[1][1] : 1;
  if (tray.confidence < cfg.reviewBelowConfidence || margin < cfg.reviewMargin) {
    reasons.push(`tray=${tray.choice}`);
    if (tray.confidence < cfg.reviewBelowConfidence)
      reasons.push(`low_confidence=${tray.confidence.toFixed(2)}`);
    if (margin < cfg.reviewMargin)
      reasons.push(`close_runner_up=${sorted[1]?.[0] ?? "?"}_margin=${margin.toFixed(2)}`);
    reasons.push(`urgency=${urgency1to5}/5`);
    return { action: "review", reasons };
  }

  // 3. Urgent human mail → escalate (subset of inbox, sorted first).
  if (tray.choice === "needs_reply" && urgency1to5 >= cfg.escalateAtUrgency1to5) {
    reasons.push(`tray=needs_reply`);
    reasons.push(`urgency=${urgency1to5}/5`);
    reasons.push(`human=${is_human.noul.toFixed(2)}`);
    return { action: "escalate", reasons };
  }

  // 4. Normal human mail → inbox.
  if (tray.choice === "needs_reply") {
    reasons.push(`tray=needs_reply`);
    reasons.push(`urgency=${urgency1to5}/5`);
    return { action: "inbox", reasons };
  }

  // 5. Everything else (updates / promos / sales) is filed, with reason.
  reasons.push(`tray=${tray.choice}`);
  reasons.push(`urgency=${urgency1to5}/5`);
  reasons.push(`human=${is_human.noul.toFixed(2)}`);
  return { action: "file", reasons };
}
