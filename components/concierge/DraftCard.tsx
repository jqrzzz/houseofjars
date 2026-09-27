"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { ChatDraft } from "@/lib/concierge/chat";
import { formatDate } from "@/content/text";
import { replyChannel } from "@/lib/inquiry/reply";
import { pages } from "@/lib/site";
import { ContactDetails } from "../contact/ContactDetails";
import styles from "./ConciergePanel.module.css";

type Problem = "rate_limited" | "busy" | "invalid" | "unavailable";

const problemText: Record<Problem, string> = {
  rate_limited: "You’ve sent several messages in a short time. Please wait a few minutes, or contact the team directly:",
  busy: "The team’s message line is busy right now, so this one couldn’t be sent. Please contact them directly:",
  invalid: "These details can’t be sent as they are. Tell Shadow what to change, or contact the team directly:",
  unavailable: "I couldn’t send it just now. Please try again in a moment, or contact the team directly:",
};

export interface DraftCardProps {
  sessionId: string;
  draft: ChatDraft;
  onSent: (reply: { content: string; sig: string }) => void;
  /** The guest wants to change something: they tell Shadow what. */
  onChange: () => void;
  onNavigate: () => void;
}

/** A saved draft comes back from session storage, so show only plain values. */
const shown = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value) : "");

function dates(checkIn: string, checkOut: string): string {
  if (checkIn && checkOut) return `${formatDate(checkIn)} to ${formatDate(checkOut)}`;
  if (checkIn) return `Arriving ${formatDate(checkIn)}`;
  return checkOut ? `Leaving ${formatDate(checkOut)}` : "";
}

/**
 * Everything Shadow prepared for the team, exactly as it will be sent. Nothing
 * leaves until the guest ticks the privacy box and presses Send, once per
 * message; the server sends this signed draft and nothing else.
 */
export function DraftCard({ sessionId, draft, onSent, onChange, onNavigate }: DraftCardProps) {
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const titleId = useId();
  const d = draft.draft;

  const rows = (
    [
      ["Name", shown(d.name)],
      ["Email", shown(d.email)],
      ["WhatsApp or phone", shown(d.phone)],
      ["They’ll reply", replyChannel(shown(d.preferred_contact) || null, shown(d.email) || null, shown(d.phone) || null)],
      ["Dates", dates(shown(d.check_in), shown(d.check_out))],
      ["Guests", shown(d.guests)],
      ["Bed", shown(d.bed_preference)],
      ["Message", shown(d.message)],
      ["Shadow’s note", shown(d.conversation_summary)],
    ] as const
  ).filter(([, value]) => value);

  async function send() {
    if (!consent || sending) return;
    setSending(true);
    setProblem(null);
    try {
      const response = await fetch("/api/concierge/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, draft: d, token: draft.token, consent: true }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: unknown;
        reply?: { content?: unknown; sig?: unknown };
      } | null;
      const reply = body?.reply;
      if (response.ok && typeof reply?.content === "string" && typeof reply.sig === "string") {
        onSent({ content: reply.content, sig: reply.sig });
        return;
      }
      setProblem(
        response.status === 429
          ? "rate_limited"
          : body?.error === "busy"
            ? "busy"
            : response.status === 400
              ? "invalid"
              : "unavailable",
      );
    } catch {
      setProblem("unavailable");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className={styles.card} aria-labelledby={titleId}>
      <h3 id={titleId} className={styles.cardTitle}>
        Your message to the team
      </h3>
      <p>Please check it. Nothing is sent until you press Send.</p>
      <dl className={styles.cardDetails}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <label className={styles.consentLabel}>
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>
          I agree to the{" "}
          <Link href={pages.privacy.path} onClick={onNavigate}>
            privacy notice
          </Link>{" "}
          and want the House of Jars team to contact me about this message.
        </span>
      </label>
      <div className={styles.draftActions}>
        <button
          type="button"
          className={styles.consentButton}
          disabled={!consent || sending}
          onClick={() => void send()}
        >
          {sending ? "Sending…" : "Send to the team"}
        </button>
        <button type="button" className={styles.secondaryButton} onClick={onChange}>
          Change something
        </button>
      </div>
      {problem ? (
        <div className={styles.draftProblem} role="alert">
          <p>{problemText[problem]}</p>
          <ContactDetails compact />
        </div>
      ) : null}
    </section>
  );
}
