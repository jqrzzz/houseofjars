"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import {
  NO_DATES,
  calendarRules,
  fitRange,
  looseRules,
  type CalendarRules,
  type DateRange,
} from "@/lib/booking/calendar";
import {
  EMPTY_DETAILS,
  bookingBody,
  checkDetails,
  clientRefFor,
  fetchAvailability,
  forgetBooking,
  formatMoney,
  loadBooking,
  postBooking,
  requestSignature,
  saveBooking,
  stepForIssues,
  type DetailsField,
  type GuestDetails,
  type SavedBooking,
  type Stay,
  type Step,
} from "@/lib/booking/flow";
import type { Availability, BookingMode, BookingProblem, FieldIssue } from "@/lib/booking/types";
import { addDays, houseToday } from "@/lib/dates";
import { inquiryPrefill } from "@/lib/inquiry/prefill";
import { replyChannel } from "@/lib/inquiry/reply";
import { uuid } from "@/lib/uuid";
import { TextileBand } from "../brand/TextileBand";
import {
  Closed,
  Confirmation,
  DatesStep,
  DetailsStep,
  Problem,
  ReviewStep,
  RoomsStep,
  StayStub,
  StepList,
  type HouseNotes,
} from "./BookingSteps";
import styles from "./BookingFlow.module.css";

interface Terms {
  readonly rules: CalendarRules;
  readonly mode: BookingMode;
  readonly holdHours: number | null;
  readonly maxGuests: number | null;
  /** False when Shadow hasn't said its limits: the calendar then keeps only the website's own bounds. */
  readonly known: boolean;
}

type Search =
  | { readonly status: "idle" }
  | { readonly status: "loading"; readonly stay: Stay }
  | { readonly status: "loaded"; readonly stay: Stay; readonly availability: Availability }
  | { readonly status: "problem"; readonly stay: Stay; readonly problem: BookingProblem };

type Sending = { readonly status: "idle" | "sending" } | { readonly status: "problem"; readonly problem: BookingProblem };

/** open, closed (Shadow isn't taking bookings), still asking, or a problem reaching Shadow. */
type Status = "loading" | "open" | "closed" | BookingProblem;

const HEADINGS: Record<Exclude<Step, "done">, (mode: BookingMode) => string> = {
  dates: () => "When would you like to stay?",
  rooms: () => "Choose your beds",
  details: () => "Your details",
  review: (mode) => (mode === "instant" ? "Check and book" : "Check and send"),
};

function termsFrom(availability: Availability, today: string): Terms {
  return {
    rules: calendarRules(today, availability.limits),
    mode: availability.mode,
    holdHours: availability.hold_hours,
    maxGuests: availability.limits.max_guests,
    known: true,
  };
}

/** What the page arrived with: today at the house, dates from a link, or a confirmation to show again. */
interface Arrival {
  readonly today: string;
  readonly saved: SavedBooking | null;
  readonly range: DateRange;
  readonly guests: number;
}

function readArrival(): Arrival {
  const today = houseToday();
  const step = (window.history.state as { booking?: Step } | null)?.booking;
  const saved = step === "done" ? loadBooking() : null;
  const prefill = inquiryPrefill(window.location.search);
  const range = fitRange({ checkIn: prefill.check_in ?? null, checkOut: prefill.check_out ?? null }, looseRules(today));
  return { today, saved, range, guests: prefill.guests ?? 1 };
}

const subscribeNothing = () => () => {};

/**
 * Online booking on /book: dates and guests, the free beds, the guest's
 * details, a last look, then the request goes to Shadow Check-in and the
 * guest gets a reference. The browser's Back button moves between the steps.
 * It loads only on /book, and only when the site was built with Shadow
 * Check-in's address and key (app/book/page.tsx). The server renders the
 * first step's frame; the form itself starts in the browser, which knows
 * today's date and the link it came from.
 */
export function BookingFlow({ house }: { house: HouseNotes }) {
  const inBrowser = useSyncExternalStore(subscribeNothing, () => true, () => false);
  return inBrowser ? <Flow house={house} /> : <Arriving />;
}

/** The first step as the server renders it: the same frame, the calendar still empty. */
function Arriving() {
  const id = useId();
  return (
    <Frame headingId={`${id}-step`} stub={<StayStub stay={null} beds={null} price={null} />}>
      <div inert className={styles.stack}>
        <StepList current="dates" />
        <h2 id={`${id}-step`} className={styles.title}>
          {HEADINGS.dates("request")}
        </h2>
        <DatesStep
          id={id}
          headingId={`${id}-step`}
          rules={null}
          rulesKnown={false}
          range={NO_DATES}
          onRange={() => {}}
          guests={1}
          maxGuests={null}
          onGuests={() => {}}
          issues={[]}
          problem={null}
          onRetry={() => {}}
          onFind={() => {}}
        />
      </div>
    </Frame>
  );
}

