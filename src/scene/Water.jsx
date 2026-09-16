import { useMemo } from 'react'
import * as THREE from 'three'
import { CFG } from '../config.js'
import { useFrame } from '@react-three/fiber'
import { U } from './uniforms.js'
import { live } from './live.js'

// Озерца: почти чёрная гладь на уровне воды, к скользящему углу чуть светлеет.
export function Water() {
  const material = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ color: 0x050807 })
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, { uCenter: U.uCenter, uSea: U.uSea, uCam: U.uCam })
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform vec2 uCenter;\nuniform float uSea;\nvarying vec3 vWaterPos;')
        .replace(
          '#include <begin_vertex>',
          'vec3 transformed = vec3(position.x + uCenter.x, uSea, position.z + uCenter.y);\nvWaterPos = transformed;'
        )
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uCam;\nvarying vec3 vWaterPos;')
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
          vec3 v = normalize(uCam - vWaterPos);
          float fres = pow(1.0 - clamp(v.y, 0.0, 1.0), 4.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.1, 0.095), fres * 0.6);`
        )
    }
    m.customProgramCacheKey = () => 'mw-water'
    return m
  }, [])

  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(CFG.worldSize, CFG.worldSize, 1, 1)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])

  useFrame(() => material.color.copy(live.water))
  return <mesh geometry={geometry} material={material} frustumCulled={false} />
}
