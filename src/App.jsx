import { Canvas } from '@react-three/fiber'
import { CFG } from './config.js'
import { CameraRig } from './scene/CameraRig.jsx'
import { HeightField } from './scene/HeightField.jsx'
import { Cursor } from './scene/Cursor.jsx'
import { Sun } from './scene/Sun.jsx'
import { Terrain } from './scene/Terrain.jsx'
import { Water } from './scene/Water.jsx'
import { Grass } from './scene/Grass.jsx'
import { Pebbles } from './scene/Pebbles.jsx'
import { Dust } from './scene/Dust.jsx'
import { Effects } from './scene/Effects.jsx'
import { Overlay } from './Overlay.jsx'
import { Adaptive } from './scene/Adaptive.jsx'

export default function App() {
  return (
    <>
      <Canvas
        className="stage"
        shadows={CFG.shadows}
        flat
        dpr={CFG.dpr}
        gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: CFG.preserveBuffer }}
        camera={{ fov: 40, near: 0.3, far: 400, position: [0, 30, 0] }}
      >
        <color attach="background" args={['#0a0908']} />
        <fogExp2 attach="fog" args={['#0a0908', 0.012]} />
        <CameraRig />
        <HeightField />
        <Cursor />
        <Sun />
        <Terrain />
        {!CFG.hide.has('water') && <Water />}
        {!CFG.hide.has('grass') && <Grass />}
        {!CFG.hide.has('pebbles') && <Pebbles />}
        {!CFG.hide.has('dust') && <Dust />}
        {CFG.effects && <Effects />}
        <Adaptive />
      </Canvas>
      <Overlay />
    </>
  )
}
