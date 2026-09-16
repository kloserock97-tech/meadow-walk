// Замер FPS в НАСТОЯЩЕМ Chrome через CDP (Playwright даёт ложный потолок ~19 fps).
// Node ≥ 22, без зависимостей.
//
// 1. Chrome с портом отладки:
//    chrome.exe --remote-debugging-port=9340 --remote-allow-origins=* --user-data-dir=%TEMP%\tides-perf ^
//      --disable-features=CalculateNativeWinOcclusion --disable-backgrounding-occluded-windows ^
//      --disable-renderer-backgrounding --disable-background-timer-throttling --start-maximized about:blank
// 2. node tools/cdp-fps.mjs --query "t=15&adaptive=0&level=0" [--seconds 8] [--port 9340]

const args = process.argv.slice(2)
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i === -1 ? def : (args[i + 1] ?? true) }
const PORT = opt('port', 9340)
const SECONDS = Number(opt('seconds', 8))
const QUERY = opt('query', '')
const URL = `http://127.0.0.1:5317/?${QUERY}`

const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
const target = targets.find((t) => t.type === 'page')
if (!target) { console.error('Нет вкладки'); process.exit(1) }

const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
let id = 0
const pending = new Map()
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } }
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const evalJs = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, timeout: 120000 })).result?.result?.value

await send('Page.bringToFront')
await send('Page.navigate', { url: URL })
await new Promise((r) => setTimeout(r, 6000)) // загрузка + компиляция шейдеров + прогрев

const result = await evalJs(`(async () => {
  const seconds = ${SECONDS}
  const times = []
  let last = performance.now()
  const start = last
  await new Promise((resolve) => {
    const loop = (now) => {
      times.push(now - last); last = now
      if (now - start < seconds * 1000) requestAnimationFrame(loop); else resolve()
    }
    requestAnimationFrame(loop)
  })
  times.shift()
  const sorted = times.slice().sort((a, b) => a - b)
  const q = (p) => sorted[Math.floor(p * (sorted.length - 1))]
  const canvas = document.querySelector('canvas')
  return {
    url: location.search,
    fps: +(times.length / (times.reduce((a, b) => a + b, 0) / 1000)).toFixed(1),
    frameMs: { p50: +q(0.5).toFixed(2), p95: +q(0.95).toFixed(2), max: +q(1).toFixed(2) },
    perfLevel: window.__perf?.level,
    canvas: canvas ? [canvas.width, canvas.height] : null,
    dpr: devicePixelRatio,
    visibility: document.visibilityState,
  }
})()`)

console.log(JSON.stringify(result, null, 2))

const SHOT = opt('shot', null) // --shot path.jpg — кадр из того же Chrome (проверка, что сцена реально рисуется)
if (SHOT) {
  const { writeFile } = await import('node:fs/promises')
  const r = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 })
  await writeFile(SHOT, Buffer.from(r.result.data, 'base64'))
}
ws.close()
