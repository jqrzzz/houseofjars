import type { ReactNode } from "react";

interface AskShadowButtonProps {
  children: ReactNode;
  /** Question to pre-fill in the chat window. */
  question?: string;
  className?: string;
}

/**
 * Opens the concierge. The click is handled by ConciergeLauncher (one
 * listener for the whole page), so this stays a server component. While it
 * sits in the floating button's corner, the floating one steps aside.
 */
export function AskShadowButton({ children, question = "", className }: AskShadowButtonProps) {
  return (
    <button type="button" className={className} data-ask-shadow={question} data-hides-launcher="" aria-haspopup="dialog">
      {children}
    </button>
  );
}
