"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import {
  choosingCheckOut,
  dayBlock,
  dayLabel,
  dayRole,
  monthWeeks,
  moveFocus,
  pickAnnouncement,
  pickDay,
  viewFor,
  type CalendarRules,
  type DateRange,
} from "@/lib/booking/calendar";
import { addMonths, formatMonth, monthOf, weekdayName } from "@/lib/dates";
import { ChevronIcon } from "../ui/icons";
import styles from "./DateRangePicker.module.css";

/**
 * Two months side by side when the space the calendar is given holds them
 * (two months of 7 x 2.75rem and the 3rem between them); one otherwise. It is
 * the space that counts, not the screen: beside the booking stub, a laptop
 * screen can have less room than a tablet.
 */
const TWO_MONTHS_REM = 41.5;

const WEEKDAYS = Array.from({ length: 7 }, (_, index) => weekdayName(index));

/**
 * An inline calendar for choosing check-in and check-out, following the
 * WAI-ARIA date picker grid: one tab stop, arrow keys by day and week, Home
 * and End, Page Up and Page Down by month (Shift for a year), Enter or Space
 * to choose. Every day's name says its date, its part in the stay and, when
 * it can't be chosen, why; each choice is announced. Days are the house's
 * days in Vientiane (lib/booking/calendar.ts). Until the house's rules have
 * arrived (`rules` is null) it shows an empty grid of the same size.
 */
export function DateRangePicker({
  rules,
  range,
  onChange,
  labelledBy,
}: {
  rules: CalendarRules | null;
  range: DateRange;
  onChange: (range: DateRange) => void;
  labelledBy: string;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  const count = wide ? 2 : 1;

  useEffect(() => {
    const space = pickerRef.current?.parentElement;
    if (!space || typeof ResizeObserver === "undefined") return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const observer = new ResizeObserver(([entry]) => setWide((entry?.contentRect.width ?? 0) >= TWO_MONTHS_REM * rem));
    observer.observe(space);
    return () => observer.disconnect();
  }, []);
  const id = useId();
  const [focusDay, setFocusDay] = useState<string | null>(null);
  const [view, setView] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const moveDomFocus = useRef(false);

  // The day with the tab stop, and the months on show, always inside the house's window.
  const anchor = rules ? clampDay(focusDay ?? range.checkIn ?? rules.first, rules) : null;
  const start = rules && anchor ? viewFor(anchor, view ?? monthOf(anchor), count, rules) : null;
  const months = start ? Array.from({ length: count }, (_, index) => addMonths(start, index)) : [null];
  const tabDay = anchor && start && monthOf(anchor) >= start && monthOf(anchor) <= addMonths(start, count - 1) ? anchor : null;

  useEffect(() => {
    if (!moveDomFocus.current || !focusDay) return;
    moveDomFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)?.focus();
  }, [focusDay, start]);

  function choose(day: string) {
    if (!rules) return;
    const pick = pickDay(range, day, rules);
    setAnnouncement(pickAnnouncement(pick, rules));
    setFocusDay(day);
    if ("range" in pick) onChange(pick.range);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const day = (event.target as HTMLElement).dataset.day;
    if (!rules || !day || event.altKey || event.ctrlKey || event.metaKey) return;
    const next = moveFocus(day, event.key, event.shiftKey, rules);
    if (!next) return;
    event.preventDefault();
    moveDomFocus.current = true;
    setFocusDay(next);
    setView(viewFor(next, start ?? monthOf(next), count, rules));
  }

  function turn(by: 1 | -1) {
    if (!rules || !start || !anchor) return;
    const next = moveFocus(anchor, by === 1 ? "PageDown" : "PageUp", false, rules) ?? anchor;
    setView(viewFor(addMonths(start, by), addMonths(start, by), count, rules));
    setFocusDay(next);
  }

  // Whether the band of nights runs on from the check-in (to a check-out, or to the day being pointed at).
  const spanning = range.checkOut !== null || Boolean(range.checkIn && preview && preview > range.checkIn);
  const canTurnBack = Boolean(rules && start && start > monthOf(rules.first));
  const canTurnOn = Boolean(rules && start && addMonths(start, count - 1) < monthOf(rules.last));

  return (
    <div ref={pickerRef} className={styles.picker}>
      <div className={styles.turns}>
        <button
          type="button"
          className={styles.turn}
          onClick={() => turn(-1)}
          disabled={!canTurnBack}
          aria-label="Previous month"
        >
          <ChevronIcon left />
        </button>
        <button type="button" className={styles.turn} onClick={() => turn(1)} disabled={!canTurnOn} aria-label="Next month">
          <ChevronIcon />
        </button>
      </div>
      <div
        ref={gridRef}
        className={styles.months}
        onKeyDown={onKeyDown}
        onMouseLeave={() => setPreview(null)}
        role="group"
        aria-labelledby={labelledBy}
      >
        {months.map((month, index) => (
          <div key={month ?? index} className={styles.month}>
            <h3 id={`${id}-m${index}`} className={styles.monthName}>
              {month ? formatMonth(month) : " "}
            </h3>
            <table
              role="grid"
              className={styles.grid}
              aria-labelledby={`${id}-m${index}`}
              aria-hidden={month ? undefined : true}
            >
              <thead>
                <tr>
                  {WEEKDAYS.map((name) => (
                    <th key={name} scope="col">
                      <span className="visually-hidden">{name}</span>
                      <span aria-hidden="true">{name.slice(0, 2)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(month ? monthWeeks(month) : EMPTY_WEEKS).map((week, row) => (
                  <tr key={row}>
                    {week.map((day, column) => {
                      if (!day || !rules) return <td key={column} className={styles.blank} />;
                      const role = dayRole(day, range, choosingCheckOut(range) ? preview : null);
                      const block = dayBlock(day, range, rules);
                      return (
                        <td
                          key={day}
                          aria-selected={role ? true : undefined}
                          className={styles.cell}
                          data-role={role ?? undefined}
                          data-span={role === "check_in" && spanning ? true : undefined}
                        >
                          <button
                            type="button"
                            data-day={day}
                            tabIndex={day === tabDay ? 0 : -1}
                            aria-label={dayLabel(day, role, block, rules)}
                            aria-disabled={block ? true : undefined}
                            aria-current={day === rules.first ? "date" : undefined}
                            className={styles.day}
                            onClick={() => choose(day)}
                            onMouseEnter={() => setPreview(day)}
                            onFocus={() => setPreview(day)}
                          >
                            {Number(day.slice(8))}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}

const EMPTY_WEEKS: null[][] = Array.from({ length: 6 }, () => Array<null>(7).fill(null));

function clampDay(day: string, rules: CalendarRules): string {
  return day < rules.first ? rules.first : day > rules.last ? rules.last : day;
}
