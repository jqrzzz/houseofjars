"use client";

import Link from "next/link";
import {
  Suspense,
  use,
  useEffect,
  useId,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import {
  ERRAND_ORDER,
  ERRANDS,
  formatClock,
  isDone,
  lamps,
  links,
  neighbourInDirection,
  nextTask,
  nodeOf,
  options,
  placeName,
  play,
  start,
  steps,
} from "@/lib/game/engine";
import type { Dir, GameGraph, GameOption, GameState, Move, NudgeRule, Phase } from "@/lib/game/types";
import { ShadowFigure } from "../shadow/ShadowFigure";
import buttons from "../ui/button.module.css";
import styles from "./FindYourPod.module.css";

export interface FindYourPodProps {
  open: boolean;
  onClose: () => void;
}

/** A promise React's use() can read at once when it has settled. */
type Tracked<T> = Promise<T> & { status?: "fulfilled"; value?: T };

/** The board loads when the game is first played, never with the page. */
let boardRequest: Tracked<GameGraph | null> | null = null;
export function loadBoard(): Promise<GameGraph | null> {
  if (!boardRequest) {
    const request: Tracked<GameGraph | null> = fetch("/game/find-your-pod.json")
      .then((response) => (response.ok ? (response.json() as Promise<GameGraph>) : null))
      .catch(() => null)
      .then((graph) => {
        if (graph) Object.assign(request, { status: "fulfilled", value: graph });
        else boardRequest = null; // try again next time
        return graph;
      });
    boardRequest = request;
  }
  return boardRequest;
}

const ALL_LAMPS = 3 * ERRAND_ORDER.length;

/** Board units of margin round the plans. */
const PAD = 8;

// ---------------------------------------------------------------------------
// A game: three errands in a row, and the phase the panel shows.

interface Session {
  readonly phase: Phase;
  readonly round: number;
  readonly state: GameState;
  /** Lamps earned on each finished errand. */
  readonly earned: readonly number[];
  readonly say: string;
  readonly nudge: NudgeRule | null;
  /** Counts every turn, so the newest stretch of thread can draw itself in. */
  readonly turn: number;
}

type Action =
  | { type: "begin" }
  | { type: "play"; move: Move }
  | { type: "bump" }
  | { type: "carry-on" }
  | { type: "next" }
  | { type: "again" };

function fresh(graph: GameGraph): Session {
  return { phase: "intro", round: 0, state: start(ERRAND_ORDER[0]!, graph), earned: [], say: "", nudge: null, turn: 0 };
}

function reduce(session: Session, action: Action, graph: GameGraph): Session {
  switch (action.type) {
    case "begin":
      return { ...session, phase: "playing", say: "" };
    case "again":
      return { ...fresh(graph), phase: "playing", turn: session.turn + 1 };
    case "next": {
      const round = session.round + 1;
      const errand = ERRAND_ORDER[round];
      if (!errand) return session;
      return { ...session, phase: "playing", round, state: start(errand, graph), say: "", nudge: null, turn: session.turn + 1 };
    }
    case "carry-on":
      return { ...session, phase: "playing", nudge: null, say: "" };
    case "bump":
      return session.phase === "playing" ? { ...session, say: "No way through there. Try another arrow, or the list of moves." } : session;
    case "play": {
      if (session.phase !== "playing") return session;
      const result = play(session.state, action.move, graph);
      const turn = session.turn + 1;
      if (result.nudge) return { ...session, phase: "nudge", state: result.state, nudge: result.nudge, say: result.say, turn };
      if (isDone(result.state)) {
        const earned = [...session.earned, lamps(result.state)];
        const phase = earned.length === ERRAND_ORDER.length ? "won" : "errand-done";
        return { ...session, phase, state: result.state, earned, say: result.say, turn };
      }
      return { ...session, state: result.state, say: result.say, turn };
    }
  }
}

const KEYS: Readonly<Record<string, Dir>> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  a: "left",
  s: "down",
  d: "right",
};

const ARROWS: Readonly<Record<Dir, string>> = { up: "↑", down: "↓", left: "←", right: "→" };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// ---------------------------------------------------------------------------

