const fs = require('fs')
const raw = fs.readFileSync('db/datosgeograficos.sql', 'utf8')
const blocks = raw.match(/INSERT INTO `corregimientos`[^;]+;/gs) ?? []
const re =
  /\((\d+),\s*'(\d{2})',\s*'([^']*)',\s*'(\d{2})',\s*'(\d{4})',\s*'([^']*)',\s*'(\d{2})',\s*'(\d{6})',\s*'([^']*)',\s*(\d+),\s*(\d+),\s*'([^']*)'\)/g
const rows = []
for (const block of blocks) {
  let m
  while ((m = re.exec(block))) {
    const codProv = m[2]
    const codDistrito = m[4]
    const codCorr = m[7]
    const computed = `${codProv}${codDistrito}${codCorr}`
    rows.push({
      id: Number(m[1]),
      stored: m[8],
      computed,
      nombre: m[9],
      distrito: m[6],
      codProvDist: m[5],
    })
  }
}
const byStored = new Map()
const byComputed = new Map()
for (const r of rows) {
  if (byStored.has(r.stored)) {
    console.log('DUP stored', r.stored, byStored.get(r.stored), r)
  } else byStored.set(r.stored, r)
  if (byComputed.has(r.computed)) {
    console.log('DUP computed', r.computed, byComputed.get(r.computed), r)
  } else byComputed.set(r.computed, r)
}
console.log('rows', rows.length, 'stored unique', byStored.size, 'computed unique', byComputed.size)
const badStored = rows.filter((r) => r.stored !== r.computed)
console.log('stored != computed', badStored.length)
badStored.forEach((r) =>
  console.log(` id ${r.id}: stored ${r.stored} computed ${r.computed} | ${r.distrito} / ${r.nombre}`),
)
