"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { inquiryPrefill } from "@/lib/inquiry/prefill";
import { replyChannel } from "@/lib/inquiry/reply";
import { pages } from "@/lib/site";
import { uuid } from "@/lib/uuid";
import { ContactDetails } from "../contact/ContactDetails";
import buttons from "../ui/button.module.css";
import { ArrowIcon } from "../ui/icons";
import styles from "./InquiryForm.module.css";

type Problem = "invalid" | "rate_limited" | "busy" | "not_configured" | "unavailable";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; name: string; replyBy: string }
  | { kind: "problem"; problem: Problem };

type FieldName =
  | "name"
  | "email"
  | "phone"
  | "preferred_contact"
  | "check_in"
  | "check_out"
  | "guests"
  | "bed_preference"
  | "message"
  | "consent";

/** Field order, for the error summary. */
const FIELDS: readonly FieldName[] = [
  "name",
  "email",
  "phone",
  "preferred_contact",
  "check_in",
  "check_out",
  "guests",
  "bed_preference",
  "message",
  "consent",
];

const problemText: Record<Exclude<Problem, "invalid">, string> = {
  rate_limited: "You have sent several messages in a short time. Please wait a few minutes, or contact the team directly:",
  busy: "Our message line is busy right now, so this one couldn’t be sent. Please contact the team directly:",
  not_configured: "Messages can’t be sent from this form at the moment. Please contact the team directly:",
  unavailable: "We couldn’t send your message just now. Please try again in a moment, or contact the team directly:",
};

