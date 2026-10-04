import { z } from "zod";
import { availabilityChecker } from "../concierge/availability";
import { identity, whatsappUrl } from "@/content/identity";
import { policies } from "@/content/stay";
import { directLinks } from "../booking/direct";
import type { AvailabilityDeps } from "../booking/handler";
import { MAX_GUESTS } from "../booking/types";
import { json, readJsonBody, rejectCrossSite } from "../http";
import { nightsBetween } from "../dates";
import { buildLlmsFullTxt } from "../llms";
import { clientKey } from "../rate-limit";
import { pages } from "../site";

/*
 * The house's door for AI assistants: a Model Context Protocol server
 * (modelcontextprotocol.io), so an assistant acting for a traveller can read
 * the house's facts, look up free beds and hand the traveller a booking link
 * with the stay filled in. Streamable HTTP, stateless: every message is one
 * POST, answered with one JSON response. Nothing here writes: no assistant
 * can book, hold a bed, send a message or see a price; the traveller finishes
 * on the website, and the team confirms.
 */

/** Newest first: the version a client asks for if we speak it, else our newest. */
export const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"] as const;

const MAX_MESSAGE_BYTES = 16_384;

const SERVER_INFO = { name: "house-of-jars", title: "House of Jars Hostel, Vientiane", version: "1.0.0" };

interface RateLimiter {
  take(key: string): { allowed: boolean; retryAfterSeconds: number };
}

export interface McpDeps {
  readonly siteUrl: string;
  /** The site takes booking requests online (lib/booking/config.ts): check_availability is offered only then. */
  readonly onlineBooking: () => boolean;
  /** The very lookup /book and Shadow use: same checks, cache and limits. */
  readonly availability: AvailabilityDeps;
  /** Messages per client, before any tool runs. */
  readonly limiter: RateLimiter;
}

const stayInput = {
  type: "object",
  additionalProperties: false,
  properties: {
    check_in: { type: "string", format: "date", description: "Arrival date, YYYY-MM-DD." },
    check_out: { type: "string", format: "date", description: "Departure date, YYYY-MM-DD, after check_in." },
    guests: { type: "integer", minimum: 1, maximum: MAX_GUESTS, description: `Number of guests, 1 to ${MAX_GUESTS}.` },
  },
  required: ["check_in", "check_out", "guests"],
} as const;

const staySchema = z
  .strictObject({ check_in: z.iso.date(), check_out: z.iso.date(), guests: z.number().int().min(1).max(MAX_GUESTS) })
  .refine((stay) => stay.check_out > stay.check_in, { message: "check_out must be after check_in", path: ["check_out"] });

const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

function tools(online: boolean) {
  return [
    {
      name: "house_information",
      title: "About House of Jars",
      description:
        "Everything the House of Jars website says, as plain text: the hostel, its address and how to reach the team " +
        "(WhatsApp, phone, email), check-in and check-out, the pods and dorms, breakfast, house rules, getting there from " +
        "Wattay Airport, what is nearby, entry to Laos, and answers to common questions. Facts that come only from guest " +
        "reviews or general practice say so. Read this before answering a traveller's questions about the house.",
      inputSchema: { type: "object", additionalProperties: false, properties: {} },
      annotations: readOnly,
    },
    ...(online
      ? [
          {
            name: "check_availability",
            title: "Free beds for a stay",
            description:
              "Which beds are free at House of Jars for one stay, live from the house's booking system. It only reads: it " +
              "books nothing, holds nothing and shows no prices. Returns each room type with the fewest free beds across the " +
              "nights and whether it can be booked for that many guests (or why the stay can't be booked online), and a link " +
              "the traveller opens to see prices and send the booking request themselves.",
            inputSchema: stayInput,
            annotations: { ...readOnly, idempotentHint: false, openWorldHint: true },
          },
        ]
      : []),
    {
      name: "booking_link",
      title: "Booking link with the stay filled in",
      description: online
        ? "A link to the House of Jars booking page with the dates and number of guests filled in: the traveller sees the " +
          "free beds and prices there and sends the booking request themselves. Nothing is booked or paid until the team confirms."
        : "How the traveller books these dates directly with the house: its website doesn't take bookings online yet, so " +
          "this gives the booking page with the stay filled in and the team's WhatsApp and email, each with the request " +
          "written out ready to send; the team replies with what is free. Booking.com and Agoda come last, as alternatives.",
      inputSchema: stayInput,
      annotations: readOnly,
    },
  ];
}

const messageSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]).optional(),
  method: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
});

type Id = string | number;

const result = (id: Id, value: unknown) => json({ jsonrpc: "2.0", id, result: value });
const failure = (id: Id | null, code: number, message: string, status = 200) =>
  json({ jsonrpc: "2.0", id, error: { code, message } }, status);
const text = (value: string, isError = false) => ({ content: [{ type: "text", text: value }], isError });

type Stay = { check_in: string; check_out: string; guests: number };

/** The booking page at the free beds for a stay. */
export function bookingLink(siteUrl: string, stay: Stay): string {
  const query = new URLSearchParams({ check_in: stay.check_in, check_out: stay.check_out, guests: String(stay.guests) });
  return `${new URL(pages.book.path, `${siteUrl}/`)}?${query}`;
}

