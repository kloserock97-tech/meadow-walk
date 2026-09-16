import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { settings } from '../settings.js'
import { timeline } from '../config.js'
import { live, stepLive, snapLive } from './live.js'
import { U } from './uniforms.js'

// Первым в кадре (priority −3): живые значения догоняют панель и раскладываются по uniform'ам.
// Цвета uniform'ы получают по ссылке (live.<цвет> — те же объекты THREE.Color).
export function Live() {
  const first = useRef(true)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20)
    if (first.current) {
      snapLive()
      first.current = false
    } else {
      stepLive(dt)
    }

    U.uHills.value = live.hills
    U.uHillScale.value = live.hillScale
    U.uWaveStrength.value = live.waveStrength
    U.uWaveSpeed.value = live.waveSpeed
    U.uWaveLife.value = live.waveLife
    U.uWind.value = live.wind
    U.uBladeScale.value.set(live.bladeHeight, live.bladeWidth)
    U.uStones.value = live.stones
    U.uStoneSize.value = live.stoneSize
    U.uDustSize.value = live.dustSize

    // ветер копит свою фазу: смена скорости меняет темп, а не перескакивает
    if (!(settings.paused || timeline.paused)) U.uWindTime.value += dt * live.windSpeed
  }, -3)

  return null
}
