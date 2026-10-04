import type { MouseEvent } from "react";

/**
 * An error summary's link: focuses its field (which scrolls it into view)
 * without writing the field's id into the address bar or the history. The
 * href stays for when the page's script hasn't loaded.
 */
export function focusField(event: MouseEvent<HTMLAnchorElement>, id: string) {
  const field = document.getElementById(id);
  if (!field) return;
  event.preventDefault();
  field.focus();
}
