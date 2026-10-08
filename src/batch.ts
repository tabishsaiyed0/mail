import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

export type BatchFlags = {
  concurrency: number;
  retries: number;
  cachePath: string | null; // null = disabled
};

export function hashKey(s: string): string {
  return createHash("sha1").update(s, "utf8").digest("hex").slice(0, 16);
}

export function parseBatchFlags(
  rest: string[],
  defaultCachePath: string,
): { positionals: string[]; flags: BatchFlags } {
  let concurrency = Number(process.env.BATCH_CONCURRENCY ?? 5);
  let retries = Number(process.env.BATCH_RETRIES ?? 2);
  let cachePath: string | null = defaultCachePath;
  const positionals: string[] = [];

  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--no-cache") {
      cachePath = null;
    } else if (a === "--cache" && rest[i + 1]) {
      cachePath = rest[++i];
    } else if (a.startsWith("--cache=")) {
      cachePath = a.slice("--cache=".length);
    } else if ((a === "--concurrency" || a === "-c") && rest[i + 1]) {
      concurrency = Math.max(1, Number(rest[++i]) || 1);
    } else if (a.startsWith("--concurrency=")) {
      concurrency = Math.max(1, Number(a.slice("--concurrency=".length)) || 1);
    } else if (a === "--retries" && rest[i + 1]) {
      retries = Math.max(0, Number(rest[++i]) || 0);
    } else if (a.startsWith("--retries=")) {
      retries = Math.max(0, Number(a.slice("--retries=".length)) || 0);
    } else if (a.startsWith("-")) {
      throw new Error(`unknown flag ${a}`);
    } else {
      positionals.push(a);
    }
  }
  if (!Number.isFinite(concurrency) || concurrency < 1) concurrency = 5;
  if (!Number.isFinite(retries) || retries < 0) retries = 2;
  return { positionals, flags: { concurrency, retries, cachePath } };
}

export function loadCache(path: string | null): Record<string, any> {
  if (!path) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8")) as Record<string, any>;
  } catch {
    return {};
  }
}

export function saveCache(path: string | null, data: Record<string, any>): void {
  if (!path) return;
  try {
    writeFileSync(path, JSON.stringify(data) + "\n");
  } catch (e) {
    console.error(`warning: could not write cache ${path}: ${(e as Error).message}`);
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number,
  baseMs = 400,
): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (attempt === retries) break;
      const ms = baseMs * 2 ** attempt + Math.random() * 100;
      await new Promise((r) => setTimeout(r, ms));
    }
  }
  throw last;
}

// Run fn over items with at most `concurrency` in flight. Order preserved.
export async function runPooled<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i], i);
      }
    },
  );
  await Promise.all(workers);
  return out;
}
