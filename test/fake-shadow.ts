/**
 * A stand-in for Shadow Check-in's public API on this machine, for tests,
 * the smoke test and trying the booking form locally. It implements the
 * booking contract (docs/BOOKING_API.md) and the inquiry contract
 * (docs/INQUIRY_API.md) from their text, checking requests by hand rather
 * than with the website's own schemas, so a website that drifts from the
 * contract fails against it. It follows the contract's additions of 27
 * September too: the price protection (409 price_changed) and the hold
 * limits (a 6-hour hold by default, at most 2 active holds per email or
 * phone; beyond them a request is pending with no hold). The other hold cap,
 * a share of each room type's beds, is left to Shadow Check-in's own tests.
 *
 *   npm run fake-shadow            # http://127.0.0.1:4010 (FAKE_SHADOW_PORT to change)
 *
 * Its rooms and rates are test fixtures, not facts about the house.
 */
import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";

/** The key the fake accepts unless told otherwise ("sck_" + 43 characters, like a real one). */
export const FAKE_SHADOW_KEY = "sck_fakeShadowCheckinKeyForLocalTestsOnly000000";

const DAY_MS = 86_400_000;
const MAX_BODY_BYTES = 16 * 1024;
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const BOOKING_KEYS = [
  "client_ref",
  "room_type_id",
  "check_in",
  "check_out",
  "guests",
  "name",
  "email",
  "phone",
  "preferred_contact",
  "arrival_time",
  "message",
  "consent",
] as const;
/** The contract's additions of 27 September: the total the guest saw, both or neither. */
const QUOTE_KEYS = ["quoted_total", "quoted_currency"] as const;

/** Per guest per night; Friday and Saturday nights cost `weekend` when given. */
export interface FakeRate {
  readonly currency: "LAK" | "USD";
  readonly amount: number;
  readonly weekend?: number;
}

export interface FakeRoom {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly description: string | null;
  readonly features: readonly string[];
  readonly beds: number;
  /** Null: no rate set. */
  readonly rate: FakeRate | null;
}

/** Test fixtures: a priced dorm, a dorm without a rate, and a small room priced in dollars. */
export const FAKE_ROOMS: readonly FakeRoom[] = [
  {
    id: "5b0c3a0e-2f7e-4c55-9a55-1f6f3c1d2a01",
    name: "Mixed dorm",
    kind: "mixed_dorm",
    description: "Pod beds with curtains, on the first floor.",
    features: ["Curtained pod beds", "Reading light", "Locker"],
    beds: 14,
    rate: { currency: "LAK", amount: 90_000, weekend: 100_000 },
  },
  {
    id: "0f7d9c52-8b1e-4d3a-b6c4-2e5a7f9d1b02",
    name: "Female dorm",
    kind: "female_dorm",
    description: null,
    features: ["Curtained pod beds", "Locker"],
    beds: 6,
    rate: null,
  },
  {
    id: "c3e8a1f4-6d2b-4f9e-8a7c-5b1d3e9f2c03",
    name: "Private room",
    kind: "private",
    description: "Two beds and a desk.",
    features: ["Two beds", "Desk"],
    beds: 2,
    rate: { currency: "USD", amount: 18 },
  },
];

/**
 * open: answers as the contract says. The others answer every call with:
 * not_configured 503, rate_limited 429, server_error 500, malformed a 200
 * or 201 that doesn't fit the contract, too_large 413 (booking requests only).
 */
export type FakeMode = "open" | "not_configured" | "rate_limited" | "server_error" | "malformed" | "too_large";

export interface FakeState {
  mode: FakeMode;
  bookingMode: "request" | "instant";
  /** How long a pending request holds its beds (the contract's default: 6 hours). */
  holdHours: number;
  /**
   * Active holds allowed per email or phone (the contract: 2). A request
   * beyond them is still accepted, pending with no hold (hold_expires_at
   * null), and holds no beds. 0: no request is held.
   */
  holdsPerContact: number;
  /**
   * The contract's price protection (quoted_total and quoted_currency).
   * False: a Shadow Check-in from before it, which refuses those keys as
   * unknown (400), as a strict body does.
   */
  quotes: boolean;
  limits: { max_guests: number; min_nights: number; max_nights: number; window_days: number };
  /** Booking requests per key in any rolling hour (the contract's example: 30). */
  hourlyLimit: number;
  /** Milliseconds to wait before answering (to test timeouts). */
  delayMs: number;
}

