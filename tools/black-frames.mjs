// Поиск «чёрных вспышек» в записи cdp-record.mjs: кадр, резко темнее соседей.
// node tools/black-frames.mjs <папка записи>   (нужен ffmpeg в PATH или FFMPEG=путь)
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = process.argv[2]
const ffmpeg = process.env.FFMPEG || 'ffmpeg'
execFileSync(ffmpeg, ['-v', 'error', '-y', '-framerate', '30', '-i', 'f_%04d.jpg',
  '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=yavg.txt',
  '-f', 'null', '-'], { cwd: dir }) // относительный путь: двоеточие диска ломает синтаксис фильтра
const v = []
let n = -1
for (const l of readFileSync(join(dir, 'yavg.txt'), 'utf8').split(/\r?\n/)) {
  const f = l.match(/frame:(\d+)/)
  if (f) n = +f[1]
  const y = l.match(/YAVG=([\d.]+)/)
  if (y) v[n] = +y[1]
}
const frames = JSON.parse(readFileSync(join(dir, 'frames.json'), 'utf8'))
const hits = []
for (let i = 1; i < v.length - 1; i++) {
  const nb = (v[i - 1] + v[i + 1]) / 2
  if (nb - v[i] > 6) hits.push({ frame: i, at: frames[i]?.at, y: +v[i].toFixed(1), neighbours: +nb.toFixed(1) })
}
console.log(JSON.stringify({ frames: v.length, blackFlashes: hits.length, hits }, null, 1))
