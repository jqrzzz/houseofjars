import Image from "next/image";
import type { CSSProperties } from "react";
import { planOverlay } from "@/lib/house/paper";
import styles from "./RulePlan.module.css";

/** Each plan carries its own title ("Ground floor", "Floor 1") and its street, drawn in. */
const PLANS = [{ floor: "ground" }, { floor: "floor1" }] as const;

/** The tallest plan's height in its own units, so both plans share one scale. */
const tallest = () => Math.max(...PLANS.map((p) => planOverlay(p.floor).viewBox[3]));

/**
 * The house rules' paper plans (docs/DESIGN.md §5.3): the ground floor and
 * Floor 1 from above, side by side and sticky beside the rules on wide
 * screens, as two strips (street on the left) at the top on phones. A rule
 * lights the areas it names when it is hovered or focused, or while it
 * crosses the middle of the screen (CurrentMarker marks it data-current).
 *
 * `scope` is the id of the element that holds both this plan and the rules;
 * each rule's <li> carries data-places, the area ids it names (placesOf() in
 * ./places). The plan is aria-hidden: each rule's own "Where" line carries the
 * fact.
 */
export function RulePlan({ scope, className }: { scope: string; className?: string }) {
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(scope)) throw new Error(`RulePlan: scope "${scope}" must be an element id`);
  const plans = PLANS.map((p) => ({ ...p, ...planOverlay(p.floor) }));
  const ids = [...new Set(plans.flatMap((p) => p.areas.map((a) => a.id)))];
  const css = `${ids.map((id) => `#${scope}:has([data-places~="${id}"]:is(:hover,:focus-within,[data-current])) [data-plan-area="${id}"]`).join(",")}{opacity:1}`;
  const max = tallest();
  return (
    <div className={[styles.plans, className].filter(Boolean).join(" ")} aria-hidden="true">
      <style href={`rule-plan-${scope}`} precedence="default">
        {css}
      </style>
      {plans.map(({ floor, viewBox, areas }) => {
        const [x, y, w, h] = viewBox;
        return (
          <figure key={floor} className={styles.plan} style={{ "--w": w, "--h": h, "--k": h / max } as CSSProperties}>
            <div className={styles.sheet}>
              <div className={styles.inner}>
                {(["day", "evening"] as const).map((theme) => (
                  <Image
                    key={theme}
                    src={`/house/paper-plan-${floor}-${theme}.svg`}
                    width={w}
                    height={h}
                    alt=""
                    unoptimized
                    loading="lazy"
                    className={`for-${theme}`}
                  />
                ))}
                <svg viewBox={`${x} ${y} ${w} ${h}`} className={styles.areas} focusable="false">
                  {areas.map((area) => (
                    <path key={area.id} data-plan-area={area.id} d={area.d} />
                  ))}
                </svg>
              </div>
            </div>
          </figure>
        );
      })}
    </div>
  );
}
