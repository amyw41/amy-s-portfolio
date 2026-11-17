import { JAR_CLINK_MIN_GAP_MS, JAR_CLINK_S } from "@/lib/motion";
import { decode, makeSound, play, type Sound, type Voice } from "@/lib/sound";

/** The glass clink: one short clink per item hitting the jar's glass (see
 * useJarPhysics's onImpact) — as the items fall in, and as they bounce when
 * the jar is lowered away. Nothing else makes a sound.
 *
 * Each clink is the clip's first JAR_CLINK_S from its first sound (skipping
 * any silence at the start of the file), at a volume set by how hard the hit
 * was and a slightly different pitch each time, never closer together than
 * JAR_CLINK_MIN_GAP_MS (so a pile landing at once is a patter, not a roar).
 *
 * How it plays: the clip is cut once per visit (decoded offline and
 * trimmed, its tail faded) and played through the site's sound engine
 * (lib/sound.ts), which starts it within a few ms even while the page is
 * busy, e.g. as home reopens from a case study.
 *
 * Clinks always try to play, even on first load. Browsers that allow sound
 * before a click play them; the rest quietly refuse until the visitor has
 * clicked, tapped or pressed a key.
 */

const SRC = "/sounds/jar-drop.mp3";
const VOLUME = 0.8;
/** Quietest clink (a feather-light touch), as a share of VOLUME. */
const MIN_LEVEL = 0.35;
/** Pitch varies by up to this much either way. */
const PITCH_SPREAD = 0.08;
/** How long the clink's tail fades over. */
const FADE_OUT_S = 0.08;
/** How quickly a still-ringing clink fades once the pile has settled. */
const SILENCE_FADE_S = 0.08;

export type JarSound = {
  /** An item hit the glass, `strength` 0-1. */
  clink(strength: number): void;
  /** The pile has settled: fade out any clink still ringing, quickly. */
  silence(): void;
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

/** The clink cut out of the decoded file: JAR_CLINK_S from the onset, mono,
 * its last FADE_OUT_S faded to silence. */
function cutClink(buffer: AudioBuffer): AudioBuffer {
  const start = Math.round(findOnset(buffer) * buffer.sampleRate);
  const count = Math.max(1, Math.min(Math.round(JAR_CLINK_S * buffer.sampleRate), buffer.length - start));
  const fade = Math.round(FADE_OUT_S * buffer.sampleRate);
  const out = new AudioBuffer({ length: count, sampleRate: buffer.sampleRate, numberOfChannels: 1 });
  const data = out.getChannelData(0);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
  for (let i = 0; i < count; i++) {
    let v = 0;
    for (const ch of channels) v += ch[start + i];
    v /= channels.length;
    const left = count - i;
    data[i] = left < fade ? (v * left) / fade : v;
  }
  return out;
}

/** The clink, made once per visit (kept when home closes and reopens). */
let clinkSound: Promise<Sound | null> | null = null;
const loadClink = () =>
  (clinkSound ??= decode(SRC).then((buffer) => (buffer ? makeSound(cutClink(buffer), 6) : null)));

export function createJarSound(): JarSound {
  let disposed = false;
  let lastClinkAt = -Infinity;
  let sound: Sound | null = null;
  // The clinks still ringing, so silence() can fade them.
  const ringing = new Set<Voice>();
  loadClink().then((s) => {
    if (!disposed) sound = s;
  });

  return {
    clink(strength) {
      if (!sound || disposed) return;
      const nowMs = performance.now();
      if (nowMs - lastClinkAt < JAR_CLINK_MIN_GAP_MS) return;
      const volume = VOLUME * (MIN_LEVEL + (1 - MIN_LEVEL) * Math.max(0, Math.min(1, strength)));
      // A different pitch each time: speed changes pitch.
      const voice = play(sound, volume, 1 + (Math.random() * 2 - 1) * PITCH_SPREAD);
      if (!voice) return;
      lastClinkAt = nowMs;
      ringing.add(voice);
      window.setTimeout(() => ringing.delete(voice), JAR_CLINK_S * 1000 + 50);
    },
    silence() {
      // Fade each still-ringing clink to nothing over SILENCE_FADE_S.
      for (const voice of ringing) voice.fadeOut(SILENCE_FADE_S);
      ringing.clear();
    },
    dispose() {
      // The clink itself stays for the next time home opens.
      disposed = true;
      for (const voice of ringing) voice.fadeOut(0.02);
      ringing.clear();
    },
  };
}
