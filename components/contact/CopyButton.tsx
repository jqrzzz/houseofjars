"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "../ui/icons";
import styles from "./ContactDetails.module.css";

/** Copies a value to the clipboard. The value stays on screen as selectable text either way. */
export function CopyButton({ value, what }: { value: string; what: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard blocked (permissions, insecure origin): the text can still be selected.
    }
  }

  return (
    <button type="button" className={styles.copy} onClick={() => void copy()}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span aria-hidden="true">{copied ? "Copied" : "Copy"}</span>
      <span className="visually-hidden">Copy {what}</span>
      <span role="status" className="visually-hidden">
        {copied ? `${what} copied` : ""}
      </span>
    </button>
  );
}
