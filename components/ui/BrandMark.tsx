import type { SiteMark } from "@/content/reviews";

/*
 * The booking and review sites' own logos, unchanged, as each brand publishes
 * them (public/brands/):
 * - Booking.com: its "B." mark, white on its blue (#003A9A), and
 * - Tripadvisor: its owl, black on its green (#34E0A1), both from Simple
 *   Icons, which takes them from the brands' media rooms
 *   (bookingholdings.com/media-room, tripadvisor.mediaroom.com);
 * - Agoda: its wordmark with the five dots, on white, as the owner sent it
 *   (7 October 2026).
 * Files, not inline SVG, so a page carries each logo once, cached, rather
 * than its path data in the HTML and again in the React payload.
 */
const FILES: Partial<Record<SiteMark, { src: string; width: number; height: number; wordmark?: true }>> = {
  booking: { src: "/brands/booking.svg", width: 24, height: 24 },
  agoda: { src: "/brands/agoda.png", width: 125, height: 72, wordmark: true },
  tripadvisor: { src: "/brands/tripadvisor.svg", width: 24, height: 24 },
};

/** Whether a site's logo is in the site yet. */
export const hasBrandMark = (mark: SiteMark): boolean => mark in FILES;

/** Whether a site's logo spells its name (a wordmark), so the name needn't be written beside it. */
export const isWordmark = (mark: SiteMark): boolean => FILES[mark]?.wordmark === true;

/** A site's logo, decorative (its name is always written beside it, or read out). Sized by its height; its width follows. */
export function BrandMark({ mark, className }: { mark: SiteMark; className?: string }) {
  const file = FILES[mark];
  if (!file) return null;
  // A tiny file: next/image would add nothing but weight.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={file.src} alt="" width={file.width} height={file.height} className={className} />;
}
