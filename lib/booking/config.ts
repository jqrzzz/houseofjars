import { readShadowConfig } from "../inquiry/submit";

/**
 * Whether this build offers online booking: Shadow Check-in's address and the
 * property's key (SHADOW_API_URL and SHADOW_INQUIRY_KEY) are both set. The
 * pages that change with it are static, so it is read when the site is built:
 * redeploy after setting them. The API routes read them on every request, and
 * the booking form still falls back if Shadow says booking isn't open.
 */
export function onlineBookingConfigured(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return readShadowConfig(env) !== null;
}

/** What links to /book say: its own title, which follows the same switch. */
export function bookingLabel(env: Readonly<Record<string, string | undefined>> = process.env): string {
  return onlineBookingConfigured(env) ? "Book a bed" : "Prices and booking";
}
