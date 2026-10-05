/*
 * The theme's names and colours, with no imports, so client code (theme-store,
 * ThemeSwitch) can share them without pulling in the content files that the
 * boot script in lib/theme.ts reads at build time. lib/theme.ts re-exports them.
 */

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_KEY = "hoj-theme";

/** The browser bar's colour in each theme: the page colour (rice, night). */
export const themeColor = { light: "#fbf6ee", dark: "#20150c" } as const;
