import Image from "next/image";
import type { CSSProperties } from "react";
import { preload } from "react-dom";
import { houseOfJars } from "@/lib/house/house-of-jars";
import { planOverlay } from "@/lib/house/paper";
import { AVOID, FLOOR } from "./places";
import styles from "./RulePlan.module.css";

/** Each plan carries its own title ("Ground floor", "1st floor") and its street, drawn in. */
const PLANS = [{ floor: "ground" }, { floor: "floor1" }] as const;

/** The tallest plan's height in its own units, so both plans share one scale. */
const tallest = () => Math.max(...PLANS.map((p) => planOverlay(p.floor).viewBox[3]));

const floorName = (id: string) => houseOfJars.floors.find((f) => f.id === id)?.name ?? id;

const round = (n: number) => Math.round(n * 10000) / 10000;

/**
 * The house rules' paper plans (docs/DESIGN.md §5.3): the ground floor and
 * the 1st floor from above, side by side and sticky beside the rules on wide
 * screens, as two strips (street on the left) at the top on phones. A rule
 * lights the areas and floors it names when it is hovered or focused, or
 * while it crosses the middle of the screen (CurrentMarker marks it
 * data-current); an area it keeps something out of ("never in Dorm H") is
 * marked apart, dashed and hatched, never lit. On phones, where the plans
 * lie on their side, each strip has its floor's name above it, upright, and
 * an area the rule names one by one shows its name upright on a small tag
 * (a floor lit whole is named by its strip's caption).
 *
 * `scope` is the id of the element that holds both this plan and the rules;
 * each rule's <li> carries data-places: the area ids and "floor:" floors it
 * names and, prefixed "not:", those it keeps something out of (placesOf() in
 * ./places). The plan is aria-hidden: each rule's own "Where" line carries
 * the fact.
 *
 * The plans are in the first screen on phones (the page's largest image
 * there), so the twin for the device's theme is preloaded with the HTML.
 */
export function RulePlan({ scope, className }: { scope: string; className?: string }) {
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(scope)) throw new Error(`RulePlan: scope "${scope}" must be an element id`);
  const plans = PLANS.map((p) => ({ ...p, ...planOverlay(p.floor) }));
  const ids = [...new Set(plans.flatMap((p) => p.areas.map((a) => a.id)))];
  const when = (token: string) => `#${scope}:has([data-places~="${token}"]:is(:hover,:focus-within,[data-current]))`;
  // An area named one by one lights with its tag; a floor named whole lights every area on its sheet, untagged.
  const lit = [
    ...ids.map((id) => `${when(id)} :is([data-plan-area="${id}"],[data-plan-tag="${id}"])`),
    ...PLANS.map(({ floor }) => `${when(`${FLOOR}${floor}`)} [data-plan-floor="${floor}"] [data-plan-area]`),
    ...ids.map((id) => `${when(`${AVOID}${id}`)} [data-plan-avoid="${id}"]`),
    ...PLANS.map(({ floor }) => `${when(`${AVOID}${FLOOR}${floor}`)} [data-plan-floor="${floor}"] [data-plan-avoid]`),
  ];
  const css = `${lit.join(",")}{opacity:1}`;
  const max = tallest();
  // Both twins stay lazy, so the hidden theme's is never fetched; the preload is for the device's theme.
  for (const { floor } of PLANS) {
    preload(`/house/paper-plan-${floor}-day.svg`, { as: "image", media: "(prefers-color-scheme: light)", fetchPriority: "high" });
    preload(`/house/paper-plan-${floor}-evening.svg`, { as: "image", media: "(prefers-color-scheme: dark)", fetchPriority: "high" });
  }
  return (
    <div className={[styles.plans, className].filter(Boolean).join(" ")} aria-hidden="true">
      <style href={`rule-plan-${scope}`} precedence="default">
        {css}
      </style>
      {plans.map(({ floor, viewBox, areas }) => {
        const [x, y, w, h] = viewBox;
        const hatch = `${scope}-hatch-${floor}`;
        return (
          <figure key={floor} className={styles.plan} data-plan-floor={floor} style={{ "--w": w, "--h": h, "--k": h / max } as CSSProperties}>
            <figcaption className={styles.floor}>{floorName(floor)}</figcaption>
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
                  <defs>
                    <pattern id={hatch} className={styles.hatch} patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)">
                      <path d="M8 0V16" />
                    </pattern>
                  </defs>
                  {areas.map((area) => (
                    <path key={area.id} data-plan-avoid={area.id} d={area.d} fill={`url(#${hatch})`} />
                  ))}
                  {areas.map((area) => (
                    <path key={area.id} data-plan-area={area.id} d={area.d} />
                  ))}
                </svg>
              </div>
              {/* Upright names for phones, where the plan lies on its side: each at the point the plan writes it. */}
              {areas.map((area) => (
                <span
                  key={area.id}
                  className={styles.tag}
                  data-plan-tag={area.id}
                  style={{ "--u": round((area.label[0] - x) / w), "--v": round((area.label[1] - y) / h) } as CSSProperties}
                >
                  {area.name}
                </span>
              ))}
            </div>
          </figure>
        );
      })}
    </div>
  );
}
