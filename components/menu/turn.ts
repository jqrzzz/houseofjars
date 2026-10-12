/*
 * The menu card turning over on a phone (MenuCard.tsx), with Web Animations
 * and no React. The side being left folds away about its upright middle line
 * until it stands edge-on, a shade deepening on it as it turns from the
 * light; at that moment, unseen, the other side takes its place, and it
 * unfolds from edge-on as its shade lifts. Towards the café the card turns
 * leftwards and back to breakfast rightwards, like a card turned over in the
 * hand. Each half is TURN_HALF_MS, so a turn is --dur-section (960 ms).
 *
 * Every animation has fill "none": once a side has landed nothing holds a
 * transform, and the wrappers rest as the server drew them. The eye's
 * distance is MenuCard.module.css's, on [data-turning]; this sets where it
 * looks from: the middle of the screen, in the card's own coordinates.
 */

/** Each half of the turn, in milliseconds: the side leaving goes edge-on, then the side arriving lands. Two halves are --dur-section. */
export const TURN_HALF_MS = 480;

/** The eye's distance from the card, in pixels: far enough that the card turns flat in its place rather than swinging out at the reader. */
export const TURN_PERSPECTIVE_PX = 2000;

/** How dark a side's shade gets as it stands edge-on: 16% ink. */
export const TURN_SHADE = 0.16;

/** The side leaving gathers speed into the edge-on moment (an ease-in); the side arriving lands on the page's --ease-out. */
export const TURN_OUT_EASING = "cubic-bezier(0.55, 0, 1, 0.45)";

/** A turn under way. finish() lands it at once, in its own order: the swap edge-on, then the end. */
export interface Turn {
  finish(): void;
}

/**
 * Turns `card` from the wrapper `from` to the wrapper `to`, each holding a
 * side and its shade ([data-shade]). `swap` runs edge-on, where it hides
 * `from` and shows `to`; `done` runs once `to` has landed.
 */
export function turnCard(card: HTMLElement, from: HTMLElement, to: HTMLElement, leftwards: boolean, swap: () => void, done: () => void): Turn {
  const box = card.getBoundingClientRect();
  card.style.perspectiveOrigin = `${innerWidth / 2 - box.left}px ${innerHeight / 2 - box.top}px`;
  card.setAttribute("data-turning", "");
  const edge = leftwards ? -90 : 90;
  let step = 0;
  let running = half(from, 0, edge, 0, TURN_SHADE, TURN_OUT_EASING);

  /** One half: the wrapper turns from `start` to `end` degrees while its shade goes from `dark` to `light`. */
  function half(wrap: HTMLElement, start: number, end: number, dark: number, light: number, easing: string): Animation[] {
    const timing: KeyframeAnimationOptions = { duration: TURN_HALF_MS, easing, fill: "none" };
    const turning = wrap.animate({ transform: [`rotateY(${start}deg)`, `rotateY(${end}deg)`] }, timing);
    turning.onfinish = next;
    const shade = wrap.querySelector<HTMLElement>(":scope > [data-shade]");
    return shade ? [turning, shade.animate({ opacity: [dark, light] }, timing)] : [turning];
  }

  // Run by each half's end, or at once by finish(); the finish events of animations finished early are ignored.
  function next() {
    for (const animation of running) {
      animation.onfinish = null;
      animation.finish();
    }
    if (step++ === 0) {
      swap();
      const easeOut = getComputedStyle(card).getPropertyValue("--ease-out").trim() || "ease-out";
      running = half(to, -edge, 0, TURN_SHADE, 0, easeOut);
    } else {
      card.removeAttribute("data-turning");
      card.style.perspectiveOrigin = "";
      done();
    }
  }

  return {
    finish() {
      while (step < 2) next();
    },
  };
}
