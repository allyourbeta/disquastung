// Storage interface -- the ONLY place gameplay code talks to persistence.
// Adapter chosen once at load: Supabase iff both env vars are set, else
// localStorage. Failures here must never break gameplay.
import { LocalAdapter } from "./localAdapter.js";
import { SupabaseAdapter } from "./supabaseAdapter.js";

const useSupabase = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
const adapter = useSupabase ? new SupabaseAdapter() : new LocalAdapter();

export async function recordAnswer({ square, drill, correct, attempts }) {
  try {
    await adapter.recordAnswer({ square, drill, correct, attempts });
  } catch (e) {
    console.error("[storage] recordAnswer failed:", e);
  }
}

export async function getSquareStats() {
  try {
    return await adapter.getSquareStats();
  } catch (e) {
    console.error("[storage] getSquareStats failed:", e);
    return {};
  }
}

export async function resetStats() {
  try {
    await adapter.resetStats();
  } catch (e) {
    console.error("[storage] resetStats failed:", e);
  }
}
