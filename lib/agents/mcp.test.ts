import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startFakeShadow, type FakeShadow } from "@/test/fake-shadow";
import { createAvailabilityCache } from "../booking/cache";
import { createLookupLimiters } from "../booking/limits";
import { addDays } from "../dates";
import { createRateLimiter } from "../rate-limit";
import { bookingLink, createMcpHandler, methodNotAllowed, PROTOCOL_VERSIONS, type McpDeps } from "./mcp";

const siteUrl = "https://thehouseofjars.com";
// Saturday 26 September 2026, midday in Vientiane.
const NOW = Date.UTC(2026, 8, 26, 5);
const TODAY = "2026-09-26";

let fake: FakeShadow;
beforeAll(async () => {
  fake = await startFakeShadow({ now: () => NOW });
});
afterAll(async () => {
  await fake.close();
});

function handler(overrides: Partial<McpDeps> & { online?: boolean } = {}) {
  const online = overrides.online ?? false;
  return createMcpHandler({
    siteUrl,
    onlineBooking: () => online,
    availability: {
      config: () => (online ? { apiUrl: fake.url, key: fake.key } : null),
      cache: createAvailabilityCache(() => NOW),
      limiters: createLookupLimiters(() => NOW),
      now: () => NOW,
    },
    limiter: createRateLimiter({ capacity: 100, refillMs: 1_000 }),
    ...overrides,
  });
}

