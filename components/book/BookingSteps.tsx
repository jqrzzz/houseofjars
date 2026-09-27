"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type RefObject } from "react";
import { identity } from "@/content/identity";
import { NO_DATES, nightsText, type CalendarRules, type DateRange } from "@/lib/booking/calendar";
import {
  DETAILS_FIELDS,
  STEPS,
  formatMoney,
  freeBedsText,
  kindLabel,
  priceLines,
  unavailableText,
  type DetailsField,
  type GuestDetails,
  type SavedBooking,
  type Stay,
  type Step,
} from "@/lib/booking/flow";
import { MAX_GUESTS, MAX_MESSAGE, MAX_NAME, type BookingMode, type BookingProblem, type FieldIssue, type RoomType } from "@/lib/booking/types";
import { formatDay, formatHouseTime, nightsBetween } from "@/lib/dates";
import { pages } from "@/lib/site";
import { AskShadowButton } from "../concierge/AskShadowButton";
import { ContactDetails } from "../contact/ContactDetails";
import { CopyButton } from "../contact/CopyButton";
import buttons from "../ui/button.module.css";
import { ArrowIcon, CheckIcon, ExternalIcon, MinusIcon, PlusIcon } from "../ui/icons";
import { Stamp } from "../ui/Stamp";
import styles from "./BookingFlow.module.css";
import { DateRangePicker } from "./DateRangePicker";
import form from "./InquiryForm.module.css";

/*
 * The steps of the booking form (components/book/BookingFlow.tsx holds the
 * state). Words about prices come only from Shadow's answers: with no rate
 * set, the page says the team confirms the price.
 */

/** What the confirmation says about arriving, from the content layer. */
export interface HouseNotes {
  readonly checkInFrom: string;
  /** Why to bring a passport, in a sentence that says whose rule it is. */
  readonly passport: string;
}

const platforms = [
  { name: "Booking.com", href: identity.links.booking.value },
  { name: "Agoda", href: identity.links.agoda.value },
];

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
const stayNightsText = (stay: Stay) => nightsText(nightsBetween(stay.check_in, stay.check_out));

