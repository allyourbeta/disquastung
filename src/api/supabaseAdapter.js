// Supabase stats adapter. Dormant until VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY are set (see storage.js's adapter choice) -- must
// import cleanly and no-op safely with no env vars, since it's bundled into
// every build even when unused. No live connection is attempted tonight.
import { createClient } from "@supabase/supabase-js";

let client = null;
let userIdPromise = null;

function getClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!client) client = createClient(url, anonKey);
  return client;
}

function getUserId(supabase) {
  if (!userIdPromise) {
    userIdPromise = supabase.auth.signInAnonymously().then(({ data, error }) => {
      if (error) throw error;
      return data.user.id;
    });
  }
  return userIdPromise;
}

export class SupabaseAdapter {
  async recordAnswer({ square, drill, correct }) {
    const supabase = getClient();
    if (!supabase) return;
    const userId = await getUserId(supabase);

    const { data: existing } = await supabase
      .from("square_stats")
      .select("seen, misses")
      .eq("user_id", userId)
      .eq("square", square)
      .eq("drill", drill)
      .maybeSingle();

    await supabase.from("square_stats").upsert({
      user_id: userId,
      square,
      drill,
      seen: (existing?.seen || 0) + 1,
      misses: (existing?.misses || 0) + (correct ? 0 : 1),
      updated_at: new Date().toISOString(),
    });
  }

  async getSquareStats() {
    const supabase = getClient();
    if (!supabase) return {};
    const userId = await getUserId(supabase);

    const { data, error } = await supabase
      .from("square_stats")
      .select("square, seen, misses")
      .eq("user_id", userId);
    if (error || !data) return {};

    const out = {};
    for (const row of data) {
      if (!out[row.square]) out[row.square] = { seen: 0, misses: 0, lastMissAt: null };
      out[row.square].seen += row.seen;
      out[row.square].misses += row.misses;
    }
    return out;
  }

  async resetStats() {
    const supabase = getClient();
    if (!supabase) return;
    const userId = await getUserId(supabase);
    await supabase.from("square_stats").delete().eq("user_id", userId);
  }
}
