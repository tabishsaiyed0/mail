#!/usr/bin/env node
// Usage:
//   npx tsx src/cli.ts score "some comment text"
//   npx tsx src/cli.ts batch samples/comments.csv out.csv
// Without TYPESAFE_API_KEY it runs the heuristic mock (same output shape).

import { readFileSync, writeFileSync } from "node:fs";
import { evaluatePost } from "./jev.js";
import { decide } from "./policy.js";
import { evaluateEmail, inboxRank } from "./email.js";
import { decideEmail } from "./emailPolicy.js";

function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function parseCsv(path: string): { id: string; text: string }[] {
  const raw = readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean);
  const rows: { id: string; text: string }[] = [];
  for (let i = 1; i < raw.length; i++) {
    // id,"text with, commas" — minimal parser for the sample file
    const m = raw[i].match(/^([^,]+),(.*)$/);
    if (!m) continue;
    rows.push({
      id: m[1],
      text: m[2].replace(/^"|"$/g, "").replace(/""/g, '"'),
    });
  }
  return rows;
}

async function scoreOne(text: string) {
  const { response, mocked } = await evaluatePost(text);
  const { action, reasons } = decide(response);
  const a = response.answers;
  console.log(
    JSON.stringify(
      {
        mode: mocked ? "mock (no key)" : "jev",
        text: text.slice(0, 120),
        action,
        reasons,
        category: a.category.choice,
        category_confidence: a.category.confidence,
        spam: a.is_spam.noul,
        toxic: a.is_toxic.noul,
        pii: a.has_pii.noul,
        severity: a.severity.score,
      },
      null,
      2,
    ),
  );
}

async function batch(inPath: string, outPath: string) {
  const rows = parseCsv(inPath);
  const out = [
    "id,action,reasons,category,spam,toxic,pii,severity,mode",
  ];
  for (const r of rows) {
    const { response, mocked } = await evaluatePost(r.text);
    const { action, reasons } = decide(response);
    const a = response.answers;
    out.push(
      [
        csvEscape(r.id),
        action,
        csvEscape(reasons.join("; ")),
        a.category.choice,
        a.is_spam.noul.toFixed(2),
        a.is_toxic.noul.toFixed(2),
        a.has_pii.noul.toFixed(2),
        a.severity.score.toFixed(1),
        mocked ? "mock" : "jev",
      ].join(","),
    );
    console.log(`${r.id} -> ${action} [${reasons.join("; ")}]`);
  }
  writeFileSync(outPath, out.join("\n") + "\n");
  console.log(`\nwrote ${rows.length} rows -> ${outPath}`);
}

async function emailScoreOne(from: string, subject: string, body: string) {
  const { response, mocked } = await evaluateEmail(from, subject, body);
  const a = response.answers;
  const { action, reasons } = decideEmail(response);
  console.log(
    JSON.stringify(
      {
        mode: mocked ? "mock (no key)" : "jev",
        action,
        reasons,
        tray: a.tray.choice,
        tray_confidence: a.tray.confidence,
        tray_top2: Object.entries(a.tray.probabilities)
          .sort(([, x], [, y]) => y - x)
          .slice(0, 2),
        urgency_1to5: Math.round(a.urgency.score) + 1,
        human: a.is_human.noul,
      },
      null,
      2,
    ),
  );
}

function parseEmailCsv(path: string): { id: string; from: string; subject: string; body: string }[] {
  const lines = readFileSync(path, "utf8").split(/\r?\n/).filter(Boolean);
  const rows: { id: string; from: string; subject: string; body: string }[] = [];
  // Minimal CSV parser handling quoted fields with commas
  const split = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out;
  };
  for (let i = 1; i < lines.length; i++) {
    const [id, from, subject, body] = split(lines[i]);
    if (!id) continue;
    rows.push({ id, from: from ?? "", subject: subject ?? "", body: body ?? "" });
  }
  return rows;
}

async function emailBatch(inPath: string, outPath: string) {
  const rows = parseEmailCsv(inPath);
  const out = ["id,action,reasons,tray,urgency_1to5,human,confidence,mode"];
  const ranked: { id: string; tray: string; urgency1to5: number; confidence: number }[] = [];
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const { response, mocked } = await evaluateEmail(r.from, r.subject, r.body);
    const a = response.answers;
    const u = Math.round(a.urgency.score) + 1;
    const { action, reasons } = decideEmail(response);
    counts[action] = (counts[action] ?? 0) + 1;
    ranked.push({ id: r.id, tray: a.tray.choice, urgency1to5: u, confidence: a.tray.confidence });
    out.push([r.id, action, csvEscape(reasons.join("; ")), a.tray.choice, u, a.is_human.noul.toFixed(2), a.tray.confidence.toFixed(2), mocked ? "mock" : "jev"].join(","));
    console.log(`${r.id} -> ${action} [${a.tray.choice} urgency ${u}/5] (${reasons.join("; ")})`);
  }
  writeFileSync(outPath, out.join("\n") + "\n");
  console.log(`\nwrote ${rows.length} rows -> ${outPath}`);
  console.log(`actions: ${Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(" ")}`);
  console.log("inbox-zero (needs_reply by urgency):");
  for (const r of inboxRank(ranked.filter((x) => x.tray === "needs_reply")))
    console.log(`  #${r.id} urgency ${r.urgency1to5}/5`);
}

const [, , cmd, ...rest] = process.argv;
if (cmd === "score" && rest[0]) {
  await scoreOne(rest.join(" "));
} else if (cmd === "batch") {
  await batch(rest[0] ?? "samples/comments.csv", rest[1] ?? "out.csv");
} else if (cmd === "email-score" && rest.length >= 3) {
  const [from, subject, ...body] = rest;
  await emailScoreOne(from, subject, body.join(" "));
} else if (cmd === "email-batch") {
  await emailBatch(rest[0] ?? "samples/emails.csv", rest[1] ?? "email-out.csv");
} else {
  console.log(`usage:
  npx tsx src/cli.ts score "some comment"
  npx tsx src/cli.ts batch samples/comments.csv out.csv
  npx tsx src/cli.ts email-score "from" "subject" "body..."
  npx tsx src/cli.ts email-batch samples/emails.csv email-out.csv`);
  process.exit(1);
}
