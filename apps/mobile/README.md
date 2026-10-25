# MyKaraoke native app

This Expo SDK 58 / React Native app is the Native N1 foundation. It is a real
native project for iOS and Android, not a WebView wrapper around the existing
browser application.

The first functional slice provides the branded app shell and persistent
Supabase account identity, including Google OAuth through the `mykaraoke://`
deep-link scheme. Native create/join, queue, playback control, display scanning,
and store billing are deliberately not represented as working yet.

## Configure

```bash
cp -n .env.example .env.local
```

Set the browser-safe hosted Supabase URL and publishable/anon key. Never put a
database password, Google client secret, or Supabase service-role key in this
app. In Supabase Authentication URL Configuration, allow this redirect pattern
for development builds:

```text
mykaraoke://**
```

## Run and verify

Expo SDK 58 requires Node.js 22.13 or newer.

```bash
npm ci
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx expo start
```

Use an iOS Simulator, Android emulator, or development build for deep-link
verification. Google sign-in requires the hosted provider and redirect allowlist
to be configured. A browser preview does not count as a real-device check.
