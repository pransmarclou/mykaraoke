export const PARTY_THEME_STORAGE_KEY = "mykaraoke:party-theme:v1";

export const PARTY_THEMES = [
  { id: "stage-glow", label: "Stage Glow", swatch: "#d92362" },
  { id: "electric-blue", label: "Electric Blue", swatch: "#0b7285" },
  { id: "velvet-gold", label: "Velvet Gold", swatch: "#9a3f62" },
] as const;

export type PartyThemeId = (typeof PARTY_THEMES)[number]["id"];

export const DEFAULT_PARTY_THEME: PartyThemeId = "stage-glow";

export function isPartyThemeId(value: unknown): value is PartyThemeId {
  return PARTY_THEMES.some((theme) => theme.id === value);
}

export function parsePartyTheme(value: string | null): PartyThemeId {
  return isPartyThemeId(value) ? value : DEFAULT_PARTY_THEME;
}

export function getNextPartyTheme(current: PartyThemeId): PartyThemeId {
  const currentIndex = PARTY_THEMES.findIndex((theme) => theme.id === current);
  return PARTY_THEMES[(currentIndex + 1) % PARTY_THEMES.length].id;
}

export function getPartyTheme(themeId: PartyThemeId) {
  return PARTY_THEMES.find((theme) => theme.id === themeId) ?? PARTY_THEMES[0];
}

export const PARTY_THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(PARTY_THEME_STORAGE_KEY)});if(t==="stage-glow"||t==="electric-blue"||t==="velvet-gold"){document.documentElement.dataset.partyTheme=t}}catch(e){}`;
