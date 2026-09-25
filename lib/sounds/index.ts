'use client';

/**
 * Micro-sound effects for UI interactions (Web Audio API, no files needed).
 *
 * Every sound is a short synthesised tone: a sine or triangle wave shaped by a
 * fast gain envelope. Nothing here loads a network resource or touches the DOM.
 *
 * Sounds are suppressed entirely when:
 *   - prefers-reduced-motion is active (spec 7.3),
 *   - the AudioContext cannot be created (old browsers, restrictive iframes), or
 *   - the context is suspended and cannot be resumed (no prior user gesture).
 *
 * The module is safe to import on the server — every function early-returns
 * when `window` / `AudioContext` is unavailable.
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  // Respect prefers-reduced-motion: if motion is reduced, skip sounds.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;

  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }

  // Safari and Chrome suspend context until a user gesture has occurred.
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  return ctx;
}

// ─── Primitives ──────────────────────────────────────────────────────────────

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.12,
) {
  const ac = getCtx();
  if (!ac) return;

  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  const now = ac.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function chord(
  freqs: number[],
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.08,
) {
  for (const f of freqs) tone(f, duration, type, volume);
}

// ─── Public sounds ───────────────────────────────────────────────────────────

/** Soft click — general buttons. */
export function playClick() {
  tone(880, 0.06, 'sine', 0.09);
}

/** Subtle pop — step navigation. */
export function playPop() {
  tone(660, 0.08, 'triangle', 0.1);
  setTimeout(() => tone(880, 0.06, 'sine', 0.06), 30);
}

/** Cheerful rising ding — success (checkpoint yes, project complete). */
export function playSuccess() {
  chord([523.25, 659.25, 783.99], 0.22, 'sine', 0.07); // C5 E5 G5
}

/** Short descending tone — "something's off" / trouble. */
export function playTrouble() {
  tone(440, 0.1, 'triangle', 0.08);
  setTimeout(() => tone(349.23, 0.12, 'triangle', 0.06), 60);
}

/** Tiny tick — checkbox toggled. */
export function playTick() {
  tone(1200, 0.035, 'sine', 0.07);
}

/** Copy confirmation bloop. */
export function playCopy() {
  tone(1046.5, 0.04, 'sine', 0.06);
  setTimeout(() => tone(1318.5, 0.05, 'sine', 0.05), 40);
}

/** Press-and-hold button activation. */
export function playPress() {
  tone(392, 0.08, 'triangle', 0.1);
}

/** Press-and-hold button release. */
export function playRelease() {
  tone(523.25, 0.06, 'sine', 0.06);
}
