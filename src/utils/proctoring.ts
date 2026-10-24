/**
 * Online Proctoring helper for audio alerts, canvas evidence snapshots, and violation tracking.
 */

// Web Audio synthesizer for alert beeps
let audioCtx: AudioContext | null = null;

export function playAlertSound(type: 'warning' | 'lockout' | 'success') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    
    if (!audioCtx || audioCtx.state === 'suspended') {
      audioCtx = new AudioContextClass();
    }
    
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'warning') {
      // Urgent double beep (880Hz -> 440Hz)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'lockout') {
      // Long descending alarm buzz
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(160, now + 0.6);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.65);
    } else {
      // Pleasant chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.15); // E5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch {
    // AudioContext blocked or not supported
  }
}

/**
 * Capture a lightweight JPEG snapshot from an HTMLVideoElement.
 */
export function captureVideoSnapshot(videoElement: HTMLVideoElement | null): string | undefined {
  if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
    return undefined;
  }

  try {
    const canvas = document.createElement('canvas');
    // Scale down to a compact resolution (320x240) to conserve memory
    const targetWidth = 320;
    const targetHeight = Math.round((videoElement.videoHeight / videoElement.videoWidth) * targetWidth);
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    // Draw video frame
    ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);
    
    // Add timestamp watermark
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, targetHeight - 20, targetWidth, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.fillText(new Date().toLocaleTimeString('id-ID'), 6, targetHeight - 6);

    return canvas.toDataURL('image/jpeg', 0.65);
  } catch {
    return undefined;
  }
}
