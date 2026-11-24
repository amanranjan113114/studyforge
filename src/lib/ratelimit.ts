// Simple in-memory sliding-window limiter.
// Fine for a single server process; use Redis (or similar) if you scale out.
const hits = new Map<string, number[]>();

/** Returns true if the action is allowed, false if the limit is hit. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
