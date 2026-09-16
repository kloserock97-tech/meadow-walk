import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CFG } from '../config.js'
import { perf } from './perf.js'
import { settings } from '../settings.js'
import { live } from './live.js'

// Автоподстройка качества: меряет средний FPS окнами по 1,5 с и меняет только густоту травы.
// Разрешение на лету НЕ меняем: setDpr пересоздаёт буферы кадра и постобработки —
// это подвисание кадра до ~200 мс («дёргается»). DPR задаётся один раз при старте.
// Густота меняется плавно (~1,5 с), а не скачком: иначе видно, как разом исчезают стебли.
// Стебли раскиданы случайно, поэтому урезанный instanceCount = равномерно реже трава, без дыр.
const LEVELS = [
  { near: 1.0, far: 1.0, dpr: 1.5 },
  { near: 0.75, far: 0.85, dpr: 1.5 },
  { near: 0.55, far: 0.7, dpr: 1.35 },
  { near: 0.4, far: 0.55, dpr: 1.2 },
  { near: 0.28, far: 0.4, dpr: 1.0 },
  { near: 0.18, far: 0.25, dpr: 1.0 },
]
const WINDOW = 1.5
const LOW_FPS = 50
const HIGH_FPS = 58
const BLEND_TIME = 1.5 // с, плавный переход густоты

// цель = максимум слоя × доля уровня качества × «grass density» с панели
function targets(level) {
  const l = LEVELS[level]
  const density = Math.min(1, Math.max(0.05, live.grassDensity))
  const out = {}
  for (const [name, g] of Object.entries(perf.grass)) {
    out[name] = Math.max(1, Math.floor(g.max * (name === 'near' ? l.near : l.far) * density))
  }
  return out
}

export function Adaptive() {
  const setDpr = useThree((s) => s.setDpr)
  const acc = useRef({ time: 0, frames: 0, good: 0, bad: 0, started: false, warm: 0, target: null })

  useFrame((_, delta) => {
    const a = acc.current
    if (!a.started) {
      // стартовый уровень: густота сразу, разрешение — один раз
      a.target = targets(CFG.startLevel)
      for (const [name, g] of Object.entries(perf.grass)) g.geometry.instanceCount = a.target[name]
      setDpr(Math.min(LEVELS[CFG.startLevel].dpr, window.devicePixelRatio, CFG.dpr[1]))
      perf.level = CFG.startLevel
      a.started = true
    }

    // плавное приближение густоты к цели (цель пересчитывается: ползунок густоты действует сразу)
    a.target = targets(perf.level)
    for (const [name, g] of Object.entries(perf.grass)) {
      const target = a.target[name]
      const cur = g.geometry.instanceCount
      if (cur === target) continue
      const step = Math.max(1, Math.ceil((g.max * delta) / BLEND_TIME))
      g.geometry.instanceCount = cur < target ? Math.min(target, cur + step) : Math.max(target, cur - step)
    }

    if (!(CFG.adaptive && settings.adaptive)) return
    // первые 4 с — компиляция и досборка шейдеров, окна с рывками занижают FPS
    a.warm += delta
    if (a.warm < 4) return

    a.time += delta
    a.frames++
    if (a.time < WINDOW) return
    const fps = a.frames / a.time
    perf.fps = Math.round(fps)
    a.time = 0
    a.frames = 0

    const setLevel = (level) => {
      perf.level = level
      a.target = targets(level)
      a.good = 0
      a.bad = 0
    }

    if (fps < LOW_FPS) {
      // вниз — после двух плохих окон подряд (одиночный рывок не в счёт)
      if (++a.bad >= 2 && perf.level < LEVELS.length - 1) setLevel(perf.level + 1)
      a.good = 0
    } else if (fps > HIGH_FPS) {
      // вверх — осторожно: три хороших окна подряд
      if (++a.good >= 3 && perf.level > 0) setLevel(perf.level - 1)
      a.bad = 0
    } else {
      a.good = 0
      a.bad = 0
    }
  })

  return null
}
