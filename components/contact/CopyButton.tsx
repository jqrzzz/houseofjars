"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "../ui/icons";
import styles from "./ContactDetails.module.css";

/** Copies a value to the clipboard. The value stays on screen as selectable text either way. */
export function CopyButton({ value, what }: { value: string; what: string }) {
  const [result, setResult] = useState<"idle" | "copied" | "blocked">("idle");

  useEffect(() => {
    if (result === "idle") return;
    const timer = setTimeout(() => setResult("idle"), result === "copied" ? 2000 : 4000);
    return () => clearTimeout(timer);
  }, [result]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setResult("copied");
    } catch {
      // Clipboard blocked (permissions, insecure origin): say so, and the text can still be selected.
      setResult("blocked");
    }
  }

  const label = result === "copied" ? "Copied" : result === "blocked" ? "Select it to copy" : "Copy";
  return (
    <button type="button" className={styles.copy} onClick={() => void copy()}>
      {result === "copied" ? <CheckIcon /> : <CopyIcon />}
      <span aria-hidden="true">{label}</span>
      <span className="visually-hidden">Copy {what}</span>
      <span role="status" className="visually-hidden">
        {result === "copied" ? `${what} copied` : result === "blocked" ? `This browser didn't allow copying: select the ${what} to copy it` : ""}
      </span>
    </button>
  );
}