/**
 * "Find your pod": a turn-based walk through the house on its plans, in a modal dialog. You are a small lamp
 * light; three errands (arriving, back late, leaving early) each earn up to three lamps, one fewer for each
 * nudge, when Shadow holds up a house rule word for word. Arrow keys or WASD move to the nearest place that
 * way; the same moves are buttons, for Tab, touch and screen readers, and a polite status line says where you
 * are and what is next. Nothing is tracked and nothing is stored.
 */
export function FindYourPod({ open, onClose }: FindYourPodProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // Once opened, the game stays put while the dialog is closed, so a visitor can close it and carry on later.
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);

  // Before the game's own effects run, so the keyboard can be put on the right button.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      focusFirst(dialog);
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} onClose={onClose}>
      {opened ? (
        <Suspense fallback={<Shell titleId={titleId} onClose={onClose} message="Opening the house…" />}>
          <Loaded titleId={titleId} onClose={onClose} />
        </Suspense>
      ) : null}
    </dialog>
  );
}

/**
 * Puts the keyboard on the button that matters (Start, Carry on, the next errand), else on the first move that
 * isn't the way back, so pressing Enter again carries on rather than undoing the step.
 */
function focusFirst(within: HTMLElement): boolean {
  const target =
    within.querySelector<HTMLElement>("[data-autofocus]") ??
    within.querySelector<HTMLElement>("[data-option]:not([data-back])") ??
    within.querySelector<HTMLElement>("[data-option]");
  target?.focus();
  return Boolean(target);
}

function Shell({ titleId, onClose, message }: { titleId: string; onClose: () => void; message: string }) {
  return (
    <div className={styles.frame}>
      <Header titleId={titleId} onClose={onClose} earned={[]} />
      <p className={styles.loading} role="status">
        {message}
      </p>
    </div>
  );
}

function Loaded({ titleId, onClose }: { titleId: string; onClose: () => void }) {
  const graph = use(loadBoard());
  if (!graph) return <Shell titleId={titleId} onClose={onClose} message="The house plans didn’t load. Close the game and try again." />;
  return <Game graph={graph} titleId={titleId} onClose={onClose} />;
}

function Header({ titleId, onClose, earned, round, phase }: { titleId: string; onClose: () => void; earned: readonly number[]; round?: number; phase?: Phase }) {
  const total = earned.reduce((a, b) => a + b, 0);
  return (
    <header className={styles.header}>
      <h2 id={titleId} className={styles.title}>
        Find your pod
      </h2>
      <p className={styles.meter} role="img" aria-label={`${plural(total, "lamp")} of ${ALL_LAMPS}`}>
        {ERRAND_ORDER.map((errand, i) => (
          <span key={errand} className={styles.meterGroup} data-current={i === round && phase !== "won" ? "" : undefined}>
            {[0, 1, 2].map((k) => (
              <LampIcon key={k} lit={k < (earned[i] ?? 0)} />
            ))}
          </span>
        ))}
      </p>
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close the game" title="Close">
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </header>
  );
}

/** One of the house's lamps: a cord, a teak cap and a squat bell shade; lit, it glows. */
function LampIcon({ lit, className }: { lit: boolean; className?: string }) {
  return (
    <svg className={[styles.lampIcon, className].filter(Boolean).join(" ")} viewBox="0 0 16 24" data-lit={lit ? "" : undefined} aria-hidden="true" focusable="false">
      <circle className={styles.lampGlow} cx="8" cy="15.5" r="7.5" />
      <path className={styles.lampCord} d="M8 0V7" />
      <rect className={styles.lampCap} x="6" y="6.5" width="4" height="2" />
      <path className={styles.lampShade} d="M2 18.5C2 12.5 4.5 8.5 8 8.5S14 12.5 14 18.5Z" />
    </svg>
  );
}

