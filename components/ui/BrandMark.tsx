import type { SiteMark } from "@/content/reviews";

/*
 * The booking and review sites' own logos, unchanged, as each brand publishes
 * them (public/brands/, shapes from Simple Icons, which takes them from the
 * brands' media rooms: bookingholdings.com/media-room and
 * tripadvisor.mediaroom.com):
 * - Booking.com: its "B." mark, white on its blue (#003A9A);
 * - Tripadvisor: its owl, black on its green (#34E0A1).
 * Files, not inline SVG, so a page carries each logo once, cached, rather
 * than its path data in the HTML and again in the React payload.
 * Agoda's logo is not here yet: until its official file is added, the strip
 * shows Agoda by name (BrandMark returns null).
 */
const FILES: Partial<Record<SiteMark, string>> = {
  booking: "/brands/booking.svg",
  tripadvisor: "/brands/tripadvisor.svg",
};

/** Whether a site's logo is in the site yet. */
export const hasBrandMark = (mark: SiteMark): boolean => mark in FILES;

/** A site's logo, square, decorative (its name is always written beside it). */
export function BrandMark({ mark, className }: { mark: SiteMark; className?: string }) {
  const src = FILES[mark];
  if (!src) return null;
  // A tiny vector file: next/image would add nothing but weight.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={24} height={24} className={className} />;
}
