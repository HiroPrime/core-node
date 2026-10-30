export type ArcadeEntryAction = "wait" | "login" | "play";

/** Secondary controls. The loading hold has none, so they cannot flash early. */
export type ArcadeEntryExtra = "guest" | "change";

/** Visible labels. The loading state has none, so it cannot flash Log in or Play. */
export const ARCADE_ENTRY_LABEL = {
  login: "Log in",
  play: "Play",
  guest: "Play as guest",
  change: "Change character",
} as const;

/**
 * Arcade main page (/arcade).
 * `ready` false always waits. A signed-in basic or owner waits until the
 * shell has loaded their saved character (`entryReady`), then Play.
 * Everyone else gets Log in.
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

/** Play as guest sits with Log in. Change character sits with Play. Nothing extra while waiting. */
export function arcadeEntryExtras(action: ArcadeEntryAction): ArcadeEntryExtra[] {
  if (action === "login") return ["guest"];
  if (action === "play") return ["change"];
  return [];
}
