export function accountLabel(metadata: Record<string, unknown> | undefined, email: string | undefined): string {
  const candidate = metadata?.full_name ?? metadata?.name ?? metadata?.display_name;
  if (typeof candidate === 'string' && candidate.trim()) return candidate.trim().slice(0, 40);
  const local = email?.split('@')[0]?.trim();
  return local ? local.slice(0, 40) : 'Singer';
}

export function hasMobileAuthConfiguration(url: string | undefined, key: string | undefined): boolean {
  if (!url || !key) return false;
  try {
    return new URL(url).protocol === 'https:' && key.length >= 20;
  } catch {
    return false;
  }
}

export function parseAuthCallback(url: string): { accessToken: string | null; refreshToken: string | null; error: boolean } {
  try {
    const parsed = new URL(url);
    const query = new URLSearchParams(parsed.search);
    const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''));
    const value = (name: string) => query.get(name) ?? fragment.get(name);
    return {
      accessToken: value('access_token'),
      refreshToken: value('refresh_token'),
      error: Boolean(value('error') ?? value('error_code')),
    };
  } catch {
    return { accessToken: null, refreshToken: null, error: true };
  }
}
