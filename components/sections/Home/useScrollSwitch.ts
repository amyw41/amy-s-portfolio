"use client";

import { useEffect, useRef } from "react";
import type { HomeMode } from "./Sidebar";
import {
  MODE_TRANSITION_MS,
  SCROLL_BACK_GAP_MS,
  SCROLL_BACK_THRESHOLD_PX,
  SCROLL_GESTURE_GAP_MS,
  SCROLL_SWITCH_SETTLE_MS,
  SCROLL_SWITCH_THRESHOLD_PX,
  slowMs,
} from "@/lib/motion";

/** The desktop layout: one fixed screen, where the page itself never
 * scrolls. Below this the page scrolls normally and the cue is the switch. */
const DESKTOP_QUERY = "(min-width: 768px)";

/** Whether input at `target` will scroll the page in direction `dir` (1 =
 * down, -1 = up) instead of switching: in work mode the whole home frame
 * (`root`) scrolls (Home.module.css), until it's at that edge. In jar mode
 * it doesn't overflow, so never. Checked directly, not by reading computed
 * styles on every wheel event (that forced a style recalc per event,
 * mid-animation). */
function scrollsItself(target: EventTarget | null, root: HTMLElement, dir: 1 | -1): boolean {
  if (!(target instanceof Node) || !root.contains(target)) return false;
  if (root.scrollHeight <= root.clientHeight + 1) return false;
  return dir === 1 ? root.scrollTop + root.clientHeight < root.scrollHeight - 1 : root.scrollTop > 0;
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
 * inertial tail — and any wheel input during the lock can't switch again.
 * Arriving at the work it scrolls the page, even while the cards are still
 * coming in; arriving at the jar it's swallowed. A gesture that scrolled the grid can't also switch:
 * reaching its top takes a fresh scroll up to go back to the jar.
 *
 * Going back up is meant to be easy: from the top of the work, a small
 * upward flick (SCROLL_BACK_THRESHOLD_PX) is enough, and a gesture going the
 * other way from the last one always counts as a new one — so a flick up
 * isn't lost in the inertial tail of the scroll that just opened the work,
 * or in the lock while it arrives (switches can be reversed mid-way). After
 * the grid has been scrolled up to its top, a short pause
 * (SCROLL_BACK_GAP_MS) is all it takes before the next flick switches.
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
  // Re-picks the wheel listener's kind (see `listen` below) when the mode
  // changes from outside a scroll (a click, a key).
  const syncListenRef = useRef<() => void>(() => {});
  useEffect(() => {
    modeRef.current = mode;
    onSwitchRef.current = onSwitch;
  });
  useEffect(() => {
    syncListenRef.current();
  }, [mode]);

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
    // Which way the current gesture is going (1 down, -1 up, 0 none yet).
    let gestureDir = 0;

    // The wheel listener can only swallow input (preventDefault) if it's
    // not passive, but a non-passive one makes the browser wait for the
    // page's main thread before every scroll step, which is what made
    // scrolling the work feel sticky. So it only blocks on the jar (nothing
    // to scroll there). In the work it never does, not even while the work
    // is still arriving: scrolling down straight away, or carrying on with
    // the gesture that opened it, just scrolls the page (Amy wants the
    // scroll to feel easy while the cards load in), and it stays on the
    // browser's fast path.
    let blocking = true;
    const shouldBlock = () => modeRef.current === "jar";
    const listen = (block: boolean) => {
      if (block === blocking) return;
      root.removeEventListener("wheel", onWheel);
      root.addEventListener("wheel", onWheel, { passive: !block });
      blocking = block;
    };
    const swallow = (e: WheelEvent) => {
      if (blocking) e.preventDefault();
    };
    syncListenRef.current = () => listen(shouldBlock());

    /** Switches if `dir` leads anywhere from this mode (down: jar → work;
     * up: work → jar); returns whether it did. */
    const trySwitch = (dir: 1 | -1) => {
      const next: HomeMode | null = modeRef.current === "jar" ? (dir === 1 ? "work" : null) : dir === -1 ? "jar" : null;
      if (!next) return false;
      if (process.env.NODE_ENV !== "production") {
        const w = window as unknown as { __scrollSwitches?: string[] };
        (w.__scrollSwitches ??= []).push(next);
      }
      onSwitchRef.current(next);
      const lockMs = slowMs(MODE_TRANSITION_MS + SCROLL_SWITCH_SETTLE_MS);
      lockedUntil = performance.now() + lockMs;
      travel = 0;
      listen(next === "jar");
      window.setTimeout(() => listen(shouldBlock()), lockMs + 20);
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
      // Lines/pages → roughly px.
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
      if (dy === 0) return;
      const dir = dy > 0 ? 1 : -1;
      const back = modeRef.current === "work" && dir === -1;
      // A new gesture: after a pause (a shorter one to go back up), or as
      // soon as the input turns round — an inertial tail never reverses, so
      // a flick the other way is always meant. Gaps are timed by when the
      // input happened, not when it's handled: events queued behind a busy
      // frame (the grid mounting) would look spaced out and end the gesture
      // early.
      const gap = back ? SCROLL_BACK_GAP_MS : SCROLL_GESTURE_GAP_MS;
      const reversed = gestureDir !== 0 && dir !== gestureDir;
      if (e.timeStamp - lastWheel > gap || reversed) {
        spent = false;
        scrolledInside = false;
        travel = 0;
        // A reversal can undo a switch that's still arriving.
        if (reversed) lockedUntil = 0;
      }
      lastWheel = e.timeStamp;
      gestureDir = dir;
      // A spent gesture's tail, or anything while the switch is still
      // locked, can't switch again. Arriving at the work, it's left to
      // scroll the page (the listener is passive there, so swallow does
      // nothing); arriving at the jar, it's swallowed.
      if (spent || now < lockedUntil) {
        swallow(e);
        return;
      }
      // A fresh gesture: drop back to the passive listener if nothing needs
      // swallowing any more.
      listen(shouldBlock());
      if (scrollsItself(e.target, root, dir)) scrolledInside = true;
      if (scrolledInside) return;
      travel += dy;
      if (Math.abs(travel) >= (back ? SCROLL_BACK_THRESHOLD_PX : SCROLL_SWITCH_THRESHOLD_PX)) {
        trySwitch(dir);
        swallow(e);
      }
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
      const need = modeRef.current === "work" && dir === -1 ? SCROLL_BACK_THRESHOLD_PX : SCROLL_SWITCH_THRESHOLD_PX;
      if (Math.abs(dy) < need || ignored(e.target) || scrollsItself(e.target, root, dir)) return;
      trySwitch(dir);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const dir =
        e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)
          ? 1
          : e.key === "ArrowUp" || e.key === "PageUp" || e.key === "Home" || (e.key === " " && e.shiftKey)
            ? -1
            : 0;
      if (dir === 0) return;
      // Keys typed into a field, or Space/arrows on a focused control, are
      // that control's.
      const t = e.target;
      if (t instanceof HTMLElement && t.closest("input, textarea, select, button, a, [contenteditable]")) return;
      // Keys aren't aimed anywhere: treat them as aimed at the page (the
      // home frame, which scrolls in work mode).
      if (!desktop.matches) return;
      if (scrollsItself(root, root, dir)) {
        // The frame isn't focused, so the key wouldn't scroll it: do it here.
        const page = e.key === "PageDown" || e.key === "PageUp" || e.key === " ";
        if (e.key === "Home") root.scrollTo({ top: 0, behavior: "smooth" });
        else root.scrollBy({ top: dir * (page ? root.clientHeight * 0.85 : 60), behavior: "smooth" });
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
