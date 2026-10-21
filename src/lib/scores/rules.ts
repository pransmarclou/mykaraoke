import { performerKey, singerLabel, type SingerAssignment } from "@/lib/songs/singers";

export type StarRating = 1 | 2 | 3 | 4 | 5;
export type RatedPerformance = SingerAssignment & { itemId: string; stars: number };
export type LeaderboardEntry = { performer: string; average: number; ratings: number; songs: number };

export const LEADERBOARD_SIZE = 10;

export function isStarRating(value: unknown): value is StarRating {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

export function averageStars(total: number, count: number): number {
  return count === 0 ? 0 : Math.round((total / count) * 10) / 10;
}

// Groups ratings by performer (a duet pair is one performer, matching fair
// rotation) and ranks by average stars, then by how many ratings back it.
export function buildLeaderboard(rows: readonly RatedPerformance[], size = LEADERBOARD_SIZE): LeaderboardEntry[] {
  const groups = new Map<string, { performer: string; total: number; ratings: number; items: Set<string> }>();
  for (const row of rows) {
    const key = performerKey(row);
    const group = groups.get(key) ?? { performer: singerLabel(row), total: 0, ratings: 0, items: new Set<string>() };
    group.total += row.stars;
    group.ratings += 1;
    group.items.add(row.itemId);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({ performer: group.performer, average: averageStars(group.total, group.ratings), ratings: group.ratings, songs: group.items.size }))
    .sort((a, b) => b.average - a.average || b.ratings - a.ratings || a.performer.localeCompare(b.performer, "en-US"))
    .slice(0, size);
}
