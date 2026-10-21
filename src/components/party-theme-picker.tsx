"use client";

import { useSyncExternalStore } from "react";
import { Palette } from "lucide-react";
import { applyPartyTheme } from "@/lib/themes/client";
import {
  DEFAULT_PARTY_THEME,
  getNextPartyTheme,
  getPartyTheme,
  parsePartyTheme,
  PARTY_THEME_STORAGE_KEY,
} from "@/lib/themes/rules";

const PARTY_THEME_CHANGE_EVENT = "mykaraoke:party-theme-change";

function subscribeToTheme(onStoreChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key !== PARTY_THEME_STORAGE_KEY) return;
    applyPartyTheme(parsePartyTheme(event.newValue));
    onStoreChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(PARTY_THEME_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(PARTY_THEME_CHANGE_EVENT, onStoreChange);
  };
}

function getThemeSnapshot() {
  return parsePartyTheme(
    document.documentElement.dataset.partyTheme ??
      window.localStorage.getItem(PARTY_THEME_STORAGE_KEY),
  );
}

export function PartyThemePicker() {
  const themeId = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    () => DEFAULT_PARTY_THEME,
  );

  const currentTheme = getPartyTheme(themeId);
  const nextThemeId = getNextPartyTheme(themeId);
  const nextTheme = getPartyTheme(nextThemeId);

  function chooseNextTheme() {
    applyPartyTheme(nextThemeId);
    window.localStorage.setItem(PARTY_THEME_STORAGE_KEY, nextThemeId);
    window.dispatchEvent(new Event(PARTY_THEME_CHANGE_EVENT));
  }

  return (
    <button
      type="button"
      onClick={chooseNextTheme}
      aria-label={`Party theme: ${currentTheme.label}. Change to ${nextTheme.label}.`}
      title={`Theme: ${currentTheme.label}. Next: ${nextTheme.label}.`}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/18 bg-white/5 px-3 font-bold text-white transition-colors hover:bg-white/10"
    >
      <Palette className="size-4" aria-hidden="true" />
      <span
        className="size-2.5 rounded-full border border-white/40"
        style={{ backgroundColor: currentTheme.swatch }}
        aria-hidden="true"
      />
      <span className="hidden text-sm lg:inline">{currentTheme.label}</span>
    </button>
  );
}