const text = (data: FormData, key: FieldName) => {
  const value = data.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

/** Local calendar date as YYYY-MM-DD. */
function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** The direct inquiry form on /book. The server validates; its answers are shown next to each field. */
export function InquiryForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<Partial<Record<FieldName | "form", string>>>({});
  const [checkIn, setCheckIn] = useState("");
  // One reference per inquiry: a retry after a failure can't create a duplicate.
  const clientRef = useRef<string | null>(null);
  const checkInRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);
  const guestsRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const fieldId = (field: FieldName) => `${id}-${field}`;

  // Dates in the past make no sense here; set the floor once the browser knows today's date.
  // A link from the booking card (or an assistant) may carry dates and guests: fill them in.
  useEffect(() => {
    if (checkInRef.current) checkInRef.current.min = today();
    const prefill = inquiryPrefill(window.location.search);
    if (prefill.check_in && checkInRef.current && checkOutRef.current) {
      checkInRef.current.value = prefill.check_in;
      checkOutRef.current.min = prefill.check_in;
      if (prefill.check_out) checkOutRef.current.value = prefill.check_out;
    }
    if (prefill.guests && guestsRef.current) guestsRef.current.value = String(prefill.guests);
  }, []);

  useEffect(() => {
    if (status.kind === "problem" && status.problem === "invalid") summaryRef.current?.focus();
    if (status.kind === "sent") resultRef.current?.focus();
  }, [status]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status.kind === "sending") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const guests = text(data, "guests");
    const payload = {
      client_ref: (clientRef.current ??= uuid()),
      name: text(data, "name") ?? "",
      email: text(data, "email"),
      phone: text(data, "phone"),
      preferred_contact: text(data, "preferred_contact"),
      check_in: text(data, "check_in"),
      check_out: text(data, "check_out"),
      guests: guests === null ? null : Number(guests),
      bed_preference: text(data, "bed_preference"),
      message: text(data, "message") ?? "",
      consent: data.get("consent") === "on",
    };

    setStatus({ kind: "sending" });
    setErrors({});
    try {
      const response = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setStatus({
          kind: "sent",
          name: payload.name,
          replyBy: replyChannel(payload.preferred_contact, payload.email, payload.phone),
        });
        clientRef.current = null;
        form.reset();
        setCheckIn("");
        return;
      }
      if (response.status === 400) {
        const body = (await response.json().catch(() => null)) as { issues?: { field: string; message: string }[] } | null;
        const next: Partial<Record<FieldName | "form", string>> = {};
        for (const issue of body?.issues ?? []) {
          const field = (FIELDS as readonly string[]).includes(issue.field) ? (issue.field as FieldName) : "form";
          next[field] ??= issue.message;
        }
        if (Object.keys(next).length === 0) next.form = "Please check the form and try again.";
        setErrors(next);
        setStatus({ kind: "problem", problem: "invalid" });
        return;
      }
      const code = ((await response.json().catch(() => null)) as { error?: unknown } | null)?.error;
      setStatus({
        kind: "problem",
        problem:
          response.status === 429
            ? "rate_limited"
            : code === "busy"
              ? "busy"
              : response.status === 503
                ? "not_configured"
                : "unavailable",
      });
    } catch {
      setStatus({ kind: "problem", problem: "unavailable" });
    }
  }

  if (status.kind === "sent") {
    return (
      <div ref={resultRef} tabIndex={-1} className={styles.sent} role="status">
        <p className={styles.sentTitle}>Thank you{status.name ? `, ${status.name}` : ""}.</p>
        <p>Your message is with the team, and they will reply {status.replyBy}.</p>
        <button type="button" className={buttons.textLink} onClick={() => setStatus({ kind: "idle" })}>
          <span>Send another message</span>
          <ArrowIcon />
        </button>
      </div>
    );
  }

  const invalid = (field: FieldName) => Boolean(errors[field]);
  const describedBy = (field: FieldName, hint?: string) =>
    [hint, errors[field] ? `${fieldId(field)}-error` : null].filter(Boolean).join(" ") || undefined;
  const error = (field: FieldName) =>
    errors[field] ? (
      <p id={`${fieldId(field)}-error`} className={styles.error}>
        {errors[field]}
      </p>
    ) : null;
  const errorList = [...FIELDS.filter((field) => errors[field]), ...(errors.form ? (["form"] as const) : [])];

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate aria-describedby={`${id}-privacy`}>
      {status.kind === "problem" && status.problem === "invalid" ? (
        <div ref={summaryRef} tabIndex={-1} className={styles.summary} role="alert">
          <p className={styles.summaryTitle}>Please check {errorList.length === 1 ? "one thing" : "a few things"}:</p>
          <ul>
            {errorList.map((field) => (
              <li key={field}>
                {field === "form" ? errors.form : <a href={`#${fieldId(field)}`}>{errors[field]}</a>}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Field label="Your name" htmlFor={fieldId("name")} error={error("name")}>
        <input
          id={fieldId("name")}
          name="name"
          autoComplete="name"
          maxLength={120}
          required
          aria-invalid={invalid("name") || undefined}
          aria-describedby={describedBy("name")}
        />
      </Field>

      <p className={styles.hint} id={`${id}-contact-hint`}>
        How can the team reach you? Give an email address, a WhatsApp number, or both.
      </p>
      <div className={styles.pair}>
        <Field label="Email" htmlFor={fieldId("email")} error={error("email")}>
          <input
            id={fieldId("email")}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={invalid("email") || undefined}
            aria-describedby={describedBy("email", `${id}-contact-hint`)}
          />
        </Field>
        <Field label="WhatsApp or phone" htmlFor={fieldId("phone")} error={error("phone")}>
          <input
            id={fieldId("phone")}
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={40}
            placeholder="+44 7700 900123"
            aria-invalid={invalid("phone") || undefined}
            aria-describedby={describedBy("phone", `${id}-contact-hint`)}
          />
        </Field>
      </div>

      <Field label="How should we reply?" htmlFor={fieldId("preferred_contact")} error={error("preferred_contact")}>
        <select
          id={fieldId("preferred_contact")}
          name="preferred_contact"
          defaultValue=""
          aria-describedby={describedBy("preferred_contact")}
        >
          <option value="">Either is fine</option>
          <option value="email">Email</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="phone">Phone call</option>
        </select>
      </Field>

      <div className={styles.pair}>
        <Field label="Check-in" optional htmlFor={fieldId("check_in")} error={error("check_in")}>
          <input
            ref={checkInRef}
            id={fieldId("check_in")}
            name="check_in"
            type="date"
            onChange={(event) => setCheckIn(event.target.value)}
            aria-invalid={invalid("check_in") || undefined}
            aria-describedby={describedBy("check_in")}
          />
        </Field>
        <Field label="Check-out" optional htmlFor={fieldId("check_out")} error={error("check_out")}>
          <input
            ref={checkOutRef}
            id={fieldId("check_out")}
            name="check_out"
            type="date"
            min={checkIn || undefined}
            aria-invalid={invalid("check_out") || undefined}
            aria-describedby={describedBy("check_out")}
          />
        </Field>
      </div>

      <div className={styles.pair}>
        <Field label="Guests" optional htmlFor={fieldId("guests")} error={error("guests")}>
          <input
            ref={guestsRef}
            id={fieldId("guests")}
            name="guests"
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            step={1}
            aria-invalid={invalid("guests") || undefined}
            aria-describedby={describedBy("guests")}
          />
        </Field>
        <Field label="Bed preference" optional htmlFor={fieldId("bed_preference")} error={error("bed_preference")}>
          <input
            id={fieldId("bed_preference")}
            name="bed_preference"
            maxLength={80}
            aria-invalid={invalid("bed_preference") || undefined}
            aria-describedby={describedBy("bed_preference")}
          />
        </Field>
      </div>

      <Field label="Your message" htmlFor={fieldId("message")} error={error("message")}>
        <textarea
          id={fieldId("message")}
          name="message"
          rows={5}
          maxLength={4000}
          required
          placeholder="Your question, or anything the team should know"
          aria-invalid={invalid("message") || undefined}
          aria-describedby={describedBy("message")}
        />
      </Field>

      <div className={styles.consent}>
        <input
          id={fieldId("consent")}
          name="consent"
          type="checkbox"
          required
          aria-invalid={invalid("consent") || undefined}
          aria-describedby={describedBy("consent")}
        />
        <label htmlFor={fieldId("consent")}>
          I agree to the <Link href={pages.privacy.path}>privacy notice</Link> and want the House of Jars team to
          contact me about this message.
        </label>
        {error("consent")}
      </div>

      <p id={`${id}-privacy`} className={styles.note}>
        Please don’t include passport or card details. The team will see your passport at check-in.
      </p>

      <div className={styles.actions}>
        <button
          type="submit"
          className={`${buttons.button} ${buttons.primary}`}
          aria-disabled={status.kind === "sending"}
        >
          {status.kind === "sending" ? "Sending…" : "Send message"}
          <ArrowIcon />
        </button>
      </div>

      {status.kind === "problem" && status.problem !== "invalid" ? (
        <div className={styles.problem} role="alert">
          <p>{problemText[status.problem]}</p>
          <ContactDetails compact />
        </div>
      ) : null}
    </form>
  );
}

function Field({
  label,
  htmlFor,
  optional = false,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  error: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={htmlFor} className={styles.label}>
        {label}
        {optional ? <span className={styles.optional}> (optional)</span> : null}
      </label>
      {children}
      {error}
    </div>
  );
}
