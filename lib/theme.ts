/**
 * The theme: Day (light) or Evening (dark), or Auto, which follows the
 * device. A guest's choice is kept in this browser only (localStorage) and set
 * on <html data-theme> before the first paint by the boot script below, so a
 * page never flashes the other theme. No choice, no attribute: the CSS follows
 * prefers-color-scheme (app/globals.css).
 */

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_KEY = "hoj-theme";
export const SPLASH_KEY = "hoj-splash";

/** The browser bar's colour in each theme: the page colour (rice, night). */
export const themeColor = { light: "#fbf6ee", dark: "#20150c" } as const;

/**
 * Runs in <head> before anything paints (inline, which the site's CSP allows;
 * next.config.ts). It sets the saved theme, and marks the first page of a visit
 * for the logo splash unless the guest prefers reduced motion. Every storage
 * call is guarded: private windows and blocked storage simply get Auto and no
 * splash.
 */
export const bootScript = `(function(){var d=document.documentElement;try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark")d.setAttribute("data-theme",t)}catch(e){}try{if(!sessionStorage.getItem(${JSON.stringify(SPLASH_KEY)})&&!matchMedia("(prefers-reduced-motion: reduce)").matches){d.classList.add("splash");sessionStorage.setItem(${JSON.stringify(SPLASH_KEY)},"1")}}catch(e){}})()`;
