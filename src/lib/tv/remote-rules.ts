export const SINGER_COUNTDOWN_SECONDS = 5;
export const TV_START_NOTICE_MS = 6_000;

export function shouldShowTvSongStartNotice(previousCurrentId: string | null, currentCurrentId: string | null): boolean {
  return currentCurrentId !== null && currentCurrentId !== previousCurrentId;
}

export function nextTvFocusIndex(currentIndex: number, itemCount: number, direction: -1 | 1): number {
  if (itemCount < 1) return -1;
  if (currentIndex < 0 || currentIndex >= itemCount) return 0;
  return (currentIndex + direction + itemCount) % itemCount;
}

export function tvQueuePreview<T>(items: readonly T[], totalCount: number, limit = 5) {
  const visible = items.slice(0, Math.max(0, limit));
  return {
    visible,
    hiddenCount: Math.max(0, Math.max(totalCount, items.length) - visible.length),
  };
}