/**
 * Without online booking: booking direct first (the booking page with the
 * stay filled in, and WhatsApp and email with it written out, as the page
 * writes it: lib/booking/direct.ts), then the booking sites.
 */
function direct(siteUrl: string, stay: Stay): string {
  const links = directLinks(
    { checkIn: stay.check_in, nights: nightsBetween(stay.check_in, stay.check_out), guests: stay.guests },
    { whatsapp: whatsappUrl(), email: identity.contact.email.value },
  );
  return [
    `Book direct with the house. ${policies.directPrice.value} Its website doesn't take bookings online yet: the traveller sends these dates to the team, who reply with what is free. Nothing is booked until the team confirms.`,
    `- The booking page with this stay filled in, to send on WhatsApp or by email: ${bookingLink(siteUrl, stay)}#message`,
    `- WhatsApp, with the request ready to send: ${links.whatsapp}`,
    `- Email, with the request ready to send: ${links.email}`,
    `- Also on Booking.com (live prices and free beds): ${identity.links.booking.value}`,
    `- Also on Agoda (live prices and free beds): ${identity.links.agoda.value}`,
  ].join("\n");
}

async function callTool(name: string, args: unknown, client: string, deps: McpDeps) {
  const online = deps.onlineBooking();
  switch (name) {
    case "house_information":
      return text(buildLlmsFullTxt(deps.siteUrl, { onlineBooking: online }));
    case "booking_link": {
      const stay = staySchema.safeParse(args ?? {});
      if (!stay.success) return text(`Invalid stay: ${stay.error.issues.map((issue) => issue.message).join("; ")}`, true);
      if (!online) return text(direct(deps.siteUrl, stay.data));
      return text(
        `${bookingLink(deps.siteUrl, stay.data)}\n\nThe traveller opens it to see free beds and prices and sends the booking request themselves; the team confirms it.`,
      );
    }
    case "check_availability": {
      if (!online) return text("Online booking isn't open: use booking_link, or Booking.com and Agoda for live availability.", true);
      const outcome = await availabilityChecker(deps.availability, client)(args ?? {});
      if (outcome.isError) return text(outcome.content, true);
      const stay = staySchema.safeParse(args);
      const link = stay.success ? bookingLink(deps.siteUrl, stay.data) : null;
      return text(link ? `${outcome.content}\n\nBooking page with this stay filled in: ${link}` : outcome.content);
    }
    default:
      return null;
  }
}

async function answer(message: z.output<typeof messageSchema>, client: string, deps: McpDeps): Promise<Response> {
  const id = message.id!;
  switch (message.method) {
    case "initialize": {
      const asked = message.params?.protocolVersion;
      const version = PROTOCOL_VERSIONS.find((known) => known === asked) ?? PROTOCOL_VERSIONS[0];
      return result(id, {
        protocolVersion: version,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          `${identity.fullName.value}: a calm dorm hostel in central Vientiane, Laos. Read house_information for the facts. ` +
          "Assistants can look things up and give the traveller a booking link, but can't book: the traveller sends the " +
          "request themselves (on the website, or on WhatsApp or by email) and the team confirms it. Booking direct with the " +
          `house comes first: ${policies.directPrice.value.charAt(0).toLowerCase()}${policies.directPrice.value.slice(1)} ` +
          "Never quote a price that isn't on the house's own pages or booking sites.",
      });
    }
    case "ping":
      return result(id, {});
    case "tools/list":
      return result(id, { tools: tools(deps.onlineBooking()) });
    case "tools/call": {
      const name = message.params?.name;
      if (typeof name !== "string") return failure(id, -32602, "params.name is required");
      const called = await callTool(name, message.params?.arguments, client, deps);
      return called ? result(id, called) : failure(id, -32602, `Unknown tool: ${name}`);
    }
    default:
      return failure(id, -32601, `Method not found: ${message.method}`);
  }
}

/** POST /api/mcp: one JSON-RPC message in, one response out. */
export function createMcpHandler(deps: McpDeps) {
  return async function POST(request: Request): Promise<Response> {
    const refused = rejectCrossSite(request, deps.siteUrl);
    if (refused) return refused;

    const version = request.headers.get("mcp-protocol-version");
    if (version !== null && !(PROTOCOL_VERSIONS as readonly string[]).includes(version)) {
      return failure(null, -32600, `Unsupported MCP-Protocol-Version: ${version}`, 400);
    }

    const client = clientKey(request.headers);
    const allowed = deps.limiter.take(client);
    if (!allowed.allowed) {
      return json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "Too many requests" } }, 429, {
        "retry-after": String(allowed.retryAfterSeconds),
      });
    }

    const body = await readJsonBody(request, MAX_MESSAGE_BYTES);
    if (!body.ok) return failure(null, -32700, body.status === 413 ? "Message too large" : "Parse error", body.status);
    if (Array.isArray(body.value)) return failure(null, -32600, "Batches are not supported", 400);
    const message = messageSchema.safeParse(body.value);
    if (!message.success) return failure(null, -32600, "Invalid request", 400);

    // A notification (no id) or a response from the client: accepted, nothing to say.
    if (message.data.id === undefined) return new Response(null, { status: 202 });
    return answer(message.data, client, deps);
  };
}

/** Anything but POST: this server keeps no stream and no session. */
export function methodNotAllowed(): Response {
  return new Response(null, { status: 405, headers: { allow: "POST" } });
}
