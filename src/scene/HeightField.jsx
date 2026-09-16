import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CFG } from '../config.js'
import { heightGLSL } from '../glsl/noise.js'
import { U } from './uniforms.js'

// Каждый кадр рисует карту высот вокруг камеры в float-текстуру.
// Рельеф, камни и тени её только читают — дорогой шум считается один раз.
export function HeightField() {
  const gl = useThree((s) => s.gl)
  const { rt, scene, cam } = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(CFG.heightRes, CFG.heightRes, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    })
    rt.texture.generateMipmaps = false
    const mat = new THREE.ShaderMaterial({
      uniforms: { uCenter: U.uCenter, uSize: U.uSize, uTime: U.uTime, uHills: U.uHills, uHillScale: U.uHillScale },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform vec2 uCenter; uniform float uSize; uniform float uTime;
        varying vec2 vUv;
        ${heightGLSL}
        void main() {
          vec2 p = uCenter + (vUv - 0.5) * uSize;
          gl_FragColor = vec4(terrainHeight(p, uTime), 0.0, 0.0, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    })
    const scene = new THREE.Scene()
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
    quad.frustumCulled = false
    scene.add(quad)
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    U.uHeight.value = rt.texture
    return { rt, scene, cam }
  }, [])

  useEffect(() => () => rt.dispose(), [rt])

  useFrame(() => {
    const prev = gl.getRenderTarget()
    gl.setRenderTarget(rt)
    gl.render(scene, cam)
    gl.setRenderTarget(prev)
  }, -1)

  return null
}
