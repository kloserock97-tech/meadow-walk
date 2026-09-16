// Общее состояние качества: сюда слои регистрируют то, что можно облегчить на лету.
export const perf = {
  grass: {}, // имя слоя → { geometry, max }
  level: 0, // 0 — максимум, дальше легче (см. LEVELS в Adaptive.jsx)
  fps: 0,
}

if (typeof window !== 'undefined') window.__perf = perf
