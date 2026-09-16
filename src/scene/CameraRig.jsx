import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CFG, timeline } from '../config.js'
import { U, seaLevel } from './uniforms.js'
import { terrainHeight } from './terrainCPU.js'
import { live } from './live.js'
import { settings } from '../settings.js'

// Бесконечная прогулка над лугом: без глав, петли и финала.
// Путь — медленные извилины; высота «дышит» между обзором сверху и полётом над самой травой;
// наклон камеры следует за высотой. Камера держится над землёй по JS-копии рельефа.

const smooth = (x) => x * x * (3 - 2 * x)

// извилины пути; амплитуда — «sway» с панели (16 — исходная)
function pathX(t) {
  const k = live.sway / 16
  return k * (16 * Math.sin(t * 0.029) + 6 * Math.sin(t * 0.071 + 1.3))
}

// Общие вычисленные величины кадра
export const rig = {
  focus: new THREE.Vector3(),
  dir: new THREE.Vector3(0, -1, 0), // направление взгляда
  focusDist: 30,
  fade: 0, // 0..1 затемнение туманом (только на старте)
}

const mouse = new THREE.Vector2()
const dir = new THREE.Vector3()
let groundSmooth = null
let walked = null // пройденный путь: скорость меняется без скачка позиции

export function CameraRig() {
  const { camera, scene, pointer } = useThree()

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20)
    const paused = settings.paused || timeline.paused
    if (!paused) timeline.t += dt
    const t = timeline.t
    const sea = seaLevel(t)

    // высота: медленное «дыхание» 3–19 ед. (период ~2,5 мин и ~1 мин)
    const breath = 0.5 + 0.5 * Math.sin(t * 0.042 + 1.9)
    const wobble = Math.sin(t * 0.105)
    let height = THREE.MathUtils.lerp(live.heightLow, Math.max(live.heightHigh, live.heightLow), smooth(breath)) + wobble * 1.6

    // курс — по касательной к пути
    const x = pathX(t) + mouse.x * 0.6
    if (walked === null) walked = t * live.walkSpeed
    if (!paused) walked += dt * live.walkSpeed
    const z = -walked
    const dx = pathX(t + 0.5) - pathX(t - 0.5)
    const heading = Math.atan2(dx, Math.max(live.walkSpeed, 0.3)) // 0 — строго вдоль −Z

    // над землёй: максимум рельефа под камерой и чуть впереди, со сглаживанием
    let ground = sea
    for (const ahead of [0, 4, 9]) {
      ground = Math.max(ground, terrainHeight(x + Math.sin(heading) * ahead, z - Math.cos(heading) * ahead, t))
    }
    if (groundSmooth === null) groundSmooth = ground
    groundSmooth += (ground - groundSmooth) * Math.min(1, dt * (ground > groundSmooth ? 3 : 0.8))
    height = Math.max(height, groundSmooth + 3.2)

    // наклон следует за высотой: низко — смотрим вдаль, высоко — вниз
    const lift = THREE.MathUtils.clamp((height - 4) / 15, 0, 1)
    const pitchDeg = THREE.MathUtils.lerp(-15, -62, smooth(lift)) + Math.sin(t * 0.13) * 2
    const yawDeg = THREE.MathUtils.radToDeg(heading) * 0.8 + Math.sin(t * 0.057) * live.lookAround

    // лёгкий параллакс от мыши
    mouse.lerp(pointer, 0.04)
    const pitch = THREE.MathUtils.degToRad(pitchDeg + mouse.y * 2.5)
    const yaw = THREE.MathUtils.degToRad(yawDeg - mouse.x * 4)

    camera.position.set(x, height, z)
    dir.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch))
    // точка фокуса: пересечение взгляда с условной поверхностью на уровне земли
    const above = Math.max(height - groundSmooth, 1)
    const dist = above / Math.max(-dir.y, 0.12)
    rig.focus.copy(camera.position).addScaledVector(dir, Math.min(dist, 70))
    camera.lookAt(rig.focus)
    timeline.focusDistance = Math.min(dist, 70)

    // центр карты высот — впереди камеры, привязан к текселю
    const texel = CFG.texel
    const ahead = new THREE.Vector2(dir.x, dir.z).normalize().multiplyScalar(CFG.worldSize * 0.28)
    U.uCenter.value.set(Math.round((x + ahead.x) / texel) * texel, Math.round((z + ahead.y) / texel) * texel)
    U.uPebbleCenter.value.set(rig.focus.x * 0.6 + x * 0.4, rig.focus.z * 0.6 + z * 0.4)
    rig.dir.copy(dir)
    rig.focusDist = Math.min(dist, 70)
    U.uCam.value.copy(camera.position)
    U.uTime.value = t
    U.uSea.value = sea

    // проявление из темноты при загрузке; дальше туман постоянный
    rig.fade = 1 - THREE.MathUtils.smoothstep(timeline.elapsed, 0, 2.5)
    // по реальному времени, без ограничения дельты: на медленной машине проявление не должно затягиваться
    timeline.elapsed += delta
    if (scene.fog) {
      scene.fog.density = THREE.MathUtils.lerp(live.haze, 0.09, rig.fade)
      scene.fog.color.copy(live.night)
      scene.background?.copy?.(live.night)
    }
  }, -2)

  return null
}
