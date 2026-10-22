export type CspOptions = {
  nonce: string;
  development: boolean;
  appOrigin?: string;
  supabaseUrl?: string;
};

const YOUTUBE_FRAMES = ["https://www.youtube.com", "https://www.youtube-nocookie.com"];
// 'strict-dynamic' lets the nonced bundle load the YouTube IFrame API and the
// player scripts it injects. The explicit hosts are a fallback for browsers
// that ignore 'strict-dynamic'.
const YOUTUBE_SCRIPTS = ["https://www.youtube.com", "https://s.ytimg.com"];

function realtimeOrigins(supabaseUrl: string | undefined): string[] {
  if (!supabaseUrl) return [];
  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return [];
    const socket = url.protocol === "https:" ? "wss:" : "ws:";
    return [url.origin, `${socket}//${url.host}`];
  } catch {
    return [];
  }
}

export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

export function buildContentSecurityPolicy({ nonce, development, appOrigin, supabaseUrl }: CspOptions): string {
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...YOUTUBE_SCRIPTS, ...(development ? ["'unsafe-eval'"] : [])]],
    // Next.js dev injects unnonced <style> tags; production styles are nonced or self-hosted.
    ["style-src", development ? ["'self'", "'unsafe-inline'"] : ["'self'", `'nonce-${nonce}'`]],
    // React style props (meter widths, theme swatches, CSS variables) are attributes, not executable code.
    ["style-src-attr", ["'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", "https://i.ytimg.com"]],
    ["media-src", ["'self'", "blob:"]],
    ["font-src", ["'self'"]],
    ["connect-src", ["'self'", ...realtimeOrigins(supabaseUrl)]],
    ["frame-src", YOUTUBE_FRAMES],
    ["worker-src", ["'self'", "blob:"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'self'"]],
  ];
  const policy = directives.map(([name, values]) => `${name} ${values.join(" ")}`);
  if (appOrigin?.startsWith("https://")) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}
