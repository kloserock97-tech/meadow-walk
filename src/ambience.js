// Фоновый звук без файлов: ветер над лугом, синтез Web Audio.
// Белый шум, сглаженный двумя однополюсными фильтрами (тёмный «шелест») →
// полосовые фильтры, частота и громкость медленно «дышат» (порывы).
// Браузер разрешает звук только после клика — поэтому старт по кнопке.
let ctx = null
let master = null

function noiseBuffer() {
  const length = ctx.sampleRate * 4
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch)
    let s1 = 0
    let s2 = 0
    let peak = 0
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1
      s1 += (white - s1) * 0.12 // срезаем резкий верх
      s2 += (s1 - s2) * 0.35 // и ещё немного
      data[i] = s2 * 0.6 + s1 * 0.4
      peak = Math.max(peak, Math.abs(data[i]))
    }
    for (let i = 0; i < length; i++) data[i] /= peak * 1.2
    // мягкий шов петли: короткий кроссфейд конца в начало
    const fade = Math.floor(ctx.sampleRate * 0.05)
    for (let i = 0; i < fade; i++) {
      const k = i / fade
      data[i] = data[i] * k + data[length - fade + i] * (1 - k)
    }
  }
  return buffer
}

function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)()
  const buffer = noiseBuffer()

  master = ctx.createGain()
  master.gain.value = 0
  master.connect(ctx.destination)

  // два слоя ветра: низкий гул и высокий шелест в траве
  const layers = [
    { freq: 300, q: 0.7, gain: 0.55, lfo: 0.07, depth: 120 },
    { freq: 1500, q: 1.2, gain: 0.14, lfo: 0.11, depth: 520 },
  ]
  for (const l of layers) {
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    src.playbackRate.value = 0.9 + Math.random() * 0.2

    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = l.freq
    filter.Q.value = l.q

    const gain = ctx.createGain()
    gain.gain.value = l.gain

    // порывы: медленный LFO на частоту фильтра и громкость слоя
    const lfo = ctx.createOscillator()
    lfo.frequency.value = l.lfo
    const lfoFreq = ctx.createGain()
    lfoFreq.gain.value = l.depth
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = l.gain * 0.45
    lfo.connect(lfoFreq).connect(filter.frequency)
    lfo.connect(lfoGain).connect(gain.gain)

    src.connect(filter).connect(gain).connect(master)
    src.start()
    lfo.start()
  }
}

export const ambience = {
  on: false,
  // включить/выключить; первый вызов обязан прийти из жеста пользователя (клик, клавиша)
  set(on) {
    if (!ctx) build()
    if (ctx.state === 'suspended') ctx.resume()
    this.on = on
    const now = ctx.currentTime
    master.gain.cancelScheduledValues(now)
    master.gain.setValueAtTime(master.gain.value, now)
    // плавно, без щелчка
    master.gain.linearRampToValueAtTime(on ? 0.55 : 0, now + (on ? 2.5 : 1.2))
    return on
  },
  toggle() {
    return this.set(!this.on)
  },
}
