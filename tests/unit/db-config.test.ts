import assert from "node:assert/strict";
import { test } from "node:test";
import { databaseConfiguration, hasDatabaseConfiguration } from "../../src/lib/db";

test("prefers the pooled serverless database URL", () => {
  const config = databaseConfiguration({
    POSTGRES_URL: "postgresql://pooled.example/db",
    DATABASE_URL: "postgresql://direct.example/db",
    VERCEL: "1",
  });

  assert.equal(config.connectionString, "postgresql://pooled.example/db");
  assert.equal(config.max, 1);
});

test("falls back to DATABASE_URL outside Vercel", () => {
  const config = databaseConfiguration({ DATABASE_URL: "postgresql://direct.example/db" });

  assert.equal(config.connectionString, "postgresql://direct.example/db");
  assert.equal(config.max, 10);
  assert.equal(hasDatabaseConfiguration({ DATABASE_URL: config.connectionString }), true);
});

test("rejects a missing database connection", () => {
  assert.equal(hasDatabaseConfiguration({}), false);
  assert.throws(() => databaseConfiguration({}), /POSTGRES_URL or DATABASE_URL is not configured/);
});
