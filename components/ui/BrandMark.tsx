import type { SiteMark } from "@/content/reviews";

/*
 * The booking and review sites' own logos, unchanged, as each brand publishes
 * them (shapes from Simple Icons, which takes them from the brands' media
 * rooms: bookingholdings.com/media-room and tripadvisor.mediaroom.com):
 * - Booking.com: its "B." mark, white on its blue (#003A9A);
 * - Tripadvisor: its owl, black on its green (#34E0A1).
 * Agoda's logo is not here yet: until its official file is added, the strip
 * shows Agoda by name (BrandMark returns null).
 */
const BOOKING =
  "M24 0H0v24h24ZM8.575 6.563h2.658c2.108 0 3.473 1.15 3.473 2.898 0 1.15-.575 1.82-.91 2.108l-.287.263.335.192c.815.479 1.318 1.389 1.318 2.395 0 1.988-1.51 3.257-3.857 3.257H7.449V7.713c0-.623.503-1.126 1.126-1.15zm1.7 1.868c-.479.024-.694.264-.694.79v1.893h1.676c.958 0 1.294-.743 1.294-1.365 0-.815-.503-1.318-1.318-1.318zm-.096 4.36c-.407.071-.598.31-.598.79v2.251h1.868c.934 0 1.509-.55 1.509-1.533 0-.934-.599-1.509-1.51-1.509zm7.737 2.394c.743 0 1.341.599 1.341 1.342a1.34 1.34 0 0 1-1.341 1.341 1.355 1.355 0 0 1-1.341-1.341c0-.743.598-1.342 1.34-1.342z";

const TRIPADVISOR =
  "M12.006 4.295c-2.67 0-5.338.784-7.645 2.353H0l1.963 2.135a5.997 5.997 0 0 0 4.04 10.43 5.976 5.976 0 0 0 4.075-1.6L12 19.705l1.922-2.09a5.972 5.972 0 0 0 4.072 1.598 6 6 0 0 0 6-5.998 5.982 5.982 0 0 0-1.957-4.432L24 6.648h-4.35a13.573 13.573 0 0 0-7.644-2.353zM12 6.255c1.531 0 3.063.303 4.504.903C13.943 8.138 12 10.43 12 13.1c0-2.671-1.942-4.962-4.504-5.942A11.72 11.72 0 0 1 12 6.256zM6.002 9.157a4.059 4.059 0 1 1 0 8.118 4.059 4.059 0 0 1 0-8.118zm11.992.002a4.057 4.057 0 1 1 .003 8.115 4.057 4.057 0 0 1-.003-8.115zm-11.992 1.93a2.128 2.128 0 0 0 0 4.256 2.128 2.128 0 0 0 0-4.256zm11.992 0a2.128 2.128 0 0 0 0 4.256 2.128 2.128 0 0 0 0-4.256z";

/** Whether a site's logo is in the site yet. */
export const hasBrandMark = (mark: SiteMark): boolean => mark !== "agoda";

/** A site's logo, square, decorative (its name is always written beside it). */
export function BrandMark({ mark, className }: { mark: SiteMark; className?: string }) {
  if (mark === "booking") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="1" y="1" width="22" height="22" fill="#fff" />
        <path d={BOOKING} fill="#003A9A" />
      </svg>
    );
  }
  if (mark === "tripadvisor") {
    return (
      <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="12" fill="#34E0A1" />
        <path d={TRIPADVISOR} fill="#000" transform="translate(3.6 3.6) scale(0.7)" />
      </svg>
    );
  }
  return null;
}
