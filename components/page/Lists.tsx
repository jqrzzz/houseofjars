import type { ReactNode } from "react";
import { Mark } from "../brand/Mark";
import { HouseIcon } from "../ui/HouseIcon";
import { signIcon } from "../ui/sign-icons";
import styles from "./Lists.module.css";

/** House rules: the rule, then the reason for it. */
export function RuleList({ rules }: { rules: readonly { readonly rule: string; readonly why: string }[] }) {
  return (
    <ul role="list" className={styles.rules}>
      {rules.map(({ rule, why }) => {
        const icon = signIcon(rule);
        return (
          <li key={rule} className={styles.rule}>
            <span className={styles.plate} aria-hidden="true">
              {icon ? <HouseIcon name={icon} /> : <Mark className={styles.plateMark} />}
            </span>
            <p className={styles.ruleText}>{rule}</p>
            <p className={styles.why}>
              <span className="visually-hidden">Why: </span>
              {why}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

/** Short items, each on an orange plate with its icon, as on the house's signs (amenities). */
export function IconList({ items }: { items: readonly string[] }) {
  return (
    <ul role="list" className={styles.iconList}>
      {items.map((item) => {
        const icon = signIcon(item);
        return (
          <li key={item} className={styles.iconItem}>
            <span className={styles.plate} aria-hidden="true">
              {icon ? <HouseIcon name={icon} /> : <Mark className={styles.plateMark} />}
            </span>
            {item}
          </li>
        );
      })}
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
