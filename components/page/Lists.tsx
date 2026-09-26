import type { ReactNode } from "react";
import styles from "./Lists.module.css";

/** House rules: the rule, then the reason for it. */
export function RuleList({ rules }: { rules: readonly { readonly rule: string; readonly why: string }[] }) {
  return (
    <ul role="list" className={styles.rules}>
      {rules.map(({ rule, why }) => (
        <li key={rule} className={styles.rule}>
          <p className={styles.ruleText}>{rule}</p>
          <p className={styles.why}>
            <span className="visually-hidden">Why: </span>
            {why}
          </p>
        </li>
      ))}
    </ul>
  );
}

export interface Step {
  readonly title: string;
  readonly body: ReactNode;
}

/** Numbered steps, e.g. what happens when you arrive. */
export function Steps({ steps }: { steps: readonly Step[] }) {
  return (
    <ol className={styles.steps}>
      {steps.map((step) => (
        <li key={step.title} className={styles.step}>
          <h3 className={styles.stepTitle}>{step.title}</h3>
          <div className={styles.stepBody}>{step.body}</div>
        </li>
      ))}
    </ol>
  );
}
