export const SINGER_COUNTDOWN_SECONDS = 5;

export function nextTvFocusIndex(currentIndex: number, itemCount: number, direction: -1 | 1): number {
  if (itemCount < 1) return -1;
  if (currentIndex < 0 || currentIndex >= itemCount) return 0;
  return (currentIndex + direction + itemCount) % itemCount;
}
