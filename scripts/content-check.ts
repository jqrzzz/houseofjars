/**
 * Lists every fact on the site that the house has not confirmed yet, and
 * what the site leaves out until the house tells us. A review list for
 * Nang, not a gate: it exits 0 unless run with --strict (e.g. at launch).
 *
 *   npm run content:check
 *   npm run content:check -- --strict
 */
import { CONTENT_UPDATED, content } from "../content";
import { creditFor } from "../content/certainty";
import { openQuestions } from "../content/open-questions";
import { describeValue, unconfirmedFacts } from "../lib/content-audit";

const strict = process.argv.includes("--strict");
const facts = unconfirmedFacts(content, "content").map((found) => ({
  ...found,
  path: found.path.replace(/^content\./, ""),
}));

const lines: string[] = [
  "House of Jars: content to confirm",
  `Facts were last checked against public listings on ${CONTENT_UPDATED}.`,
  "",
];

if (facts.length === 0) {
  lines.push("Every fact is confirmed.");
} else {
  lines.push(
    `${facts.length} facts are not confirmed yet. When one is right, set confirmed: true next to it in content/*.ts;`,
    "when it is wrong, correct the value (see docs/CONTENT.md).",
    "",
  );
  let section = "";
  for (const { path, fact } of facts) {
    const top = path.split(/[.[]/)[0] ?? path;
    if (top !== section) {
      section = top;
      lines.push(`## ${section}`);
    }
    lines.push(`- ${path}`, `    ${describeValue(fact.value)}`, `    Source: ${fact.source}`);
    if (fact.note) lines.push(`    Note: ${fact.note}`);
    const credit = creditFor(fact);
    if (credit) lines.push(`    Until confirmed: credited as "${credit}", and kept out of search engines' structured data.`);
  }
}

lines.push("", `Left out until the house tells us (${openQuestions.length}):`);
openQuestions.forEach((question, index) => lines.push(`${index + 1}. ${question.ask}`));

console.log(lines.join("\n"));

if (strict && facts.length > 0) {
  console.error(`\n--strict: ${facts.length} unconfirmed facts.`);
  process.exit(1);
}
