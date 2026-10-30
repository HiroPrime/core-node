export type ArcadeEntryAction = "wait" | "login" | "play";

/** Visible labels. The loading state has none, so it cannot flash Log in or Play. */
export const ARCADE_ENTRY_LABEL: Record<Exclude<ArcadeEntryAction, "wait">, string> = {
  login: "Log in",
  play: "Play",
};

/**
 * Arcade main page (/arcade).
 * `ready` false always waits, including the hook's in-between state
 * (signedIn already true, tier not back yet). A signed-in basic or owner
 * waits until the shell has loaded their saved character (`entryReady`),
 * then Play. Everyone else gets Log in.
 */
export function arcadeEntryAction(
  state: { ready: boolean; tier: "guest" | "basic" | "owner"; signedIn: boolean },
  entryReady = true,
): ArcadeEntryAction {
  if (!state.ready) return "wait";
  if (state.signedIn && (state.tier === "basic" || state.tier === "owner")) {
    return entryReady ? "play" : "wait";
  }
  return "login";
}
