import { useId } from "react";
import paper from "./paper.module.css";
import { num } from "./stone-jar";

// The canopy's scalloped valance, front to back.
const VALANCE = `M95 23V25${"a3 2.6 0 0 1-6 0".repeat(14)}V23Z`;

/** A wheel: tyre, hub and three spokes (the spokes turn when it rolls). */
function Wheel({ x, y, r }: { x: number; y: number; r: number }) {
  const s = r * 0.62;
  const spoke = (a: number) => {
    const [dx, dy] = [Math.sin(a) * s, Math.cos(a) * s];
    return `M${num(x - dx)} ${num(y - dy)}L${num(x + dx)} ${num(y + dy)}`;
  };
  return (
    <g className="wh">
      <circle className="b" cx={x} cy={y} r={r} />
      <circle className="s" cx={x} cy={y} r={num(r * 0.42)} />
      <path className="h" d={[0, Math.PI / 3, (2 * Math.PI) / 3].map(spoke).join("")} />
    </g>
  );
}

/**
 * A Vientiane tuk-tuk in cut paper, parked (its rest pose), facing right:
 * a teak canopy with a gold valance, benches for passengers, the motorbike
 * up front with its lamp, which is lit by Evening. Drawn in page tokens
 * (components/art/paper.module.css), so it follows Day and Evening. Wheels
 * carry the class "wh" for a scene that rolls them. Decorative.
 */
export function TukTuk({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg
      className={[paper.paper, className].filter(Boolean).join(" ")}
      viewBox="4 10 108 68"
      width="108"
      height="68"
      aria-hidden="true"
      focusable="false"
    >
      <circle className="gl" cx="101" cy="39.8" r="12" />
      <circle className="gl" cx="101" cy="39.8" r="7" />
      <use href={`#${id}`} className="o" />
      <g id={id}>
        {/* Posts, behind everything: back, between the benches and the driver, and the windscreen's. */}
        <path className="b" d="M13 23h2.4v24H13ZM70 23h2.4v20H70ZM90.6 23h2.4l2 16h-2.4Z" />
        <path className="w" d="M10 19Q10 14 15 14H88Q95 14 96 19L97 23H10Z" />
        <path className="t" d={VALANCE} />
        {/* The passengers' tub, cut away over the back wheel, and the bench on it. */}
        <path className="s" d="M11 44H77V56Q77 60 73 60H42.4A13 13 0 0 0 17.6 60H15Q11 60 11 56Z" />
        <path className="cu" d="M17 39Q17 37 19 37H66Q68 37 68 39V44H17Z" />
        <path className="w" d="M11 50H77V53H11Z" />
        {/* The motorbike: saddle, a leg shield curving down to the footboard, fork, mudguard and lamp. */}
        <path className="cu" d="M74 40Q74 38 76 38H86Q88 38 88 40V44H74Z" />
        <path className="wd" d="M76 44H89Q91.5 44 92 46Q93 42 96 42Q99 42 98.6 46L96 58Q95.6 60 93.6 60H76Z" />
        <path className="b" d="M95.4 44h2.6l4 22.6h-2.6Z" />
        <path className="wd" d="M89 63A11.5 11.5 0 0 1 112 63H108A7.5 7.5 0 0 0 93 63Z" />
        <path className="in" d="M99.6 36.4a3.4 3.4 0 1 1 0 6.8h-1.4v-6.8Z" />
        <path className="l" d="M96.5 42.5L96 36.5M91.5 36.5H97.5" />
        <path className="h" d="M15 47H73M44 44V50M44 53V60M80 56H92" />
        <Wheel x={30} y={64} r={11} />
        <Wheel x={100.5} y={67} r={9} />
      </g>
    </svg>
  );
}
