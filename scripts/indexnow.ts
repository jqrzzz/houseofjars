/**
 * Tells the search engines that take IndexNow (Bing, Yandex, Seznam, Naver
 * and others) that the site's pages changed. Run it after a deploy that
 * changes content:
 *
 *   INDEXNOW_KEY=… npm run indexnow                   # every page in the sitemap
 *   INDEXNOW_KEY=… npm run indexnow -- /faq /guides   # only these pages
 *   INDEXNOW_KEY=… npm run indexnow -- --dry-run      # show what would be sent
 *
 * The deployed site must already serve the same key at /indexnow-key.txt
 * (INDEXNOW_KEY in its environment); the script checks that first.
 * NEXT_PUBLIC_SITE_URL sets the site (default https://thehouseofjars.com).
 */
import { buildSubmission, INDEXNOW_ENDPOINT, indexNowKey, keyIsLive, submit } from "../lib/indexnow";
import { allPages } from "../lib/pages";
import { absoluteUrl, siteUrl } from "../lib/site";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const paths = args.filter((arg) => !arg.startsWith("--"));

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const key = indexNowKey();
if (!key) fail("Set INDEXNOW_KEY to the key the site serves at /indexnow-key.txt: 8 to 128 letters, digits or dashes.");

const known = allPages.map((page) => page.path);
const unknown = paths.filter((path) => !known.includes(path));
if (unknown.length > 0) fail(`Not pages on the site: ${unknown.join(", ")}`);

const submission = buildSubmission(siteUrl, key, (paths.length > 0 ? paths : known).map(absoluteUrl));

if (dryRun) {
  console.log(JSON.stringify(submission, null, 2));
  process.exit(0);
}

if (!(await keyIsLive(submission))) {
  fail(
    `${submission.keyLocation} does not serve this key yet. Set INDEXNOW_KEY in the deployment's environment, redeploy, and run this again.`,
  );
}

// INDEXNOW_ENDPOINT exists for testing against a local stand-in.
const result = await submit(submission, { endpoint: process.env.INDEXNOW_ENDPOINT || INDEXNOW_ENDPOINT });
const count = submission.urlList.length;
console.log(`IndexNow answered ${result.status}: ${result.message} (${count} URL${count === 1 ? "" : "s"} from ${submission.host})`);
process.exit(result.ok ? 0 : 1);
