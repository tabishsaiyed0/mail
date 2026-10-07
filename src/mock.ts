// Heuristic mock so the demo works with no API key.
// Returns the SAME shape as the real Jev API, so policy.ts never knows.

export type JevResponse = {
  model: string;
  answers: {
    category: {
      type: "choice";
      choice: string;
      confidence: number;
      probabilities: Record<string, number>;
    };
    is_spam: { type: "noul"; noul: number };
    is_toxic: { type: "noul"; noul: number };
    has_pii: { type: "noul"; noul: number };
    severity: {
      type: "score";
      score: number;
      confidence: number;
      legend: Record<string, string>;
      probabilities: Record<string, number>;
    };
  };
  usage?: { input_tokens: number; output_tokens: number };
};

const has = (text: string, re: RegExp) => re.test(text);

export function mockEvaluate(text: string): JevResponse {
  const t = text.toLowerCase();

  const spam = has(
    t,
    /(buy now|cheap crypto|10x guaranteed|free iphone|won a|bank details|click http|claim now|giveaway|send.*(btc|bank|wallet))/,
  )
    ? 0.95
    : has(t, /(http:\/\/|https:\/\/|promo|discount|earn \$)/)
      ? 0.6
      : 0.05;

  const severeToxic = /(kill yourself|i will (hurt|kill)|hate you)/.test(t);
  const mildToxic = has(
    t,
    /(shut up|idiot|suck at your jobs|you guys suck|worst update)/,
  );
  const toxic = severeToxic ? 0.97 : mildToxic ? 0.68 : 0.06;

  const pii = has(
    text,
    /[\w.+-]+@[\w-]+\.[\w.]+|\b\d{3}[-. ]\d{3}[-. ]\d{4}\b|\b\d{16}\b/,
  )
    ? 0.96
    : 0.04;

  let category = "clean";
  if (spam > 0.8 && /bank|iphone|won|giveaway/.test(t)) category = "fraud";
  else if (spam > 0.7) category = "spam";
  else if (toxic > 0.8) category = "toxic";
  else if (pii > 0.8) category = "other_violation";

  const severity =
    toxic >= 0.95 || /kill yourself/.test(t)
      ? 3.0
      : Math.max(spam, toxic, pii) > 0.8
        ? 2.0
        : Math.max(spam, toxic) > 0.5 || /suck/.test(t)
          ? 1.0
          : 0.1;

  const probs = (winner: string, names: string[]): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const n of names) out[n] = n === winner ? 0.85 : 0.15 / (names.length - 1);
    return out;
  };

  return {
    model: "mock-jev",
    answers: {
      category: {
        type: "choice",
        choice: category,
        confidence: 0.85,
        probabilities: probs(category, [
          "clean",
          "spam",
          "toxic",
          "sexual",
          "fraud",
          "other_violation",
        ]),
      },
      is_spam: { type: "noul", noul: spam },
      is_toxic: { type: "noul", noul: toxic },
      has_pii: { type: "noul", noul: pii },
      severity: {
        type: "score",
        score: severity,
        confidence: 0.8,
        legend: {
          "0": "Benign",
          "1": "Borderline",
          "2": "Violating",
          "3": "Severe",
        },
        probabilities: probs(String(Math.round(severity)), ["0", "1", "2", "3"]),
      },
    },
    usage: { input_tokens: text.length, output_tokens: 0 },
  };
}
