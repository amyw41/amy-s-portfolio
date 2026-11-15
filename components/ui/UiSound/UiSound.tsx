"use client";

import { useEffect } from "react";
import { UI_SOUND_MIN_GAP_MS } from "@/lib/motion";
import { decode, makeSound, play, type Sound } from "@/lib/sound";

/** The sound (mixkit "modern technology select", public/sounds). */
const SRC = "/sounds/ui-select.wav";
const CLICK_VOLUME = 0.5;
/** What counts as a button: real buttons and links, and anything acting as
 * one. */
const TARGET = 'button, a[href], [role="button"], summary';

/** The click, made once per visit. */
let clickSound: Promise<Sound | null> | null = null;
const loadClick = () => (clickSound ??= decode(SRC).then((b) => (b ? makeSound(b, 4) : null)));

/**
 * A soft "select" sound when a button or link is clicked (or pressed with
 * the keyboard). Hovering is silent. Site-wide, from the root layout;
 * renders nothing.
 *
 * Plays through the site's sound engine (lib/sound.ts), on pointerdown (the
 * moment the button is pressed, not when it's released) so it lands with
 * the press even when the click opens a new page. Browsers block sound until
 * the visitor has clicked, tapped or pressed a key; the engine handles that.
 * Disabled buttons are quiet.
 */
export default function UiSound() {
  useEffect(() => {
    let sound: Sound | null = null;
    let live = true;
    let lastAt = -Infinity;
    loadClick().then((s) => {
      if (live) sound = s;
    });

    const fire = () => {
      if (!sound) return;
      const now = performance.now();
      if (now - lastAt < UI_SOUND_MIN_GAP_MS) return;
      lastAt = now;
      play(sound, CLICK_VOLUME);
    };
    const targetOf = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.(TARGET) as HTMLElement | null;
      if (!el || el.matches(":disabled, [aria-disabled='true']")) return null;
      return el;
    };
    // The press (mouse, pen or touch; main button only).
    const onDown = (e: PointerEvent) => {
      if (e.button === 0 && targetOf(e)) fire();
    };
    // Enter or Space on a focused button or link.
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Enter" || e.key === " ") && !e.repeat && targetOf(e)) fire();
    };

    document.addEventListener("pointerdown", onDown, { capture: true });
    document.addEventListener("keydown", onKey, { capture: true });
    return () => {
      live = false;
      document.removeEventListener("pointerdown", onDown, { capture: true });
      document.removeEventListener("keydown", onKey, { capture: true });
    };
  }, []);
  return null;
}