export interface FakeBooking {
  readonly request: Record<string, unknown>;
  readonly response: Record<string, unknown>;
  readonly at: number;
}

export interface FakeShadow {
  readonly url: string;
  readonly key: string;
  readonly state: FakeState;
  /** Every request, in order. */
  readonly calls: { method: string; path: string; status: number }[];
  /** Booking requests received, by client_ref. */
  readonly bookings: Map<string, FakeBooking>;
  /** Inquiries received, by client_ref. */
  readonly inquiries: Map<string, Record<string, unknown>>;
  /** Takes beds for other guests on the nights [from, to), as a booking elsewhere would. */
  occupy(roomId: string, from: string, to: string, beds: number): void;
  /** The house changes a room's rate (null: no rate set), until reset. */
  setRate(roomId: string, rate: FakeRate | null): void;
  /** Back to an empty house, open, with the default settings. */
  reset(): void;
  close(): Promise<void>;
}

const defaults = (): FakeState => ({
  mode: "open",
  bookingMode: "request",
  holdHours: 6,
  holdsPerContact: 2,
  quotes: true,
  limits: { max_guests: 6, min_nights: 1, max_nights: 30, window_days: 365 },
  hourlyLimit: 30,
  delayMs: 0,
});

const vientianeDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const isRealDate = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
const plusDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
const nightsOf = (from: string, to: string) => {
  const nights: string[] = [];
  for (let night = from; night < to; night = plusDays(night, 1)) nights.push(night);
  return nights;
};
const isUuid = (value: unknown) =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

interface Issue {
  field: string;
  message: string;
}

