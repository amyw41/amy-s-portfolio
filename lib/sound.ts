/**
 * The site's sound engine, shared by the jar's clink (components/sections/
 * Hero/jar-sound.ts) and the buttons' click (components/ui/UiSound).
 *
 * Why it's built like this:
 * - Sounds are decoded with an OfflineAudioContext, which never opens the
 *   audio device, so decoding never stalls the page.
 * - They play through small pools of <audio> elements, each already loaded
 *   and warmed up (played once, silently, on the visitor's first click, tap
 *   or key press), so a sound starts straight away.
 * - No live AudioContext: creating one opens the audio device, which froze
 *   the page for 0.4 to 1 second in Chrome on Amy's machine, wherever it was
 *   put (on load, after load, on the first click), and showed as the site
 *   feeling slow.
 * - Everything lives at module level, so it's made once per visit and kept
 *   across pages.
 */

const RATE = 44100;

let unlocked = false;
/** Every pool, so the first gesture can warm them. */
const pools: HTMLAudioElement[][] = [];
let warmed = false;

/** Whether sound is allowed: the visitor has clicked, tapped or pressed a
 * key on the site (the browser remembers that across pages). */
export function soundAllowed(): boolean {
  return (unlocked ||= typeof navigator !== "undefined" && !!navigator.userActivation?.hasBeenActive);
}

/** Plays every pooled element once, muted, so each has its data decoded and
 * its output running before it's first heard. Needs sound to be allowed. */
function warm(pool: HTMLAudioElement[]) {
  for (const a of pool) {
    a.muted = true;
    a.play()
      .then(() => {
        a.pause();
        a.currentTime = 0;
        a.muted = false;
      })
      .catch(() => {
        a.muted = false;
      });
  }
}

function warmAll() {
  if (warmed || !soundAllowed()) return;
  warmed = true;
  pools.forEach(warm);
}

if (typeof window !== "undefined") {
  const events = ["pointerdown", "keydown", "touchend"] as const;
  const unlock = () => {
    unlocked = true;
    events.forEach((e) => window.removeEventListener(e, unlock, true));
    warmAll();
  };
  events.forEach((e) => window.addEventListener(e, unlock, true));
}

/** Decodes a sound file offline (no audio device). */
export function decode(url: string): Promise<AudioBuffer | null> {
  return fetch(url)
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`${res.status}`))))
    .then((data) => new OfflineAudioContext(1, 1, RATE).decodeAudioData(data))
    .catch(() => null);
}

/** A buffer as a WAV blob URL, for the <audio> elements. */
function wavUrl(buffer: AudioBuffer): string {
  const count = buffer.length;
  const wav = new DataView(new ArrayBuffer(44 + count * 2));
  const text = (at: number, s: string) => [...s].forEach((ch, i) => wav.setUint8(at + i, ch.charCodeAt(0)));
  text(0, "RIFF");
  wav.setUint32(4, 36 + count * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  wav.setUint32(16, 16, true);
  wav.setUint16(20, 1, true);
  wav.setUint16(22, 1, true);
  wav.setUint32(24, buffer.sampleRate, true);
  wav.setUint32(28, buffer.sampleRate * 2, true);
  wav.setUint16(32, 2, true);
  wav.setUint16(34, 16, true);
  text(36, "data");
  wav.setUint32(40, count * 2, true);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
  for (let i = 0; i < count; i++) {
    let v = 0;
    for (const ch of channels) v += ch[i];
    v /= channels.length;
    wav.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 0x7fff, true);
  }
  return URL.createObjectURL(new Blob([wav.buffer], { type: "audio/wav" }));
}

/** One sound, ready to play: a pool of preloaded <audio> elements. */
export interface Sound {
  pool: HTMLAudioElement[];
  next: number;
}

/** Makes a sound from a decoded buffer: a pool of `voices` preloaded <audio>
 * elements (so quick repeats overlap), warmed on the first gesture. */
export function makeSound(buffer: AudioBuffer, voices = 4): Sound {
  const url = wavUrl(buffer);
  const pool = Array.from({ length: voices }, () => {
    const a = new Audio(url);
    a.preload = "auto";
    a.preservesPitch = false;
    a.load();
    return a;
  });
  pools.push(pool);
  // Already allowed (arrived by a click): warm this one now.
  if (warmed) warm(pool);
  else warmAll();
  return { pool, next: 0 };
}

/** A playing sound, so it can be faded out early. */
export interface Voice {
  fadeOut(seconds: number): void;
}

/** Plays a sound now, at `volume` (0-1) and `rate` (speed and pitch). Does
 * nothing until sound is allowed. */
export function play(sound: Sound, volume: number, rate = 1): Voice | null {
  if (!soundAllowed()) return null;
  warmAll();
  const a = sound.pool[sound.next++ % sound.pool.length];
  // A fade still running from this element's last use can't touch this one.
  const use = (uses.get(a) ?? 0) + 1;
  uses.set(a, use);
  a.pause();
  a.currentTime = 0;
  a.muted = false;
  a.volume = volume;
  a.playbackRate = rate;
  a.play().catch(() => undefined);
  return {
    fadeOut(seconds) {
      const from = a.volume;
      const steps = 4;
      for (let i = 1; i <= steps; i++) {
        window.setTimeout(() => {
          if (uses.get(a) !== use) return;
          a.volume = from * (1 - i / steps);
          if (i === steps) a.pause();
        }, (seconds * 1000 * i) / steps);
      }
    },
  };
}

const uses = new WeakMap<HTMLAudioElement, number>();
