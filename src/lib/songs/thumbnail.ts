const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/u;

export function youtubeThumbnailUrl(videoId: string): string | null {
  return YOUTUBE_VIDEO_ID.test(videoId)
    ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
    : null;
}
