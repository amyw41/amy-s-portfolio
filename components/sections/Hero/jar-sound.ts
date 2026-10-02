/** Glass-jar clatter played over the load-in fall: starts when the first item
 * lands and fades out when the last one does.
 *
 * Web Audio rather than an <audio> element so the fade-out is a scheduled
 * gain ramp (iOS ignores HTMLMediaElement.volume) and the clip can loop
 * seamlessly if the fall outlasts it.
 *
 * Browsers block audio until the visitor has interacted with the page, so on
 * a cold first visit the AudioContext starts suspended and the fall plays
 * silently. That's handled by simply not playing: resume() is attempted, and
 * the clip only starts if it resolves before the last landing. */

const SRC = "/sounds/jar-drop.mp3";
const FADE_IN_S = 0.03;
const FADE_OUT_S = 0.4;
const VOLUME = 0.8;

export type JarSound = {
  /** First item landed. `expectedSpanS` is how long until the last lands. */
  start(expectedSpanS: number): void;
  /** Last item landed (or replay was cut short): fade out. */
  stop(): void;
  dispose(): void;
};

export function createJarSound(): JarSound {
  let ctx: AudioContext | null = null;
  let buffer: AudioBuffer | null = null;
  let source: AudioBufferSourceNode | null = null;
  let gain: GainNode | null = null;
  // True between start() and stop(): a late resume() only plays inside it.
  let wanted = false;
  let disposed = false;

  try {
    ctx = new AudioContext();
    fetch(SRC)
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(`${res.status}`))))
      .then((data) => ctx!.decodeAudioData(data))
      .then((decoded) => {
        buffer = decoded;
      })
      .catch(() => {
        // Missing file or undecodable: the fall just plays silently.
      });
  } catch {
    ctx = null;
  }

  function play(expectedSpanS: number) {
    if (!ctx || !buffer || disposed || !wanted || source) return;
    const now = ctx.currentTime;
    gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(VOLUME, now + FADE_IN_S);
    gain.connect(ctx.destination);
    source = ctx.createBufferSource();
    source.buffer = buffer;
    // Loop only if the fall outlasts the clip; stop() ends it either way.
    source.loop = buffer.duration < expectedSpanS + FADE_OUT_S;
    source.connect(gain);
    source.start(now);
  }

  return {
    start(expectedSpanS) {
      if (!ctx || disposed) return;
      wanted = true;
      if (ctx.state === "running") {
        play(expectedSpanS);
        return;
      }
      // Autoplay policy: without a prior user gesture this either rejects or
      // stays pending. Either way nothing plays, which is the intended
      // fallback.
      ctx
        .resume()
        .then(() => play(expectedSpanS))
        .catch(() => {});
    },
    stop() {
      wanted = false;
      if (!ctx || !source || !gain) return;
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + FADE_OUT_S);
      try {
        source.stop(now + FADE_OUT_S);
      } catch {
        // Already stopped.
      }
    },
    dispose() {
      disposed = true;
      wanted = false;
      try {
        source?.stop();
      } catch {
        // Already stopped.
      }
      ctx?.close().catch(() => {});
    },
  };
}
