// JS-копия terrainHeight из glsl/noise.js — нужна, чтобы найти точку курсора на рельефе
// и держать камеру над землёй. Хэш целочисленный (Math.imul + >>> 0 повторяют uint32 GLSL),
// поэтому значения совпадают с шейдером. При изменении формулы в шейдере править и здесь.

// lowbias32 (Chris Wellons, public domain)
function mix32(x) {
  x ^= x >>> 16
  x = Math.imul(x, 0x7feb352d)
  x ^= x >>> 15
  x = Math.imul(x, 0x846ca68b)
  x ^= x >>> 16
  return x >>> 0
}

function cell(ix, iy) {
  return mix32(Math.imul(ix | 0, 0x0001f35b) ^ mix32(((iy | 0) + 0x9e3779b9) >>> 0))
}

function noise(px, py) {
  const fx0 = Math.floor(px)
  const fy0 = Math.floor(py)
  const fx = px - fx0
  const fy = py - fy0
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10)
  const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10)
  const g = (ix, iy, dx, dy) => {
    const h = cell(ix, iy)
    const gx = (h & 0xffff) / 32767.5 - 1
    const gy = ((h >>> 16) & 0xffff) / 32767.5 - 1
    return gx * dx + gy * dy
  }
  const a = g(fx0, fy0, fx, fy)
  const b = g(fx0 + 1, fy0, fx - 1, fy)
  const c = g(fx0, fy0 + 1, fx, fy - 1)
  const d = g(fx0 + 1, fy0 + 1, fx - 1, fy - 1)
  const ab = a + (b - a) * ux
  const cd = c + (d - c) * ux
  return ab + (cd - ab) * uy
}

function fbm(px, py, octaves, lac, norm) {
  let s = 0
  let a = 0.5
  for (let i = 0; i < octaves; i++) {
    s += a * noise(px, py)
    // mat2(0.82, -0.57, 0.57, 0.82) * p в GLSL (матрица задаётся по столбцам)
    const nx = (0.82 * px + 0.57 * py) * lac
    const ny = (-0.57 * px + 0.82 * py) * lac
    px = nx
    py = ny
    a *= 0.5
  }
  return s * norm
}

export function terrainHeight(x, z, t) {
  let qx = x * 0.03
  let qy = z * 0.03 * 1.3
  const wx = fbm(qx * 1.2 + 1.7 + t * 0.012, qy * 1.2 + 9.2, 3, 2.03, 1.6)
  const wy = fbm(qx * 1.2 + 8.3, qy * 1.2 + 2.8 - t * 0.01, 3, 2.03, 1.6)
  qx += wx * 1.1
  qy += wy * 1.1
  const n = fbm(qx, qy, 5, 2.01, 1.55)
  const bands = Math.sin(qy * 4.2 + n * 2.6 + t * 0.04)
  const s = n * 1.8 + bands * 0.55
  const plateau = s / (0.75 + Math.abs(s))
  return plateau * 2.6 + n * 0.7 + noise(x * 0.21, z * 0.21) * 0.25
}
