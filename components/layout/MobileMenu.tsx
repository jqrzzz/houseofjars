"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A <details> disclosure for the phone menu: works without JavaScript. With
 * it, the menu also closes after client-side navigation, on Escape (focus
 * goes back to the menu button) and on a tap outside it. Its two bars cross
 * into a close mark, and the panel unfolds and folds away (SiteHeader.module.css).
 */
export function MobileMenu({ className, summaryClassName, children }: { className?: string; summaryClassName?: string; children: ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const details = ref.current;
    if (!open || !details) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      details.open = false;
      details.querySelector("summary")?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !details.contains(event.target)) details.open = false;
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <details ref={ref} className={className} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className={summaryClassName}>
        <span className="visually-hidden">Menu</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="24" height="24">
          <path data-bar="top" d="M4 8h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <path data-bar="bottom" d="M4 16h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </svg>
      </summary>
      {children}
    </details>
  );
}
