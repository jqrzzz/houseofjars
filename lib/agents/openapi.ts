import { identity } from "@/content/identity";
import { MAX_GUESTS } from "../booking/types";

/**
 * /openapi.json: the website's public, read-only API, described for AI
 * assistants and tools that read OpenAPI. The free-beds lookup is the one
 * the booking page itself uses (same checks and limits); the MCP server is
 * the richer door (lib/agents/mcp.ts). Booking requests are not listed: the
 * traveller sends those on the website.
 */
export function openApiDocument(siteUrl: string, onlineBooking: boolean) {
  const date = (description: string) => ({ in: "query", required: true, schema: { type: "string", format: "date" }, description });
  return {
    openapi: "3.1.0",
    info: {
      title: `${identity.fullName.value}: public API`,
      version: "1.0.0",
      description:
        `Read-only doors for assistants acting for a traveller. Facts: ${siteUrl}/llms-full.txt. ` +
        `Booking: send the traveller to ${siteUrl}/book?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&guests=N, where they ` +
        "send the request themselves; nothing is booked or paid until the team confirms.",
      contact: { email: identity.contact.email.value, url: `${siteUrl}/` },
    },
    servers: [{ url: siteUrl }],
    paths: {
      "/api/availability": {
        get: {
          operationId: "checkAvailability",
          summary: "Free beds for one stay",
          description: onlineBooking
            ? "Which room types have beds free on every night of the stay, live from the house's booking system, with prices where the house has set them. Reads only: nothing is held."
            : "Online booking isn't open yet: this answers 503 not_configured. Use Booking.com or Agoda, or the booking page's message form.",
          parameters: [
            { name: "check_in", ...date("Arrival date, YYYY-MM-DD.") },
            { name: "check_out", ...date("Departure date, YYYY-MM-DD, after check_in.") },
            { name: "guests", in: "query", required: true, schema: { type: "integer", minimum: 1, maximum: MAX_GUESTS }, description: "Number of guests." },
          ],
          responses: {
            "200": { description: "The stay, the house's limits, and each room type's free beds per night." },
            "400": { description: "The stay isn't valid (issues say why)." },
            "429": { description: "Too many lookups from this client: wait for retry-after seconds." },
            "503": { description: "Online booking isn't open (not_configured), or the booking system is busy." },
          },
        },
      },
      "/api/mcp": {
        post: {
          operationId: "mcp",
          summary: "Model Context Protocol server (Streamable HTTP, stateless)",
          description:
            "JSON-RPC 2.0 messages per the Model Context Protocol. Tools: house_information, " +
            (onlineBooking ? "check_availability, " : "") +
            "booking_link. All read-only; no sign-in.",
          requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } },
          responses: {
            "200": { description: "The JSON-RPC response." },
            "202": { description: "A notification, accepted." },
            "429": { description: "Too many messages from this client." },
          },
        },
      },
    },
  } as const;
}
