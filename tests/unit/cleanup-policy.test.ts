import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertCleanupDatabaseTarget,
  CleanupConfigurationError,
  isAuthorizedCleanupRequest,
} from "../../src/lib/rooms/cleanup-policy";

const cronSecret = "test-secret-that-is-at-least-thirty-two-characters";

test("authorizes only the configured bearer secret", () => {
  const env = { CRON_SECRET: cronSecret };

  assert.equal(isAuthorizedCleanupRequest(`Bearer ${cronSecret}`, env), true);
  assert.equal(isAuthorizedCleanupRequest("Bearer wrong-secret", env), false);
  assert.equal(isAuthorizedCleanupRequest(null, env), false);
  assert.equal(isAuthorizedCleanupRequest(`Bearer ${cronSecret}`, {}), false);
  assert.equal(isAuthorizedCleanupRequest("Bearer short", { CRON_SECRET: "short" }), false);
});

test("allows local cleanup without a hosted allowlist", () => {
  assert.equal(
    assertCleanupDatabaseTarget({ DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/postgres" }),
    "127.0.0.1",
  );
});

test("requires an exact allowlist match for the selected hosted database", () => {
  const connection = "postgresql://postgres:secret@pooler.example.test:6543/postgres?sslmode=require";

  assert.equal(
    assertCleanupDatabaseTarget({
      POSTGRES_URL: connection,
      DATABASE_URL: "postgresql://postgres:secret@direct.example.test:5432/postgres",
      MYKARAOKE_CLEANUP_DB_HOST: "pooler.example.test",
    }),
    "pooler.example.test",
  );
  assert.throws(
    () => assertCleanupDatabaseTarget({ POSTGRES_URL: connection }),
    (error: unknown) => error instanceof CleanupConfigurationError && /exact MYKARAOKE_CLEANUP_DB_HOST/.test(error.message),
  );
  assert.throws(
    () => assertCleanupDatabaseTarget({ POSTGRES_URL: connection, MYKARAOKE_CLEANUP_DB_HOST: "direct.example.test" }),
    CleanupConfigurationError,
  );
});

test("rejects missing or malformed database URLs without exposing credentials", () => {
  assert.throws(() => assertCleanupDatabaseTarget({}), /valid database URL/);
  assert.throws(
    () => assertCleanupDatabaseTarget({ DATABASE_URL: "not-a-database-url" }),
    (error: unknown) => error instanceof CleanupConfigurationError && !error.message.includes("not-a-database-url"),
  );
});
