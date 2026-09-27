"use client";

import { useSearchParams } from "next/navigation";
import { useEffectEvent, useLayoutEffect, useRef } from "react";

/**
 * Whether the page's current history entry is one the booking form made
 * (it says which step it is), rather than one a link made. Next.js writes a
 * link's entry while committing the new page, before layout effects run;
 * read it in a layout effect, before the booking form (in its own effects)
 * turns that entry into one of its steps.
 */
export function entryFromBookingForm(): boolean {
  return Boolean((window.history.state as { booking?: unknown } | null)?.booking);
}

/**
 * Calls `onLink` with the page's new query string when a link inside the
 * site changes it without a reload (Next.js navigates in the page: a
 * /book?check_in=… link in Shadow's replies, followed while on /book). The
 * booking form's own steps, and Back and Forward between them, are left
 * alone. `onLink` runs in a layout effect, so it may change the page but not
 * the browser's history. Render it only in the browser: the page itself is
 * static.
 */
export function FollowLinks({ onLink }: { onLink: (search: string) => void }) {
  const search = useSearchParams().toString();
  const seen = useRef(search);
  const follow = useEffectEvent(onLink);
  useLayoutEffect(() => {
    if (search === seen.current) return;
    seen.current = search;
    if (!entryFromBookingForm()) follow(search);
  }, [search]);
  return null;
}