function Frame({
  headingId,
  sectionRef,
  stub,
  children,
}: {
  headingId: string;
  sectionRef?: RefObject<HTMLElement | null>;
  stub: ReactNode;
  children: ReactNode;
}) {
  return (
    <section ref={sectionRef} id="book-online" aria-labelledby={headingId} className={styles.section}>
      <div className="container">
        <div className={styles.ticket}>
          <div className={styles.main}>
            <TextileBand pattern="lozenge" weave="view" />
            <div className={styles.body}>{children}</div>
          </div>
          {stub}
        </div>
      </div>
    </section>
  );
}

function Flow({ house }: { house: HouseNotes }) {
  const id = useId();
  const [arrival] = useState(readArrival);
  const { today } = arrival;
  const linkedStay: Stay | null =
    arrival.range.checkIn && arrival.range.checkOut
      ? { check_in: arrival.range.checkIn, check_out: arrival.range.checkOut, guests: arrival.guests }
      : null;

  const [terms, setTerms] = useState<Terms | null>(null);
  const [status, setStatus] = useState<Status>(arrival.saved ? "open" : "loading");
  const [step, setStep] = useState<Step>(arrival.saved ? "done" : linkedStay ? "rooms" : "dates");
  const [range, setRange] = useState<DateRange>(arrival.range);
  const [guests, setGuests] = useState(arrival.guests);
  const [dateIssues, setDateIssues] = useState<readonly FieldIssue[]>([]);
  const [search, setSearch] = useState<Search>(linkedStay ? { status: "loading", stay: linkedStay } : { status: "idle" });
  const [roomId, setRoomId] = useState<string | null>(null);
  const [taken, setTaken] = useState(false);
  const [details, setDetails] = useState<GuestDetails>(EMPTY_DETAILS);
  const [detailErrors, setDetailErrors] = useState<Partial<Record<DetailsField, string>>>({});
  const [sending, setSending] = useState<Sending>({ status: "idle" });
  const [saved, setSaved] = useState<SavedBooking | null>(arrival.saved);

  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const started = useRef(false);
  const searchCount = useRef(0);
  const lastRequest = useRef<{ signature: string; ref: string } | null>(null);

  function show(next: Step, history: "push" | "replace" = "push", url?: string) {
    moved.current = true;
    setStep(next);
    if (history === "push") window.history.pushState({ booking: next }, "", url);
    else window.history.replaceState({ booking: next }, "", url);
  }

  /** New limits from Shadow: dates and guests they no longer allow are dropped or brought down to them. */
  function applyTerms(next: Terms) {
    setTerms(next);
    setRange((current) => fitRange(current, next.rules));
    if (next.maxGuests) setGuests((current) => Math.min(current, next.maxGuests!));
  }

  /** The free beds for a stay. `known`: the terms so far (null when the calendar still needs them). */
  function lookUp(stay: Stay, known: Terms | null) {
    const count = ++searchCount.current;
    return fetchAvailability(stay).then((outcome) => {
      if (count !== searchCount.current) return; // The guest has asked about other dates since.
      if (outcome.ok) {
        applyTerms(termsFrom(outcome.availability, today));
        setStatus("open");
        setSearch({ status: "loaded", stay, availability: outcome.availability });
        // Keep the guest's choice only while it can still be booked.
        setRoomId((chosen) =>
          outcome.availability.room_types.some((room) => room.id === chosen && room.bookable) ? chosen : null,
        );
        return;
      }
      if (outcome.problem === "not_configured") {
        moved.current = true;
        setStatus("closed");
        return;
      }
      // The calendar still needs the house's rules if this was the first lookup (dates from a link).
      if (!known) void loadTerms();
      if (outcome.problem === "invalid") {
        // Shadow turned the dates or the party down: back to the first step, in its words.
        setSearch({ status: "idle" });
        setDateIssues(outcome.issues);
        show("dates");
        return;
      }
      setSearch({ status: "problem", stay, problem: outcome.problem });
    });
  }

  /** The house's rules for the calendar, from a lookup of tonight for one guest. */
  function loadTerms() {
    return fetchAvailability({ check_in: today, check_out: addDays(today, 1), guests: 1 }).then((outcome) => {
      if (outcome.ok) {
        applyTerms(termsFrom(outcome.availability, today));
        setStatus("open");
      } else if (outcome.problem === "not_configured") {
        moved.current = true;
        setStatus("closed");
      } else {
        // Shadow still checks its limits (and explains) when the guest looks for beds.
        setTerms((current) => current ?? { rules: looseRules(today), mode: "request", holdHours: null, maxGuests: null, known: false });
        setStatus(outcome.problem === "invalid" ? "open" : outcome.problem);
      }
    });
  }

  // On arrival: the history entries for the steps, then Shadow's rules or the linked dates' free beds.
  useEffect(() => {
    if (started.current || arrival.saved) return;
    started.current = true;
    window.history.replaceState({ booking: "dates" }, "");
    if (linkedStay) {
      // Dates from a link: straight to the free beds, with the dates one step back.
      window.history.pushState({ booking: "rooms" }, "", `?${stayQuery(linkedStay)}${window.location.hash}`);
      void lookUp(linkedStay, null);
    } else {
      void loadTerms();
    }
    // Runs once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The Back and Forward buttons move between the steps. After a booking, sending the same request
  // again reuses its client_ref, so Shadow answers with the same booking rather than a second one.
  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      moved.current = true;
      setStep((event.state as { booking?: Step } | null)?.booking ?? "dates");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // A new step: its heading takes focus (screen readers announce it), and the page scrolls back to the form.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    headingRef.current?.focus({ preventScroll: true });
    if ((sectionRef.current?.getBoundingClientRect().top ?? 0) < 0) sectionRef.current?.scrollIntoView({ block: "start" });
  }, [step, status]);

  const stay: Stay | null =
    range.checkIn && range.checkOut ? { check_in: range.checkIn, check_out: range.checkOut, guests } : null;
  const shown = search.status === "loaded" ? search : null;
  const room = shown?.availability.room_types.find((candidate) => candidate.id === roomId) ?? null;
  const mode = terms?.mode ?? "request";
  const replyBy = replyChannel(details.preferred_contact || null, details.email.trim() || null, details.phone.trim() || null);

  function findBeds() {
    if (!stay) return;
    setDateIssues([]);
    setTaken(false);
    setSearch({ status: "loading", stay });
    show("rooms", "push", `?${stayQuery(stay)}`);
    void lookUp(stay, terms);
  }

  function retrySearch() {
    if (search.status === "idle") return;
    setSearch({ status: "loading", stay: search.stay });
    void lookUp(search.stay, terms);
  }

  function continueToReview(): boolean {
    const errors = checkDetails(details);
    setDetailErrors(errors);
    if (Object.keys(errors).length > 0) return false;
    setSending({ status: "idle" });
    show("review");
    return true;
  }

  function send() {
    if (!shown || !room || sending.status === "sending") return;
    const draft = bookingBody("", shown.stay, room.id, details);
    const next = clientRefFor(lastRequest.current, draft, uuid);
    lastRequest.current = next;
    setSending({ status: "sending" });
    void postBooking({ ...draft, client_ref: next.ref }).then((outcome) => {
      if (outcome.ok) {
        const booked = outcome.confirmation;
        const shownTotal = room.price ? formatMoney(room.price.total, room.price.currency) : null;
        const bookedTotal = booked.total !== null && booked.currency ? formatMoney(booked.total, booked.currency) : null;
        const done: SavedBooking = {
          confirmation: booked,
          stay: shown.stay,
          roomName: room.name,
          replyBy,
          arrival: details.arrival_time || null,
          shownTotal: shownTotal && bookedTotal && shownTotal !== bookedTotal ? shownTotal : null,
        };
        saveBooking(done);
        setSaved(done);
        setSending({ status: "idle" });
        show("done", "replace");
        return;
      }
      setSending({ status: "idle" });
      if (outcome.problem === "taken") {
        // The beds went while the guest was booking: fresh availability, their details kept.
        setTaken(true);
        setSearch({ status: "loading", stay: shown.stay });
        show("rooms");
        void lookUp(shown.stay, terms);
        return;
      }
      if (outcome.problem === "not_configured") {
        moved.current = true;
        setStatus("closed");
        return;
      }
      if (outcome.problem === "invalid") {
        const target = stepForIssues(outcome.issues);
        if (target === "dates") setDateIssues(outcome.issues);
        if (target === "details") setDetailErrors(Object.fromEntries(outcome.issues.map((issue) => [issue.field, issue.message])));
        if (target === "rooms") {
          setRoomId(null);
          setSearch({ status: "loading", stay: shown.stay });
          void lookUp(shown.stay, terms);
        }
        if (target !== "review") {
          show(target);
          return;
        }
      }
      setSending({ status: "problem", problem: outcome.problem });
    });
  }

  function startAgain() {
    forgetBooking();
    lastRequest.current = null;
    setSaved(null);
    setRange(NO_DATES);
    setSearch({ status: "idle" });
    setRoomId(null);
    setDetails(EMPTY_DETAILS);
    setTaken(false);
    show("dates", "replace", window.location.pathname);
    if (!terms) void loadTerms();
  }

  const headingId = `${id}-step`;
  const booked = step === "done" && saved ? saved : null;
  const bookedTotal = booked?.confirmation.total != null && booked.confirmation.currency ? formatMoney(booked.confirmation.total, booked.confirmation.currency) : null;
  const stub = booked ? (
    <StayStub stay={booked.stay} beds={booked.roomName} price={bookedTotal ?? "Confirmed by the team"} />
  ) : (
    <StayStub
      stay={shown?.stay ?? stay}
      beds={room?.name ?? null}
      price={room ? (room.price ? formatMoney(room.price.total, room.price.currency) : "Confirmed by the team") : null}
    />
  );

  let content: ReactNode;
  if (status === "closed") {
    content = <Closed headingId={headingId} headingRef={headingRef} />;
  } else if (step === "done" && saved) {
    content = <Confirmation saved={saved} house={house} headingId={headingId} headingRef={headingRef} onAgain={startAgain} />;
  } else if (step === "dates" || step === "rooms" || (shown && room && step !== "done")) {
    const current = step as Exclude<Step, "done">;
    content = (
      <>
        <StepList current={current} />
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className={styles.title}>
          {HEADINGS[current](mode)}
        </h2>
        {current === "dates" ? (
          <DatesStep
            id={id}
            headingId={headingId}
            rules={terms?.rules ?? null}
            rulesKnown={terms?.known ?? false}
            range={range}
            onRange={(next) => {
              setRange(next);
              setDateIssues([]);
            }}
            guests={guests}
            maxGuests={terms?.maxGuests ?? null}
            onGuests={(next) => {
              setGuests(next);
              setDateIssues([]);
            }}
            issues={dateIssues}
            problem={status !== "open" && status !== "loading" ? status : null}
            onRetry={() => void loadTerms()}
            onFind={findBeds}
          />
        ) : current === "rooms" ? (
          <RoomsStep
            search={search}
            roomId={roomId}
            onRoom={setRoomId}
            taken={taken}
            onChangeDates={() => show("dates")}
            onRetry={retrySearch}
            onContinue={() => show("details")}
          />
        ) : shown && room && current === "details" ? (
          <DetailsStep
            id={id}
            stay={shown.stay}
            room={room}
            details={details}
            errors={detailErrors}
            checkInFrom={house.checkInFrom}
            onChange={(field, value) => setDetails((before) => ({ ...before, [field]: value }))}
            onChangeRoom={() => show("rooms")}
            onContinue={continueToReview}
          />
        ) : shown && room ? (
          <ReviewStep
            stay={shown.stay}
            room={room}
            details={details}
            mode={mode}
            holdHours={terms?.holdHours ?? null}
            replyBy={replyBy}
            sending={sending.status === "sending"}
            sentAs={
              saved && lastRequest.current?.signature === requestSignature(bookingBody("", shown.stay, room.id, details))
                ? saved.confirmation.reference
                : null
            }
            onChange={(target) => show(target)}
            onSend={send}
          >
            {sending.status === "problem" ? <Problem problem={sending.problem} action="send" /> : null}
          </ReviewStep>
        ) : null}
      </>
    );
  } else {
    content = <Lost headingId={headingId} headingRef={headingRef} onStart={() => show("dates")} />;
  }

  return (
    <Frame headingId={headingId} sectionRef={sectionRef} stub={stub}>
      {content}
    </Frame>
  );
}

/** A step whose earlier choices are gone (after a reload): start again from the dates. */
function Lost({
  headingId,
  headingRef,
  onStart,
}: {
  headingId: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onStart: () => void;
}) {
  return (
    <div className={styles.stack}>
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className={styles.title}>
        Let’s start with your dates
      </h2>
      <p>The choices you made earlier were cleared when the page reloaded.</p>
      <p>
        <button type="button" className={styles.textButton} onClick={onStart}>
          Choose your dates
        </button>
      </p>
    </div>
  );
}

function stayQuery(stay: Stay): string {
  return new URLSearchParams({ check_in: stay.check_in, check_out: stay.check_out, guests: String(stay.guests) }).toString();
}
