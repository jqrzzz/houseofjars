import { fact } from "./fact";
import { sources } from "./sources";

/** Statements in the privacy notice that the house must decide or confirm. */
export const privacy = {
  retention: fact(
    "We keep a message for as long as we need it to answer you and look after your stay. If your booking request or message does not lead to a stay, we delete it, with the emails about it, 90 days after we last dealt with it. You can ask us to delete it sooner at any time.",
    sources.assumption,
    {
      note:
        "Shadow Check-in deletes website booking requests and messages that never became a stay 90 days after they were last dealt with (its nightly clean-up, REQUEST_RETENTION_DAYS). Confirm the period, or change it in both places.",
    },
  ),
} as const;

/** Date the privacy notice was last changed. */
export const PRIVACY_UPDATED = "2026-10-06";
