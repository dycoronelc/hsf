/**
 * Compara ubicacion_geo.csv (catálogo operativo) contra db/datosgeograficos.sql (referencia TE).
 * Ejecutar: node scripts/compare-geo-catalog.js
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const raw = fs.readFileSync(path.join(root, 'db', 'datosgeograficos.sql'), 'utf8')

function norm(txt) {
  return String(txt ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\(cabecera\)\s*/gi, ' ')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function parseProvincias() {
  const block = raw.match(/INSERT INTO `cat_provincias`[^;]+;/s)?.[0] ?? ''
  return [...block.matchAll(/\(\d+,\s*\d+,\s*'([^']*)'\)/g)].map((m) => ({
    nombre: m[1],
    norm: norm(m[1]),
  }))
}

function parseDistritos() {
  const block = raw.match(/INSERT INTO `distritos`[^;]+;/s)?.[0] ?? ''
  return [...block.matchAll(/\(\d+,\s*\d+,\s*'([^']*)',\s*\d+,\s*'([^']*)'/g)].map((m) => ({
    provincia: m[1],
    nombre: m[2],
    key: `${norm(m[1])}|${norm(m[2])}`,
  }))
}

function parseCorregimientos() {
  const blocks = raw.match(/INSERT INTO `corregimientos`[^;]+;/gs) ?? []
  const rows = []
  const re =
    /\(\d+,\s*'(\d{2})',\s*'([^']*)',\s*'(\d{2})',\s*'(\d{4})',\s*'([^']*)',\s*'(\d{2})',\s*'(\d{6})',\s*'([^']*)'/g
  for (const block of blocks) {
    let match
    while ((match = re.exec(block))) {
      rows.push({
        provincia: match[2],
        distrito: match[5],
        nombre: match[8],
        key: `${norm(match[2])}|${norm(match[5])}|${norm(match[8])}`,
      })
    }
  }
  return rows
}

function parseCsv() {
  const lines = fs.readFileSync(path.join(root, 'ubicacion_geo.csv'), 'utf8').split('\n').slice(1)
  const provs = new Map()
  const dists = new Set()
  const corrs = new Set()
  for (const line of lines) {
    if (!line.trim()) continue
    const [, , , provinciaName, , distritoName, , corregimiento] = line.split(',').map((s) => s.trim())
    provs.set(norm(provinciaName), provinciaName)
    dists.add(`${norm(provinciaName)}|${norm(distritoName)}`)
    corrs.add(`${norm(provinciaName)}|${norm(distritoName)}|${norm(corregimiento)}`)
  }
  return { provs, dists, corrs }
}

const refProv = parseProvincias()
const refDist = parseDistritos()
const refCorr = parseCorregimientos()
const app = parseCsv()

const missProv = refProv.filter((p) => !app.provs.has(p.norm))
const missDist = refDist.filter((d) => !app.dists.has(d.key))
const missCorr = refCorr.filter((c) => !app.corrs.has(c.key))

console.log('=== Catálogo geográfico: referencia TE vs ubicacion_geo.csv ===\n')
console.log('Referencia (datosgeograficos.sql):', refProv.length, 'provincias,', refDist.length, 'distritos,', refCorr.length, 'corregimientos')
console.log('Aplicación (ubicacion_geo.csv):   ', app.provs.size, 'provincias,', app.dists.size, 'distritos,', app.corrs.size, 'corregimientos')
console.log('')
console.log('Faltantes en CSV/aplicación:')
console.log('  Provincias:      ', missProv.length)
console.log('  Distritos:       ', missDist.length)
console.log('  Corregimientos:  ', missCorr.length)

if (missProv.length) {
  console.log('\nProvincias faltantes:')
  missProv.forEach((p) => console.log('  -', p.nombre))
}
if (missDist.length) {
  console.log('\nDistritos faltantes (primeros 20):')
  missDist.slice(0, 20).forEach((d) => console.log('  -', d.provincia, '/', d.nombre))
  if (missDist.length > 20) console.log(`  ... y ${missDist.length - 20} más`)
}
if (missCorr.length) {
  console.log('\nCorregimientos faltantes (primeros 20):')
  missCorr.slice(0, 20).forEach((c) => console.log('  -', c.provincia, '/', c.distrito, '/', c.nombre))
  if (missCorr.length > 20) console.log(`  ... y ${missCorr.length - 20} más`)
}

if (!missProv.length && !missDist.length && !missCorr.length) {
  console.log('\n✓ Por nombre, el CSV cubre todo el catálogo de referencia TE.')
} else {
  console.log('\n⚠ Hay brechas. Ejecute db/validacion_geo_catalogo.sql en PostgreSQL para el detalle completo.')
}
