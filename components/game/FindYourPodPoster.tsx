import { FindYourPodLauncher } from "./FindYourPodLauncher";
import styles from "./FindYourPodPoster.module.css";

/*
 * The game's still poster for /the-house#play: two paper plans side by side (the ground floor and the 1st floor),
 * the thread of the arrival walk from the terrace up to a pod, and the lamp light at its end. Drawn inline,
 * so it fetches nothing; the game and its board load only when the button is used.
 */
export function FindYourPodPoster({ label }: { label?: string }) {
  return (
    <div className={styles.poster}>
      <svg className={styles.art} viewBox="0 0 360 230" aria-hidden="true" focusable="false">
        <rect className={styles.table} width="360" height="230" />
        {/* The two sheets, with their card edges. */}
        <path className={styles.edge} d="M74 18h92v198H74zM196 18h92v168h-92z" />
        <path className={styles.sheet} d="M74 18h92v198H74zM196 18h92v168h-92z" />
        {/* Ground floor: walls, the terrace, the counter, tables, the stairs. */}
        <path className={styles.wall} d="M84 30h72v148H84z" />
        <path className={styles.dash} d="M82 182h76v26H82z" />
        <path className={styles.wood} d="M90 104h10v42H90zM88 36h40v16H88z" />
        <path className={styles.tread} d="M96 36v16M104 36v16M112 36v16M120 36v16" />
        <circle className={styles.wood} cx="140" cy="128" r="5" />
        <circle className={styles.wood} cx="140" cy="150" r="5" />
        <circle className={styles.wood} cx="106" cy="164" r="5" />
        {/* 1st floor: the landing and its cubbies, Dorm H's seven stacks of pods. */}
        <path className={styles.wall} d="M206 30h72v118h-72z" />
        <path className={styles.line} d="M206 70h72" />
        <path className={styles.wood} d="M270 36h6v26h-6zM210 36h40v16h-40z" />
        <path className={styles.pod} d="M209 76h22v20h-22zM209 100h22v20h-22zM209 124h22v20h-22zM253 76h22v20h-22zM253 100h22v20h-22zM253 124h22v20h-22z" />
        <path className={styles.line} d="M209 86h22M209 110h22M209 134h22M253 86h22M253 110h22M253 134h22" />
        {/* The arrival walk, from the terrace to the pod by the door. */}
        <path className={styles.thread} d="M98 198L98 176L114 168L124 128L124 112L134 70L140 56Q185 6 230 50L262 46L258 64L242 70L242 86L224 90" />
        <circle className={styles.ring} cx="124" cy="112" r="4" />
        <circle className={styles.ring} cx="140" cy="56" r="4" />
        <circle className={styles.ring} cx="262" cy="46" r="4" />
        <g className={styles.lamp}>
          <circle r="26" />
          <circle r="19" />
          <circle r="13" />
          <circle r="8.5" />
          <circle className={styles.core} r="5" />
        </g>
      </svg>
      <FindYourPodLauncher label={label} />
    </div>
  );
}
