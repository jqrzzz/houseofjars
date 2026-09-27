import { fact } from "./fact";
import { sources } from "./sources";

/** Statements in the privacy notice that the house must decide or confirm. */
export const privacy = {
  retention: fact(
    "We keep a message for as long as we need it to answer you and look after your stay, and then delete it. You can ask us to delete it sooner at any time.",
    sources.assumption,
    { note: "Decide a concrete period (for example, 12 months after the stay) and write it here." },
  ),
} as const;

/** Date the privacy notice was last changed. */
export const PRIVACY_UPDATED = "2026-09-27";
