/* Small in-memory limiter for the public endpoints that cost money or send email. State is per
   Node process — fine on this single-instance box; it only has to stop a script, not be exact. */

/** The caller's address as nginx saw it. nginx overwrites X-Real-IP with $remote_addr, so it can't
    be forged; the FIRST X-Forwarded-For entry can (a client may send its own), so it is never used. */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = req.headers.get("x-forwarded-for");
  return (forwarded ? forwarded.split(",").pop()?.trim() : "") || "unknown";
}

export function createLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return {
    /** Records a hit and returns true if the caller is still within the limit. */
    allow(key: string, cost = 1): boolean {
      const now = Date.now();
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length + cost > max) { hits.set(key, recent); return false; }
      for (let i = 0; i < cost; i++) recent.push(now);
      hits.set(key, recent);
      if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
      return true;
    },
  };
}
