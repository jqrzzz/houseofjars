/** The 3D mascot, the "Ask Shadow" feature image: a WebP master from scripts/export-mascot.mjs that next/image resizes. Elsewhere Shadow is drawn flat (components/shadow/). */
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
