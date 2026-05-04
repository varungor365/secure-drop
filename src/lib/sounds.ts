/** Synthesises UI sounds using the Web Audio API — no audio files needed. */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/** Swoosh/launch sound — rising frequency burst */
export function playSend(): void {
  try {
    const c = getCtx();
    const buf = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      const t = i / c.sampleRate;
      const env = Math.pow(1 - t / 0.6, 1.5);
      d[i] = (Math.random() * 2 - 1) * env * 0.4;
    }
    const noise = c.createBufferSource();
    noise.buffer = buf;

    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(200, c.currentTime);
    filter.frequency.linearRampToValueAtTime(2800, c.currentTime + 0.5);
    filter.Q.value = 0.8;

    const gain = c.createGain();
    gain.gain.setValueAtTime(0.7, c.currentTime);
    gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.6);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(c.destination);
    noise.start();
    noise.stop(c.currentTime + 0.6);
  } catch { /* ignore */ }
}

/** Landing/receive sound — descending tones */
export function playReceive(): void {
  try {
    const c = getCtx();
    const freqs = [880, 660, 440, 330];
    freqs.forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = c.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.04);
      gain.gain.linearRampToValueAtTime(0, start + 0.18);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    });
  } catch { /* ignore */ }
}

/** Soft click for UI interactions */
export function playClick(): void {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, c.currentTime);
    osc.frequency.linearRampToValueAtTime(200, c.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, c.currentTime);
    gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.08);
  } catch { /* ignore */ }
}
