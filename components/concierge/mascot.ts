/** The 3D mascot, the "Ask Shadow" feature image: a WebP master from scripts/export-mascot.mjs that next/image resizes. Wherever else the site shows Shadow, it is this mascot, cut below (components/shadow/ShadowMascot.tsx). */
export const shadowFull = { src: "/shadow/shadow-800.webp", width: 800, height: 1173 } as const;

/**
 * The same Shadow, whole, for the dock (ConciergeLauncher): cut from the
 * master by scripts/export-mascot.mjs, trimmed to his outline, at the 72px he
 * floats at in the corner of wider screens (`src`) and at twice that for sharp
 * screens (`src2x`). Under 7 kB together.
 */
export const shadowDock = {
  src: "/shadow/shadow-dock-49.webp",
  src2x: "/shadow/shadow-dock-98.webp",
  width: 49,
  height: 72,
} as const;

/**
 * The same Shadow, whole, larger: 120px tall (`src`) and twice that for sharp
 * screens (`src2x`), for the chat window's welcome, the 404 and the game's
 * nudge. Cut by scripts/export-mascot.mjs --figure; under 14 kB together.
 */
export const shadowFigure = {
  src: "/shadow/shadow-figure-81.webp",
  src2x: "/shadow/shadow-figure-162.webp",
  width: 81,
  height: 120,
} as const;
