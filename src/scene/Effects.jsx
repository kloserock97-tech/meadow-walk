import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  EffectComposer,
  DepthOfField,
  Bloom,
  ChromaticAberration,
  Vignette,
  HueSaturation,
  BrightnessContrast,
  ToneMapping,
} from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import * as THREE from 'three'
import { CFG, timeline } from '../config.js'
import { GrainEffect } from './Grain.js'

const caOffset = new THREE.Vector2(0.0017, 0.0013)

// Цветокор: оптика (DOF, bloom, CA) → тон → десатурация → зерно, виньетка.
// Штатный Noise заменён на GrainEffect — он и давал мигающий белый шум.
export function Effects() {
  const dof = useRef()
  const off = CFG.fxOff
  const grain = useMemo(() => new GrainEffect({ amount: 0.045, rate: 24 }), [])

  useFrame(() => {
    const coc = dof.current?.cocMaterial
    if (coc) {
      // фокус чуть дальше центра кадра и широкий: размыт в основном передний план
      coc.focusDistance = timeline.focusDistance * 1.25
      coc.focusRange = timeline.focusDistance * 1.6
    }
  })

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      {CFG.dof && !off.has('dof') ? <DepthOfField ref={dof} focusDistance={30} focusRange={16} bokehScale={3.2} resolutionScale={0.5} /> : <></>}
      {!off.has('bloom') ? <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.62} luminanceSmoothing={0.2} radius={0.7} /> : <></>}
      {!off.has('ca') ? <ChromaticAberration offset={caOffset} radialModulation modulationOffset={0.35} /> : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <HueSaturation saturation={-0.55} />
      <BrightnessContrast brightness={-0.02} contrast={0.12} />
      {!off.has('grain') ? <primitive object={grain} /> : <></>}
      <Vignette offset={0.22} darkness={0.82} />
    </EffectComposer>
  )
}
