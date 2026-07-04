let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext()
    } catch {
      return null
    }
  }
  return audioCtx
}

export function unlockInterviewAudio() {
  const ctx = getCtx()
  if (!ctx) return
  void ctx.resume()
}

/** 倒计时 tick：3/2/1 音调递增，开始音更亮 */
export function playCountdownTick(step: number) {
  const ctx = getCtx()
  if (!ctx) return
  void ctx.resume()

  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.connect(gain)
  gain.connect(ctx.destination)

  if (step <= 0) {
    osc.frequency.setValueAtTime(523.25, now)
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12)
    gain.gain.setValueAtTime(0.22, now)
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45)
    osc.start(now)
    osc.stop(now + 0.45)
    return
  }

  const freq = step === 3 ? 220 : step === 2 ? 330 : 440
  osc.frequency.setValueAtTime(freq, now)
  gain.gain.setValueAtTime(0.18, now)
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22)
  osc.start(now)
  osc.stop(now + 0.22)
}

export function playPreviewPulse() {
  const ctx = getCtx()
  if (!ctx) return
  void ctx.resume()
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(180, now)
  gain.gain.setValueAtTime(0.06, now)
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.35)
}
