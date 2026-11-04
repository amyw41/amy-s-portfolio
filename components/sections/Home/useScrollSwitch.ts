"use client";

import { useEffect, useRef } from "react";
import type { HomeMode } from "./Sidebar";
import {
  MODE_TRANSITION_MS,
  SCROLL_GESTURE_GAP_MS,
  SCROLL_SWITCH_SETTLE_MS,
  SCROLL_SWITCH_THRESHOLD_PX,
  slowMs,
} from "@/lib/motion";

/** The desktop layout: one fixed screen, where the page itself never
 * scrolls. Below this the page scrolls normally and the cue is the switch. */
const DESKTOP_QUERY = "(min-width: 768px)";

/** Whether `target` sits in something that will scroll itself in direction
 * `dir` (1 = down, -1 = up) — e.g. the work grid when it overflows and
 * isn't at that edge yet — up to (not including) `root`. */
function scrollsItself(target: EventTarget | null, root: HTMLElement, dir: 1 | -1): boolean {
  for (let el = target instanceof Element ? target : null; el && el !== root; el = el.parentElement) {
    if (!(el instanceof HTMLElement)) continue;
    const { overflowY } = getComputedStyle(el);
    if (overflowY !== "auto" && overflowY !== "scroll") continue;
    if (el.scrollHeight <= el.clientHeight + 1) continue;
    if (dir === 1 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 0) return true;
  }
  return false;
}

/**
 * Scroll to switch mode (brief Part 2.4), on the desktop layout, one way
 * each: scrolling down on the jar (wheel, trackpad, a swipe up on a touch
 * screen, ↓ / PageDown / Space) goes to the work; on the work, scrolling
 * moves the list, and scrolling up from its top (↑ / PageUp / Shift+Space)
 * goes back to the jar. Scrolling up on the jar, or down at the bottom of
 * the work, does nothing. Input over the sidebar never switches.
 *
 * One gesture, one switch: travel adds up to SCROLL_SWITCH_THRESHOLD_PX,
 * then switching is locked until the transition is done (plus
 * SCROLL_SWITCH_SETTLE_MS). The rest of that gesture — a trackpad's
 * inertial tail — and any wheel input during the lock is swallowed, so it
 * doesn't scroll the grid that's just arriving either. A gesture that scrolled the grid can't also switch:
 * reaching its top takes a fresh scroll up to go back to the jar.
 *
 * `sidebarSelector` marks the area to leave alone; `onSwitch` gets the mode
 * to switch to.
 */
export function useScrollSwitch(
  rootRef: React.RefObject<HTMLElement | null>,
  mode: HomeMode,
  onSwitch: (next: HomeMode) => void,
  sidebarSelector = "aside",
) {
  // Read inside the listeners, which are only attached once.
  const modeRef = useRef(mode);
  const onSwitchRef = useRef(onSwitch);
  useEffect(() => {
    modeRef.current = mode;
    onSwitchRef.current = onSwitch;
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const desktop = window.matchMedia(DESKTOP_QUERY);

    let lockedUntil = 0;
    let travel = 0;
    let lastWheel = 0;
    // The current gesture already switched: swallow the rest of it.
    let spent = false;
    // The current gesture scrolled something else (the grid): it can't
    // switch.
    let scrolledInside = false;

    /** Switches if `dir` leads anywhere from this mode (down: jar → work;
     * up: work → jar); returns whether it did. */
    const trySwitch = (dir: 1 | -1) => {
      const next: HomeMode | null = modeRef.current === "jar" ? (dir === 1 ? "work" : null) : dir === -1 ? "jar" : null;
      if (!next) return false;
      onSwitchRef.current(next);
      lockedUntil = performance.now() + slowMs(MODE_TRANSITION_MS + SCROLL_SWITCH_SETTLE_MS);
      travel = 0;
      spent = true;
      return true;
    };
    /** Whether input at `target` should be left alone entirely: the mobile
     * layout (page scrolls normally) or the sidebar. */
    const ignored = (target: EventTarget | null) =>
      !desktop.matches || (target instanceof Element && target.closest(sidebarSelector) !== null);

    const onWheel = (e: WheelEvent) => {
      const now = performance.now();
      if (ignored(e.target)) return;
      // Gaps are timed by when the input happened, not when it's handled:
      // events queued behind a busy frame (the grid mounting) would look
      // spaced out and end the gesture early.
      if (e.timeStamp - lastWheel > SCROLL_GESTURE_GAP_MS) {
        spent = false;
        scrolledInside = false;
        travel = 0;
      }
      lastWheel = e.timeStamp;
      // A spent gesture's tail, or anything while the switch is still
      // locked, is swallowed: it would otherwise scroll the grid that's
      // only just arriving.
      if (spent || now < lockedUntil) {
        e.preventDefault();
        return;
      }
      // Lines/pages → roughly px.
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
      if (dy === 0) return;
      const dir = dy > 0 ? 1 : -1;
      if (scrollsItself(e.target, root, dir)) scrolledInside = true;
      if (scrolledInside) return;
      // Changing direction starts the count again.
      if (Math.sign(travel) !== dir) travel = 0;
      travel += dy;
      if (Math.abs(travel) >= SCROLL_SWITCH_THRESHOLD_PX) trySwitch(dir);
    };

    let touchY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches.length === 1 ? e.touches[0].clientY : null;
      spent = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchY === null || spent || performance.now() < lockedUntil) return;
      // A finger moving up scrolls down.
      const dy = touchY - e.touches[0].clientY;
      const dir = dy > 0 ? 1 : -1;
      if (Math.abs(dy) < SCROLL_SWITCH_THRESHOLD_PX || ignored(e.target) || scrollsItself(e.target, root, dir)) return;
      trySwitch(dir);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const dir =
        e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)
          ? 1
          : e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey)
            ? -1
            : 0;
      if (dir === 0) return;
      // Keys typed into a field, or Space/arrows on a focused control, are
      // that control's.
      const t = e.target;
      if (t instanceof HTMLElement && t.closest("input, textarea, select, button, a, [contenteditable]")) return;
      // Keys aren't aimed anywhere: check the work grid (if it's there) as
      // if they were aimed at it.
      const grid = root.querySelector("[data-scroll-switch-target]");
      if (!desktop.matches) return;
      if (grid && scrollsItself(grid.firstElementChild ?? grid, root, dir)) {
        // The grid isn't focused, so the key wouldn't scroll it: do it here.
        const page = e.key === "PageDown" || e.key === "PageUp" || e.key === " ";
        grid.scrollBy({ top: dir * (page ? grid.clientHeight * 0.85 : 60), behavior: "smooth" });
        e.preventDefault();
        return;
      }
      if (performance.now() < lockedUntil) return;
      if (trySwitch(dir)) e.preventDefault();
    };

    // Not passive: a spent gesture's tail and input during the lock are
    // swallowed (preventDefault).
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [rootRef, sidebarSelector]);
}
