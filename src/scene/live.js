import * as THREE from 'three'
import { DEFAULTS, settings } from '../settings.js'

// «Живые» значения: плавно догоняют настройки панели, чтобы ползунок не давал скачка
// (рельеф перетекает, скорость разгоняется, цвет переливается). Читают их все компоненты сцены,
// а JS-копия рельефа — те же числа, что шейдер, поэтому курсор и камера не расходятся с картинкой.
export const live = {}
const colors = {}

for (const [key, value] of Object.entries(DEFAULTS)) {
  if (typeof value === 'number') live[key] = settings[key]
  else if (typeof value === 'string') {
    colors[key] = new THREE.Color(settings[key])
    live[key] = colors[key]
  }
}

const target = new THREE.Color()

export function stepLive(dt) {
  const k = 1 - Math.exp(-dt * 5) // ~0,6 с до цели
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (typeof value === 'number') live[key] += (settings[key] - live[key]) * k
    else if (typeof value === 'string') colors[key].lerp(target.set(settings[key]), k)
  }
}

// сразу к цели (пресет при загрузке, стоп-кадры)
export function snapLive() {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (typeof value === 'number') live[key] = settings[key]
    else if (typeof value === 'string') colors[key].set(settings[key])
  }
}
