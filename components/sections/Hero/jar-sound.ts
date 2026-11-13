import { JAR_CLINK_MIN_GAP_MS, JAR_CLINK_S } from "@/lib/motion";

/** The glass clink: one short clink per item hitting the jar's glass (see
 * useJarPhysics's onImpact) — as the items fall in, and as they bounce when
 * the jar is lowered away. Nothing else makes a sound.
 *
 * Each clink is the clip's first JAR_CLINK_S from its first sound (skipping
 * any silence at the start of the file), at a volume set by how hard the hit
 * was and a slightly different pitch each time, never closer together than
 * JAR_CLINK_MIN_GAP_MS (so a pile landing at once is a patter, not a roar).
 *
 * How it plays: the clip is cut once, up front, into its own tiny sound
 * (decoded and trimmed with an OfflineAudioContext, its tail faded, saved as
 * a WAV in memory), and each clink plays that through a plain <audio>
 * element. Not a live Web Audio AudioContext: creating one opens the audio
 * device, which blocked the page for a quarter to most of a second on some
 * machines, and whenever it happened (at load, on a click, mid-scroll) it
 * was a visible stall. An offline context and <audio> elements never block
 * like that.
 *
 * Browsers block audio until the visitor has clicked, tapped or pressed a
 * key on the page, so until then clinks are silently skipped. */

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
/** The sample rate the clip is cut at. */
const RATE = 44100;

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
 * its last FADE_OUT_S faded to silence, as a 16-bit WAV. */
function clinkWav(buffer: AudioBuffer): Blob {
  const onset = findOnset(buffer);
  const start = Math.round(onset * buffer.sampleRate);
  const count = Math.min(Math.round(JAR_CLINK_S * buffer.sampleRate), buffer.length - start);
  const fade = Math.round(FADE_OUT_S * buffer.sampleRate);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
  const wav = new DataView(new ArrayBuffer(44 + count * 2));
  const text = (at: number, s: string) => [...s].forEach((ch, i) => wav.setUint8(at + i, ch.charCodeAt(0)));
  text(0, "RIFF");
  wav.setUint32(4, 36 + count * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  wav.setUint32(16, 16, true);
  wav.setUint16(20, 1, true); // PCM
  wav.setUint16(22, 1, true); // mono
  wav.setUint32(24, buffer.sampleRate, true);
  wav.setUint32(28, buffer.sampleRate * 2, true);
  wav.setUint16(32, 2, true);
  wav.setUint16(34, 16, true);
  text(36, "data");
  wav.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) {
    let v = 0;
    for (const ch of channels) v += ch[start + i];
    v /= channels.length;
    const left = count - i;
    if (left < fade) v *= left / fade;
    wav.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 0x7fff, true);
  }
  return new Blob([wav.buffer], { type: "audio/wav" });
}

export function createJarSound(): JarSound {
  let url: string | null = null;
  let unlocked = false;
  let disposed = false;
  let lastClinkAt = -Infinity;
  // The clinks still ringing, so silence() can fade them.
  const ringing = new Set<HTMLAudioElement>();

  // Fetch, decode (offline: no audio device) and cut the clip, once.
  fetch(SRC)
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`${res.status}`))))
    .then((data) => new OfflineAudioContext(1, 1, RATE).decodeAudioData(data))
    .then((decoded) => {
      if (disposed) return;
      url = URL.createObjectURL(clinkWav(decoded));
    })
    .catch(() => {
      // Missing file, undecodable, or no Web Audio: the jar is just silent.
    });

  // The first click, tap or key press lets audio play.
  const unlock = () => {
    unlocked = true;
    removeUnlock();
  };
  const unlockEvents = ["pointerdown", "keydown", "touchend"] as const;
  const removeUnlock = () => unlockEvents.forEach((e) => window.removeEventListener(e, unlock));
  unlockEvents.forEach((e) => window.addEventListener(e, unlock));

  return {
    clink(strength) {
      if (!url || !unlocked || disposed) return;
      const nowMs = performance.now();
      if (nowMs - lastClinkAt < JAR_CLINK_MIN_GAP_MS) return;
      lastClinkAt = nowMs;
      const audio = new Audio(url);
      audio.volume = VOLUME * (MIN_LEVEL + (1 - MIN_LEVEL) * Math.max(0, Math.min(1, strength)));
      // A different pitch each time: speed changes pitch (not preserved).
      audio.preservesPitch = false;
      audio.playbackRate = 1 + (Math.random() * 2 - 1) * PITCH_SPREAD;
      ringing.add(audio);
      audio.onended = () => ringing.delete(audio);
      audio.play().catch(() => ringing.delete(audio));
    },
    silence() {
      // Fade each still-ringing clink to nothing over SILENCE_FADE_S.
      for (const audio of ringing) {
        const from = audio.volume;
        const steps = 4;
        for (let i = 1; i <= steps; i++) {
          window.setTimeout(() => {
            audio.volume = from * (1 - i / steps);
            if (i === steps) audio.pause();
          }, (SILENCE_FADE_S * 1000 * i) / steps);
        }
        ringing.delete(audio);
      }
    },
    dispose() {
      disposed = true;
      removeUnlock();
      for (const audio of ringing) audio.pause();
      ringing.clear();
      if (url) URL.revokeObjectURL(url);
    },
  };
}
