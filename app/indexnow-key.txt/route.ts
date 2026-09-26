import { indexNowKey } from "@/lib/indexnow";

const text = { "content-type": "text/plain; charset=utf-8" };

/** The IndexNow key (INDEXNOW_KEY), read on each request so setting it needs no rebuild; 404 until it is set. */
export function GET() {
  const key = indexNowKey();
  if (!key) return new Response("Not found", { status: 404, headers: text });
  return new Response(key, { headers: { ...text, "cache-control": "public, max-age=3600" } });
}
