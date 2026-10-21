import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PARTY_THEME,
  getNextPartyTheme,
  getPartyTheme,
  isPartyThemeId,
  parsePartyTheme,
  PARTY_THEMES,
} from "../../src/lib/themes/rules";

test("party themes use a fixed allowlist with Stage Glow as the default", () => {
  assert.equal(DEFAULT_PARTY_THEME, "stage-glow");
  assert.deepEqual(PARTY_THEMES.map((theme) => theme.id), [
    "stage-glow",
    "electric-blue",
    "velvet-gold",
  ]);
  assert.equal(isPartyThemeId("electric-blue"), true);
  assert.equal(isPartyThemeId("custom-css"), false);
});

test("stored themes fail closed to the owner-brand default", () => {
  for (const invalid of [null, "", "neon", "<style>body{display:none}</style>"]) {
    assert.equal(parsePartyTheme(invalid), DEFAULT_PARTY_THEME);
  }
  assert.equal(parsePartyTheme("velvet-gold"), "velvet-gold");
});

test("the theme control cycles through each fixed theme", () => {
  assert.equal(getNextPartyTheme("stage-glow"), "electric-blue");
  assert.equal(getNextPartyTheme("electric-blue"), "velvet-gold");
  assert.equal(getNextPartyTheme("velvet-gold"), "stage-glow");
  assert.equal(getPartyTheme("electric-blue").label, "Electric Blue");
});
