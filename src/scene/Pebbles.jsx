import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CFG } from '../config.js'
import { noiseGLSL } from '../glsl/noise.js'
import { U, sampleHeightGLSL, cursorFieldGLSL } from './uniforms.js'

// Вся логика камня — в вершинном шейдере: заворот вокруг камеры,
// посадка на рельеф, редкая маска вдоль тропинок и берега, мягкий отклик на курсор.
const pebbleHead = /* glsl */ `
${sampleHeightGLSL}
${noiseGLSL}
attribute vec4 aSeed;
uniform vec2 uPebbleCenter;
uniform float uTile;
uniform float uTime;
uniform float uSea;
${cursorFieldGLSL}
mat3 tdRotation(vec3 a) {
  float cx = cos(a.x), sx = sin(a.x), cy = cos(a.y), sy = sin(a.y), cz = cos(a.z), sz = sin(a.z);
  mat3 rx = mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx);
  mat3 ry = mat3(cy, 0.0, -sy, 0.0, 1.0, 0.0, sy, 0.0, cy);
  mat3 rz = mat3(cz, sz, 0.0, -sz, cz, 0.0, 0.0, 0.0, 1.0);
  return ry * rx * rz;
}
`

const pebbleBody = /* glsl */ `
  float T = uTile;
  vec2 base = aSeed.xy * T;
  vec2 origin = uPebbleCenter - 0.5 * T;
  vec2 wxz = origin + mod(base - origin, T);
  vec2 fromC = abs(wxz - uPebbleCenter) / (0.5 * T);
  float edge = 1.0 - smoothstep(0.8, 1.0, max(fromC.x, fromC.y));

  float h = hfHeight(wxz);
  float sea = uSea;
  float r1 = aSeed.z;
  float r2 = aSeed.w;
  float r3 = fract(r2 * 13.17 + r1 * 3.1);

  // скопления вдоль тропинок и кромки воды
  float bands = 0.0;
  for (int k = 0; k < 2; k++) {
    float fk = float(k);
    float level = sea + 0.95 + fk * 1.15 + 0.1 * sin(uTime * 0.21 + fk * 1.7);
    float d = (h - level) / 0.18;
    bands += exp(-d * d) * (1.0 - fk * 0.3);
  }
  float ds = (h - (sea + 0.15)) / 0.2;
  float shoreBand = exp(-ds * ds);
  // редкие жилы камушков
  float veins = smoothstep(0.8, 0.97, 1.0 - abs(tdNoise(wxz * 0.085 + 4.0)) * 2.2);
  float mask = clamp(bands * 0.1 + shoreBand * 0.12 + veins * 0.18 + 0.006, 0.0, 1.0);

  // курсор: камни катятся на гребне волны и оседают, когда она прошла (cursorField)
  vec3 field = cursorField(wxz);
  vec2 push = field.xy;
  float stir = field.z;
  float jitter = 0.75 + 0.5 * r3;
  wxz += push * 0.9 * jitter;
  float lift = stir * (0.1 + 0.32 * fract(r1 * 31.7)) * jitter;
  if (stir > 0.0005) h = hfHeight(wxz);

  float under = smoothstep(sea - 0.05, sea + 0.08, h);
  float visible = step(r1, mask) * edge * under;
  float size = mix(0.04, 0.2, pow(fract(r2 * 3.7), 2.6)) * (0.85 + 0.4 * min(bands + shoreBand, 1.0));
  float sc = size * visible;

  // лёгкий крен на волне, без кувырков
  mat3 rot = tdRotation(vec3(r1 * 6.2832 + push.y * 0.6, r2 * 6.2832 + stir * (r3 - 0.5) * 0.8, r3 * 6.2832 - push.x * 0.6));
  vec3 transformed = rot * (position * vec3(1.0, 0.62, 0.85)) * sc
                   + vec3(wxz.x, h + sc * 0.3 + lift, wxz.y);
`

export function Pebbles() {
  const { geometry, material, depthMaterial } = useMemo(() => {
    // искажённый икосаэдр: индексированный, плоское затенение считается во фрагменте
    let g = new THREE.IcosahedronGeometry(1, 0)
    g.deleteAttribute('normal')
    g.deleteAttribute('uv')
    g = mergeVertices(g)
    const pos = g.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const k = 0.72 + Math.random() * 0.45
      pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k)
    }
    g.computeVertexNormals()

    const geometry = new THREE.InstancedBufferGeometry()
    geometry.index = g.index
    geometry.setAttribute('position', g.attributes.position)
    geometry.setAttribute('normal', g.attributes.normal)
    const seeds = new Float32Array(CFG.pebbles * 4)
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random()
    geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4))
    geometry.instanceCount = CFG.pebbles

    const uniforms = {
      uHeight: U.uHeight, uCenter: U.uCenter, uSize: U.uSize, uTexel: U.uTexel,
      uPebbleCenter: U.uPebbleCenter, uTile: U.uTile, uTime: U.uTime, uSea: U.uSea,
      uHead: U.uHead, uWaves: U.uWaves, uFieldBounds: U.uFieldBounds,
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.62,
      metalness: 0,
      flatShading: true,
    })
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${pebbleHead}\nvarying float vShade;`)
        .replace('#include <begin_vertex>', `${pebbleBody}\n vShade = 0.55 + 0.6 * pow(fract(r1 * 17.3 + r2), 1.4);`)
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vShade;')
        .replace(
          '#include <color_fragment>',
          '#include <color_fragment>\n diffuseColor.rgb = vec3(0.45, 0.43, 0.4) * vShade;'
        )
    }
    material.customProgramCacheKey = () => 'mw-pebbles'

    const depthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
    depthMaterial.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${pebbleHead}`)
        .replace('#include <begin_vertex>', pebbleBody)
    }
    depthMaterial.customProgramCacheKey = () => 'mw-pebbles-depth'

    return { geometry, material, depthMaterial }
  }, [])

  return (
    <mesh
      geometry={geometry}
      material={material}
      customDepthMaterial={depthMaterial}
      frustumCulled={false}
      castShadow
      receiveShadow
    />
  )
}