function Game({ graph, titleId, onClose }: { graph: GameGraph; titleId: string; onClose: () => void }) {
  const [session, dispatch] = useReducer((s: Session, a: Action) => reduce(s, a, graph), graph, fresh);
  const panelRef = useRef<HTMLDivElement>(null);
  const { phase, state, round, earned } = session;
  const all = phase === "playing" ? options(state, graph) : [];

  // Keep the keyboard where it was; when the button it was on has gone, move it to the first of the new moves,
  // and to what matters when the panel changes (Start, Carry on, the next errand, the last scene's words).
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !panel.closest("dialog")?.open) return;
    const active = document.activeElement;
    const lost = !active || active === document.body || !panel.closest("dialog")?.contains(active);
    if (panel.querySelector("[data-autofocus]") || lost) focusFirst(panel);
  }, [phase, session.turn]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const dir = KEYS[event.key] ?? KEYS[event.key.toLowerCase()];
    if (!dir || phase !== "playing") return;
    event.preventDefault();
    const to = neighbourInDirection(state, graph, dir);
    dispatch(to ? { type: "play", move: { kind: "go", to } } : { type: "bump" });
  }

  function onBoardKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    const first = all.find((o) => o.move.kind === "act");
    if (!first || phase !== "playing") return;
    event.preventDefault();
    dispatch({ type: "play", move: first.move });
  }

  const night = ERRANDS[state.errand].clock < 7 * 60 || ERRANDS[state.errand].clock >= 21 * 60;
  return (
    <div className={styles.frame} onKeyDown={onKeyDown}>
      <Header titleId={titleId} onClose={onClose} earned={earned} round={round} phase={phase} />
      <div className={styles.body} data-phase={phase}>
        <Board
          graph={graph}
          session={session}
          night={night && phase !== "intro"}
          onGo={(to) => dispatch({ type: "play", move: { kind: "go", to } })}
          onKeyDown={onBoardKey}
        />
        <div className={styles.panel} ref={panelRef}>
          <Status graph={graph} session={session} />
          {phase === "intro" ? <Intro onBegin={() => dispatch({ type: "begin" })} /> : null}
          {phase === "playing" ? <Playing session={session} all={all} onMove={(move) => dispatch({ type: "play", move })} /> : null}
          {phase === "nudge" && session.nudge ? <Nudge graph={graph} session={session} onCarryOn={() => dispatch({ type: "carry-on" })} /> : null}
          {phase === "errand-done" ? <Done session={session} onNext={() => dispatch({ type: "next" })} /> : null}
          {phase === "won" ? <Won graph={graph} session={session} onAgain={() => dispatch({ type: "again" })} /> : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The board: the two plans side by side, the thread walked so far, the places next door, and the lamp.

function Board({
  graph,
  session,
  night,
  onGo,
  onKeyDown,
}: {
  graph: GameGraph;
  session: Session;
  night: boolean;
  onGo: (to: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}) {
  const id = useId();
  const { phase, state } = session;
  const [w, h] = graph.board;
  const here = nodeOf(graph, state.node);
  const playing = phase === "playing";
  const next = playing ? links(graph, here.id).map(({ to, via }) => ({ node: nodeOf(graph, to), via })) : [];
  const trail = state.trail.map((n) => nodeOf(graph, n));
  const won = phase === "won";
  // A margin round the board, so the sheets' card edges and the lamp's glow are never cut.
  const box = [-PAD, -PAD, w + 2 * PAD, h + 2 * PAD] as const;
  const pct = (x: number, size: number) => `${(100 * (x + PAD)) / (size + 2 * PAD)}%`;
  const frame = { "--board-ratio": box[2] / box[3] } as CSSProperties;
  return (
    <div
      className={styles.boardWrap}
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="group"
      aria-label="The house plans. Arrow keys or W, A, S and D move the lamp; Enter does the first thing listed here."
      data-night={night ? "" : undefined}
      data-phase={phase}
    >
      <div className={styles.boardBox}>
        <div className={styles.boardFrame} style={frame}>
          <svg className={styles.board} viewBox={box.join(" ")} aria-hidden="true" focusable="false">
            <defs>
              <pattern id={`${id}weave`} width="26" height="10" patternUnits="userSpaceOnUse">
                <rect className={styles.weave} width="26" height="10" />
                <rect className={styles.weaveFold} width="9" height="10" />
                <rect className={styles.weaveThread} x="15" width="3" height="10" />
                <rect className={styles.weaveThread} x="21" width="1" height="10" />
              </pattern>
            </defs>
            {graph.floors.map((floor) => {
              const [vx, vy, vw, vh] = floor.viewBox;
              const [x, y] = floor.at;
              const twin = floor.src.day !== floor.src.evening;
              return (
                <g key={floor.id}>
                  <rect className={styles.sheetEdge} x={x} y={y} width={floor.crop[2]} height={floor.crop[3]} />
                  <svg x={x} y={y} width={floor.crop[2]} height={floor.crop[3]} viewBox={floor.crop.join(" ")}>
                    <image href={floor.src.day} x={vx} y={vy} width={vw} height={vh} className={twin ? "for-day" : undefined} />
                    {twin ? <image href={floor.src.evening} x={vx} y={vy} width={vw} height={vh} className="for-evening" /> : null}
                  </svg>
                  <rect className={styles.dusk} x={x} y={y} width={floor.crop[2]} height={floor.crop[3]} />
                </g>
              );
            })}
            <Thread nodes={trail} turn={session.turn} />
            {next.map(({ node, via }) => (
              <path key={`hint-${node.id}`} className={styles.hint} d={hop(here, node, via === "stairs")} />
            ))}
            {next.map(({ node }) => (
              <g key={node.id} className={styles.spot} transform={`translate(${node.x} ${node.y})`} onClick={() => onGo(node.id)}>
                <circle className={styles.spotHit} r="26" />
                <circle className={styles.spotRing} r="9" />
              </g>
            ))}
            {won ? null : (
              <g className={styles.lamp} style={{ transform: `translate(${here.x}px, ${here.y}px)` }}>
                <Halo big />
              </g>
            )}
            {won ? <Finale graph={graph} weave={`url(#${id}weave)`} /> : null}
          </svg>
          {won
            ? null
            : graph.floors.map((floor) => (
                <span key={floor.id} className={styles.floorTag} style={{ left: pct(floor.at[0], w), bottom: pct(h - floor.at[1], h) }}>
                  {floor.name}
                </span>
              ))}
          {won ? <span className={styles.sleepTag}>Sleep well</span> : null}
        </div>
      </div>
      {/* The plans are drawn from the walk through the house, so they carry its caption, as every house drawing does. */}
      <p className={styles.boardCaption}>Drawn from our walk through the house: positions are approximate.</p>
    </div>
  );
}

/** A stepped halo: a core and four rings of light, each adding a little. */
function Halo({ big = false }: { big?: boolean }) {
  const radii = big ? [46, 34, 25, 17] : [26, 19, 14, 10];
  return (
    <>
      {radii.map((r) => (
        <circle key={r} className={styles.halo} r={r} />
      ))}
      <circle className={styles.core} r={big ? 9 : 5.5} />
      <circle className={styles.bulb} r={big ? 3.5 : 2.2} />
    </>
  );
}

/** A step drawn as thread: straight across a floor, in a low arc up or down the stairs. */
function hop(a: { x: number; y: number }, b: { x: number; y: number }, arc: boolean): string {
  if (!arc) return `M${a.x} ${a.y}L${b.x} ${b.y}`;
  const lift = Math.min(a.y, b.y) - 70;
  return `M${a.x} ${a.y}Q${(a.x + b.x) / 2} ${lift} ${b.x} ${b.y}`;
}

/** The way walked on this errand; the newest stretch draws itself in as the lamp moves. */
function Thread({ nodes, turn }: { nodes: readonly { id: string; x: number; y: number; floor: string }[]; turn: number }) {
  const parts: string[] = [];
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1]!;
    const b = nodes[i]!;
    if (a.id !== b.id) parts.push(hop(a, b, a.floor !== b.floor));
  }
  const last = parts.pop();
  return (
    <g className={styles.thread}>
      {parts.length > 0 ? <path d={parts.join("")} /> : null}
      {last ? <path key={turn} className={styles.threadNew} d={last} pathLength={1} /> : null}
    </g>
  );
}

/** The last scene: the curtain closes over the house, and its lamps glow through it one by one. */
function Finale({ graph, weave }: { graph: GameGraph; weave: string }) {
  const [w, h] = graph.board;
  const half = w / 2 + 1;
  return (
    <g className={styles.finale}>
      <g className={`${styles.curtain} ${styles.curtainLeft}`}>
        <rect width={half} height={h} style={{ fill: weave }} />
        <rect className={styles.hem} y={h - 12} width={half} height={12} />
      </g>
      <g className={`${styles.curtain} ${styles.curtainRight}`}>
        <rect x={w - half} width={half} height={h} style={{ fill: weave }} />
        <rect className={styles.hem} x={w - half} y={h - 12} width={half} height={12} />
      </g>
      <rect className={styles.valance} width={w} height={22} />
      <rect className={styles.hem} y={20} width={w} height={4} />
      {graph.lights.map(([x, y], i) => (
        <g key={`${x},${y}`} className={styles.light} style={{ "--i": i, transform: `translate(${x}px, ${y}px)` } as CSSProperties}>
          <Halo />
        </g>
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// The panel

function Status({ graph, session }: { graph: GameGraph; session: Session }) {
  const { phase, state, say } = session;
  let text = "";
  if (phase === "playing") text = `${say ? `${say} ` : ""}${placeName(state, graph)}. Next: ${nextTask(state, graph)}.`;
  else if (phase === "nudge") text = `Shadow’s nudge: ${say}`;
  else if (phase === "errand-done") text = `Errand done: ${plural(session.earned.at(-1) ?? 0, "lamp")}.`;
  else if (phase === "won") text = `All three errands done: ${session.earned.reduce((a, b) => a + b, 0)} of ${ALL_LAMPS} lamps. Sleep well.`;
  return (
    <div className={phase === "playing" ? styles.status : "visually-hidden"} role="status" aria-live="polite" aria-atomic="true">
      {phase === "playing" ? (
        <>
          {say ? <p className={styles.say}>{say}</p> : null}
          <p className={styles.where}>
            <span className={styles.place}>
              {placeName(state, graph)}
              <span className="visually-hidden">.</span>
            </span>{" "}
            <span className={styles.next}>Next: {nextTask(state, graph)}.</span>
          </p>
        </>
      ) : (
        text
      )}
    </div>
  );
}

function Intro({ onBegin }: { onBegin: () => void }) {
  return (
    <div className={styles.card}>
      <p className={styles.eyebrow}>Practise the walk</p>
      <h3 className={styles.heading}>Walk the house as a small lamp light.</h3>
      <p className={styles.lede}>
        Three errands: arriving, back late and leaving early. Keep to the house rules on the way and earn up to nine lamps. Miss a rule
        and Shadow holds it up for you, then you carry on: you can’t lose.
      </p>
      <p className={`${styles.keys} ${styles.forKeys}`}>
        <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> or <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> move the lamp. Every move is in
        the list too: Tab to it and press Enter.
      </p>
      <p className={`${styles.keys} ${styles.forTouch}`}>Tap a move in the list, or a ring on the plans.</p>
      <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={onBegin} data-autofocus="">
        Start: {ERRANDS.arrive.name}
      </button>
    </div>
  );
}

function Playing({ session, all, onMove }: { session: Session; all: readonly GameOption[]; onMove: (move: Move) => void }) {
  const { state, round } = session;
  const errand = ERRANDS[state.errand];
  const here = all.filter((o) => o.move.kind === "act");
  const walk = all.filter((o) => o.move.kind === "go");
  const list = steps(state);
  const current = list.findIndex((s) => !s.done);
  // The place the lamp has just come from: its move is the way back.
  const from = [...state.trail].reverse().find((node) => node !== state.node);
  return (
    <>
      <section className={styles.errand} aria-label={`Errand ${round + 1} of ${ERRAND_ORDER.length}`}>
        <p className={styles.eyebrow}>
          Errand {round + 1} of {ERRAND_ORDER.length}
          <time className={styles.clock}>{formatClock(state.clock)}</time>
        </p>
        <h3 className={styles.heading}>{errand.title}</h3>
        <ol className={styles.steps}>
          {list.map((step, i) => (
            <li key={step.label} data-done={step.done ? "" : undefined} data-current={i === current ? "" : undefined}>
              <span className={styles.stepLabel}>
                {step.label}
                {step.done ? <span className="visually-hidden"> (done)</span> : null}
              </span>
            </li>
          ))}
        </ol>
      </section>
      <div className={styles.moves}>
        {here.length > 0 ? (
          <>
            <h4 className={styles.groupLabel}>Here</h4>
            <ul className={styles.options}>
              {here.map((option) => (
                <li key={option.key}>
                  <button type="button" className={styles.option} data-option="" data-kind="act" onClick={() => onMove(option.move)}>
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <h4 className={styles.groupLabel}>Walk</h4>
        <ul className={styles.options}>
          {walk.map((option) => (
            <li key={option.key}>
              <button
                type="button"
                className={styles.option}
                data-option=""
                data-back={option.move.kind === "go" && option.move.to === from ? "" : undefined}
                onClick={() => onMove(option.move)}
              >
                {option.dir ? (
                  <kbd className={styles.arrow} aria-hidden="true">
                    {ARROWS[option.dir]}
                  </kbd>
                ) : null}
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function Nudge({ graph, session, onCarryOn }: { graph: GameGraph; session: Session; onCarryOn: () => void }) {
  const { rule, why } = graph.rules[session.nudge!];
  const left = lamps(session.state);
  return (
    <div className={styles.nudge}>
      <div className={styles.nudgeFigure}>
        <span className={styles.bust}>
          <ShadowFigure variant="bust" />
        </span>
        <figure className={styles.sign}>
          <figcaption className={styles.signLabel}>Shadow’s nudge</figcaption>
          <p className={styles.rule}>{rule}</p>
          <p className={styles.why}>{why}</p>
        </figure>
      </div>
      <p className={styles.lede}>
        The lamp stays where it was. This errand can still earn {plural(left, "lamp")}.
      </p>
      <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={onCarryOn} data-autofocus="">
        Carry on
      </button>
    </div>
  );
}

function Done({ session, onNext }: { session: Session; onNext: () => void }) {
  const got = session.earned.at(-1) ?? 0;
  const next = ERRAND_ORDER[session.round + 1]!;
  return (
    <div className={styles.card}>
      <p className={styles.eyebrow}>
        Errand {session.round + 1} of {ERRAND_ORDER.length}: done
      </p>
      <p className={styles.earned} aria-hidden="true">
        {[0, 1, 2].map((k) => (
          <LampIcon key={k} lit={k < got} className={styles.bigLamp} />
        ))}
      </p>
      <h3 className={styles.heading}>{plural(got, "lamp")}</h3>
      {session.say ? <p className={styles.lede}>{session.say}</p> : null}
      <button type="button" className={`${buttons.button} ${buttons.primary}`} onClick={onNext} data-autofocus="">
        Next: {ERRANDS[next].name}
      </button>
    </div>
  );
}

function Won({ graph, session, onAgain }: { graph: GameGraph; session: Session; onAgain: () => void }) {
  const total = session.earned.reduce((a, b) => a + b, 0);
  const [shared, setShared] = useState("");
  const text = `I found my pod at House of Jars: ${total} of ${ALL_LAMPS} lamps.`;

  async function share() {
    const url = new URL(graph.links.play, window.location.origin).toString();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShared("Copied, ready to paste.");
    } catch {
      setShared(`${text} ${url}`);
    }
  }

  return (
    <div className={styles.card}>
      <p className={styles.eyebrow}>All three errands done</p>
      <p className={styles.earned} aria-hidden="true">
        {session.earned.map((got, i) => (
          <span key={i} className={styles.earnedGroup}>
            {[0, 1, 2].map((k) => (
              <LampIcon key={k} lit={k < got} className={styles.midLamp} />
            ))}
          </span>
        ))}
      </p>
      <h3 className={styles.heading} tabIndex={-1} data-autofocus="">
        <span className={styles.line}>Sleep well.</span> <span className={styles.line}>Quiet hours {graph.quiet}.</span>
      </h3>
      <p className={styles.lede}>
        You found your pod: {total} of {ALL_LAMPS} lamps.
      </p>
      <div className={styles.actions}>
        <button type="button" className={`${buttons.button} ${buttons.secondary}`} onClick={() => void share()}>
          Share
        </button>
        <button type="button" className={`${buttons.button} ${buttons.secondary}`} onClick={onAgain}>
          Play again
        </button>
        <Link className={`${buttons.button} ${buttons.secondary}`} href={graph.links.book}>
          Book direct
        </Link>
      </div>
      <p className={styles.shared} role="status">
        {shared}
      </p>
    </div>
  );
}
