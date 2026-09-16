import { useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CFG } from '../config.js'
import { U, cursorFieldGLSL } from './uniforms.js'

// Пылинки в воздухе: коробка вокруг камеры, заворот через mod, медленный дрейф
export function Dust() {
  const dpr = useThree((s) => s.viewport.dpr)
  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    const seeds = new Float32Array(CFG.dust * 3)
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CFG.dust * 3), 3))
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uCam: U.uCam, uTime: U.uTime, uDpr: { value: 1 },
        uHead: U.uHead, uWaves: U.uWaves, uFieldBounds: U.uFieldBounds,
      },
      vertexShader: /* glsl */ `
        attribute vec3 aSeed;
        uniform vec3 uCam;
        uniform float uTime;
        uniform float uDpr;
        ${cursorFieldGLSL}
        varying float vAlpha;
        void main() {
          vec3 box = vec3(56.0, 22.0, 56.0);
          vec3 p = aSeed * box;
          p += vec3(sin(uTime * 0.13 + aSeed.x * 40.0) * 1.2, uTime * (aSeed.y - 0.4) * 0.12, uTime * 0.35);
          vec3 origin = uCam - box * vec3(0.5, 0.65, 0.5);
          vec3 w = origin + mod(p - origin, box);
          // пыль мягко приподнимается волной курсора
          vec3 field = cursorField(w.xz);
          w.xz += field.xy * 1.2;
          w.y += field.z * (0.6 + 1.2 * aSeed.y);
          vec4 mv = viewMatrix * vec4(w, 1.0);
          gl_Position = projectionMatrix * mv;
          float big = pow(fract(aSeed.z * 9.13), 6.0);
          float size = (1.2 + 5.0 * big) * uDpr * 14.0 / -mv.z;
          // не меньше 2 px: субпиксельные точки мерцают между кадрами («белый шум»),
          // вместо уменьшения гасим яркость
          gl_PointSize = clamp(size, 2.0 * uDpr, 7.0 * uDpr);
          float tw = 0.75 + 0.25 * sin(uTime * (0.6 + aSeed.x * 1.2) + aSeed.y * 50.0);
          vAlpha = tw * min(size / (2.0 * uDpr), 1.0) * smoothstep(60.0, 20.0, -mv.z) * smoothstep(0.5, 2.0, -mv.z);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.1, d) * vAlpha;
          gl_FragColor = vec4(vec3(0.95, 0.93, 0.9) * a, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    return { geometry, material }
  }, [])

  material.uniforms.uDpr.value = dpr
  return <points geometry={geometry} material={material} frustumCulled={false} />
}
