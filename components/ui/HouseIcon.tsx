import { houseIcons, type HouseIconName } from "./house-icons";

/** One of the house's icons (brand/icons), in the text's colour. Decorative: the words beside it say the same. */
export function HouseIcon({ name, className }: { name: HouseIconName; className?: string }) {
  return (
    <svg viewBox="0 0 256 256" aria-hidden="true" focusable="false" className={className ? `icon ${className}` : "icon"}>
      {houseIcons[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
