import type { Art } from "../lib";
import pod from "./pod";

/**
 * The pod with no callouts: the same drawing (the same seeds, so the same paper) without the four dots and their
 * leaders, which only PodDiagram numbers. For the home page's room niche and the quiet-stay guide, where nothing does.
 */
export default function podPlain(): Art {
  return pod({ callouts: false });
}
