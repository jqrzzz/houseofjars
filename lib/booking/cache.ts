import { processSingleton } from "../gate";
import type { AvailabilityQuery } from "./contract";
import type { LookupResult } from "./shadow";

/** How long an answer from Shadow is reused for the same dates and guests. */
export const AVAILABILITY_TTL_MS = 60_000;
const MAX_ENTRIES = 500;

interface Entry {
  readonly query: AvailabilityQuery;
  readonly expires: number;
  readonly result: Promise<LookupResult>;
}

export interface AvailabilityCache {
  /** The answer (or the lookup still under way) for exactly this query, while fresh. */
  get(query: AvailabilityQuery): Promise<LookupResult> | null;
  /** Keeps a lookup for AVAILABILITY_TTL_MS; failures worth asking again about are dropped once they arrive. */
  put(query: AvailabilityQuery, result: Promise<LookupResult>): void;
  /** Forgets every answer about a night in [checkIn, checkOut): beds there were just booked, or turned out taken. */
  invalidate(checkIn: string, checkOut: string): void;
  readonly size: number;
}

/**
 * One key per stay: the query as parseAvailabilityQuery checked it (real
 * dates, a whole number of guests), never the text of the URL, so the order
 * of the parameters, repeated or extra ones, or "02" for 2 guests all find
 * the same answer.
 */
const keyOf = (query: AvailabilityQuery) => `${query.check_in}|${query.check_out}|${query.guests}`;

/**
 * In memory, per server instance. Identical lookups share one call to
 * Shadow, even while it is still on its way. Answers are kept: availability,
 * "not open", and Shadow turning the stay down (the house's limits), which
 * it would do again for the same query. Failures (busy, unreachable) are
 * worth asking again about straight away.
 */
export function createAvailabilityCache(now: () => number = Date.now): AvailabilityCache {
  const entries = new Map<string, Entry>();
  return {
    get(query) {
      const key = keyOf(query);
      const entry = entries.get(key);
      if (!entry) return null;
      if (entry.expires <= now()) {
        entries.delete(key);
        return null;
      }
      return entry.result;
    },
    put(query, result) {
      const key = keyOf(query);
      const entry: Entry = { query, expires: now() + AVAILABILITY_TTL_MS, result };
      entries.delete(key);
      entries.set(key, entry);
      // The Map keeps insertion order: the first entries are the oldest.
      for (const [oldKey, old] of entries) {
        if (entries.size <= MAX_ENTRIES && old.expires > now()) break;
        entries.delete(oldKey);
      }
      void result.then((answer) => {
        const keep = answer.ok || answer.error === "not_configured" || answer.error === "invalid_request";
        if (!keep && entries.get(key) === entry) entries.delete(key);
      });
    },
    invalidate(checkIn, checkOut) {
      for (const [key, entry] of entries) {
        if (entry.query.check_in < checkOut && checkIn < entry.query.check_out) entries.delete(key);
      }
    },
    get size() {
      return entries.size;
    },
  };
}

/** The one cache in this server process, shared by /api/availability and /api/booking. */
export function sharedAvailabilityCache(): AvailabilityCache {
  return processSingleton("houseofjars.availability-cache", () => createAvailabilityCache());
}
