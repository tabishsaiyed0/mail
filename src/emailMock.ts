// Heuristic mock with the SAME shape as the real Jev email answers,
// so emailPolicy.ts works unchanged once TYPESAFE_API_KEY is set.

export type EmailJevResponse = {
  model: string;
  answers: {
    tray: {
      type: "choice";
      choice: string;
      confidence: number;
      probabilities: Record<string, number>;
    };
    urgency: {
      type: "score";
      score: number; // 0-4 index into the 5 urgency levels (display +1)
      confidence: number;
      probabilities: Record<string, number>;
    };
    is_human: { type: "noul"; noul: number };
  };
};

const TRAYS = ["needs_reply", "updates", "promos", "sales", "spam"] as const;

const probs = (winner: string, names: readonly string[]) => {
  const out: Record<string, number> = {};
  for (const n of names) out[n] = n === winner ? 0.8 : 0.2 / (names.length - 1);
  return out;
};

export function mockEvaluateEmail(
  from: string,
  subject: string,
  body: string,
): EmailJevResponse {
  const t = `${subject}\n${body}`.toLowerCase();
  const sender = from.toLowerCase();

  let tray: (typeof TRAYS)[number] = "needs_reply";
  let urgency = 2; // 0-based; display = +1
  let human = 0.85;

  if (/(prize|\bwon\b|\bclaim\b|verify.*account|password.*expir|suspended|bank.*details|\bwire\b|crypto.*10x|click http)/.test(t)) {
    tray = "spam";
    urgency = 1;
    human = 0.15;
  } else if (/(unsubscribe|newsletter|% off|sale ends|coupon|promo code|black friday)/.test(t)) {
    tray = "promos";
    urgency = 0;
    human = 0.08;
  } else if (/(demo|quick call|15 minutes|pipeline|roi|book a slot|cold outreach|per seat)/.test(t)) {
    tray = "sales";
    urgency = 1;
    human = 0.5;
  } else if (
    /(receipt|invoice|order shipped|tracking|delivered|otp|verification code|statement|payment.*processed|alert)/.test(t) ||
    /no-?reply|donotreply|notifications?@|alerts?@/.test(sender)
  ) {
    tray = "updates";
    urgency = /otp|verification code|suspicious|failed|overdue/.test(t) ? 3 : 1;
    human = 0.05;
  } else {
    tray = "needs_reply";
    urgency = /(asap|urgent|today|deadline|blocked|need.*by|sign.*contract|offer letter)/.test(t) ? 4 : 2;
    human = 0.9;
  }

  return {
    model: "mock-jev",
    answers: {
      tray: {
        type: "choice",
        choice: tray,
        confidence: 0.8,
        probabilities: probs(tray, TRAYS),
      },
      urgency: {
        type: "score",
        score: urgency,
        confidence: 0.75,
        probabilities: probs(String(urgency), ["0", "1", "2", "3", "4"]),
      },
      is_human: { type: "noul", noul: human },
    },
  };
}
