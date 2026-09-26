"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * A <details> disclosure for the phone menu: works without JavaScript, and
 * closes itself after client-side navigation.
 */
export function MobileMenu({ className, summaryClassName, children }: { className?: string; summaryClassName?: string; children: ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  return (
    <details ref={ref} className={className}>
      <summary className={summaryClassName}>
        <span className="visually-hidden">Menu</span>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" width="24" height="24">
          <path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </svg>
      </summary>
      {children}
    </details>
  );
}
