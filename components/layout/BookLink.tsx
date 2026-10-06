"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * The header's Book button. On /book itself it marks the page the guest is on
 * and takes them down to the booking form (`form`, its id) instead of
 * reloading the page they are reading.
 */
export function BookLink({ form, className, children }: { form: string; className?: string; children: ReactNode }) {
  const here = usePathname() === "/book";
  return (
    <Link href={here ? `#${form}` : "/book"} className={className} aria-current={here ? "page" : undefined}>
      {children}
    </Link>
  );
}
