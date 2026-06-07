// lib/auth/rateLimit.ts
// StaffTrack — In-memory rate limiter (upgrade to Upstash Redis for production scale)

interface RateLimitEntry {
  count:     number;
  resetAt:   number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  success:   boolean;
  limit:     number;
  remaining: number;
  resetAt:   number;
}

export function rateLimit(
  key:       string,
  maxTokens: number,
  windowMs:  number
): RateLimitResult {
  const now   = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, limit: maxTokens, remaining: maxTokens - 1, resetAt: now + windowMs };
  }

  if (entry.count >= maxTokens) {
    return { success: false, limit: maxTokens, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, limit: maxTokens, remaining: maxTokens - entry.count, resetAt: entry.resetAt };
}

// Convenience wrappers
export function rateLimitLogin(ip: string): RateLimitResult {
  const max    = parseInt(process.env.RATE_LIMIT_LOGIN_MAX    || "5");
  const window = parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW || "900") * 1000;
  return rateLimit(`login:${ip}`, max, window);
}

export function rateLimitAPI(ip: string, route: string): RateLimitResult {
  const max    = parseInt(process.env.RATE_LIMIT_API_MAX    || "100");
  const window = parseInt(process.env.RATE_LIMIT_API_WINDOW || "60") * 1000;
  return rateLimit(`api:${ip}:${route}`, max, window);
}

export function rateLimitPunch(userId: string): RateLimitResult {
  // Max 10 punches per hour per user (prevents spam)
  return rateLimit(`punch:${userId}`, 10, 60 * 60 * 1000);
}
