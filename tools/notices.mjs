// Собирает THIRD_PARTY_NOTICES.md: production-зависимости с полными текстами лицензий
// плюс заимствованные алгоритмы. Запуск после обновления пакетов:
//   npx license-checker-rseidelsohn --production --json --excludePackages "meadow-walk@0.1.0" > lic.json
//   node tools/notices.mjs lic.json
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const list = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const out = []
out.push('# Third-party notices')
out.push('')
out.push('Meadow Walk is MIT-licensed (see `LICENSE`). It bundles or builds on the open-source software listed below.')
out.push('Each component keeps its own license; the full texts follow.')
out.push('')
out.push('## Algorithms')
out.push('')
out.push('- **lowbias32** integer hash — Chris Wellons, [hash-prospector](https://github.com/skeeto/hash-prospector), released into the public domain (Unlicense). Used in `src/glsl/noise.js`, `src/scene/terrainCPU.js`, `src/scene/Grain.js`.')
out.push('- Gradient noise, fractal Brownian motion and domain warping are long-established techniques; the implementation and constants in this repository are original.')
out.push('')
out.push('## Packages')
out.push('')
out.push('| Package | License | Repository |')
out.push('|---|---|---|')
const entries = Object.entries(list).sort(([a], [b]) => a.localeCompare(b))
for (const [name, info] of entries) {
  out.push(`| ${name} | ${info.licenses} | ${info.repository ?? ''} |`)
}
out.push('')
out.push('## License texts')
for (const [name, info] of entries) {
  out.push('')
  out.push(`### ${name}`)
  out.push('')
  const file = info.licenseFile
  const text = file && existsSync(file) && !/readme/i.test(file) ? readFileSync(file, 'utf8').trim() : null
  out.push('```')
  out.push(text ?? `${info.licenses} (license file not shipped in the package; see ${info.repository ?? 'the package page on npm'})`)
  out.push('```')
}
writeFileSync('THIRD_PARTY_NOTICES.md', out.join('\n') + '\n')
console.log(`THIRD_PARTY_NOTICES.md: ${entries.length} packages`)
