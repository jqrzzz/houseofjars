import styles from "./ShadowWriting.module.css";

/**
 * Shadow's clipboard with a pencil at work: shown while he writes a reply,
 * in place of the usual three dots. Decorative; the chat window announces
 * "Shadow is writing" in words.
 */
export function ShadowWriting() {
  return (
    <svg className={styles.writing} viewBox="0 0 40 30" aria-hidden="true" focusable="false">
      <rect className={styles.board} x="3" y="3" width="21" height="26" rx="2.6" />
      <rect className={styles.paper} x="5.6" y="6.6" width="15.8" height="19.8" rx="1" />
      <rect className={styles.clip} x="9.5" y="1" width="8" height="4.4" rx="1.2" />
      <path className={`${styles.line} ${styles.first}`} d="M8.5 11.5q1.2-1.8 2.4 0t2.4 0 2.4 0 2.4 0" />
      <path className={`${styles.line} ${styles.second}`} d="M8.5 16q1.2-1.8 2.4 0t2.4 0 2.4 0 2.4 0" />
      <path className={`${styles.line} ${styles.third}`} d="M8.5 20.5q1.2-1.8 2.4 0t2.4 0 1.6 0" />
      <g className={styles.pencil}>
        <path className={styles.wood} d="M17.6 11.2 29 -0.2 32.2 3 20.8 14.4Z" />
        <path className={styles.tip} d="M17.6 11.2 20.8 14.4 16.4 15.6Z" />
      </g>
    </svg>
  );
}
