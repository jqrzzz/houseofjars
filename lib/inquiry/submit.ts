import { z } from "zod";
import { inquiryPayloadSchema, toFieldIssues, type FieldIssue } from "./schema";

export interface ShadowConfig {
  readonly apiUrl: string;
  readonly key: string;
}

/**
 * busy: Shadow's per-key hourly limit was reached. That limit is shared by
 * every guest, so this is never reported as the guest sending too much.
 */
export type SubmitError = "not_configured" | "invalid_request" | "busy" | "unavailable";

/** The HTTP status the website's own routes answer with for each failure. */
export const submitErrorStatus: Record<SubmitError, number> = {
  invalid_request: 400,
  busy: 503,
  not_configured: 503,
  unavailable: 502,
};

export type SubmitResult =
  | { readonly ok: true; readonly id: string; readonly duplicate: boolean }
  | { readonly ok: false; readonly error: SubmitError; readonly issues?: readonly FieldIssue[] };

export interface SubmitDeps {
  readonly config: ShadowConfig | null;
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
  readonly log?: (message: string) => void;
}

/** Reads Shadow's endpoint and key from the environment; null if either is missing. */
export function readShadowConfig(env: Readonly<Record<string, string | undefined>> = process.env): ShadowConfig | null {
  const apiUrl = env.SHADOW_API_URL?.trim();
  const key = env.SHADOW_INQUIRY_KEY?.trim();
  if (!apiUrl || !key) return null;
  return { apiUrl: apiUrl.replace(/\/+$/, ""), key };
}

const receivedSchema = z.object({ id: z.string().min(1), status: z.literal("received") });

/**
 * Validates an inquiry against the contract and forwards it to Shadow
 * Check-in. Used by /api/inquiry (the booking form) and /api/concierge/send
 * (a draft Shadow prepared, sent by the guest).
 * Never throws: every failure maps to a SubmitError.
 */
export async function submitInquiry(input: unknown, deps: SubmitDeps): Promise<SubmitResult> {
  const log = deps.log ?? ((message: string) => console.error(message));
  const parsed = inquiryPayloadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_request", issues: toFieldIssues(parsed.error) };
  if (!deps.config) return { ok: false, error: "not_configured" };

  const doFetch = deps.fetch ?? fetch;
  let response: Response;
  try {
    response = await doFetch(`${deps.config.apiUrl}/api/public/inquiries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${deps.config.key}`,
      },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(deps.timeoutMs ?? 10_000),
      cache: "no-store",
    });
  } catch (error) {
    log(`[inquiry] Shadow unreachable: ${error instanceof Error ? error.name : "unknown error"}`);
    return { ok: false, error: "unavailable" };
  }

  if (response.status === 201 || response.status === 200) {
    const body = receivedSchema.safeParse(await response.json().catch(() => null));
    if (!body.success) {
      log(`[inquiry] Shadow answered ${response.status} with an unexpected body`);
      return { ok: false, error: "unavailable" };
    }
    return { ok: true, id: body.data.id, duplicate: response.status === 200 };
  }

  switch (response.status) {
    case 400:
    case 413:
      log(`[inquiry] Shadow rejected the payload (${response.status})`);
      return { ok: false, error: "invalid_request" };
    case 429:
      log("[inquiry] Shadow's hourly limit for this key was reached (429)");
      return { ok: false, error: "busy" };
    case 503:
      return { ok: false, error: "not_configured" };
    case 401:
    case 403:
      log(`[inquiry] Shadow refused the inbound key (${response.status}); check SHADOW_INQUIRY_KEY`);
      return { ok: false, error: "unavailable" };
    default:
      log(`[inquiry] Shadow answered ${response.status}`);
      return { ok: false, error: "unavailable" };
  }
}
