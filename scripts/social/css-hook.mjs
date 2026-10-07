/**
 * A Node module hook for `npm run social` (registered by scripts/social.ts with module.register): a component
 * that imports a CSS Module (import styles from "./WovenBand.module.css") gets its class map, each class named
 * "<Basename>__<key>" by scripts/social/css-modules.ts, which also gives the page the stylesheet to match. Every
 * other import goes on to the next loader (tsx's) untouched.
 */
export async function load(url, context, nextLoad) {
  if (!url.startsWith("file:") || !url.endsWith(".module.css")) return nextLoad(url, context);
  const scoper = new URL("./css-modules.ts", import.meta.url).href;
  return {
    format: "module",
    shortCircuit: true,
    source: [
      `import { fileURLToPath } from "node:url";`,
      `import { loadCssModule } from ${JSON.stringify(scoper)};`,
      `export default loadCssModule(fileURLToPath(${JSON.stringify(url)})).classes;`,
    ].join("\n"),
  };
}
