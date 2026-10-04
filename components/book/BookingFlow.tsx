"use client";

import { useSearchParams } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
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
  houseTodayNow,
  loadBooking,
  postBooking,
  quoteOf,
  quoteText,
  requestSignature,
  saveBooking,
  stepForIssues,
  type DetailsField,
  type GuestDetails,
  type SavedBooking,
  type Stay,
  type Step,
} from "@/lib/booking/flow";
import { guestText } from "@/lib/booking/text";
import type { Availability, BookingLimits, BookingMode, BookingProblem, FieldIssue, Quote } from "@/lib/booking/types";
import { addDays } from "@/lib/dates";
import { inquiryPrefill } from "@/lib/inquiry/prefill";
import { replyChannel } from "@/lib/inquiry/reply";
import { uuid } from "@/lib/uuid";
import { entryFromBookingForm } from "./FollowLinks";
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
  /** Null when Shadow hasn't said its limits: the calendar then keeps only the website's own bounds. */
  readonly limits: BookingLimits | null;
  readonly mode: BookingMode;
  readonly holdHours: number | null;
}

type Search =
  | { readonly status: "idle" }
  | { readonly status: "loading"; readonly stay: Stay }
  | { readonly status: "loaded"; readonly stay: Stay; readonly availability: Availability }
  | { readonly status: "problem"; readonly stay: Stay; readonly problem: BookingProblem; readonly retryAfterSeconds: number | null };

type Sending =
  | { readonly status: "idle" | "sending" }
  | { readonly status: "problem"; readonly problem: BookingProblem; readonly retryAfterSeconds: number | null };

/**
 * Shadow's total changed while the guest was booking, so nothing was booked
 * (F1W-03): the review shows the new total for this stay and room, and the
 * guest decides.
 */
interface PriceChange {
  readonly stay: Stay;
  readonly roomId: string;
  readonly was: Quote;
  readonly now: Quote;
}

/** open, closed (Shadow isn't taking bookings), still asking, or a problem reaching Shadow. */
type Status = "loading" | "open" | "closed" | BookingProblem;

const HEADINGS: Record<Exclude<Step, "done">, (mode: BookingMode) => string> = {
  dates: () => "When would you like to stay?",
  rooms: () => "Choose your beds",
  details: () => "Your details",
  review: (mode) => (mode === "instant" ? "Check and book" : "Check and send"),
};

function termsFrom(availability: Availability): Terms {
  return { limits: availability.limits, mode: availability.mode, holdHours: availability.hold_hours };
}

/** The calendar's rules on a given day: Shadow's limits when known, else the website's own bounds. */
const rulesFor = (today: string, limits: BookingLimits | null): CalendarRules =>
  limits ? calendarRules(today, limits) : looseRules(today);

const sameStay = (a: Stay, b: Stay) => a.check_in === b.check_in && a.check_out === b.check_out && a.guests === b.guests;

/** The dates and guests a /book link carries (lib/inquiry/prefill.ts), inside the website's own bounds. */
function linkedStay(search: string, today: string): { range: DateRange; guests: number } {
  const prefill = inquiryPrefill(search);
  const range = fitRange({ checkIn: prefill.check_in ?? null, checkOut: prefill.check_out ?? null }, looseRules(today));
  return { range, guests: prefill.guests ?? 1 };
}

/** What the page arrived with: today at the house, dates from a link, or a confirmation to show again. */
interface Arrival {
  readonly today: string;
  readonly saved: SavedBooking | null;
  readonly range: DateRange;
  readonly guests: number;
}

/**
 * `search` is the address's query as Next.js has it (useSearchParams): after
 * a link inside the site, the page renders before the browser's address
 * changes, so window.location would still be the page the guest came from.
 */