export function StepList({ current }: { current: Exclude<Step, "done"> }) {
  const index = STEPS.findIndex((step) => step.id === current);
  return (
    <nav aria-label="Booking steps" className={styles.steps}>
      <ol role="list">
        {STEPS.map((step, i) => (
          <li
            key={step.id}
            aria-current={i === index ? "step" : undefined}
            data-state={i < index ? "done" : i === index ? "current" : "next"}
          >
            <span className={styles.stepMark} aria-hidden="true">
              {i < index ? <CheckIcon /> : i + 1}
            </span>
            <span className={styles.stepLabel}>
              <span className="visually-hidden">Step {i + 1} of {STEPS.length}: </span>
              {step.label}
              {i < index ? <span className="visually-hidden"> (done)</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** The house's limits in a sentence, once Shadow has said them. */
function rulesText(rules: CalendarRules): string {
  const nights =
    rules.minNights === rules.maxNights
      ? plural(rules.minNights, "night")
      : rules.minNights === 1
        ? `up to ${plural(rules.maxNights, "night")}`
        : `${rules.minNights} to ${rules.maxNights} nights`;
  return `Online booking is open until ${formatDay(rules.last, "long")}, for stays of ${nights}.`;
}

export function DatesStep({
  id,
  headingId,
  rules,
  rulesKnown,
  range,
  onRange,
  guests,
  maxGuests,
  onGuests,
  issues,
  problem,
  onRetry,
  onFind,
}: {
  id: string;
  headingId: string;
  rules: CalendarRules | null;
  rulesKnown: boolean;
  range: DateRange;
  onRange: (range: DateRange) => void;
  guests: number;
  maxGuests: number | null;
  onGuests: (guests: number) => void;
  issues: readonly FieldIssue[];
  problem: BookingProblem | null;
  onRetry: () => void;
  onFind: () => void;
}) {
  const [tried, setTried] = useState(false);
  const chosen = Boolean(range.checkIn && range.checkOut);
  const limit = maxGuests ?? MAX_GUESTS;
  const messages = [...new Set(issues.map((issue) => issue.message))];
  const hint = !range.checkIn
    ? "Choose your check-in date."
    : !range.checkOut
      ? "Now choose your check-out date."
      : `${stayNightsText({ check_in: range.checkIn, check_out: range.checkOut, guests })}.`;

  return (
    <div className={styles.stack}>
      {problem ? <Problem problem={problem} action="check" onRetry={onRetry} /> : null}
      {messages.length > 0 ? (
        <div role="alert" className={styles.notice}>
          {messages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}

      <div className={styles.picks}>
        <DateValue label="Check-in" date={range.checkIn} />
        <DateValue label="Check-out" date={range.checkOut} />
        <div className={styles.pick} role="group" aria-labelledby={`${id}-guests`}>
          <span id={`${id}-guests`} className={styles.pickLabel}>
            Guests
          </span>
          <span className={styles.stepper}>
            <button
              type="button"
              className={styles.stepperButton}
              aria-label="Fewer guests"
              aria-disabled={guests <= 1 || undefined}
              onClick={() => guests > 1 && onGuests(guests - 1)}
            >
              <MinusIcon />
            </button>
            <output className={`${styles.pickValue} tnum`} aria-live="polite">
              {guests}
              <span className="visually-hidden">{guests === 1 ? " guest" : " guests"}</span>
            </output>
            <button
              type="button"
              className={styles.stepperButton}
              aria-label="More guests"
              aria-disabled={guests >= limit || undefined}
              onClick={() => guests < limit && onGuests(guests + 1)}
            >
              <PlusIcon />
            </button>
          </span>
        </div>
      </div>

      <div className={styles.hints}>
        <p aria-live="polite">{hint}</p>
        {rules && rulesKnown ? (
          <p>{rulesText(rules)}</p>
        ) : rules ? null : (
          // Holds the line the house's rules will fill, so the calendar doesn't move when they arrive.
          <p aria-hidden="true" className={styles.reserve}>
            Online booking is open until Wednesday 29 September 2027, for stays of up to 30 nights.
          </p>
        )}
        {maxGuests && guests >= maxGuests ? (
          <p>
            Online booking takes up to {plural(maxGuests, "guest")}. For a bigger group,{" "}
            <a href="#message">send the team a message</a>.
          </p>
        ) : null}
      </div>

      <DateRangePicker rules={rules} range={range} onChange={onRange} labelledBy={headingId} />
      <p role="status" className="visually-hidden">
        {rules ? "" : "Opening the calendar…"}
      </p>

      <div className={styles.actions}>
        <button
          type="button"
          className={`${buttons.button} ${buttons.primary}`}
          aria-disabled={!chosen || undefined}
          onClick={() => {
            setTried(!chosen);
            if (chosen) onFind();
          }}
        >
          See free beds
          <ArrowIcon />
        </button>
        {range.checkIn ? (
          <button type="button" className={styles.textButton} onClick={() => onRange(NO_DATES)}>
            Clear dates
          </button>
        ) : null}
      </div>
      {tried && !chosen ? (
        <p role="alert" className={form.error}>
          Please choose your check-in and check-out dates.
        </p>
      ) : null}
    </div>
  );
}

function DateValue({ label, date }: { label: string; date: string | null }) {
  return (
    <div className={styles.pick}>
      <span className={styles.pickLabel}>{label}</span>
      <span className={`${styles.pickValue} tnum`} data-empty={date ? undefined : true}>
        {date ? formatDay(date) : "Choose"}
      </span>
    </div>
  );
}

/** Dates, nights, guests (and beds, once chosen), with a way back. */
function TripLine({ stay, room, change, onChange }: { stay: Stay; room?: RoomType; change: string; onChange: () => void }) {
  return (
    <div className={styles.trip}>
      <p>
        <span className={`${styles.tripDates} tnum`}>
          {formatDay(stay.check_in)} – {formatDay(stay.check_out)}
        </span>
        <span className={styles.tripMeta}>
          {stayNightsText(stay)} · {plural(stay.guests, "guest")}
          {room ? ` · ${room.name}` : ""}
        </span>
      </p>
      <button type="button" className={styles.textButton} onClick={onChange}>
        {change}
      </button>
    </div>
  );
}

type SearchView =
  | { readonly status: "idle" }
  | { readonly status: "loading"; readonly stay: Stay }
  | { readonly status: "loaded"; readonly stay: Stay; readonly availability: { readonly room_types: readonly RoomType[] } }
  | { readonly status: "problem"; readonly stay: Stay; readonly problem: BookingProblem };

export function RoomsStep({
  search,
  roomId,
  onRoom,
  taken,
  onChangeDates,
  onRetry,
  onContinue,
}: {
  search: SearchView;
  roomId: string | null;
  onRoom: (id: string) => void;
  taken: boolean;
  onChangeDates: () => void;
  onRetry: () => void;
  onContinue: () => void;
}) {
  const id = useId();
  const [tried, setTried] = useState(false);
  const rooms = search.status === "loaded" ? search.availability.room_types : [];
  const chosen = rooms.some((room) => room.id === roomId && room.bookable);

  return (
    <div className={styles.stack}>
      {search.status === "idle" ? null : <TripLine stay={search.stay} change="Change dates" onChange={onChangeDates} />}
      {taken ? (
        <div role="alert" className={styles.notice}>
          <p>
            <strong>Sorry, those beds were taken while you were booking.</strong> Here is what is free for your dates now;
            your details are kept.
          </p>
        </div>
      ) : null}

      {search.status === "loading" ? (
        <>
          <p role="status" className={styles.hints}>
            Checking free beds…
          </p>
          <div className={styles.skeleton} aria-hidden="true">
            <span />
            <span />
          </div>
        </>
      ) : search.status === "problem" ? (
        <Problem problem={search.problem} action="check" onRetry={onRetry} />
      ) : search.status === "loaded" ? (
        <>
          {rooms.some((room) => room.bookable) ? null : (
            <div className={styles.notice}>
              <p>
                <strong>No beds are free online for all of these nights.</strong> Try other dates or fewer guests, or{" "}
                <a href="#message">send the team a message</a>: they may still be able to help.
              </p>
            </div>
          )}
          <fieldset className={styles.rooms}>
            <legend className="visually-hidden">Beds for your stay</legend>
            {rooms.map((room) => (
              <RoomOption
                key={room.id}
                id={`${id}-${room.id}`}
                name={`${id}-room`}
                room={room}
                stay={search.stay}
                checked={room.id === roomId}
                onChoose={() => {
                  setTried(false);
                  onRoom(room.id);
                }}
              />
            ))}
          </fieldset>
          <div className={styles.actions}>
            <button
              type="button"
              className={`${buttons.button} ${buttons.primary}`}
              aria-disabled={!chosen || undefined}
              onClick={() => {
                setTried(!chosen);
                if (chosen) onContinue();
              }}
            >
              Continue
              <ArrowIcon />
            </button>
          </div>
          {tried && !chosen ? (
            <p role="alert" className={form.error}>
              Please choose where you would like to sleep.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function RoomOption({
  id,
  name,
  room,
  stay,
  checked,
  onChoose,
}: {
  id: string;
  name: string;
  room: RoomType;
  stay: Stay;
  checked: boolean;
  onChoose: () => void;
}) {
  const kind = kindLabel(room);
  const unavailable = unavailableText(room, stay.guests);
  const lines = room.price ? priceLines(room.price, stay) : null;
  return (
    <label className={styles.room} data-unavailable={unavailable ? true : undefined} data-chosen={checked || undefined}>
      <input
        type="radio"
        name={name}
        value={room.id}
        checked={checked}
        disabled={!room.bookable}
        onChange={onChoose}
        className={styles.roomRadio}
        aria-labelledby={`${id}-name`}
        aria-describedby={`${id}-info ${id}-price`}
      />
      <span className={styles.roomMain}>
        <span id={`${id}-name`} className={styles.roomName}>
          {room.name}
        </span>
        <span id={`${id}-info`} className={styles.roomInfo}>
          {kind ? <span className={styles.roomKind}>{kind}</span> : null}
          {room.description ? <span className={styles.roomText}>{room.description}</span> : null}
          {room.features.length > 0 ? <span className={styles.roomFeatures}>{room.features.join(" · ")}</span> : null}
          <span className={styles.roomBeds} data-short={unavailable ? true : undefined}>
            {unavailable ?? freeBedsText(room, nightsBetween(stay.check_in, stay.check_out))}
          </span>
        </span>
      </span>
      <span id={`${id}-price`} className={styles.roomPrice}>
        {lines ? (
          <>
            <span className={`${styles.amount} tnum`}>{lines.perNight}</span>
            <span>per guest per night</span>
            <span className={styles.roomTotal}>
              <span className="tnum">{lines.total}</span> in all for {lines.totalFor}
            </span>
          </>
        ) : (
          <span className={styles.roomTotal}>Price confirmed by the team</span>
        )}
      </span>
      <NightStrip room={room} guests={stay.guests} />
    </label>
  );
}

/** The free beds on each night of the stay, from Shadow's counts. */
function NightStrip({ room, guests }: { room: RoomType; guests: number }) {
  return (
    <span className={styles.nights}>
      <span className="visually-hidden">Free beds each night: </span>
      {room.free_each_night.map((night) => (
        <span key={night.date} className={styles.night} data-short={night.free < guests ? true : undefined}>
          <span className={styles.nightDay}>{formatDay(night.date)}</span>
          <span className={`${styles.nightFree} tnum`}>
            {night.free}
            <span className="visually-hidden"> {night.free === 1 ? "bed" : "beds"} free</span>
            <span className={styles.nightUnit} aria-hidden="true">
              {" "}
              free
            </span>
          </span>
          <span className="visually-hidden">;</span>
        </span>
      ))}
    </span>
  );
}

export function DetailsStep({
  id,
  stay,
  room,
  details,
  errors,
  checkInFrom,
  onChange,
  onChangeRoom,
  onContinue,
}: {
  id: string;
  stay: Stay;
  room: RoomType;
  details: GuestDetails;
  errors: Partial<Record<DetailsField, string>>;
  checkInFrom: string;
  onChange: <F extends DetailsField>(field: F, value: GuestDetails[F]) => void;
  onChangeRoom: () => void;
  onContinue: () => boolean;
}) {
  const summaryRef = useRef<HTMLDivElement>(null);
  const [attempts, setAttempts] = useState(0);
  const fieldId = (field: DetailsField) => `${id}-${field}`;
  const errorList = DETAILS_FIELDS.filter((field) => errors[field]);

  useEffect(() => {
    if (attempts > 0) summaryRef.current?.focus();
  }, [attempts]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onContinue()) setAttempts((count) => count + 1);
  }

  const describedBy = (field: DetailsField, hint?: string) =>
    [hint, errors[field] ? `${fieldId(field)}-error` : null].filter(Boolean).join(" ") || undefined;
  const error = (field: DetailsField) =>
    errors[field] ? (
      <p id={`${fieldId(field)}-error`} className={form.error}>
        {errors[field]}
      </p>
    ) : null;
  const text = (field: "name" | "email" | "phone" | "arrival_time" | "message") => ({
    id: fieldId(field),
    name: field,
    value: details[field],
    onChange: (event: { target: { value: string } }) => onChange(field, event.target.value),
    "aria-invalid": errors[field] ? true : undefined,
  });

  return (
    <form className={`${form.form} ${styles.detailsForm}`} noValidate onSubmit={onSubmit} aria-label="Your details">
      <TripLine stay={stay} room={room} change="Change beds" onChange={onChangeRoom} />

      {errorList.length > 0 && attempts > 0 ? (
        <div ref={summaryRef} tabIndex={-1} className={form.summary} role="alert">
          <p className={form.summaryTitle}>Please check {errorList.length === 1 ? "one thing" : "a few things"}:</p>
          <ul>
            {errorList.map((field) => (
              <li key={field}>
                <a href={`#${fieldId(field)}`}>{errors[field]}</a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Field label="Your name" htmlFor={fieldId("name")} error={error("name")}>
        <input {...text("name")} autoComplete="name" maxLength={MAX_NAME} required aria-describedby={describedBy("name")} />
      </Field>

      <p className={form.hint} id={`${id}-contact-hint`}>
        How can the team reach you? Give an email address, a WhatsApp number, or both.
      </p>
      <div className={form.pair}>
        <Field label="Email" htmlFor={fieldId("email")} error={error("email")}>
          <input
            {...text("email")}
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-describedby={describedBy("email", `${id}-contact-hint`)}
          />
        </Field>
        <Field label="WhatsApp or phone" htmlFor={fieldId("phone")} error={error("phone")}>
          <input
            {...text("phone")}
            type="tel"
            autoComplete="tel"
            maxLength={40}
            placeholder="+44 7700 900123"
            aria-describedby={describedBy("phone", `${id}-contact-hint`)}
          />
        </Field>
      </div>

      <fieldset className={styles.choice} aria-describedby={errors.preferred_contact ? `${fieldId("preferred_contact")}-error` : undefined}>
        <legend className={form.label}>How should the team reply?</legend>
        <span className={styles.choices}>
          {(
            [
              ["", "Either is fine"],
              ["email", "Email"],
              ["whatsapp", "WhatsApp"],
              ["phone", "Phone call"],
            ] as const
          ).map(([value, label]) => (
            <label key={value || "either"} className={styles.chip}>
              <input
                id={value === "" ? fieldId("preferred_contact") : undefined}
                type="radio"
                name="preferred_contact"
                value={value}
                checked={details.preferred_contact === value}
                onChange={() => onChange("preferred_contact", value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </span>
        {error("preferred_contact")}
      </fieldset>

      <div className={form.pair}>
        <Field label="Arrival time" optional htmlFor={fieldId("arrival_time")} error={error("arrival_time")}>
          <input {...text("arrival_time")} type="time" aria-describedby={describedBy("arrival_time", `${id}-arrival-hint`)} />
          <p className={form.hint} id={`${id}-arrival-hint`}>
            Check-in is from {checkInFrom}.
          </p>
        </Field>
      </div>

      <Field label="Anything the team should know?" optional htmlFor={fieldId("message")} error={error("message")}>
        <textarea
          {...text("message")}
          rows={4}
          maxLength={MAX_MESSAGE}
          placeholder="A late arrival, a bed preference, a question…"
          aria-describedby={describedBy("message")}
        />
      </Field>

      <div className={form.consent}>
        <input
          id={fieldId("consent")}
          name="consent"
          type="checkbox"
          checked={details.consent}
          onChange={(event) => onChange("consent", event.target.checked)}
          aria-invalid={errors.consent ? true : undefined}
          aria-describedby={describedBy("consent")}
        />
        <label htmlFor={fieldId("consent")}>
          I agree to the <Link href={pages.privacy.path}>privacy notice</Link> and want the House of Jars team to contact
          me about this booking.
        </label>
        {error("consent")}
      </div>
      <p className={form.note}>Please don’t include passport or card details. The team will see your passport at check-in.</p>

      <div className={form.actions}>
        <button type="submit" className={`${buttons.button} ${buttons.primary}`}>
          Continue
          <ArrowIcon />
        </button>
      </div>
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
    <div className={form.field}>
      <label htmlFor={htmlFor} className={form.label}>
        {label}
        {optional ? <span className={form.optional}> (optional)</span> : null}
      </label>
      {children}
      {error}
    </div>
  );
}

export function ReviewStep({
  stay,
  room,
  details,
  mode,
  holdHours,
  replyBy,
  sending,
  sentAs,
  onChange,
  onSend,
  children,
}: {
  stay: Stay;
  room: RoomType;
  details: GuestDetails;
  mode: BookingMode;
  holdHours: number | null;
  replyBy: string;
  sending: boolean;
  /** The reference, when exactly this request has already been booked. */
  sentAs: string | null;
  onChange: (step: Step) => void;
  onSend: () => void;
  children: ReactNode;
}) {
  const lines = room.price ? priceLines(room.price, stay) : null;
  const kind = kindLabel(room);
  const contact = [details.email.trim(), details.phone.trim()].filter(Boolean);
  return (
    <div className={styles.stack}>
      <dl className={styles.review}>
        <ReviewRow term="Dates" change="Change dates" onChange={() => onChange("dates")}>
          <span className="tnum">
            {formatDay(stay.check_in, "long")} to {formatDay(stay.check_out, "long")}
          </span>
          <span className={styles.reviewNote}>
            {stayNightsText(stay)}, {plural(stay.guests, "guest")}
          </span>
        </ReviewRow>
        <ReviewRow term="Beds" change="Change beds" onChange={() => onChange("rooms")}>
          {room.name}
          {kind ? <span className={styles.reviewNote}>{kind}</span> : null}
        </ReviewRow>
        <ReviewRow term="Price">
          {lines ? (
            <>
              <span className="tnum">{lines.total}</span>
              <span className={styles.reviewNote}>
                {lines.perNight} per guest per night, for {lines.totalFor}
              </span>
            </>
          ) : (
            <>
              Confirmed by the team
              <span className={styles.reviewNote}>The house hasn’t set an online price for these beds yet.</span>
            </>
          )}
        </ReviewRow>
        <ReviewRow term="Payment">
          At the house
          <span className={styles.reviewNote}>Nothing to pay online.</span>
        </ReviewRow>
        <ReviewRow term="You" change="Change details" onChange={() => onChange("details")}>
          {details.name.trim()}
          {contact.map((line) => (
            <span key={line} className={styles.reviewNote}>
              {line}
            </span>
          ))}
          <span className={styles.reviewNote}>
            Reply {replyBy}
            {details.arrival_time ? ` · arriving around ${details.arrival_time}` : ""}
          </span>
        </ReviewRow>
        {details.message.trim() ? (
          <ReviewRow term="Message">
            <span className={styles.reviewMessage}>{details.message.trim()}</span>
          </ReviewRow>
        ) : null}
      </dl>

      <p className={styles.next}>
        {mode === "instant"
          ? "Your beds are booked as soon as you press Book now."
          : `The team confirms your booking ${replyBy}${holdHours ? ` within ${plural(holdHours, "hour")}, and your beds are held for you until then` : ""}.`}{" "}
        Nothing to pay now: you pay at the house.
      </p>
      {sentAs ? (
        <p className={styles.notice}>
          You have already sent this request (reference {sentAs}). Sending it again won’t make a second booking.
        </p>
      ) : null}

      <div className={styles.actions}>
        <button
          type="button"
          className={`${buttons.button} ${buttons.primary}`}
          aria-disabled={sending || undefined}
          onClick={onSend}
        >
          {sending ? "Sending…" : mode === "instant" ? "Book now" : "Send booking request"}
          <ArrowIcon />
        </button>
      </div>
      <p role="status" className="visually-hidden">
        {sending ? "Sending your booking…" : ""}
      </p>
      {children}
    </div>
  );
}

function ReviewRow({
  term,
  change,
  onChange,
  children,
}: {
  term: string;
  change?: string;
  onChange?: () => void;
  children: ReactNode;
}) {
  return (
    <div className={styles.reviewRow}>
      <dt className={styles.pickLabel}>{term}</dt>
      <dd className={styles.reviewValue}>{children}</dd>
      {change && onChange ? (
        <dd className={styles.reviewChange}>
          <button type="button" className={styles.textButton} onClick={onChange}>
            {change}
          </button>
        </dd>
      ) : null}
    </div>
  );
}

export function Confirmation({
  saved,
  house,
  headingId,
  headingRef,
  onAgain,
}: {
  saved: SavedBooking;
  house: HouseNotes;
  headingId: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onAgain: () => void;
}) {
  const { confirmation, stay } = saved;
  const pending = confirmation.status === "pending";
  const until = confirmation.hold_expires_at ? formatHouseTime(confirmation.hold_expires_at) : null;
  const total = confirmation.total !== null && confirmation.currency ? formatMoney(confirmation.total, confirmation.currency) : null;

  return (
    <div className={styles.done}>
      <Stamp text={pending ? "Request received" : "Booked"} className={styles.stamp} />
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className={styles.title}>
        {pending ? "Booking request sent" : "You’re booked"}
      </h2>
      <div className={styles.reference}>
        <span className={styles.pickLabel}>Your reference</span>
        <span className={styles.referenceCode}>{confirmation.reference}</span>
        <CopyButton value={confirmation.reference} what="reference" />
      </div>
      <p className={styles.doneStay}>
        <span className="tnum">
          {formatDay(stay.check_in, "long")} to {formatDay(stay.check_out, "long")}
        </span>
        <span>
          {stayNightsText(stay)}, {plural(stay.guests, "guest")}, {saved.roomName}
        </span>
      </p>

      <h3 className={styles.nextTitle}>What happens next</h3>
      <ol className={styles.nextSteps}>
        <li>
          {pending
            ? `The team checks your request and confirms it ${saved.replyBy}${until ? `, by ${until} (Vientiane time). Your beds are held for you until then` : ""}.`
            : "Your beds are booked. Keep your reference: it is how the team finds your booking."}
        </li>
        <li>
          {total
            ? `The total is ${total}, and you pay it at the house.`
            : "The team confirms the price with your booking, and you pay at the house."}{" "}
          Nothing to pay now.
          {saved.shownTotal ? ` The rate changed while you were booking: the page had shown ${saved.shownTotal}.` : ""}
        </li>
        <li>
          Check-in is from {house.checkInFrom}
          {saved.arrival ? `, and the team knows you plan to arrive around ${saved.arrival}` : ""}. {house.passport}
        </li>
        <li>To change or cancel, message the team with your reference.</li>
      </ol>
      <ContactDetails compact />
      <p>
        <button type="button" className={styles.textButton} onClick={onAgain}>
          Book another stay
        </button>
      </p>
    </div>
  );
}

/** The summary beside the steps, and the other ways to book. `beds` and `price` once a room is chosen. */
export function StayStub({ stay, beds, price }: { stay: Stay | null; beds: string | null; price: string | null }) {
  return (
    <aside className={styles.stub} aria-label="Your stay">
      <p className={styles.stubTitle}>Your stay</p>
      {stay ? (
        <dl className={styles.stubList}>
          <div>
            <dt>Check-in</dt>
            <dd className="tnum">{formatDay(stay.check_in)}</dd>
          </div>
          <div>
            <dt>Check-out</dt>
            <dd className="tnum">{formatDay(stay.check_out)}</dd>
          </div>
          <div>
            <dt>Stay</dt>
            <dd>
              {stayNightsText(stay)}, {plural(stay.guests, "guest")}
            </dd>
          </div>
          {beds ? (
            <div>
              <dt>Beds</dt>
              <dd>{beds}</dd>
            </div>
          ) : null}
          {price ? (
            <div>
              <dt>Price</dt>
              <dd className="tnum">{price}</dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className={styles.stubText}>Choose your dates to see the free beds.</p>
      )}
      <p className={styles.stubPay}>Nothing to pay online: you pay at the house.</p>
      <div className={styles.stubOther}>
        <p className={styles.stubTitle}>Or book on</p>
        <ul role="list" className={styles.stubLinks}>
          {platforms.map((platform) => (
            <li key={platform.name}>
              <a href={platform.href} target="_blank" rel="noopener noreferrer">
                <span>{platform.name}</span>
                <ExternalIcon />
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
        <p className={styles.stubText}>
          Or <a href="#message">send the team a message</a>, or{" "}
          <AskShadowButton className={styles.linkButton}>ask Shadow</AskShadowButton>.
        </p>
      </div>
    </aside>
  );
}

const PROBLEM_TEXT: Record<"check" | "send", Record<"rate_limited" | "busy" | "unavailable" | "other", string>> = {
  check: {
    rate_limited: "You have looked up a lot of dates in a short time. Please wait a minute, then try again.",
    busy: "Our booking line is busy right now. Please try again in a minute, or contact the team directly:",
    unavailable: "We couldn’t check the free beds just now. Please try again in a moment, or contact the team directly:",
    other: "Something went wrong. Please try again, or contact the team directly:",
  },
  send: {
    rate_limited: "You have sent several requests in a short time. Please wait a few minutes, or contact the team directly:",
    busy: "Our booking line is busy right now, so your request wasn’t sent. Please try again in a minute, or contact the team directly:",
    unavailable:
      "We couldn’t send your request just now. Please try again in a moment (sending it again won’t book twice), or contact the team directly:",
    other: "Please check your booking and try again, or contact the team directly:",
  },
};

export function Problem({ problem, action, onRetry }: { problem: BookingProblem; action: "check" | "send"; onRetry?: () => void }) {
  const key = problem === "rate_limited" || problem === "busy" || problem === "unavailable" ? problem : "other";
  return (
    <div role="alert" className={form.problem}>
      <p>{PROBLEM_TEXT[action][key]}</p>
      {onRetry ? (
        <p>
          <button type="button" className={styles.textButton} onClick={onRetry}>
            Try again
          </button>
        </p>
      ) : null}
      {key === "rate_limited" && action === "check" ? null : <ContactDetails compact />}
    </div>
  );
}

/** Shadow Check-in says online booking isn't open: the other ways, which are on this page too. */
export function Closed({ headingId, headingRef }: { headingId: string; headingRef: RefObject<HTMLHeadingElement | null> }) {
  return (
    <div className={styles.stack}>
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className={styles.title}>
        Online booking isn’t open just now
      </h2>
      <p>
        You can book on Booking.com or Agoda, or send the team a message and they will reply by email or WhatsApp.
      </p>
      <ul role="list" className={styles.closedLinks}>
        {platforms.map((platform) => (
          <li key={platform.name}>
            <a href={platform.href} target="_blank" rel="noopener noreferrer" className={`${buttons.button} ${buttons.secondary}`}>
              {platform.name}
              <ExternalIcon />
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
        <li>
          <a href="#message" className={`${buttons.button} ${buttons.secondary}`}>
            Send the team a message
          </a>
        </li>
      </ul>
    </div>
  );
}
