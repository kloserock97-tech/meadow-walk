/* Всё, что делает луг таким, какой он есть, — в одном объекте.
 *
 * Панель пишет в адресную строку только то, что отличается от этих значений, поэтому понравившийся
 * вариант можно отправить ссылкой, и он откроется точно таким же. Компоненты сцены читают этот объект
 * каждый кадр, так что любой ползунок действует сразу, без пересборки шейдеров. */

export const DEFAULTS = {
  /* walk */
  walkSpeed: 2.1,
  heightLow: 4.5,
  heightHigh: 19,
  sway: 16,
  lookAround: 9,
  paused: false,

  /* meadow */
  hills: 2.6,
  hillScale: 1,
  waterLevel: -1.6,
  lush: '#59793f',
  meadow: '#86a259',
  dry: '#adaa76',
  rock: '#aaa8a2',
  path: '#c4b6a2',
  water: '#050807',

  /* grass */
  grassDensity: 1,
  bladeHeight: 1,
  bladeWidth: 1,
  wind: 1,
  windSpeed: 1,
  grassRoot: '#506c38',
  grassTip: '#89aa59',
  grassDry: '#b3b176',

  /* stones */
  stones: 1,
  stoneSize: 1,
  stoneColor: '#b3afaa',

  /* light and air */
  sunHeight: 13,
  sunAngle: 65,
  sunColor: '#f2ebe1',
  sunIntensity: 4.2,
  skyLight: 0.45,
  haze: 0.012,
  night: '#0a0908',
  dust: 1,
  dustSize: 1,

  /* cursor */
  waveStrength: 1,
  waveSpeed: 2.6,
  waveLife: 2.6,

  /* look */
  exposure: 1,
  saturation: -0.55,
  contrast: 0.12,
  bloom: 0.55,
  focusBlur: 3.2,
  aberration: 1,
  grain: 0.045,
  vignette: 0.82,

  /* view */
  lines: false,
  sound: false,
  adaptive: true,
}

export const PRESETS = {
  dusk: {},
  spring: {
    sunHeight: 32, sunAngle: 40, sunColor: '#fff4dc', sunIntensity: 3.4, skyLight: 0.8,
    night: '#1e2824', haze: 0.016, exposure: 0.9, saturation: -0.2, contrast: 0.08, bloom: 0.35, vignette: 0.6,
    lush: '#4e7a33', meadow: '#7fa050', dry: '#a3a066', grassRoot: '#44672b', grassTip: '#86a855', grassDry: '#a8a66c',
    water: '#0c1c1f', waterLevel: -1.4,
  },
  autumn: {
    sunHeight: 10, sunAngle: 5, sunColor: '#ffd2a0', sunIntensity: 4.6, skyLight: 0.4,
    night: '#140c07', saturation: -0.4, bloom: 0.7,
    lush: '#5e5534', meadow: '#8a7a48', dry: '#a88a55', grassRoot: '#4e4424', grassTip: '#9a8450', grassDry: '#b39462',
    path: '#9a8266', stones: 1.6, dust: 1.6,
  },
  moor: {
    hills: 3.4, hillScale: 1.35, waterLevel: -0.9, sunHeight: 11, sunIntensity: 4.6, skyLight: 0.9, exposure: 1.25,
    night: '#0c0e10', haze: 0.022, saturation: -0.35, wind: 1.8, windSpeed: 1.5,
    lush: '#6a7a62', meadow: '#8e917a', dry: '#aa9d8b', grassRoot: '#5c6552', grassTip: '#9d9d80', grassDry: '#b3a28a',
    stones: 2.2, stoneSize: 1.4, bladeHeight: 0.8,
  },
  frost: {
    sunHeight: 18, sunColor: '#dfe8ff', sunIntensity: 3.8, skyLight: 0.7, night: '#0a0d12', haze: 0.018,
    exposure: 0.9, saturation: -0.6, contrast: 0.14, bloom: 0.8,
    lush: '#7d8583', meadow: '#9ea4a1', dry: '#b3b7b3', grassRoot: '#6f7876', grassTip: '#c3c9c7', grassDry: '#d2d6d4',
    water: '#0a1016', wind: 0.4, windSpeed: 0.5, dust: 2, dustSize: 1.3,
  },
}

const KEYS = {
  walkSpeed: 'ws', heightLow: 'hl', heightHigh: 'hh', sway: 'sw', lookAround: 'la', paused: 'pa',
  hills: 'hi', hillScale: 'hs', waterLevel: 'wl', lush: 'lu', meadow: 'me', dry: 'dr', rock: 'ro', path: 'pt', water: 'wa',
  grassDensity: 'gd', bladeHeight: 'bh', bladeWidth: 'bw', wind: 'wi', windSpeed: 'wv', grassRoot: 'gr', grassTip: 'gt', grassDry: 'gy',
  stones: 'st', stoneSize: 'ss', stoneColor: 'sc',
  sunHeight: 'sh', sunAngle: 'sa', sunColor: 'su', sunIntensity: 'si', skyLight: 'sl', haze: 'hz', night: 'ni', dust: 'du', dustSize: 'ds',
  waveStrength: 'vs', waveSpeed: 'vp', waveLife: 'vl',
  exposure: 'ex', saturation: 'sat', contrast: 'co', bloom: 'bl', focusBlur: 'fb', aberration: 'ab', grain: 'gn', vignette: 'vi',
  lines: 'li', adaptive: 'ad',
}

const FROM_KEY = Object.fromEntries(Object.entries(KEYS).map(([name, key]) => [key, name]))

export const settings = { ...DEFAULTS, ...readUrl() }

export function readUrl() {
  const out = {}
  const params = new URLSearchParams(location.hash.replace(/^#/, ''))
  for (const [key, raw] of params) {
    const name = FROM_KEY[key]
    if (name === undefined) continue
    const fallback = DEFAULTS[name]
    if (typeof fallback === 'number') {
      const value = Number(raw)
      if (Number.isFinite(value)) out[name] = value
    } else if (typeof fallback === 'boolean') out[name] = raw === '1'
    else if (/^#?[0-9a-f]{3,8}$/i.test(raw)) out[name] = raw.startsWith('#') ? raw : `#${raw}`
  }
  return out
}

export function writeUrl() {
  const params = new URLSearchParams()
  for (const [name, key] of Object.entries(KEYS)) {
    const value = settings[name]
    if (value === DEFAULTS[name]) continue
    if (typeof value === 'boolean') params.set(key, value ? '1' : '0')
    else if (typeof value === 'number') params.set(key, String(Math.round(value * 1000) / 1000))
    else params.set(key, String(value).replace(/^#/, ''))
  }
  const hash = params.toString()
  history.replaceState(null, '', hash ? `#${hash}` : location.pathname + location.search)
}

if (typeof window !== 'undefined') window.__settings = settings
