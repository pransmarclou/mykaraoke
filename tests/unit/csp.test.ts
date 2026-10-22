import assert from "node:assert/strict";
import test from "node:test";
import { buildContentSecurityPolicy, createNonce } from "../../src/lib/security/csp";

function directives(policy: string): Map<string, string[]> {
  return new Map(policy.split("; ").map((part) => {
    const [name, ...values] = part.split(" ");
    return [name, values];
  }));
}

test("production policy nonces scripts and styles without unsafe script sources", () => {
  const policy = directives(buildContentSecurityPolicy({ nonce: "abc123", development: false, appOrigin: "https://mykaraoke.example", supabaseUrl: "https://ref.supabase.co" }));
  const scripts = policy.get("script-src")!;
  assert.ok(scripts.includes("'nonce-abc123'"));
  assert.ok(scripts.includes("'strict-dynamic'"));
  assert.equal(scripts.some((value) => value === "'unsafe-inline'" || value === "'unsafe-eval'"), false);
  assert.deepEqual(policy.get("style-src"), ["'self'", "'nonce-abc123'"]);
  assert.deepEqual(policy.get("object-src"), ["'none'"]);
  assert.deepEqual(policy.get("frame-ancestors"), ["'self'"]);
  assert.ok(policy.has("upgrade-insecure-requests"));
});

test("policy allows only the YouTube player, thumbnails, and the configured Realtime host", () => {
  const policy = directives(buildContentSecurityPolicy({ nonce: "n", development: false, supabaseUrl: "https://ref.supabase.co/" }));
  assert.deepEqual(policy.get("frame-src"), ["https://www.youtube.com", "https://www.youtube-nocookie.com"]);
  assert.ok(policy.get("img-src")!.includes("https://i.ytimg.com"));
  assert.deepEqual(policy.get("connect-src"), ["'self'", "https://ref.supabase.co", "wss://ref.supabase.co"]);
});

test("development and loopback relax only what Next.js dev and plain HTTP need", () => {
  const dev = directives(buildContentSecurityPolicy({ nonce: "n", development: true, appOrigin: "http://127.0.0.1:3100" }));
  assert.ok(dev.get("script-src")!.includes("'unsafe-eval'"));
  assert.ok(dev.get("style-src")!.includes("'unsafe-inline'"));
  assert.equal(dev.has("upgrade-insecure-requests"), false);
  assert.deepEqual(dev.get("connect-src"), ["'self'"]);
});

test("malformed Supabase URLs are ignored and nonces are unique", () => {
  const policy = directives(buildContentSecurityPolicy({ nonce: "n", development: false, supabaseUrl: "javascript:alert(1)" }));
  assert.deepEqual(policy.get("connect-src"), ["'self'"]);
  const nonces = new Set(Array.from({ length: 50 }, createNonce));
  assert.equal(nonces.size, 50);
  for (const nonce of nonces) assert.match(nonce, /^[A-Za-z0-9+/]{22}==$/u);
});