export async function startFakeShadow(
  options: { port?: number; host?: string; key?: string; now?: () => number } = {},
): Promise<FakeShadow> {
  const key = options.key ?? FAKE_SHADOW_KEY;
  const now = options.now ?? Date.now;
  const state = defaults();
  const calls: FakeShadow["calls"] = [];
  const bookings = new Map<string, FakeBooking>();
  const inquiries = new Map<string, Record<string, unknown>>();
  /** Beds taken per room and night, by bookings here and elsewhere. */
  const taken = new Map<string, number>();
  const takenOn = (roomId: string, night: string) => taken.get(`${roomId}|${night}`) ?? 0;
  const take = (roomId: string, nights: string[], beds: number) => {
    for (const night of nights) taken.set(`${roomId}|${night}`, takenOn(roomId, night) + beds);
  };
  const rates = new Map<string, FakeRate | null>();
  const rateOf = (room: FakeRoom) => (rates.has(room.id) ? rates.get(room.id)! : room.rate);
  let referenceCount = 0;

  const today = () => vientianeDay.format(now());

  /** Checks the stay the contract allows; the fields name the query's or body's keys. */
  function stayIssues(checkIn: unknown, checkOut: unknown, guests: unknown): Issue[] {
    const issues: Issue[] = [];
    if (!isRealDate(checkIn)) issues.push({ field: "check_in", message: "check_in must be a date (YYYY-MM-DD)." });
    if (!isRealDate(checkOut)) issues.push({ field: "check_out", message: "check_out must be a date (YYYY-MM-DD)." });
    if (!Number.isInteger(guests) || (guests as number) < 1 || (guests as number) > state.limits.max_guests) {
      issues.push({ field: "guests", message: `guests must be 1 to ${state.limits.max_guests}.` });
    }
    if (issues.some((issue) => issue.field !== "guests")) return issues;
    const [from, to] = [checkIn as string, checkOut as string];
    if (from < today()) issues.push({ field: "check_in", message: "check_in is in the past." });
    if (to <= from) issues.push({ field: "check_out", message: "check_out must be after check_in." });
    const nights = nightsOf(from, to).length;
    if (to > from && (nights < state.limits.min_nights || nights > state.limits.max_nights)) {
      issues.push({ field: "check_out", message: `Stays are ${state.limits.min_nights} to ${state.limits.max_nights} nights.` });
    }
    if (to > plusDays(today(), state.limits.window_days)) {
      issues.push({ field: "check_out", message: "Outside the booking window." });
    }
    return issues;
  }

  function roomAvailability(room: FakeRoom, from: string, to: string, guests: number) {
    const nights = nightsOf(from, to);
    const freeEachNight = nights.map((night) => ({ date: night, free: Math.max(0, room.beds - takenOn(room.id, night)) }));
    const minFree = Math.min(...freeEachNight.map((night) => night.free));
    const rate = rateOf(room);
    const price = rate
      ? (() => {
          const perNight = nights.map((night) => {
            const day = new Date(`${night}T00:00:00Z`).getUTCDay();
            const weekend = (day === 5 || day === 6) && rate.weekend !== undefined;
            return { date: night, amount: weekend ? rate.weekend! : rate.amount };
          });
          return {
            currency: rate.currency,
            per_guest_per_night: perNight,
            total: perNight.reduce((sum, night) => sum + night.amount, 0) * guests,
          };
        })()
      : null;
    return { freeEachNight, minFree, price };
  }

  function availability(query: URLSearchParams): [number, unknown] {
    const guestsText = query.get("guests") ?? "";
    const guests = /^\d+$/.test(guestsText) ? Number(guestsText) : NaN;
    const [from, to] = [query.get("check_in"), query.get("check_out")];
    const issues = stayIssues(from, to, guests);
    if (issues.length > 0) return [400, { error: "invalid_request", issues }];
    return [
      200,
      {
        property: { name: "House of Jars", timezone: "Asia/Vientiane" },
        check_in: from,
        check_out: to,
        nights: nightsOf(from!, to!).length,
        guests,
        mode: state.bookingMode,
        hold_hours: state.holdHours,
        limits: { ...state.limits },
        room_types: FAKE_ROOMS.map((room) => {
          const { freeEachNight, minFree, price } = roomAvailability(room, from!, to!, guests);
          return {
            id: room.id,
            name: room.name,
            kind: room.kind,
            description: room.description,
            features: [...room.features],
            free_each_night: freeEachNight,
            min_free: minFree,
            bookable: minFree >= guests,
            price,
          };
        }),
      },
    ];
  }

  /** The contract's body rules, by hand. */
  function bookingIssues(body: Record<string, unknown>): Issue[] {
    const issues: Issue[] = [];
    const keys = Object.keys(body);
    const known: readonly string[] = state.quotes ? [...BOOKING_KEYS, ...QUOTE_KEYS] : BOOKING_KEYS;
    for (const extra of keys.filter((k) => !known.includes(k))) {
      issues.push({ field: extra, message: "Unknown key." });
    }
    if (state.quotes) {
      const [total, currency] = [body.quoted_total, body.quoted_currency];
      const quoted = "quoted_total" in body || "quoted_currency" in body;
      const whole =
        (total === null && currency === null) ||
        (typeof total === "number" && total >= 0 && (currency === "LAK" || currency === "USD"));
      if (quoted && !whole) issues.push({ field: "quoted_total", message: "A total and its currency, or both null." });
    }
    for (const missing of BOOKING_KEYS.filter((k) => !keys.includes(k))) {
      issues.push({ field: missing, message: "Missing (send null for an empty optional field)." });
    }
    const text = (value: unknown, min: number, max: number) =>
      typeof value === "string" && value === value.trim() && value.length >= min && value.length <= max;
    const nullOr = (value: unknown, ok: (v: unknown) => boolean) => value === null || ok(value);
    if (!isUuid(body.client_ref)) issues.push({ field: "client_ref", message: "Must be a UUID." });
    if (!isUuid(body.room_type_id)) issues.push({ field: "room_type_id", message: "Must be a UUID." });
    else if (!FAKE_ROOMS.some((room) => room.id === body.room_type_id)) {
      issues.push({ field: "room_type_id", message: "Unknown room type." });
    }
    issues.push(...stayIssues(body.check_in, body.check_out, body.guests));
    if (!text(body.name, 1, 120)) issues.push({ field: "name", message: "1 to 120 characters, trimmed." });
    const email = (v: unknown) => typeof v === "string" && v === v.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    if (!nullOr(body.email, email)) issues.push({ field: "email", message: "A valid email or null." });
    if (!nullOr(body.phone, (v) => text(v, 5, 40))) issues.push({ field: "phone", message: "5 to 40 characters or null." });
    if (!body.email && !body.phone) issues.push({ field: "email", message: "Email or phone is required." });
    if (!nullOr(body.preferred_contact, (v) => v === "email" || v === "whatsapp" || v === "phone")) {
      issues.push({ field: "preferred_contact", message: "email, whatsapp, phone or null." });
    }
    const hhmm = (v: unknown) => typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
    if (!nullOr(body.arrival_time, hhmm)) issues.push({ field: "arrival_time", message: "HH:MM or null." });
    if (!nullOr(body.message, (v) => text(v, 1, 2000))) issues.push({ field: "message", message: "Up to 2000 characters or null." });
    if (body.consent !== true) issues.push({ field: "consent", message: "Must be true." });
    return issues;
  }

  function bookingRequest(body: Record<string, unknown>): [number, unknown] {
    const issues = bookingIssues(body);
    if (issues.length > 0) return [400, { error: "invalid_request", issues }];

    const repeat = bookings.get(body.client_ref as string);
    if (repeat) return [200, repeat.response];

    const hourAgo = now() - 3_600_000;
    if ([...bookings.values()].filter((booking) => booking.at > hourAgo).length >= state.hourlyLimit) {
      return [429, { error: "rate_limited" }];
    }

    const room = FAKE_ROOMS.find((candidate) => candidate.id === body.room_type_id)!;
    const [from, to, guests] = [body.check_in as string, body.check_out as string, body.guests as number];
    const { minFree, price } = roomAvailability(room, from, to, guests);
    if (minFree < guests) return [409, { error: "unavailable" }];
    // The price protection: the total the guest saw must be the one booked, or nothing is.
    const [total, currency] = [price?.total ?? null, price?.currency ?? null];
    if ("quoted_total" in body && (body.quoted_total !== total || body.quoted_currency !== currency)) {
      return [409, { error: "price_changed", total, currency }];
    }

    const pending = state.bookingMode === "request";
    // Holds are a courtesy: a contact's requests beyond the limit are pending with no hold, and hold no beds.
    const sameContact = (request: Record<string, unknown>) =>
      (body.email !== null && request.email === body.email) || (body.phone !== null && request.phone === body.phone);
    const holding = [...bookings.values()].filter(
      (booking) =>
        typeof booking.response.hold_expires_at === "string" &&
        Date.parse(booking.response.hold_expires_at) > now() &&
        sameContact(booking.request),
    ).length;
    const held = pending && holding < state.holdsPerContact;
    if (!pending || held) take(room.id, nightsOf(from, to), guests);
    referenceCount += 1;
    let code = "";
    for (let n = referenceCount * 7_919 + 104_729, i = 0; i < 6; i++, n = Math.floor(n / REFERENCE_ALPHABET.length)) {
      code += REFERENCE_ALPHABET[n % REFERENCE_ALPHABET.length];
    }
    const response = {
      id: randomUUID(),
      reference: `HOJ-${code}`,
      status: pending ? "pending" : "confirmed",
      hold_expires_at: held ? new Date(now() + state.holdHours * 3_600_000).toISOString() : null,
      total,
      currency,
    };
    bookings.set(body.client_ref as string, { request: body, response, at: now() });
    return [201, response];
  }

  function inquiry(body: Record<string, unknown>): [number, unknown] {
    if (!isUuid(body.client_ref) || typeof body.name !== "string" || typeof body.message !== "string" || body.consent !== true) {
      return [400, { error: "invalid_request", issues: [{ field: "body", message: "Not an inquiry." }] }];
    }
    const ref = body.client_ref as string;
    const known = inquiries.has(ref);
    if (!known) inquiries.set(ref, body);
    return [known ? 200 : 201, { id: `inq-${ref.slice(0, 8)}`, status: "received" }];
  }

  async function readBody(request: IncomingMessage): Promise<{ tooLarge: true } | { tooLarge: false; json: unknown }> {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
      size += (chunk as Buffer).byteLength;
      if (size > MAX_BODY_BYTES) return { tooLarge: true };
      chunks.push(chunk as Buffer);
    }
    try {
      return { tooLarge: false, json: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
    } catch {
      return { tooLarge: false, json: undefined };
    }
  }

  async function answer(request: IncomingMessage): Promise<[number, unknown]> {
    const url = new URL(request.url ?? "/", "http://fake-shadow");
    const route = `${request.method} ${url.pathname}`;
    const known = ["GET /api/public/availability", "POST /api/public/booking-requests", "POST /api/public/inquiries"];
    if (!known.includes(route)) return [404, { error: "not_found" }];

    if (state.mode === "not_configured") return [503, { error: "not_configured" }];
    if (request.headers.authorization !== `Bearer ${key}`) return [401, { error: "unauthorized" }];
    if (state.mode === "rate_limited") return [429, { error: "rate_limited" }];
    if (state.mode === "server_error") return [500, { error: "server_error" }];
    if (state.mode === "malformed") return [route.startsWith("GET") ? 200 : 201, { ok: true }];

    if (route === "GET /api/public/availability") return availability(url.searchParams);

    if (state.mode === "too_large" && route.includes("booking")) return [413, { error: "payload_too_large" }];
    const body = await readBody(request);
    if (body.tooLarge) return [413, { error: "payload_too_large" }];
    if (typeof body.json !== "object" || body.json === null || Array.isArray(body.json)) {
      return [400, { error: "invalid_request", issues: [{ field: "body", message: "The body must be a JSON object." }] }];
    }
    const json = body.json as Record<string, unknown>;
    return route === "POST /api/public/booking-requests" ? bookingRequest(json) : inquiry(json);
  }

  async function handle(request: IncomingMessage, response: ServerResponse) {
    const [status, body] = await answer(request);
    if (state.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, state.delayMs));
    calls.push({ method: request.method ?? "", path: request.url ?? "", status });
    if (response.destroyed) return;
    response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify(body));
  }

  const server = createServer((request, response) => {
    handle(request, response).catch(() => {
      response.writeHead(500).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(options.port ?? 0, options.host ?? "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : options.port;

  return {
    url: `http://${options.host ?? "127.0.0.1"}:${port}`,
    key,
    state,
    calls,
    bookings,
    inquiries,
    occupy(roomId, from, to, beds) {
      take(roomId, nightsOf(from, to), beds);
    },
    setRate(roomId, rate) {
      rates.set(roomId, rate);
    },
    reset() {
      Object.assign(state, defaults());
      calls.length = 0;
      bookings.clear();
      inquiries.clear();
      taken.clear();
      rates.clear();
    },
    close() {
      server.closeAllConnections();
      return new Promise((resolve) => server.close(() => resolve()));
    },
  };
}

// `npm run fake-shadow`: run it on its own, for the smoke test or to try the booking form.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.FAKE_SHADOW_PORT ?? 4010);
  const fake = await startFakeShadow({ port, key: process.env.SHADOW_INQUIRY_KEY || FAKE_SHADOW_KEY });
  console.log(`Fake Shadow Check-in at ${fake.url}. Start the site with:
  SHADOW_API_URL=${fake.url} SHADOW_INQUIRY_KEY=${fake.key}`);
}
