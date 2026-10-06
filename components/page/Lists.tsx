import type { ReactNode } from "react";
import { Mark } from "../brand/Mark";
import { HouseIcon } from "../ui/HouseIcon";
import { signIcon } from "../ui/sign-icons";
import styles from "./Lists.module.css";

export interface RuleItem {
  readonly rule: string;
  readonly why: string;
  /** Where in the house the rule applies or is acted on, in one sentence (lib/house/rules.ts). */
  readonly where?: string;
  /** The areas it names, space-separated (placesOf() in components/stage/places.ts): a RulePlan beside the list lights them. */
  readonly places?: string;
}

/**
 * House rules: the rule, the reason for it, and where it lives in the house.
 * A rule with places carries them as data-places, so a RulePlan in the same
 * scope lights those areas while the rule is pointed at or current.
 */
export function RuleList({ rules }: { rules: readonly RuleItem[] }) {
  return (
    <ul role="list" className={styles.rules}>
      {rules.map(({ rule, why, where, places }) => {
        const icon = signIcon(rule);
        return (
          <li key={rule} className={styles.rule} data-places={places || undefined}>
            <span className={styles.plate} aria-hidden="true">
              {icon ? <HouseIcon name={icon} /> : <Mark className={styles.plateMark} />}
            </span>
            <p className={styles.ruleText}>{rule}</p>
            <p className={styles.why}>
              <span className="visually-hidden">Why: </span>
              {why}
            </p>
            {where ? (
              <p className={styles.where}>
                <span className={styles.whereLabel}>Where:</span> {where}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

/** Short items, each on a small paper plate with its icon, as on the house's signs (amenities). */
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