function readArrival(search: string): Arrival {
  const today = houseTodayNow();
  const step = (window.history.state as { booking?: Step } | null)?.booking;
  const saved = step === "done" ? loadBooking() : null;
  return { today, saved, ...linkedStay(search, today) };
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
      <noscript>
        <p className={styles.notice}>
          Online booking needs JavaScript. You can still book on Booking.com or Agoda, or send the team a message below.
        </p>
      </noscript>
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
    // The floating Ask Shadow button steps aside for the form (the stub offers Shadow instead).
    <section ref={sectionRef} id="book-online" aria-labelledby={headingId} className={styles.section} data-hides-launcher="">
      <div className="container">
        <div className={styles.ticket}>
          <div className={styles.main}>
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
  const search = useSearchParams().toString();
  const [arrival] = useState(() => readArrival(search));
  const arrivedStay: Stay | null =
    arrival.range.checkIn && arrival.range.checkOut
      ? { check_in: arrival.range.checkIn, check_out: arrival.range.checkOut, guests: arrival.guests }
      : null;

  const [today, setToday] = useState(arrival.today);
  const [terms, setTerms] = useState<Terms | null>(null);
  const [status, setStatus] = useState<Status>(arrival.saved ? "open" : "loading");
  const [step, setStep] = useState<Step>(arrival.saved ? "done" : arrivedStay ? "rooms" : "dates");
  const [range, setRange] = useState<DateRange>(arrival.range);
  const [guests, setGuests] = useState(arrival.guests);
  const [dateIssues, setDateIssues] = useState<readonly FieldIssue[]>([]);
  const [lookup, setLookup] = useState<Search>(arrivedStay ? { status: "loading", stay: arrivedStay } : { status: "idle" });
  const [roomId, setRoomId] = useState<string | null>(null);
  const [taken, setTaken] = useState(false);
  const [priceChange, setPriceChange] = useState<PriceChange | null>(null);
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
  const todayNow = useRef(arrival.today);

  function show(next: Step, history: "push" | "replace" = "push", url?: string) {
    moved.current = true;
    setStep(next);
    if (history === "push") window.history.pushState({ booking: next }, "", url);
    else window.history.replaceState({ booking: next }, "", url);
  }

  /**
   * Today at the house, asked again: midnight in Vientiane may have passed
   * while the page was open, or the website's answers have shown that this
   * device's clock is off (F1W-09). Dates before it are dropped.
   */
  function refreshToday(): string {
    const now = houseTodayNow();
    if (now !== todayNow.current) {
      todayNow.current = now;
      setToday(now);
      setRange((current) => fitRange(current, looseRules(now)));
    }
    return now;
  }

  /** New limits from Shadow: dates and guests they no longer allow are dropped or brought down to them. */
  function applyTerms(next: Terms) {
    setTerms(next);
    setRange((current) => fitRange(current, rulesFor(todayNow.current, next.limits)));
    if (next.limits) setGuests((current) => Math.min(current, next.limits!.max_guests));
  }

  /** The free beds for a stay. `known`: the terms so far (null when the calendar still needs them). */
  function lookUp(stay: Stay, known: Terms | null) {
    const count = ++searchCount.current;
    return fetchAvailability(stay).then((outcome) => {
      if (count !== searchCount.current) return; // The guest has asked about other dates since.
      if (outcome.ok) {
        applyTerms(termsFrom(outcome.availability));
        setStatus("open");
        setLookup({ status: "loaded", stay, availability: outcome.availability });
        // Fresh prices: an earlier change is part of them now.
        setPriceChange(null);
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
        // If the check-in is in the past by the website's clock, today moves on and the dates go.
        if (outcome.issues.some((issue) => issue.field === "check_in")) refreshToday();
        setLookup({ status: "idle" });
        setDateIssues(outcome.issues);
        show("dates");
        return;
      }
      setLookup({ status: "problem", stay, problem: outcome.problem, retryAfterSeconds: outcome.retryAfterSeconds });
    });
  }

  /** The house's rules for the calendar, from a lookup of tonight for one guest. */
  function loadTerms(again = false): Promise<void> {
    const day = refreshToday();
    return fetchAvailability({ check_in: day, check_out: addDays(day, 1), guests: 1 }).then((outcome) => {
      if (outcome.ok) {
        applyTerms(termsFrom(outcome.availability));
        setStatus("open");
      } else if (outcome.problem === "not_configured") {
        moved.current = true;
        setStatus("closed");
      } else if (outcome.problem === "invalid" && !again && refreshToday() !== day) {
        // "Tonight" was already yesterday at the house: ask about the right night.
        return loadTerms(true);
      } else {
        // Shadow still checks its limits (and explains) when the guest looks for beds.
        setTerms((current) => current ?? { limits: null, mode: "request", holdHours: null });
        setStatus(outcome.problem === "invalid" ? "open" : outcome.problem);
      }
    });
  }

  /**
   * A link inside the site to /book with dates (one in Shadow's replies)
   * while the form is open: Next.js changes the address without a reload, so
   * the form starts from the linked stay itself, as on arrival (F1W-04). The
   * guest's details and choices are kept.
   */
  function followLink(linked: string) {
    const now = refreshToday();
    const link = linkedStay(linked, now);
    if (!link.range.checkIn) {
      // A link without dates (the Book button in the header) leaves the form as it is.
      window.history.replaceState({ booking: stepNow.current }, "");
      return;
    }
    const range = fitRange(link.range, rulesFor(now, terms?.limits ?? null));
    const party = Math.min(link.guests, terms?.limits?.max_guests ?? link.guests);
    setRange(range);
    setGuests(party);
    setDateIssues([]);
    setTaken(false);
    setSending({ status: "idle" });
    // The dates one step back, as on arrival; then the free beds for them.
    window.history.replaceState({ booking: "dates" }, "");
    if (range.checkIn && range.checkOut) {
      const stay = { check_in: range.checkIn, check_out: range.checkOut, guests: party };
      setLookup({ status: "loading", stay });
      show("rooms", "push", `?${stayQuery(stay)}${window.location.hash}`);
      void lookUp(stay, terms);
    } else {
      setLookup({ status: "idle" });
      show("dates", "replace");
    }
  }

  // On arrival: the history entries for the steps, then Shadow's rules or the linked dates' free beds.
  useEffect(() => {
    if (started.current || arrival.saved) return;
    started.current = true;
    window.history.replaceState({ booking: "dates" }, "");
    if (arrivedStay) {
      // Dates from a link: straight to the free beds, with the dates one step back.
      window.history.pushState({ booking: "rooms" }, "", `?${stayQuery(arrivedStay)}${window.location.hash}`);
      void lookUp(arrivedStay, null);
    } else {
      void loadTerms();
    }
    // Runs once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The address changed without a reload. The form's own steps (and Back and Forward between them) carry
  // their step in the history entry and are left to it; a link from elsewhere in the site is followed.
  // Which it was shows only once Next.js has written the new entry, while committing: it is read in a
  // layout effect, and the link is followed afterwards, so the message form below reads the entry first.
  const seenSearch = useRef(search);
  const linkToFollow = useRef<string | null>(null);
  const onLink = useEffectEvent(followLink);
  useLayoutEffect(() => {
    if (search === seenSearch.current) return;
    seenSearch.current = search;
    if (!entryFromBookingForm()) linkToFollow.current = search;
  }, [search]);
  useEffect(() => {
    const linked = linkToFollow.current;
    linkToFollow.current = null;
    if (linked !== null) onLink(linked);
  }, [search]);

  // Back at the page after a while (the phone was locked overnight): today may have moved on.
  const onVisible = useEffectEvent(() => {
    if (document.visibilityState === "visible") refreshToday();
  });
  useEffect(() => {
    const listener = () => onVisible();
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
  }, []);

  // The Back and Forward buttons move between the steps. Entries the form didn't make (a link to
  // #message on this page) leave the step alone. After a booking, sending the same request again
  // reuses its client_ref, so Shadow answers with the same booking rather than a second one.
  const stepNow = useRef(step);
  useEffect(() => {
    stepNow.current = step;
  }, [step]);
  const onHistory = useEffectEvent((target: Step) => {
    // An entry from before a followed link carries another stay in its address than the one on screen:
    // show that stay again (its dates, and its free beds on a later step). Only then: a stay Shadow
    // turned down shows nothing, and looking it up again would add a step each time Back is pressed.
    const link = linkedStay(window.location.search, todayNow.current);
    const { checkIn, checkOut } = link.range;
    const showing = lookup.status === "idle" ? null : lookup.stay;
    const stay = checkIn && checkOut ? { check_in: checkIn, check_out: checkOut, guests: link.guests } : null;
    if (stay && showing && target !== "done" && !sameStay(stay, showing)) {
      setRange(link.range);
      setGuests(link.guests);
      setDateIssues([]);
      if (target !== "dates") {
        setLookup({ status: "loading", stay });
        void lookUp(stay, terms);
      }
    }
    if (target === stepNow.current) return;
    moved.current = true;
    setStep(target);
  });
  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      const target = (event.state as { booking?: Step } | null)?.booking;
      if (target) onHistory(target);
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

  const rules = terms ? rulesFor(today, terms.limits) : null;
  const stay: Stay | null =
    range.checkIn && range.checkOut ? { check_in: range.checkIn, check_out: range.checkOut, guests } : null;
  const shown = lookup.status === "loaded" ? lookup : null;
  const room = shown?.availability.room_types.find((candidate) => candidate.id === roomId) ?? null;
  const mode = terms?.mode ?? "request";
  const replyBy = replyChannel(details.preferred_contact || null, details.email.trim() || null, details.phone.trim() || null);
  const change =
    priceChange && shown && room && priceChange.roomId === room.id && sameStay(priceChange.stay, shown.stay) ? priceChange : null;
  // The total the guest is shown for their beds, and the one the request carries.
  const quote: Quote | null = room ? (change?.now ?? quoteOf(room.price)) : null;

  function findBeds() {
    const now = refreshToday();
    if (!stay) return;
    if (stay.check_in < now) {
      // Midnight passed at the house while the page was open: the check-in is gone from the calendar.
      setDateIssues([{ field: "check_in", message: guestText.fromToday }]);
      return;
    }
    setDateIssues([]);
    setTaken(false);
    setLookup({ status: "loading", stay });
    show("rooms", "push", `?${stayQuery(stay)}`);
    void lookUp(stay, terms);
  }

  function retrySearch() {
    if (lookup.status === "idle") return;
    refreshToday();
    setLookup({ status: "loading", stay: lookup.stay });
    void lookUp(lookup.stay, terms);
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
    if (!shown || !room || !quote || sending.status === "sending") return;
    const draft = bookingBody("", shown.stay, room.id, details, quote);
    const next = clientRefFor(lastRequest.current, draft, uuid);
    lastRequest.current = next;
    setSending({ status: "sending" });
    void postBooking({ ...draft, client_ref: next.ref }).then((outcome) => {
      if (outcome.ok) {
        const booked = outcome.confirmation;
        // A Shadow Check-in from before the price protection books at its own total: say so if it differs.
        const [shownTotal, bookedTotal] = [quoteText(quote), quoteText(booked)];
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
        setPriceChange(null);
        setSending({ status: "idle" });
        show("done", "replace");
        return;
      }
      setSending({ status: "idle" });
      if (outcome.problem === "price_changed" && outcome.quote) {
        // Nothing was booked: the review shows the new total, and the guest decides.
        setPriceChange({ stay: shown.stay, roomId: room.id, was: quote, now: outcome.quote });
        return;
      }
      if (outcome.problem === "taken") {
        // The beds went while the guest was booking: fresh availability, their details kept.
        setTaken(true);
        setLookup({ status: "loading", stay: shown.stay });
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
          setLookup({ status: "loading", stay: shown.stay });
          void lookUp(shown.stay, terms);
        }
        if (target !== "review") {
          show(target);
          return;
        }
      }
      setSending({ status: "problem", problem: outcome.problem, retryAfterSeconds: outcome.retryAfterSeconds });
    });
  }

  function startAgain() {
    forgetBooking();
    lastRequest.current = null;
    setSaved(null);
    setRange(NO_DATES);
    setLookup({ status: "idle" });
    setRoomId(null);
    setDetails(EMPTY_DETAILS);
    setTaken(false);
    setPriceChange(null);
    show("dates", "replace", window.location.pathname);
    if (!terms) void loadTerms();
  }

  const headingId = `${id}-step`;
  const booked = step === "done" && saved ? saved : null;
  const stub = booked ? (
    <StayStub stay={booked.stay} beds={booked.roomName} price={quoteText(booked.confirmation) ?? "Confirmed by the team"} />
  ) : (
    <StayStub
      stay={shown?.stay ?? stay}
      beds={room?.name ?? null}
      price={quote ? (quoteText(quote) ?? "Confirmed by the team") : null}
    />
  );

  // A later step without its choices shows the beds again (after a 409, the room may be gone);
  // after a reload they are gone altogether.
  const needsRoom = step === "details" || step === "review";
  const current: Exclude<Step, "done"> | null =
    step === "done" ? null : needsRoom && !(shown && room) ? (lookup.status === "idle" ? null : "rooms") : step;

  let content: ReactNode;
  if (status === "closed") {
    content = <Closed headingId={headingId} headingRef={headingRef} />;
  } else if (step === "done" && saved) {
    content = <Confirmation saved={saved} house={house} headingId={headingId} headingRef={headingRef} onAgain={startAgain} />;
  } else if (current) {
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
            rules={rules}
            rulesKnown={Boolean(terms?.limits)}
            range={range}
            onRange={(next) => {
              setRange(next);
              setDateIssues([]);
            }}
            guests={guests}
            maxGuests={terms?.limits?.max_guests ?? null}
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
            search={lookup}
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
        ) : shown && room && quote ? (
          <ReviewStep
            stay={shown.stay}
            room={room}
            details={details}
            mode={mode}
            holdHours={terms?.holdHours ?? null}
            replyBy={replyBy}
            priceChange={change}
            sending={sending.status === "sending"}
            sentAs={
              saved && lastRequest.current?.signature === requestSignature(bookingBody("", shown.stay, room.id, details, quote))
                ? saved.confirmation.reference
                : null
            }
            onChange={(target) => show(target)}
            onSend={send}
          >
            {sending.status === "problem" ? (
              <Problem problem={sending.problem} action="send" retryAfterSeconds={sending.retryAfterSeconds} />
            ) : null}
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
