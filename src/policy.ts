import type { JevResponse } from "./mock.js";

export type Action = "allow" | "review" | "block";

export type PolicyConfig = {
  blockAtNoul: number;
  reviewAtNoul: number;
  blockAtSeverity: number;
  reviewAtSeverity: number;
};

export const DEFAULT_POLICY: PolicyConfig = {
  blockAtNoul: Number(process.env.BLOCK_AT_NOUL ?? 0.85),
  reviewAtNoul: Number(process.env.REVIEW_AT_NOUL ?? 0.55),
  blockAtSeverity: Number(process.env.BLOCK_AT_SEVERITY ?? 2),
  reviewAtSeverity: Number(process.env.REVIEW_AT_SEVERITY ?? 1),
};

// Code owns the decision; Jev only supplies probabilities.
// Tune thresholds here — never rewrite the questions to shift a boundary.
export function decide(
  r: JevResponse,
  cfg: PolicyConfig = DEFAULT_POLICY,
): { action: Action; reasons: string[] } {
  const { is_spam, is_toxic, has_pii, severity, category } = r.answers;
  const reasons: string[] = [];
  let action: Action = "allow";

  const worstNoul = Math.max(is_spam.noul, is_toxic.noul, has_pii.noul);
  if (is_spam.noul >= cfg.blockAtNoul) reasons.push(`spam=${is_spam.noul.toFixed(2)}`);
  if (is_toxic.noul >= cfg.blockAtNoul) reasons.push(`toxic=${is_toxic.noul.toFixed(2)}`);
  if (has_pii.noul >= cfg.blockAtNoul) reasons.push(`pii=${has_pii.noul.toFixed(2)}`);
  if (severity.score >= cfg.blockAtSeverity)
    reasons.push(`severity=${severity.score.toFixed(1)}`);
  if (reasons.length > 0) return { action: "block", reasons };

  if (
    worstNoul >= cfg.reviewAtNoul ||
    severity.score >= cfg.reviewAtSeverity ||
    category.choice !== "clean" ||
    category.confidence < 0.6
  ) {
    if (category.choice !== "clean") reasons.push(`category=${category.choice}`);
    if (worstNoul >= cfg.reviewAtNoul)
      reasons.push(`uncertain_noul=${worstNoul.toFixed(2)}`);
    if (severity.score >= cfg.reviewAtSeverity)
      reasons.push(`severity=${severity.score.toFixed(1)}`);
    if (category.confidence < 0.6)
      reasons.push(`low_confidence=${category.confidence.toFixed(2)}`);
    return { action: "review", reasons };
  }

  return { action: "allow", reasons: [`category=${category.choice}`] };
}
