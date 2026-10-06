/**
 * The shortest way through an errand without a nudge, found breadth first over the game's states. For the tests
 * (every errand can be done) and for scripts that play the game; the game itself never needs it.
 */
import { doorLocked, isDone, options, play, start } from "./engine";
import type { ErrandId, GameGraph, GameOption, GameState } from "./types";

const keyOf = (s: GameState, graph: GameGraph) =>
  [s.node, s.shoes, s.bag, s.checkedIn, s.checkedOut, s.doorOpen, doorLocked(s, graph), [...s.done].sort().join("+")].join("|");

export function solve(errand: ErrandId, graph: GameGraph, from: GameState = start(errand, graph)): GameOption[] | null {
  const seen = new Set([keyOf(from, graph)]);
  let frontier: { state: GameState; path: GameOption[] }[] = [{ state: from, path: [] }];
  while (frontier.length > 0) {
    const next: typeof frontier = [];
    for (const { state, path } of frontier) {
      for (const option of options(state, graph)) {
        const result = play(state, option.move, graph);
        if (result.nudge) continue;
        const key = keyOf(result.state, graph);
        if (seen.has(key)) continue;
        seen.add(key);
        const walked = [...path, option];
        if (isDone(result.state)) return walked;
        next.push({ state: result.state, path: walked });
      }
    }
    frontier = next;
  }
  return null;
}
