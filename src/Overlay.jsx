import { useEffect, useState } from 'react'
import { timeline } from './config.js'
import { settings } from './settings.js'

// Поверх канваса: проявление из темноты при загрузке и (по желанию) короткие строки над лугом.
// Заголовок, подсказка и ссылка на код — статичной разметкой в index.html, панель — panel.js.
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
  const [, tick] = useState(0)

  useEffect(() => {
    let raf
    let last = 0
    const loop = (now) => {
      if (now - last > 50) {
        tick((n) => n + 1)
        last = now
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const t = timeline.t
  const fadeIn = 1 - clamp01(timeline.elapsed / 2.5)
  const showLines = settings.lines && timeline.showUI
  const phase = ((t % PERIOD) + PERIOD) % PERIOD
  const line = LINES[Math.floor(t / PERIOD) % LINES.length]
  const lineOpacity = showLines ? clamp01((phase - SHOW_FROM) / 1.6) * clamp01((SHOW_TO - phase) / 1.6) : 0

  return (
    <>
      <div className="fade-in" style={{ opacity: fadeIn }} />
      <p className="field-line" style={{ opacity: lineOpacity }}>
        {line}
      </p>
    </>
  )
}
