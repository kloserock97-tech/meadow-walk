import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CFG } from '../config.js'
import { rig } from './CameraRig.jsx'
import { live } from './live.js'

// Солнце: высота над горизонтом и азимут — с панели (азимут 0° — прямо по ходу прогулки, к −Z).
// По умолчанию низко, «из глубины» кадра и справа, поэтому тени камней и травы тянутся к зрителю.
const DIR = new THREE.Vector3()
const RAD = Math.PI / 180

export function Sun() {
  const light = useRef()
  const sky = useRef()

  useFrame(() => {
    const l = light.current
    if (!l) return
    const el = THREE.MathUtils.clamp(live.sunHeight, 2, 89) * RAD
    const az = live.sunAngle * RAD
    DIR.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el))

    const f = rig.focus
    // привязка к текселю теневой карты убирает мерцание теней при полёте
    const step = 90 / CFG.shadowMap
    const fx = Math.round(f.x / step) * step
    const fz = Math.round(f.z / step) * step
    l.target.position.set(fx, 0, fz)
    l.position.set(fx + DIR.x * 80, DIR.y * 80, fz + DIR.z * 80)
    l.target.updateMatrixWorld()
    l.color.copy(live.sunColor)
    l.intensity = live.sunIntensity
    if (sky.current) sky.current.intensity = live.skyLight
  })

  return (
    <>
      <hemisphereLight ref={sky} args={['#a9a39a', '#1a1816', 0.45]} />
      <directionalLight
        ref={light}
        color="#f2ebe1"
        intensity={4.2}
        castShadow
        shadow-mapSize={[CFG.shadowMap, CFG.shadowMap]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.05}
        shadow-camera-left={-45}
        shadow-camera-right={45}
        shadow-camera-top={45}
        shadow-camera-bottom={-45}
        shadow-camera-near={1}
        shadow-camera-far={200}
      />
    </>
  )
}
