"use client";

import { createClient } from "@/lib/supabase/client";
import { getCharacter } from "@/lib/arcade/roster";

const LOCAL_CHAR = "arcade-character-v1";

/** Saved character for this account (Supabase) or this device (guest). */
export async function loadSavedCharacter(userId: string | null): Promise<string | null> {
  if (userId) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("arcade_players")
        .select("character_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!error && data?.character_id) return getCharacter(data.character_id).id;
    } catch {
      /* table missing or offline: fall back */
    }
  }
  try {
    const local = localStorage.getItem(`${LOCAL_CHAR}:${userId ?? "guest"}`);
    return local ? getCharacter(local).id : null;
  } catch {
    return null;
  }
}

export async function saveCharacter(userId: string | null, characterId: string): Promise<void> {
  const id = getCharacter(characterId).id;
  try {
    localStorage.setItem(`${LOCAL_CHAR}:${userId ?? "guest"}`, id);
  } catch {
    /* private mode */
  }
  if (!userId) return;
  try {
    const supabase = createClient();
    await supabase
      .from("arcade_players")
      .upsert({ user_id: userId, character_id: id, updated_at: new Date().toISOString() });
  } catch {
    /* stays local */
  }
}

/** Display name: profiles.username, then auth metadata, then email prefix. */
export async function loadDisplayName(userId: string, fallback: string): Promise<string> {
  try {
    const supabase = createClient();
    const { data } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
    if (data?.username) return String(data.username);
  } catch {
    /* fall back */
  }
  return fallback;
}
