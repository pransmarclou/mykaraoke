import assert from "node:assert/strict";
import { test } from "node:test";
import { databaseConfiguration, hasDatabaseConfiguration } from "../../src/lib/db";

test("prefers the pooled serverless database URL", () => {
  const config = databaseConfiguration({
    POSTGRES_URL: "postgresql://pooled.example/db?sslmode=require",
    DATABASE_URL: "postgresql://direct.example/db",
    VERCEL: "1",
  });

  const connectionUrl = new URL(config.connectionString);
  assert.equal(connectionUrl.hostname, "pooled.example");
  assert.equal(connectionUrl.searchParams.get("sslmode"), "require");
  assert.equal(connectionUrl.searchParams.get("uselibpqcompat"), "true");
  assert.equal(config.max, 1);
});

test("preserves explicit certificate verification for a pooled URL", () => {
  const config = databaseConfiguration({ POSTGRES_URL: "postgresql://pooled.example/db?sslmode=verify-full" });

  assert.equal(new URL(config.connectionString).searchParams.has("uselibpqcompat"), false);
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
