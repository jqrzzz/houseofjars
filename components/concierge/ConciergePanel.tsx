"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  chatReducer,
  failureOf,
  linkify,
  newChat,
  restoreChat,
  shadowLines,
  toApiMessages,
  type ChatMessage,
  type ChatState,
  type Closed,
} from "@/lib/concierge/chat";
import { MAX_MESSAGE_CHARS } from "@/lib/concierge/limits";
import { parseEvents, type ConciergeEvent } from "@/lib/concierge/protocol";
import { immigration } from "@/content/area";
import { identity, whatsappUrl } from "@/content/identity";
import { pages, siteUrl } from "@/lib/site";
import { uuid } from "@/lib/uuid";
import { ContactDetails } from "../contact/ContactDetails";
import { ShadowFigure } from "../shadow/ShadowFigure";
import { ShadowWriting } from "../shadow/ShadowWriting";
import { CloseIcon, RestartIcon, SendIcon } from "../ui/icons";
import { AvailabilityCard } from "./AvailabilityCard";
import styles from "./ConciergePanel.module.css";
import { DraftCard } from "./DraftCard";

export interface ConciergePanelProps {
  open: boolean;
  /** A question to put in the message box; `id` changes each time a new one is asked for. */
  prefill: { text: string; id: number } | null;
  onClose: () => void;
}

const STORAGE_KEY = "houseofjars:concierge";

/** The only outside sites Shadow's replies may link to: the ones in the house's own content. */
const linkHosts = [
  ...Object.values(identity.links).map((link) => link.value),
  immigration.ldif.value.url,
  whatsappUrl(),
].map((url) => new URL(url).hostname);

const starters = ["What time is check-in?", "Is breakfast included?", "How far is the airport?", "Is it a quiet hostel?"];

