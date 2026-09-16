// Параметры из адресной строки: ?q=low, ?t=12 (старт с секунды), ?pause=1 (стоп-кадр), ?ui=0
const params = new URLSearchParams(window.location.search)

export const LOW = params.get('q') === 'low'

const heightRes = LOW ? 256 : 512
const worldSize = LOW ? 220 : 240

export const CFG = {
  heightRes, // разрешение карты высот
  worldSize, // сторона участка карты высот в мировых единицах
  texel: worldSize / heightRes,
  // шаг сетки рельефа = 1 тексель карты высот, иначе вершины «плывут» при полёте
  terrainSegments: heightRes - 16,
  pebbles: LOW ? 22000 : 60000,
  pebbleTile: LOW ? 60 : 72, // сторона «плитки», в которой заворачиваются камни
  // трава: густой участок у камеры + редкий дальний; дальше траву изображает цвет рельефа
  grassLayers: [
    // 360k стеблей на 26×26 ≈ 530 на квадратную единицу
    { name: 'near', count: LOW ? 150000 : 360000, tile: 26, levels: [0, 0.5], height: [0.16, 0.46], width: [0.05, 0.09], shadows: true },
    { name: 'far', count: LOW ? 60000 : 140000, tile: 70, levels: [0], height: [0.2, 0.5], width: [0.12, 0.2], shadows: false },
  ],
  adaptive: params.get('adaptive') !== '0', // ?adaptive=0 — выключить автоподстройку (для замеров)
  preserveBuffer: params.get('pdb') === '1', // ?pdb=1 — preserveDrawingBuffer (на чёрные вспышки не влияет, стоит FPS)
  // эксперименты: ?fx=0 без постобработки, ?shadows=0 без теней
  effects: params.get('fx') !== '0',
  hide: new Set((params.get('hide') ?? '').split(',').filter(Boolean)), // ?hide=pebbles,grass,dust,water
  fxOff: new Set((params.get('off') ?? '').split(',').filter(Boolean)), // ?off=dof,bloom,ca,grain
  shadows: params.get('shadows') !== '0',
  startLevel: Math.max(0, Math.min(5, Number(params.get('level') ?? (LOW ? 3 : 0)))),
  dust: LOW ? 1200 : 2600,
  shadowMap: LOW ? 1536 : 4096,
  dof: !LOW,
  dpr: LOW ? [1, 1] : [1, 1.5],
}

// Общий таймлайн: камера пишет, остальные читают
export const timeline = {
  t: Number(params.get('t') ?? 0),
  paused: params.get('pause') === '1',
  showUI: params.get('ui') !== '0',
  focusDistance: 30,
  elapsed: 0, // секунды с загрузки (для проявления из темноты)
}

if (typeof window !== 'undefined') window.__meadow = timeline
