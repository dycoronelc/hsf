'use strict'

/**
 * Next.js empaqueta `http-proxy` en `dist/compiled/http-proxy` y ese código aún llama a
 * `util._extend` (DEP0060 en Node.js 22+). El aviso aparece en build/deploy aunque no usemos
 * ese API directamente. Ver: https://github.com/vercel/next.js/issues/74460
 * Arreglo upstream: https://github.com/vercel/next.js/pull/89614 (cuando llegue a la versión
 * de Next que desplieguen, este script no hará cambios si ya no encuentra el patrón).
 *
 * Sustituimos solo el acceso `_extend` del mock `r(837)` por `Object.assign`, equivalente
 * para las firmas usadas allí (mezcla de objetos planos).
 */

const fs = require('fs')
const path = require('path')

const target = path.join(
  __dirname,
  '..',
  'node_modules',
  'next',
  'dist',
  'compiled',
  'http-proxy',
  'index.js',
)

const NEEDLE = 'r(837)._extend'
const REPLACEMENT = 'Object.assign'

function main() {
  if (!fs.existsSync(target)) {
    return
  }
  const before = fs.readFileSync(target, 'utf8')
  if (!before.includes(NEEDLE)) {
    return
  }
  const after = before.split(NEEDLE).join(REPLACEMENT)
  if (after !== before) {
    fs.writeFileSync(target, after, 'utf8')
    process.stdout.write(
      '[fix-next-dep0060] Reemplazado util._extend en next/dist/compiled/http-proxy (DEP0060).\n',
    )
  }
}

main()
