/**
 * Plays sound from URL (for card sounds from admin upload).
 */
export function playSoundFromUrl(url) {
  if (!url) return;
  try {
    const audio = new Audio(url);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch (_) {}
}

/**
 * Simple beep sounds using Web Audio API.
 * @param {string} type - 'click' | 'cardPlay' | 'attack' | 'victory' | 'defeat' | 'draw'
 */
export function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    const presets = {
      click: { freq: 800, duration: 0.05, gain: 0.15 },
      cardPlay: { freq: 523, duration: 0.12, gain: 0.2 },
      attack: { freq: 200, duration: 0.15, gain: 0.25 },
      victory: { freq: 523, duration: 0.2, gain: 0.2, endFreq: 784 },
      defeat: { freq: 150, duration: 0.3, gain: 0.2, endFreq: 100 },
      draw: { freq: 400, duration: 0.2, gain: 0.18 },
    };

    const p = presets[type] || presets.click;
    oscillator.frequency.setValueAtTime(p.freq, now);
    if (p.endFreq) {
      oscillator.frequency.exponentialRampToValueAtTime(p.endFreq, now + p.duration);
    }
    oscillator.type = type === 'attack' || type === 'defeat' ? 'sawtooth' : 'sine';
    gainNode.gain.setValueAtTime(p.gain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + p.duration);

    oscillator.start(now);
    oscillator.stop(now + p.duration);
  } catch (_) {
    // Web Audio not supported or user interaction required
  }
}
