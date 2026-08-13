/**
 * Tiny synthesized sound effects (Web Audio, no assets). The audio context
 * is created lazily on the first call, which always follows a user gesture.
 */

const MUTE_KEY = "dots-and-boxes:muted";

let ctx: AudioContext | null = null;
let muted = globalThis.localStorage?.getItem(MUTE_KEY) === "1";

export function isMuted(): boolean {
  return muted;
}

export function setMuted(next: boolean): void {
  muted = next;
  globalThis.localStorage?.setItem(MUTE_KEY, next ? "1" : "0");
}

function audio(): AudioContext | null {
  if (muted) return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Oscillator blip with a pitch slide and a fast-decay envelope. */
function tone(
  atTime: number,
  freqFrom: number,
  freqTo: number,
  duration: number,
  type: OscillatorType,
  volume: number,
): void {
  const audioCtx = audio();
  if (audioCtx === null) return;
  const start = audioCtx.currentTime + atTime;
  const osc = audioCtx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, start);
  osc.frequency.exponentialRampToValueAtTime(freqTo, start + duration);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration);
}

/** Short burst of band-passed noise (pencil scratch / stamp dust). */
function noise(
  atTime: number,
  duration: number,
  frequency: number,
  volume: number,
): void {
  const audioCtx = audio();
  if (audioCtx === null) return;
  const start = audioCtx.currentTime + atTime;
  const length = Math.ceil(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, length, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = frequency;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  source.connect(filter).connect(gain).connect(audioCtx.destination);
  source.start(start);
}

/** A line being penciled in. */
export function playDraw(): void {
  noise(0, 0.05, 2400, 0.1);
  tone(0, 520, 220, 0.06, "triangle", 0.08);
}

/** A cell being stamped with an initial. */
export function playClaim(): void {
  tone(0, 170, 65, 0.14, "sine", 0.22);
  noise(0, 0.06, 700, 0.14);
}

/** Three rising notes when the human wins. */
export function playWin(): void {
  tone(0, 523, 523, 0.12, "triangle", 0.14);
  tone(0.09, 659, 659, 0.12, "triangle", 0.14);
  tone(0.18, 784, 784, 0.22, "triangle", 0.16);
}

/** Two falling notes when the computer wins. */
export function playLose(): void {
  tone(0, 330, 330, 0.16, "triangle", 0.12);
  tone(0.14, 233, 220, 0.26, "triangle", 0.12);
}
