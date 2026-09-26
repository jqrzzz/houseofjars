/** Small helpers shared by the API routes. */

export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

/**
 * Refuses requests that another website could make from a visitor's browser.
 * Any page can POST a "simple" request (text/plain, no preflight) here, so the
 * API routes accept only application/json: from another origin that needs a
 * CORS preflight, which fails because these routes never send CORS headers.
 * When the browser says where a request came from (Sec-Fetch-Site, Origin),
 * it must be this site. A client that sends neither is not a browser acting
 * for a visitor; the rate limits cover it like anyone else.
 */
export function rejectCrossSite(request: Request, siteUrl: string): Response | null {
  const type = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (type !== "application/json") return json({ error: "unsupported_media_type" }, 415);
  return rejectForeignOrigin(request, siteUrl);
}

/**
 * The origin half of rejectCrossSite, for GET routes (which have no body to
 * type): when the browser says where the request came from, it must be this
 * site or the visitor's own address bar.
 */
export function rejectForeignOrigin(request: Request, siteUrl: string): Response | null {
  const site = request.headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin" && site !== "none") return json({ error: "forbidden" }, 403);

  const origin = request.headers.get("origin");
  if (origin !== null && !isOwnOrigin(origin, request.headers, siteUrl)) return json({ error: "forbidden" }, 403);
  return null;
}

/** The canonical site, or the host this request was sent to (a preview deployment or a local server). */
function isOwnOrigin(origin: string, headers: Headers, siteUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false; // "null" (sandboxed frames, file: pages) or malformed
  }
  if (url.origin === new URL(siteUrl).origin) return true;
  const hosts = [headers.get("x-forwarded-host")?.split(",")[0], headers.get("host")];
  return hosts.some((host) => host?.trim().toLowerCase() === url.host);
}

export type BodyResult = { ok: true; value: unknown } | { ok: false; status: 400 | 413 };

/**
 * Reads a JSON body without trusting Content-Length: stops reading as soon
 * as the body passes `maxBytes`.
 */
export async function readJsonBody(request: Request, maxBytes: number): Promise<BodyResult> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return { ok: false, status: 413 };
  if (!request.body) return { ok: false, status: 400 };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return { ok: false, status: 413 };
    }
    chunks.push(value);
  }

  try {
    return { ok: true, value: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch {
    return { ok: false, status: 400 };
  }
}
