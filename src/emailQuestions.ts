// Jevmail-style questions: 1 choice + 1 score + 1 noul, answered in parallel.
// Mirrors https://github.com/fazlerocks/jevmail — tray, urgency, human-written.

export const EMAIL_QUESTIONS = {
  tray: {
    type: "choice",
    instructions:
      "Which tray does `email` belong in? Needs reply = a person or request waiting on the reader. Updates = automated alerts, receipts, deliveries, OTPs, bank notices. Promos = marketing newsletters and offers. Sales = outbound sales pitches and cold outreach. Spam = scam, phishing, or junk.",
    criteria: {
      needs_reply:
        "A real person asks the reader something, requests action, or awaits a decision.",
      updates:
        "Automated notification: bank alert, receipt, delivery tracking, OTP code, password reset, system notice.",
      promos: "Marketing newsletter, sale announcement, coupon, or brand offer.",
      sales: "Cold outreach, sales pitch, demo request, or lead-gen follow-up.",
      spam: "Scam, phishing, fake prize, credential or payment harvesting, or junk.",
    },
  },
  urgency: {
    type: "score",
    instructions: "How urgent is `email`? Rate time-sensitivity for the reader.",
    criteria: [
      "1 — No action needed, read whenever or never.",
      "2 — Low: FYI, promo, or routine notice.",
      "3 — Medium: worth handling this week.",
      "4 — High: needs action in a day or two.",
      "5 — Critical: time-sensitive, money, security, or someone blocked on you.",
    ],
  },
  is_human: {
    type: "noul",
    instructions:
      "Was `email` written by a human personally to the reader (not automated, bulk, or machine-generated)?",
    criteria: {
      yes: "Personal tone, addressed to the reader, specific context.",
      no: "Automated, bulk, templated, or machine-generated message.",
    },
  },
} as const;

export type EmailState = {
  email: { from: string; subject: string; body: string };
};

export function buildEmailState(
  from: string,
  subject: string,
  body: string,
): EmailState {
  return { email: { from, subject, body: body.slice(0, 4000) } };
}
