// Single source of truth for the Jev questions.
// One request, 5 questions in parallel: 1 choice + 3 noul + 1 score.
// Question IDs are for our code only — the full meaning lives in `instructions`.

export const MODERATION_QUESTIONS = {
  category: {
    type: "choice",
    instructions: "What is the primary category of `post.text`?",
    criteria: {
      clean: "Benign, friendly, or on-topic discussion with no violation.",
      spam: "Unsolicited promotion, scam, phishing, fake giveaway, or link bait.",
      toxic: "Harassment, insult, threat, hate speech, or wish of harm.",
      sexual: "Explicit sexual content or solicitation.",
      fraud: "Deception, impersonation, or request for bank / credential details.",
      other_violation:
        "Some other policy violation not covered above (self-harm, gore, etc).",
    },
  },
  is_spam: {
    type: "noul",
    instructions:
      "Does `post.text` constitute spam, scam, phishing, or unsolicited promotion?",
    criteria: {
      yes: "Contains scam, fake giveaway, guaranteed-returns pitch, or spam link.",
      no: "Genuine message with no promotional deception.",
    },
  },
  is_toxic: {
    type: "noul",
    instructions:
      "Does `post.text` contain harassment, insult, threat, hate speech, or a wish of harm?",
    criteria: {
      yes: "Attacks a person or group, threatens, or wishes harm.",
      no: "Civil even if angry or critical.",
    },
  },
  has_pii: {
    type: "noul",
    instructions:
      "Does `post.text` contain personal data such as email, phone number, street address, or ID number?",
    criteria: {
      yes: "Contains a reachable email, phone, address, or ID.",
      no: "No personal data present.",
    },
  },
  severity: {
    type: "score",
    instructions: "How severe is the worst policy issue in `post.text`?",
    criteria: [
      "Benign: no violation, safe to publish.",
      "Borderline: rude or low-quality but not clearly violating.",
      "Violating: clear spam, harassment, PII, or fraud — should be removed or held.",
      "Severe: threat, hate, sexual content involving harm, or dangerous scam — block immediately.",
    ],
  },
} as const;

export type ModerationState = {
  post: { text: string; author?: string; context?: string };
};
