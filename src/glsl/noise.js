// Общий GLSL: шум и функция высоты рельефа.
// Высота считается один раз за кадр в карту высот (HeightField),
// рельеф и камни её только читают. JS-копия — scene/terrainCPU.js (совпадает бит в бит).
//
// Хэш — целочисленный: перемешивание lowbias32 (Chris Wellons, hash-prospector, public domain),
// ячейка сетки сводится к одному uint32. Градиентный шум с квинтик-сглаживанием
// и FBM с поворотом октав написаны здесь заново, свои константы.
export const noiseGLSL = /* glsl */ `
uint mdMix(uint x) {
  x ^= x >> 16u;
  x *= 0x7feb352du;
  x ^= x >> 15u;
  x *= 0x846ca68bu;
  x ^= x >> 16u;
  return x;
}
uint mdCell(ivec2 c) {
  return mdMix((uint(c.x) * 0x0001f35bu) ^ mdMix(uint(c.y) + 0x9e3779b9u));
}
// градиент ячейки: два 16-битных куска хэша → вектор в квадрате [-1, 1]
vec2 mdGrad(ivec2 c) {
  uint h = mdCell(c);
  return vec2(float(h & 0xffffu), float((h >> 16u) & 0xffffu)) / 32767.5 - 1.0;
}
// градиентный шум, диапазон примерно [-0.7, 0.7]
float tdNoise(vec2 p) {
  vec2 fl = floor(p);
  ivec2 i = ivec2(fl);
  vec2 f = p - fl;
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(mdGrad(i), f);
  float b = dot(mdGrad(i + ivec2(1, 0)), f - vec2(1.0, 0.0));
  float c = dot(mdGrad(i + ivec2(0, 1)), f - vec2(0.0, 1.0));
  float d = dot(mdGrad(i + ivec2(1, 1)), f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
// поворот октав ≈ 35° (свой угол), чтобы узоры разных октав не складывались по осям
const mat2 mdTurn = mat2(0.82, -0.57, 0.57, 0.82);
float tdFbm3(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { s += a * tdNoise(p); p = mdTurn * p * 2.03; a *= 0.5; }
  return s * 1.6;
}
float tdFbm5(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * tdNoise(p); p = mdTurn * p * 2.01; a *= 0.5; }
  return s * 1.55;
}
`

export const heightGLSL = /* glsl */ `
${noiseGLSL}
uniform float uHills;     // высота холмов (2.6 — исходная)
uniform float uHillScale; // частота холмов
// Рельеф: FBM с доменным искажением + поперечные гряды.
// Мягкая сигмоида даёт пологие верхушки и более крутые склоны к низинам.
float terrainHeight(vec2 p, float t) {
  vec2 q = p * 0.03 * uHillScale;
  q.y *= 1.3;
  vec2 w = vec2(
    tdFbm3(q * 1.2 + vec2(1.7, 9.2) + vec2(t * 0.012, 0.0)),
    tdFbm3(q * 1.2 + vec2(8.3, 2.8) - vec2(0.0, t * 0.010))
  );
  q += w * 1.1;
  float n = tdFbm5(q);
  float bands = sin(q.y * 4.2 + n * 2.6 + t * 0.04);
  float s = n * 1.8 + bands * 0.55;
  float plateau = s / (0.75 + abs(s));
  return (plateau * 2.6 + n * 0.7) * (uHills / 2.6) + tdNoise(p * 0.21) * 0.25;
}
`
