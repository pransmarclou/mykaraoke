import { accountLabel, hasMobileAuthConfiguration, parseAuthCallback } from '@/lib/auth-rules';

describe('native account rules', () => {
  test('uses bounded Google identity metadata with safe fallbacks', () => {
    expect(accountLabel({ full_name: '  Karaoke Queen  ' }, 'fallback@example.com')).toBe('Karaoke Queen');
    expect(accountLabel({}, 'singer@example.com')).toBe('singer');
    expect(accountLabel(undefined, undefined)).toBe('Singer');
  });

  test('requires an HTTPS Supabase URL and a plausible public key', () => {
    expect(hasMobileAuthConfiguration('https://example.supabase.co', 'a'.repeat(20))).toBe(true);
    expect(hasMobileAuthConfiguration('http://example.supabase.co', 'a'.repeat(20))).toBe(false);
    expect(hasMobileAuthConfiguration(undefined, undefined)).toBe(false);
  });

  test('accepts OAuth tokens from a native callback fragment without logging them', () => {
    expect(parseAuthCallback('mykaraoke://auth/callback#access_token=access&refresh_token=refresh')).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
      error: false,
    });
    expect(parseAuthCallback('mykaraoke://auth/callback?error=access_denied').error).toBe(true);
  });
});