let nextId = 1;
function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(`${siteUrl}/api/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "x-real-ip": "203.0.113.9", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const call = (method: string, params?: Record<string, unknown>) => post({ jsonrpc: "2.0", id: nextId++, method, ...(params ? { params } : {}) });

async function rpc(response: Response) {
  expect(response.headers.get("content-type")).toContain("application/json");
  return (await response.json()) as { id: unknown; result?: Record<string, unknown>; error?: { code: number; message: string } };
}

const toolText = (result: Record<string, unknown> | undefined) => (result!.content as { type: string; text: string }[])[0]!.text;

describe("the MCP server for AI assistants", () => {
  it("introduces itself and agrees on a protocol version", async () => {
    const reply = await rpc(await handler()(call("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } })));
    expect(reply.result).toMatchObject({
      protocolVersion: "2025-06-18",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "house-of-jars" },
    });
    const newer = await rpc(await handler()(call("initialize", { protocolVersion: "2099-01-01" })));
    expect(newer.result!.protocolVersion).toBe(PROTOCOL_VERSIONS[0]);
  });

  it("offers free beds only when the site takes bookings online, and every tool only reads", async () => {
    const offline = await rpc(await handler()(call("tools/list")));
    const online = await rpc(await handler({ online: true })(call("tools/list")));
    const names = (reply: Awaited<ReturnType<typeof rpc>>) => (reply.result!.tools as { name: string }[]).map((tool) => tool.name);
    expect(names(offline)).toEqual(["house_information", "booking_link"]);
    expect(names(online)).toEqual(["house_information", "check_availability", "booking_link"]);
    for (const tool of online.result!.tools as { annotations: { readOnlyHint: boolean; destructiveHint: boolean } }[]) {
      expect(tool.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
    }
  });

  it("tells the house's facts", async () => {
    const reply = await rpc(await handler()(call("tools/call", { name: "house_information", arguments: {} })));
    expect(reply.result!.isError).toBe(false);
    expect(toolText(reply.result)).toContain("House of Jars");
    expect(toolText(reply.result)).toContain("Check-in from 14:00");
  });

  it("gives the booking page at the free beds when booking is online, otherwise the booking sites and WhatsApp", async () => {
    const stay = { check_in: "2026-10-10", check_out: "2026-10-12", guests: 2 };
    const online = await rpc(await handler({ online: true })(call("tools/call", { name: "booking_link", arguments: stay })));
    expect(toolText(online.result).split("\n")[0]).toBe(`${siteUrl}/book?check_in=2026-10-10&check_out=2026-10-12&guests=2`);
    expect(bookingLink(siteUrl, stay)).toBe(`${siteUrl}/book?check_in=2026-10-10&check_out=2026-10-12&guests=2`);

    const offline = toolText((await rpc(await handler()(call("tools/call", { name: "booking_link", arguments: stay })))).result);
    expect(offline).toContain("doesn't take bookings yet");
    expect(offline).toContain("booking.com");
    expect(offline).toContain("agoda");
    expect(offline).toMatch(/https:\/\/wa\.me\/\d+\?text=/);
    expect(decodeURIComponent(offline)).toContain("2 beds from 2026-10-10 to 2026-10-12 (2 nights)");
    expect(offline).not.toContain("/book?");
  });

  it("refuses a stay that makes no sense, as a tool error the assistant can read", async () => {
    const reply = await rpc(
      await handler()(call("tools/call", { name: "booking_link", arguments: { check_in: "2026-10-12", check_out: "2026-10-10", guests: 1 } })),
    );
    expect(reply.result!.isError).toBe(true);
    expect(toolText(reply.result)).toContain("check_out must be after check_in");
  });

  it("looks up free beds through the booking form's own path, without prices, with the link to book", async () => {
    const stay = { check_in: addDays(TODAY, 7), check_out: addDays(TODAY, 9), guests: 1 };
    const reply = await rpc(await handler({ online: true })(call("tools/call", { name: "check_availability", arguments: stay })));
    expect(reply.result!.isError).toBe(false);
    const content = toolText(reply.result);
    const facts = JSON.parse(content.split("\n\n")[0]!) as Record<string, unknown>;
    expect(facts).toMatchObject({ check_in: stay.check_in, check_out: stay.check_out, guests: 1 });
    expect(content).not.toMatch(/"price"/);
    expect(content).toContain(`${siteUrl}/book?check_in=${stay.check_in}&check_out=${stay.check_out}&guests=1`);
  });

  it("answers unknown methods and tools as JSON-RPC errors", async () => {
    expect((await rpc(await handler()(call("resources/list")))).error!.code).toBe(-32601);
    expect((await rpc(await handler()(call("tools/call", { name: "book_now", arguments: {} })))).error!.code).toBe(-32602);
  });

  it("accepts notifications without a reply, and refuses batches and malformed messages", async () => {
    expect((await handler()(post({ jsonrpc: "2.0", method: "notifications/initialized" }))).status).toBe(202);
    expect((await handler()(post([{ jsonrpc: "2.0", id: 1, method: "ping" }]))).status).toBe(400);
    expect((await handler()(post("{not json"))).status).toBe(400);
    expect((await handler()(post({ id: 1, method: "ping" }))).status).toBe(400);
  });

  it("keeps browsers on other sites out, and speaks only the versions it knows", async () => {
    expect((await handler()(post({ jsonrpc: "2.0", id: 1, method: "ping" }, { origin: "https://evil.example" }))).status).toBe(403);
    expect((await handler()(post({ jsonrpc: "2.0", id: 1, method: "ping" }, { "content-type": "text/plain" }))).status).toBe(415);
    expect((await handler()(post({ jsonrpc: "2.0", id: 1, method: "ping" }, { "mcp-protocol-version": "1999-01-01" }))).status).toBe(400);
    expect((await handler()(post({ jsonrpc: "2.0", id: 1, method: "ping" }, { "mcp-protocol-version": "2025-06-18" }))).status).toBe(200);
  });

  it("limits how fast one client can ask", async () => {
    const strict = handler({ limiter: createRateLimiter({ capacity: 1, refillMs: 60_000 }) });
    expect((await strict(call("ping"))).status).toBe(200);
    const limited = await strict(call("ping"));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toMatch(/^\d+$/);
  });

  it("keeps no stream or session: anything but POST is refused", () => {
    const response = methodNotAllowed();
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });
});

describe("the API description", async () => {
  const { openApiDocument } = await import("./openapi");

  it("describes the read-only doors, and no way to book", () => {
    const document = openApiDocument(siteUrl, false);
    expect(document.openapi).toBe("3.1.0");
    expect(Object.keys(document.paths)).toEqual(["/api/availability", "/api/mcp"]);
    expect(JSON.stringify(document)).not.toContain("/api/booking");
    expect(JSON.stringify(document)).not.toContain("/api/inquiry");
    expect(document.paths["/api/availability"].get.description).toContain("not_configured");
    expect(openApiDocument(siteUrl, true).paths["/api/mcp"].post.description).toContain("check_availability");
  });
});
