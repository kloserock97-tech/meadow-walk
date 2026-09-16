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
import { GrainEffect, ExposureEffect } from './Grain.js'
import { live } from './live.js'

const caOffset = new THREE.Vector2(0.0017, 0.0013)

// Цветокор: экспозиция → оптика (DOF, bloom, CA) → тон → насыщенность и контраст → зерно, виньетка.
// Все величины — с панели: пишем их в эффекты каждый кадр, без перерисовки React.
export function Effects() {
  const dof = useRef()
  const bloom = useRef()
  const sat = useRef()
  const bc = useRef()
  const vig = useRef()
  const off = CFG.fxOff
  const grain = useMemo(() => new GrainEffect({ amount: 0.045, rate: 24 }), [])
  const exposure = useMemo(() => new ExposureEffect(), [])

  useFrame(() => {
    const coc = dof.current?.cocMaterial
    if (coc) {
      // фокус чуть дальше центра кадра и широкий: размыт в основном передний план
      coc.focusDistance = timeline.focusDistance * 1.25
      coc.focusRange = timeline.focusDistance * 1.6
      dof.current.bokehScale = live.focusBlur
    }
    if (bloom.current) bloom.current.intensity = live.bloom
    if (sat.current) sat.current.saturation = live.saturation
    if (bc.current) bc.current.contrast = live.contrast
    if (vig.current) vig.current.darkness = live.vignette
    caOffset.set(0.0017, 0.0013).multiplyScalar(live.aberration)
    grain.amount = live.grain
    exposure.exposure = live.exposure
  })

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <primitive object={exposure} />
      {CFG.dof && !off.has('dof') ? <DepthOfField ref={dof} focusDistance={30} focusRange={16} bokehScale={3.2} resolutionScale={0.5} /> : <></>}
      {!off.has('bloom') ? <Bloom ref={bloom} mipmapBlur intensity={0.55} luminanceThreshold={0.62} luminanceSmoothing={0.2} radius={0.7} /> : <></>}
      {!off.has('ca') ? <ChromaticAberration offset={caOffset} radialModulation modulationOffset={0.35} /> : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <HueSaturation ref={sat} saturation={-0.55} />
      <BrightnessContrast ref={bc} brightness={-0.02} contrast={0.12} />
      {!off.has('grain') ? <primitive object={grain} /> : <></>}
      <Vignette ref={vig} offset={0.22} darkness={0.82} />
    </EffectComposer>
  )
}
