import assert from "node:assert/strict";
import { test } from "node:test";
import { GET } from "../../src/app/api/internal/rooms/cleanup/route";

test("cleanup route rejects unauthenticated requests without echoing credentials", async () => {
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (value?: unknown) => warnings.push(String(value));

  try {
    const response = await GET(new Request("https://mykaraoke.example/api/internal/rooms/cleanup", {
      headers: { authorization: "Bearer do-not-log-this-value" },
    }));

    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { ok: false });
    assert.match(warnings.join("\n"), /room_cleanup_rejected/);
    assert.doesNotMatch(warnings.join("\n"), /do-not-log-this-value/);
  } finally {
    console.warn = originalWarn;
  }
});
