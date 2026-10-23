import assert from "node:assert/strict";
import test from "node:test";
import { accountLabel, normalizeEmail, safeNextPath, validatePassword } from "../../src/lib/auth/rules";

test("account inputs normalize email and enforce bounded passwords", () => {
  assert.equal(normalizeEmail("  SINGER@Example.COM "), "singer@example.com");
  assert.equal(normalizeEmail("not-an-email"), null);
  assert.equal(validatePassword("1234567"), null);
  assert.equal(validatePassword("eight-ok"), "eight-ok");
  assert.equal(validatePassword("x".repeat(129)), null);
});

test("auth redirects stay on this origin", () => {
  assert.equal(safeNextPath("/host?from=account"), "/host?from=account");
  assert.equal(safeNextPath("//evil.example/path"), "/account");
  assert.equal(safeNextPath("https://evil.example/path"), "/account");
  assert.equal(safeNextPath(null), "/account");
});

test("account labels prefer bounded metadata and fall back to email", () => {
  assert.equal(accountLabel({ display_name: "  Karaoke Queen  " }, "other@example.com"), "Karaoke Queen");
  assert.equal(accountLabel({}, "singer@example.com"), "singer");
  assert.equal(accountLabel(undefined, undefined), "Singer");
});
