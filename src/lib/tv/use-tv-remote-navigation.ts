"use client";

import { useEffect, useRef } from "react";
import { nextTvFocusIndex } from "@/lib/tv/remote-rules";

type TvRemoteNavigationOptions = {
  onBack?: () => boolean;
};

const BACK_KEYS = new Set(["BrowserBack", "Escape", "GoBack"]);
const DIRECTION_KEYS = new Set(["ArrowDown", "ArrowLeft", "ArrowRight", "ArrowUp"]);

export function useTvRemoteNavigation({ onBack }: TvRemoteNavigationOptions = {}) {
  const onBackRef = useRef(onBack);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    document.documentElement.dataset.tvRemoteReady = "true";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

      if (BACK_KEYS.has(event.key)) {
        if (onBackRef.current?.()) event.preventDefault();
        return;
      }

      if (!DIRECTION_KEYS.has(event.key)) return;
      const active = document.activeElement;
      if (active instanceof HTMLInputElement && (event.key === "ArrowLeft" || event.key === "ArrowRight")) return;

      const items = Array.from(document.querySelectorAll<HTMLElement>("[data-tv-focus]:not([disabled])"))
        .filter((item) => item.getClientRects().length > 0 && item.getAttribute("aria-hidden") !== "true");
      if (items.length === 0) return;

      const currentIndex = items.indexOf(active as HTMLElement);
      const direction = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1;
      const nextIndex = nextTvFocusIndex(currentIndex, items.length, direction);
      if (nextIndex < 0) return;
      event.preventDefault();
      items[nextIndex].focus();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      delete document.documentElement.dataset.tvRemoteReady;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}
