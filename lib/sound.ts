/**
 * The site's sound engine, shared by the jar's clink (components/sections/
 * Hero/jar-sound.ts) and the buttons' click (components/ui/UiSound).
 *
 * Why it's built like this:
 * - Sounds are decoded with an OfflineAudioContext, which never opens the
 *   audio device, so decoding never stalls the page.
 * - They play through one live AudioContext, from those decoded buffers, so a
 *   sound starts within a few ms of being asked for, even while the page is
 *   busy (a route change, the jar starting up): playback runs on the audio
 *   thread. Plain <audio> elements, used before, could lag a beat behind,
 *   most noticeably on a click that navigates and when home reopens.
 * - That live context is made up front, before any click (like
 *   franceszhao.ca does), and left suspended; the first press resumes it, so
 *   even the very first click and clinks play through it. Making it can
 *   block the page for a moment while the audio device opens, so it waits
 *   until the page has loaded and its load-in has played (OPEN_AFTER_LOAD_MS),
 *   then an idle moment.
 *   If it isn't there yet, sounds fall back to a small pool of preloaded
 *   <audio> elements.
 * - Everything lives at module level, so it's made once per visit and kept
 *   across pages.
 */

const RATE = 44100;

let ctx: AudioContext | null = null;
let creating = false;
let unlocked = false;

/** Whether sound is allowed: the visitor has clicked, tapped or pressed a
 * key on the site (the browser remembers that across pages). */
export function soundAllowed(): boolean {
  return (unlocked ||= typeof navigator !== "undefined" && !!navigator.userActivation?.hasBeenActive);
}

/** How long after the page loads to make the live context: past the home
 * load-in (the jar dropping and filling), so the moment it takes to open the
 * audio device can't freeze an animation that's playing. */
const OPEN_AFTER_LOAD_MS = 3500;

/** Opens the live context: `soon` (after a press, when it's needed) on the
 * next idle moment; otherwise once the page has loaded and settled, in a
 * genuinely idle moment. */
function openContext(soon = false) {
  if (ctx || typeof window === "undefined") return;
  const make = () => {
    if (ctx) return;
    try {
      ctx = new AudioContext({ latencyHint: "interactive" });
      if (unlocked) void ctx.resume();
    } catch {
      ctx = null;
    }
  };
  const idle = (timeout?: number) =>
    typeof window.requestIdleCallback === "function"
      ? window.requestIdleCallback(make, timeout ? { timeout } : undefined)
      : window.setTimeout(make, 200);
  if (soon) {
    idle(1000);
    return;
  }
  if (creating) return;
  creating = true;
  const later = () => window.setTimeout(() => idle(), OPEN_AFTER_LOAD_MS);
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later, { once: true });
}

if (typeof window !== "undefined") {
  const events = ["pointerdown", "keydown", "touchend"] as const;
  const unlock = () => {
    unlocked = true;
    events.forEach((e) => window.removeEventListener(e, unlock, true));
    // Made before the gesture, it starts suspended: the gesture resumes it.
    void ctx?.resume();
  };
  events.forEach((e) => window.addEventListener(e, unlock, true));
  // Made up front, once the page has loaded and settled, before any click.
  openContext();
}

/** Decodes a sound file offline (no audio device). */
export function decode(url: string): Promise<AudioBuffer | null> {
  return fetch(url)
    .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`${res.status}`))))
    .then((data) => new OfflineAudioContext(1, 1, RATE).decodeAudioData(data))
    .catch(() => null);
}

/** A buffer as a WAV blob URL, for the <audio> fallback. */
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

/** One sound, ready to play: its buffer, and the <audio> fallback pool. */
export interface Sound {
  buffer: AudioBuffer;
  pool: HTMLAudioElement[];
  next: number;
}

/** Makes a sound from a decoded buffer (and its fallback pool of `voices`
 * preloaded <audio> elements). */
export function makeSound(buffer: AudioBuffer, voices = 4): Sound {
  const url = wavUrl(buffer);
  const pool = Array.from({ length: voices }, () => {
    const a = new Audio(url);
    a.preload = "auto";
    a.preservesPitch = false;
    a.load();
    return a;
  });
  return { buffer, pool, next: 0 };
}

/** A playing sound, so it can be faded out early. */
export interface Voice {
  fadeOut(seconds: number): void;
}

/** Plays a sound now, at `volume` (0-1) and `rate` (speed and pitch). Does
 * nothing until sound is allowed. */
export function play(sound: Sound, volume: number, rate = 1): Voice | null {
  if (!soundAllowed()) return null;
  if (!ctx) openContext(true);
  if (ctx && ctx.state !== "closed") {
    if (ctx.state === "suspended") void ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = sound.buffer;
    src.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(ctx.destination);
    src.start();
    const c = ctx;
    return {
      fadeOut(seconds) {
        const now = c.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(0, now + seconds);
        src.stop(now + seconds + 0.01);
      },
    };
  }
  // Fallback until the live context exists.
  const a = sound.pool[sound.next++ % sound.pool.length];
  a.pause();
  a.currentTime = 0;
  a.volume = volume;
  a.playbackRate = rate;
  a.play().catch(() => undefined);
  return {
    fadeOut(seconds) {
      const from = a.volume;
      const steps = 4;
      for (let i = 1; i <= steps; i++) {
        window.setTimeout(() => {
          a.volume = from * (1 - i / steps);
          if (i === steps) a.pause();
        }, (seconds * 1000 * i) / steps);
      }
    },
  };
}
