"use client";

import { useEffect, useState } from "react";
import { CheckIcon, ShareIcon } from "./icons";
import styles from "./ShareButton.module.css";

/**
 * Shares a page: the phone's own share sheet (WhatsApp, LINE, WeChat,
 * Messenger…) where the browser has one, otherwise the link copied to the
 * clipboard. The link preview (title, words and picture) comes from the
 * page's Open Graph tags (lib/metadata.ts and each opengraph-image).
 */
export function ShareButton({ path, label = "Share", className }: { path?: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2400);
    return () => clearTimeout(timer);
  }, [copied]);

  async function share() {
    const url = new URL(path ?? window.location.pathname, window.location.origin).toString();
    const title = path ? undefined : document.title;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url, ...(title ? { title } : {}) });
        return;
      } catch (error) {
        // The guest closed the share sheet: nothing to do. Anything else: fall back to copying.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard blocked too: the address bar still has the link.
    }
  }

  return (
    <button type="button" className={[styles.share, className].filter(Boolean).join(" ")} onClick={() => void share()}>
      {copied ? <CheckIcon /> : <ShareIcon />}
      <span>{copied ? "Link copied" : label}</span>
      <span role="status" className="visually-hidden">
        {copied ? "Link copied" : ""}
      </span>
    </button>
  );
}
