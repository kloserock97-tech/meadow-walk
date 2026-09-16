import { useEffect, useState } from 'react'
import { timeline } from './config.js'
import { ambience } from './ambience.js'

// Минимальный интерфейс: подпись в углу, звук, короткие строки над лугом, разовая подсказка.
const LINES = [
  'Wind moves through the grass before you notice it.',
  'Stones remember every path that crossed them.',
  'Nothing here is in a hurry. Neither are you.',
  'Somewhere below the hill, water keeps a piece of the sky.',
  'Stay a little longer. The field is patient.',
]
const PERIOD = 18 // с на строку
const SHOW_FROM = 3 // с внутри периода
const SHOW_TO = 12

const clamp01 = (x) => Math.min(Math.max(x, 0), 1)

export function Overlay() {
  const [t, setT] = useState(timeline.t)
  const [elapsed, setElapsed] = useState(0)
  const [sound, setSound] = useState(false)
  const [moved, setMoved] = useState(false)

  useEffect(() => {
    let raf
    let last = 0
    const loop = (now) => {
      if (now - last > 50) {
        setT(timeline.t)
        setElapsed(timeline.elapsed)
        last = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    const onMove = () => setMoved(true)
    window.addEventListener('pointermove', onMove, { once: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  const fadeIn = 1 - clamp01(elapsed / 2.5)
  if (!timeline.showUI) return <div className="mw-fade" style={{ opacity: fadeIn }} />

  const phase = ((t % PERIOD) + PERIOD) % PERIOD
  const line = LINES[Math.floor(t / PERIOD) % LINES.length]
  const lineOpacity = clamp01((phase - SHOW_FROM) / 1.6) * clamp01((SHOW_TO - phase) / 1.6)
  const hint = moved ? 0 : clamp01((elapsed - 3) / 1) * clamp01((14 - elapsed) / 1.5)

  return (
    <div className="mw">
      <div className="mw-fade" style={{ opacity: fadeIn }} />

      <p className="mw-line" style={{ opacity: lineOpacity }} aria-live="off">
        {line}
      </p>

      <p className="mw-hint" style={{ opacity: hint }}>
        move the cursor across the grass
      </p>

      <div className="mw-mark">
        <span className="mw-name">meadow walk</span>
        <span className="mw-sub">a study of grass and wind</span>
      </div>

      <button
        className={`mw-sound${sound ? ' is-on' : ''}`}
        onClick={() => setSound(ambience.toggle())}
        aria-pressed={sound}
      >
        <span className="mw-dot" aria-hidden="true" />
        sound {sound ? 'on' : 'off'}
      </button>
    </div>
  )
}
