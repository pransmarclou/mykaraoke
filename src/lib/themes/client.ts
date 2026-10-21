import {
  parsePartyTheme,
  PARTY_THEME_STORAGE_KEY,
  type PartyThemeId,
} from "@/lib/themes/rules";

export function applyPartyTheme(themeId: PartyThemeId) {
  document.documentElement.dataset.partyTheme = themeId;
}

export function restorePersonalPartyTheme() {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(PARTY_THEME_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
  applyPartyTheme(parsePartyTheme(stored));
}
