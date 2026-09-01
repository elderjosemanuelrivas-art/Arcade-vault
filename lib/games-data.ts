import { createClient } from "@/lib/supabase/server";

export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: string;
  cover: string;
  color: GameColor;
  best: number;
  plays: number;
};

export type ScoreRow = { rank: number; name: string; score: number; date: string };
export type TopRow = { rank: number; player: string; score: number };
export type TickerRow = {
  player: string;
  game: string;
  score: number;
  when: string;
  color: GameColor;
};

type GameRow = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: string;
  cover: string;
  color: GameColor;
  sort_order: number;
};

type GameStatsRow = { game_id: string; best: number | null; plays: number | null };

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${mon}/${d.getFullYear()}`;
}

function formatRelative(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "hace instantes";
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr} h`;
  return `hace ${Math.floor(diffHr / 24)} d`;
}

async function getStatsMap(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("game_stats")
    .select("game_id, best, plays")
    .returns<GameStatsRow[]>();
  const map = new Map<string, { best: number; plays: number }>();
  for (const row of data ?? []) {
    map.set(row.game_id, { best: Number(row.best ?? 0), plays: Number(row.plays ?? 0) });
  }
  return map;
}

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const [{ data: games }, stats] = await Promise.all([
    supabase
      .from("games")
      .select("*")
      .order("sort_order", { ascending: true })
      .returns<GameRow[]>(),
    getStatsMap(supabase),
  ]);
  return (games ?? []).map((g) => ({
    ...g,
    best: stats.get(g.id)?.best ?? 0,
    plays: stats.get(g.id)?.plays ?? 0,
  }));
}

export async function getGame(id: string): Promise<Game | null> {
  const supabase = await createClient();
  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .maybeSingle<GameRow>();
  if (!game) return null;
  const { data: stat } = await supabase
    .from("game_stats")
    .select("best, plays")
    .eq("game_id", id)
    .maybeSingle<GameStatsRow>();
  return { ...game, best: Number(stat?.best ?? 0), plays: Number(stat?.plays ?? 0) };
}

export async function getCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("games")
    .select("cat")
    .order("sort_order", { ascending: true })
    .returns<{ cat: string }[]>();
  const seen = new Set<string>();
  const cats: string[] = [];
  for (const row of data ?? []) {
    if (!seen.has(row.cat)) {
      seen.add(row.cat);
      cats.push(row.cat);
    }
  }
  return ["TODOS", ...cats];
}

type ScoreWithProfile = { score: number; played_at: string; profiles: { nickname: string } | null };

export async function getGameScores(gameId: string, limit = 10): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scores")
    .select("score, played_at, profiles(nickname)")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(limit)
    .returns<ScoreWithProfile[]>();
  return (data ?? []).map((row, i) => ({
    rank: i + 1,
    name: row.profiles?.nickname ?? "???",
    score: row.score,
    date: formatDate(row.played_at),
  }));
}

type ScoreWithPlayer = { score: number; profiles: { nickname: string } | null };

export async function getTopPlayers(limit = 5): Promise<TopRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scores")
    .select("score, profiles(nickname)")
    .order("score", { ascending: false })
    .limit(200)
    .returns<ScoreWithPlayer[]>();
  const seen = new Set<string>();
  const rows: TopRow[] = [];
  for (const row of data ?? []) {
    const player = row.profiles?.nickname;
    if (!player || seen.has(player)) continue;
    seen.add(player);
    rows.push({ rank: rows.length + 1, player, score: row.score });
    if (rows.length >= limit) break;
  }
  return rows;
}

type RecentScoreRow = {
  score: number;
  played_at: string;
  profiles: { nickname: string } | null;
  games: { title: string; color: GameColor } | null;
};

export async function getRecentScores(limit = 7): Promise<TickerRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scores")
    .select("score, played_at, profiles(nickname), games(title, color)")
    .order("played_at", { ascending: false })
    .limit(limit)
    .returns<RecentScoreRow[]>();
  return (data ?? []).map((row) => ({
    player: row.profiles?.nickname ?? "???",
    game: row.games?.title ?? "",
    score: row.score,
    when: formatRelative(row.played_at),
    color: row.games?.color ?? "cyan",
  }));
}

export async function getSiteStats(): Promise<{ gameCount: number; playCount: number }> {
  const supabase = await createClient();
  const [{ count: gameCount }, { count: playCount }] = await Promise.all([
    supabase.from("games").select("*", { count: "exact", head: true }),
    supabase.from("scores").select("*", { count: "exact", head: true }),
  ]);
  return { gameCount: gameCount ?? 0, playCount: playCount ?? 0 };
}
