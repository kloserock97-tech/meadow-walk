// Запись того, что реально видит зритель, в НАСТОЯЩЕМ Chrome через CDP:
// кадры скринкаста + журнал страницы (уровень качества, размер канваса, длинные кадры).
// Node ≥ 22, без зависимостей. Chrome с --remote-debugging-port=9340 (см. cdp-fps.mjs).
//
// node tools/cdp-record.mjs --query "t=0" --seconds 20 --out <папка> [--mouse]

const args = process.argv.slice(2)
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : (args[i + 1] ?? true) }
const PORT = opt('port', 9340)
const SECONDS = Number(opt('seconds', 20))
const OUT = opt('out', 'record')
const MOUSE = args.includes('--mouse')
const { mkdir, writeFile } = await import('node:fs/promises')
await mkdir(OUT, { recursive: true })

const keepAlive = setInterval(() => {}, 1000) // глобальный WebSocket не держит процесс живым
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
const target = targets.find((t) => t.type === 'page')
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
const frames = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return }
  if (m.method === 'Page.screencastFrame') {
    const { data, metadata, sessionId } = m.params
    frames.push({ t: metadata.timestamp, data })
    ws.send(JSON.stringify({ id: ++id, method: 'Page.screencastFrameAck', params: { sessionId } }))
  }
}
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const evalJs = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

await send('Page.bringToFront')
await send('Page.navigate', { url: `http://127.0.0.1:5317/?${opt('query', 't=0')}` })
await sleep(3000)

// журнал в странице: каждый кадр — дельта, уровень качества, размер канваса
await evalJs(`(() => {
  const log = window.__rec = []
  let last = performance.now()
  const start = last
  let prev = ''
  const loop = (now) => {
    const c = document.querySelector('canvas')
    const size = c ? c.width + 'x' + c.height : '-'
    const level = window.__perf?.level
    const dt = now - last
    const key = size + '|' + level
    if (dt > 40 || key !== prev) log.push({ at: +((now - start) / 1000).toFixed(3), dt: +dt.toFixed(1), size, level, fps: window.__perf?.fps, t: +window.__meadow.t.toFixed(2) })
    prev = key
    last = now
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
  window.__recStart = Date.now()
})()`)

await send('Page.startScreencast', { format: 'jpeg', quality: 70, maxWidth: 1000, everyNthFrame: 1 })
const t0 = Date.now()
while (Date.now() - t0 < SECONDS * 1000) {
  if (MOUSE) {
    const k = (Date.now() - t0) / 1000
    const x = 700 + Math.sin(k * 1.3) * 500
    const y = 700 + Math.cos(k * 0.9) * 250
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
  }
  await sleep(33)
}
await send('Page.stopScreencast')
const log = await evalJs('window.__rec')

const t00 = frames[0]?.t ?? 0
for (let i = 0; i < frames.length; i++) {
  await writeFile(`${OUT}/f_${String(i).padStart(4, '0')}.jpg`, Buffer.from(frames[i].data, 'base64'))
}
await writeFile(`${OUT}/frames.json`, JSON.stringify(frames.map((f, i) => ({ i, at: +(f.t - t00).toFixed(3) })), null, 1))
await writeFile(`${OUT}/log.json`, JSON.stringify(log, null, 1))
console.log(JSON.stringify({ frames: frames.length, events: log.length, log: log.slice(0, 40) }, null, 1))
ws.close()
clearInterval(keepAlive)