// sessionStorage can be missing or throw (private mode, blocked storage): the chat still works without it.
function loadChat(): ChatState | null {
  try {
    return restoreChat(window.sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function saveChat(state: ChatState | null) {
  try {
    if (state) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Not saved; the conversation simply won't survive a reload.
  }
}

async function readEvents(body: ReadableStream<Uint8Array>, onEvent: (event: ConciergeEvent) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const { events, rest } = parseEvents(buffer + decoder.decode(value, { stream: true }));
    buffer = rest;
    events.forEach(onEvent);
  }
  buffer += decoder.decode();
  if (buffer.trim()) parseEvents(`${buffer}\n`).events.forEach(onEvent);
}

export function ConciergePanel({ open, prefill, onClose }: ConciergePanelProps) {
  const [state, dispatch] = useReducer(chatReducer, null, () => loadChat() ?? newChat(uuid()));
  const [draft, setDraft] = useState({ text: "", prefillId: -1 });
  const [pending, setPending] = useState(false);
  const [closed, setClosed] = useState<Closed | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const titleId = useId();
  const noteId = useId();
  const inputId = useId();

  // A new pre-filled question replaces the draft (adjusting state during render, not in an effect).
  if (prefill && prefill.id !== draft.prefillId) {
    setDraft({ text: prefill.text.slice(0, MAX_MESSAGE_CHARS), prefillId: prefill.id });
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Put the cursor at the end of the message box whenever the window opens or a question is pre-filled.
  useEffect(() => {
    const input = inputRef.current;
    if (!open || !input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [open, draft.prefillId]);

  const streaming = state.messages.some((message) => message.state === "streaming");

  useEffect(() => {
    if (!streaming) saveChat(state);
  }, [state, streaming]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [state, closed]);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim().slice(0, MAX_MESSAGE_CHARS);
      if (!question || pending) return;

      const history = toApiMessages([...state.messages, { role: "user", content: question, state: "final" }]);
      dispatch({ type: "send", text: question });
      setDraft((current) => ({ ...current, text: "" }));
      setPending(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/concierge", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ session_id: state.sessionId, messages: history }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          const code = ((await response.json().catch(() => null)) as { error?: unknown } | null)?.error;
          const failure = failureOf(response.status, code);
          if (failure.closed) setClosed(failure.closed);
          dispatch({ type: "failed", line: failure.line });
          return;
        }
        await readEvents(response.body, (event) => {
          if (event.type === "error" && event.code === "resting") setClosed("resting");
          dispatch({ type: "event", event });
        });
        dispatch({ type: "ended" });
      } catch {
        dispatch(controller.signal.aborted ? { type: "ended" } : { type: "failed", line: shadowLines.unavailable });
      } finally {
        abortRef.current = null;
        setPending(false);
      }
    },
    [pending, state],
  );

  function restart() {
    abortRef.current?.abort();
    saveChat(null);
    dispatch({ type: "reset", sessionId: uuid() });
    setClosed(null);
    setDraft((current) => ({ ...current, text: "" }));
    inputRef.current?.focus();
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft.text);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft.text);
    }
  }

  const lastReply = state.messages.findLast((message) => message.role === "assistant" && message.state !== "streaming");
  const showStarters = state.messages.length === 0;

  return (
    <dialog
      ref={dialogRef}
      className={styles.panel}
      aria-labelledby={titleId}
      aria-describedby={noteId}
      onClose={onClose}
    >
      <header className={styles.header}>
        <span className={styles.avatar}>
          <ShadowFigure variant="bust" />
        </span>
        <div className={styles.heading}>
          <h2 id={titleId} className={styles.title}>
            Shadow
          </h2>
          <p className={styles.subtitle}>AI concierge at House of Jars</p>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          onClick={restart}
          disabled={state.messages.length === 0}
          aria-label="Start a new conversation"
          title="New conversation"
        >
          <RestartIcon />
        </button>
        <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close" title="Close">
          <CloseIcon />
        </button>
      </header>

      <p id={noteId} className={styles.disclaimer}>
        Shadow is an AI and can make mistakes. For anything important,{" "}
        <Link href={`${pages.book.path}#contact`} onClick={onClose}>
          contact the team
        </Link>
        .
      </p>

      <div ref={logRef} className={styles.log}>
        {showStarters ? <ShadowFigure className={styles.welcome} /> : null}
        <Bubble role="assistant">{shadowLines.greeting}</Bubble>

        {state.messages.map((message, index) => (
          <Message key={index} message={message} onNavigate={onClose} />
        ))}

        {showStarters ? (
          <ul role="list" className={styles.starters} aria-label="Example questions">
            {starters.map((question) => (
              <li key={question}>
                <button type="button" className={styles.starter} onClick={() => void send(question)}>
                  {question}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {state.draft ? (
          <DraftCard
            key={state.draft.token}
            sessionId={state.sessionId}
            draft={state.draft}
            onSent={(reply) => dispatch({ type: "draftSent", reply })}
            onChange={() => {
              dispatch({ type: "draftDismissed" });
              inputRef.current?.focus();
            }}
            onNavigate={onClose}
          />
        ) : null}

        {closed ? (
          <div className={styles.contacts}>
            <ContactDetails compact />
          </div>
        ) : null}
      </div>

      <form className={styles.composer} onSubmit={onSubmit}>
        <label htmlFor={inputId} className="visually-hidden">
          Your question for Shadow
        </label>
        <textarea
          id={inputId}
          ref={inputRef}
          className={styles.input}
          rows={1}
          maxLength={MAX_MESSAGE_CHARS}
          value={draft.text}
          onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))}
          onKeyDown={onKeyDown}
          placeholder="Ask a question…"
          enterKeyHint="send"
          autoComplete="off"
        />
        <button type="submit" className={styles.send} disabled={!draft.text.trim() || pending} aria-label="Send">
          <SendIcon />
        </button>
      </form>

      {/*
        Announced politely: that Shadow is writing, then his finished reply, never token by token.
        The text always passes through "writing", so two identical replies are both announced.
      */}
      <p className="visually-hidden" role="status" aria-live="polite">
        {pending ? shadowLines.writing : (lastReply?.content ?? "")}
      </p>
    </dialog>
  );
}

function Bubble({ role, failed = false, children }: { role: ChatMessage["role"]; failed?: boolean; children: ReactNode }) {
  const className = [styles.bubble, role === "user" ? styles.user : styles.shadow, failed ? styles.failed : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={className}>
      <span className="visually-hidden">{role === "user" ? "You: " : "Shadow: "}</span>
      {children}
    </div>
  );
}

function Message({ message, onNavigate }: { message: ChatMessage; onNavigate: () => void }) {
  if (message.state === "streaming" && !message.content) {
    return (
      <Bubble role="assistant">
        <span className={styles.writing}>
          <ShadowWriting />
          <span aria-hidden="true">Writing…</span>
        </span>
        <span className="visually-hidden">Shadow is writing</span>
      </Bubble>
    );
  }
  if (message.role === "user") return <Bubble role="user">{message.content}</Bubble>;

  return (
    <>
      <Bubble role="assistant" failed={message.state === "failed"}>
        {linkify(message.content, siteUrl, linkHosts).map((part, index) => {
          if (part.kind === "text") return <span key={index}>{part.text}</span>;
          return part.internal ? (
            <Link key={index} href={part.href} onClick={onNavigate}>
              {part.text}
            </Link>
          ) : (
            <a key={index} href={part.href} target="_blank" rel="noopener noreferrer">
              {part.text}
            </a>
          );
        })}
        {message.truncated ? "…" : null}
      </Bubble>
      {/* The free beds his reply points to: one card per stay he looked up. */}
      {message.cards?.map((card) => (
        <AvailabilityCard key={`${card.check_in} ${card.check_out} ${card.guests}`} card={card} onNavigate={onNavigate} />
      ))}
    </>
  );
}
