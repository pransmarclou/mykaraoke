import { performerKey, type SingerAssignment } from "@/lib/songs/singers";

export type SingerQueueItem = SingerAssignment;

export function fairSingerOrder<T extends SingerQueueItem>(items: readonly T[], currentSinger?: SingerAssignment | null): T[] {
  if (items.length < 2) return [...items];

  const groups = new Map<string, T[]>();
  const singerOrder: string[] = [];
  for (const item of items) {
    const key = performerKey(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else {
      groups.set(key, [item]);
      singerOrder.push(key);
    }
  }

  const currentIndex = currentSinger ? singerOrder.indexOf(performerKey(currentSinger)) : -1;
  const roundOrder = currentIndex >= 0
    ? [...singerOrder.slice(currentIndex + 1), ...singerOrder.slice(0, currentIndex + 1)]
    : singerOrder;
  const result: T[] = [];
  let round = 0;
  while (result.length < items.length) {
    for (const singer of roundOrder) {
      const item = groups.get(singer)?.[round];
      if (item) result.push(item);
    }
    round += 1;
  }
  return result;
}
