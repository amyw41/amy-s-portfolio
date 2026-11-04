import { JAR_CLINK_MIN_GAP_MS, JAR_CLINK_S } from "@/lib/motion";

/** The glass clink: one short clink per item hitting the jar's glass (see
 * useJarPhysics's onImpact) — as the items fall in, and as they bounce when
 * the jar is lowered away. Nothing else makes a sound.
 *
 * Web Audio, decoded once up front, so each clink starts instantly and many
 * can overlap. Each is the clip's first JAR_CLINK_S from its first sound
 * (skipping any silence at the start of the file), at a volume set by how
 * hard the hit was and a slightly different pitch each time, never closer
 * together than JAR_CLINK_MIN_GAP_MS (so a pile landing at once is a patter,
 * not a roar).
 *
 * Browsers block audio until the visitor has clicked, tapped or pressed a
 * key on the page, so until then clinks are silently skipped; the first such
 * gesture unlocks it. */

const SRC = "/sounds/jar-drop.mp3";
const VOLUME = 0.8;
/** Quietest clink (a feather-light touch), as a share of VOLUME. */
const MIN_LEVEL = 0.35;
/** Pitch varies by up to this much either way. */
const PITCH_SPREAD = 0.08;
/** How long the clink's tail fades over. */
const FADE_OUT_S = 0.08;

export type JarSound = {
  /** An item hit the glass, `strength` 0-1. */
  clink(strength: number): void;
  dispose(): void;
};

/** Where the clip's first sound starts, s: the first sample louder than a
 * small share of its peak, less a hair of lead-in. */
function findOnset(buffer: AudioBuffer): number {
  const data = buffer.getChannelData(0);
  let peak = 0;
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
  const threshold = peak * 0.1;
  for (let i = 0; i < data.length; i++) {
    if (Math.abs(data[i]) >= threshold) return Math.max(0, i / buffer.sampleRate - 0.005);
  }
  return 0;
}

export function createJarSound(): JarSound {
  let ctx: AudioContext | null = null;
  let buffer: AudioBuffer | null = null;
  let onset = 0;
  let lastClinkAt = -Infinity;
  let disposed = false;

  // The first click, tap or key press lets audio play.
  const unlock = () => {
    ctx?.resume().catch(() => {});
    if (ctx?.state === "running") removeUnlock();
  };
  const unlockEvents = ["pointerdown", "keydown", "touchend"] as const;
  const removeUnlock = () => unlockEvents.forEach((e) => window.removeEventListener(e, unlock));

  try {
    ctx = new AudioContext();
    unlockEvents.forEach((e) => window.addEventListener(e, unlock));
    fetch(SRC)
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`${res.status}`))))
      .then((data) => ctx!.decodeAudioData(data))
      .then((decoded) => {
        buffer = decoded;
        onset = findOnset(decoded);
      })
      .catch(() => {
        // Missing file or undecodable: the jar is just silent.
      });
  } catch {
    ctx = null;
  }

  return {
    clink(strength) {
      if (!ctx || !buffer || disposed || ctx.state !== "running") return;
      const nowMs = ctx.currentTime * 1000;
      if (nowMs - lastClinkAt < JAR_CLINK_MIN_GAP_MS) return;
      lastClinkAt = nowMs;

      const now = ctx.currentTime;
      const level = VOLUME * (MIN_LEVEL + (1 - MIN_LEVEL) * Math.max(0, Math.min(1, strength)));
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(level, now);
      gain.gain.setValueAtTime(level, now + JAR_CLINK_S - FADE_OUT_S);
      gain.gain.linearRampToValueAtTime(0, now + JAR_CLINK_S);
      gain.connect(ctx.destination);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = 1 + (Math.random() * 2 - 1) * PITCH_SPREAD;
      source.connect(gain);
      source.start(now, onset, JAR_CLINK_S);
      source.onended = () => gain.disconnect();
    },
    dispose() {
      disposed = true;
      removeUnlock();
      ctx?.close().catch(() => {});
    },
  };
}
