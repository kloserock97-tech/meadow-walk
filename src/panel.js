import GUI from './panel/panel.js'
import { DEFAULTS, PRESETS, settings, writeUrl } from './settings.js'
import { ambience } from './ambience.js'
import { perf } from './scene/perf.js'

// Панель: каждый ползунок пишет в settings, сцена подхватывает сама (live.js плавно догоняет).
export function createPanel() {
  const gui = new GUI({ title: 'Meadow Walk', repo: 'https://github.com/kloserock97-tech/meadow-walk', theme: 'dark', onReset: () => load(DEFAULTS) })
  const save = () => writeUrl()

  const walk = gui.addFolder('Walk')
  walk.add(settings, 'walkSpeed', 0, 8, 0.05).name('speed').onChange(save)
  walk.add(settings, 'heightLow', 3, 20, 0.1).name('lowest flight').onChange(save)
  walk.add(settings, 'heightHigh', 3, 40, 0.1).name('highest flight').onChange(save)
  walk.add(settings, 'sway', 0, 40, 0.5).name('path sway').onChange(save)
  walk.add(settings, 'lookAround', 0, 30, 0.5).name('look around').onChange(save)
  walk.add(settings, 'paused').name('freeze time').onChange(save).listen()

  const land = gui.addFolder('Meadow')
  land.add(settings, 'hills', 0, 6, 0.05).name('hill height').onChange(save)
  land.add(settings, 'hillScale', 0.4, 2.5, 0.01).name('hill frequency').onChange(save)
  land.add(settings, 'waterLevel', -4, 1, 0.01).name('water level').onChange(save)
  land.addColor(settings, 'lush').name('lowland grass').onChange(save)
  land.addColor(settings, 'meadow').name('slope grass').onChange(save)
  land.addColor(settings, 'dry').name('dry crests').onChange(save)
  land.addColor(settings, 'rock').name('rock').onChange(save)
  land.addColor(settings, 'path').name('paths').onChange(save)
  land.addColor(settings, 'water').name('ponds').onChange(save)

  const grass = gui.addFolder('Grass')
  grass.add(settings, 'grassDensity', 0.05, 1, 0.01).name('density').onChange(save)
  grass.add(settings, 'bladeHeight', 0.2, 3, 0.01).name('blade height').onChange(save)
  grass.add(settings, 'bladeWidth', 0.3, 3, 0.01).name('blade width').onChange(save)
  grass.add(settings, 'wind', 0, 3, 0.01).name('wind strength').onChange(save)
  grass.add(settings, 'windSpeed', 0, 4, 0.01).name('wind speed').onChange(save)
  grass.addColor(settings, 'grassRoot').name('roots').onChange(save)
  grass.addColor(settings, 'grassTip').name('tips').onChange(save)
  grass.addColor(settings, 'grassDry').name('dry tips').onChange(save)

  const stones = gui.addFolder('Stones')
  stones.add(settings, 'stones', 0, 5, 0.05).name('amount').onChange(save)
  stones.add(settings, 'stoneSize', 0.2, 4, 0.05).name('size').onChange(save)
  stones.addColor(settings, 'stoneColor').name('colour').onChange(save)

  const air = gui.addFolder('Light and air')
  air.add(settings, 'sunHeight', 2, 80, 0.5).name('sun height').onChange(save)
  air.add(settings, 'sunAngle', -180, 180, 1).name('sun direction').onChange(save)
  air.addColor(settings, 'sunColor').name('sun colour').onChange(save)
  air.add(settings, 'sunIntensity', 0, 10, 0.05).name('sun strength').onChange(save)
  air.add(settings, 'skyLight', 0, 3, 0.01).name('sky light').onChange(save)
  air.addColor(settings, 'night').name('sky and haze').onChange(save)
  air.add(settings, 'haze', 0, 0.06, 0.001).name('haze').onChange(save)
  air.add(settings, 'dust', 0, 2, 0.01).name('dust amount').onChange(save)
  air.add(settings, 'dustSize', 0.3, 3, 0.01).name('dust size').onChange(save)

  const cursor = gui.addFolder('Cursor waves')
  cursor.add(settings, 'waveStrength', 0, 3, 0.01).name('strength').onChange(save)
  cursor.add(settings, 'waveSpeed', 0.5, 8, 0.05).name('speed').onChange(save)
  cursor.add(settings, 'waveLife', 0.8, 6, 0.05).name('how long they last').onChange(save)

  const look = gui.addFolder('Look')
  look.add(settings, 'exposure', 0.2, 3, 0.01).name('exposure').onChange(save)
  look.add(settings, 'saturation', -1, 1, 0.01).name('saturation').onChange(save)
  look.add(settings, 'contrast', -0.5, 0.5, 0.01).name('contrast').onChange(save)
  look.add(settings, 'bloom', 0, 2, 0.01).name('bloom').onChange(save)
  look.add(settings, 'focusBlur', 0, 8, 0.05).name('foreground blur').onChange(save)
  look.add(settings, 'aberration', 0, 4, 0.01).name('lens fringing').onChange(save)
  look.add(settings, 'grain', 0, 0.2, 0.001).name('film grain').onChange(save)
  look.add(settings, 'vignette', 0, 1.2, 0.01).name('vignette').onChange(save)

  const view = gui.addFolder('View')
  view.add(settings, 'lines').name('lines over the field').onChange(save)
  view.add(settings, 'sound').name('wind sound').onChange((on) => ambience.set(on)).listen()
  view.add(settings, 'adaptive').name('adaptive quality').onChange(save)

  const actions = {
    preset: 'dusk',
    copyLink: async () => {
      writeUrl()
      try {
        await navigator.clipboard.writeText(location.href)
        toast('Link copied')
      } catch {
        toast('Copy failed, the address bar has it')
      }
    },
    copySettings: async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(settings, null, 2))
        toast('Settings copied')
      } catch {
        toast('Copy failed')
      }
    },
  }

  gui.add(actions, 'preset', Object.keys(PRESETS)).name('preset').onChange((key) => load({ ...DEFAULTS, ...PRESETS[key] }))
  gui.add(actions, 'copyLink').name('copy link to this meadow')
  gui.add(actions, 'copySettings').name('copy settings as JSON')

  function load(next) {
    const sound = settings.sound // звук — не часть «вида», пресет его не трогает
    Object.assign(settings, next, { sound })
    gui.controllersRecursive().forEach((controller) => controller.updateDisplay())
    writeUrl()
  }

  /* ── toast, stats, keys ── */
  const note = document.createElement('p')
  note.className = 'toast'
  document.body.appendChild(note)
  let noteTimer = 0
  function toast(text) {
    note.textContent = text
    note.classList.add('is-on')
    clearTimeout(noteTimer)
    noteTimer = setTimeout(() => note.classList.remove('is-on'), 1600)
  }

  const stats = document.createElement('p')
  stats.className = 'stats'
  document.body.appendChild(stats)
  let frames = 0
  let fpsAt = performance.now()
  const count = (now) => {
    frames++
    if (now - fpsAt > 500) {
      stats.textContent = `${Math.round((frames * 1000) / (now - fpsAt))} fps · quality ${5 - perf.level}/5`
      frames = 0
      fpsAt = now
    }
    requestAnimationFrame(count)
  }
  requestAnimationFrame(count)

  addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement) return
    if (event.key === 'h' || event.key === 'H') gui.show(gui._hidden)
    if (event.code === 'Space') {
      event.preventDefault()
      settings.paused = !settings.paused
      writeUrl()
    }
    if (event.key === 'm' || event.key === 'M') {
      settings.sound = !settings.sound
      ambience.set(settings.sound)
    }
  })

  return gui
}
