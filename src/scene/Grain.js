import { Effect, BlendFunction } from 'postprocessing'
import { Uniform } from 'three'

// Плёночное зерно без «мигания».
// Штатный Noise рисует полноэкранный белый шум заново каждый кадр и одинаково сильно
// по всему кадру — на тёмной сцене это читается как мерцание. Здесь:
//   • зерно только в полутонах (в чёрном и в светах почти нет),
//   • мягкое (сумма мелкого и крупного зерна, без резких белых пикселей),
//   • узор меняется ~24 раза в секунду, как у плёнки, а не каждый кадр монитора.
const grainFragment = /* glsl */ `
uniform float amount;
uniform float rate;

// целочисленное перемешивание lowbias32 (Chris Wellons, public domain)
uint grainMix(uint x) {
  x ^= x >> 16u;
  x *= 0x7feb352du;
  x ^= x >> 15u;
  x *= 0x846ca68bu;
  x ^= x >> 16u;
  return x;
}
float grainHash(uvec2 p, uint frame) {
  uint h = grainMix(p.x ^ grainMix(p.y ^ grainMix(frame)));
  return float(h & 0xffffu) / 65535.0;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  uint frame = uint(floor(time * rate));
  uvec2 px = uvec2(uv * resolution);
  float g = (grainHash(px, frame) + grainHash(px / 2u, frame + 7919u)) * 0.5 - 0.5;
  float lum = dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  float midtones = smoothstep(0.02, 0.25, lum) * (1.0 - smoothstep(0.6, 1.0, lum));
  outputColor = vec4(inputColor.rgb + g * amount * midtones, inputColor.a);
}
`

export class GrainEffect extends Effect {
  constructor({ amount = 0.05, rate = 24 } = {}) {
    super('GrainEffect', grainFragment, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['amount', new Uniform(amount)],
        ['rate', new Uniform(rate)],
      ]),
    })
  }
  set amount(v) {
    this.uniforms.get('amount').value = v
  }
}

// Экспозиция: умножение линейного цвета до тонмаппинга (ползунок «exposure»)
const exposureFragment = /* glsl */ `
uniform float exposure;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = vec4(inputColor.rgb * exposure, inputColor.a);
}
`

export class ExposureEffect extends Effect {
  constructor({ exposure = 1 } = {}) {
    super('ExposureEffect', exposureFragment, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([['exposure', new Uniform(exposure)]]),
    })
  }
  set exposure(v) {
    this.uniforms.get('exposure').value = v
  }
}
