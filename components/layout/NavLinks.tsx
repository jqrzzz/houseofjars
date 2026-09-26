"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNav } from "@/lib/site";

export function NavLinks({ className, linkClassName }: { className?: string; linkClassName?: string }) {
  const pathname = usePathname();
  return (
    <ul role="list" className={className}>
      {primaryNav.map((page) => (
        <li key={page.path}>
          <Link
            href={page.path}
            className={linkClassName}
            aria-current={pathname === page.path ? "page" : undefined}
          >
            {page.nav}
          </Link>
        </li>
      ))}
    </ul>
  );
}
