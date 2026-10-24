"use client";

import { createClient } from "@/lib/supabase/client";

export type PortfolioChoice = "criticism" | "compliments";

export type PortfolioTally = { choice: PortfolioChoice; votes: number; verifiedVotes: number };

/**
 * One vote per signed-in user. Anonymous callers pass a stable fingerprint
 * of 8–80 letters, numbers, underscores, or hyphens, and share a global cap.
 * Tallies include the signed-in count and the total. They have no voter id.
 */
export async function castPortfolioVote(
  choice: PortfolioChoice,
  voterKey: string,
): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("portfolio_cast_vote", {
    p_voter_key: voterKey,
    p_choice: choice,
  });
  return !error && data === true;
}

export async function fetchPortfolioTallies(): Promise<PortfolioTally[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("portfolio_vote_tallies");
  if (error || !Array.isArray(data)) return [];
  return data.flatMap((row) => {
    const choice = (row as { choice?: string }).choice;
    const votes = Number((row as { votes?: number }).votes);
    const verifiedVotes = Number((row as { verified_votes?: number }).verified_votes);
    if ((choice !== "criticism" && choice !== "compliments") || !Number.isFinite(votes)) return [];
    return [{ choice, votes, verifiedVotes: Number.isFinite(verifiedVotes) ? verifiedVotes : 0 }];
  });
}
