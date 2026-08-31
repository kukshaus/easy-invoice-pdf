/**
 * A small fixed-window limiter held in this process's memory.
 *
 * Invoice storage deliberately has no database behind it, so the Redis-backed
 * limiter is not available here. The counters reset when the process restarts
 * and are not shared between instances, which is fine for the job: this exists
 * to stop one client hammering the disk, not to enforce a precise quota.
 */
interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

// Bounds the map so a flood of distinct IPs cannot grow it without limit
const MAX_TRACKED_IDENTIFIERS = 10_000;

export function checkInMemoryRateLimit({
  identifier,
  limit,
  windowMs,
}: {
  identifier: string;
  limit: number;
  windowMs: number;
}): { success: boolean } {
  const now = Date.now();
  const existing = windows.get(identifier);

  if (!existing || existing.resetAt <= now) {
    if (windows.size >= MAX_TRACKED_IDENTIFIERS) {
      for (const [key, value] of windows) {
        if (value.resetAt <= now) {
          windows.delete(key);
        }
      }

      // Still full of live windows: refuse rather than grow unbounded
      if (windows.size >= MAX_TRACKED_IDENTIFIERS) {
        return { success: false };
      }
    }

    windows.set(identifier, { count: 1, resetAt: now + windowMs });

    return { success: true };
  }

  if (existing.count >= limit) {
    return { success: false };
  }

  existing.count += 1;

  return { success: true };
}
