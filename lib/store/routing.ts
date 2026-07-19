import type { State } from "./context";

/**
 * Single source of truth for "where should this person be right now,"
 * used by /login, /onboarding/home, /onboarding/persona, and the
 * authenticated app shell so they all agree instead of each guessing.
 * Returns null when the caller's own route is already correct.
 */
export function nextRouteFor(state: State): string | null {
  if (!state.currentProfileId) return "/login";
  if (!state.home) return "/onboarding/home";
  if (!state.onboarded) return "/onboarding/persona";
  return null;
}
