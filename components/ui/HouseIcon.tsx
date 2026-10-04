import { ICON_CUT_ID } from "../brand/Mark";
import { houseIcons, type HouseIconName } from "./house-icons";

/** How brand/icons draws a "no" icon: a cut along the slash, then the slash itself (house-icons keeps both lines). */
export const SLASH_CUT = "M48 48L208 208";
const SLASH = "M46 46L210 210";

/**
 * One of the house's icons (brand/icons), in the text's colour. Decorative:
 * the words beside it say the same. A "no" icon (no smoking aside, which
 * Phosphor draws itself) is drawn as its file is: the picture a little
 * smaller, cut where the slash crosses it, inside a ring with the slash, as
 * on the house's own signs.
 */
export function HouseIcon({ name, className }: { name: HouseIconName; className?: string }) {
  const paths = houseIcons[name];
  const forbidden = paths[0] === SLASH_CUT;
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" focusable="false" className={className ? `icon ${className}` : "icon"}>
      {forbidden ? (
        <>
          <g mask={`url(#${ICON_CUT_ID})`}>
            <g transform="translate(33.3 33.3) scale(0.74)">
              {paths.slice(1, -1).map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
          </g>
          <circle cx="128" cy="128" r="116" fill="none" stroke="currentColor" strokeWidth="16" />
          <path d={SLASH} fill="none" stroke="currentColor" strokeWidth="16" />
        </>
      ) : (
        paths.map((d) => <path key={d} d={d} />)
      )}
    </svg>
  );
}
