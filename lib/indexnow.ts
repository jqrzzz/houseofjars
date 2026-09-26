/*
 * IndexNow (indexnow.org) tells the search engines that take part (Bing,
 * Yandex, Seznam, Naver and others; they share submissions) that pages
 * changed, so they recrawl them soon. A key proves the site is ours: the
 * site serves it at /indexnow-key.txt, and `npm run indexnow` submits the
 * pages after a deploy (scripts/indexnow.ts).
 */

export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
/** The most URLs one submission may carry. */
const MAX_URLS = 10_000;

/** INDEXNOW_KEY, if it is a valid key: 8 to 128 letters, digits and dashes. */
export function indexNowKey(value = process.env.INDEXNOW_KEY): string | null {
  const key = value?.trim();
  return key && /^[A-Za-z0-9-]{8,128}$/.test(key) ? key : null;
}

export interface Submission {
  readonly host: string;
  readonly key: string;
  readonly keyLocation: string;
  readonly urlList: readonly string[];
}

/** The JSON body IndexNow expects. Every URL must be on the site's own host. */
export function buildSubmission(siteUrl: string, key: string, urls: readonly string[]): Submission {
  const site = new URL(siteUrl);
  const urlList = [...new Set(urls)];
  if (urlList.length === 0 || urlList.length > MAX_URLS) throw new RangeError(`Submit 1 to ${MAX_URLS} URLs, not ${urlList.length}.`);
  for (const url of urlList) {
    if (new URL(url).host !== site.host) throw new Error(`${url} is not on ${site.host}.`);
  }
  return { host: site.host, key, keyLocation: new URL(INDEXNOW_KEY_PATH, site).toString(), urlList };
}

/** What IndexNow's responses mean, from its documentation. */
export function describeResponse(status: number): { ok: boolean; message: string } {
  switch (status) {
    case 200:
      return { ok: true, message: "Submitted." };
    case 202:
      return { ok: true, message: "Received; the key is still being checked." };
    case 400:
      return { ok: false, message: "Bad request: the submission's format is not valid." };
    case 403:
      return { ok: false, message: "The key is not valid: the key file is missing, or doesn't hold the key." };
    case 422:
      return { ok: false, message: "A URL is not on the host, or the key doesn't match the protocol." };
    case 429:
      return { ok: false, message: "Too many requests. Try again later." };
    default:
      return { ok: false, message: `Unexpected response ${status}.` };
  }
}

type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

/** Whether the live site serves the key, so a submission isn't refused for a missing key file. */
export async function keyIsLive(submission: Submission, fetcher: Fetch = fetch): Promise<boolean> {
  try {
    const response = await fetcher(submission.keyLocation, { signal: AbortSignal.timeout(15_000) });
    return response.ok && (await response.text()).trim() === submission.key;
  } catch {
    return false;
  }
}

export async function submit(
  submission: Submission,
  { endpoint = INDEXNOW_ENDPOINT, fetcher = fetch }: { endpoint?: string; fetcher?: Fetch } = {},
): Promise<{ status: number; ok: boolean; message: string }> {
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(submission),
    signal: AbortSignal.timeout(30_000),
  });
  return { status: response.status, ...describeResponse(response.status) };
}
