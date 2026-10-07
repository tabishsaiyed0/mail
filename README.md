# Jev moderation scorer

One Jev call, 5 questions in parallel: `choice` (category) + 3× `noul` (spam / toxic / PII) + `score` (severity). Code in `src/policy.ts` turns probabilities into `allow | review | block`.

## Run (no key needed — mock mode)

```bash
npm install
npx tsx src/cli.ts score "You are an idiot, shut up"
npx tsx src/cli.ts batch samples/comments.csv out.csv
```

## Use real Jev

1. Key from https://console.typesafe.ai/keys
2. `copy .env.example .env` → set `TYPESAFE_API_KEY`
3. Same commands now hit `POST https://api.typesafe.ai/v1/systemone` (`jev-latest`).

## Email triage (Jevmail-style)

Same pattern, different questions: `tray` (choice: needs_reply / updates / promos / sales / spam) + `urgency` (score 1–5) + `is_human` (noul), one call per message.

```bash
npx tsx src/cli.ts email-score "alice@example.com" "Contract signature needed" "Please sign by 5pm, we're blocked"
npx tsx src/cli.ts email-batch samples/emails.csv email-out.csv
```

`email-batch` prints per-message tray + urgency and an inbox-zero view (needs_reply sorted by urgency). Mock mode works without a key; set `TYPESAFE_API_KEY` for real Jev.

Tune thresholds in `.env`, not the prompts — that's the System One pattern.
