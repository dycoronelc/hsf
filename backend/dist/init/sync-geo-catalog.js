"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repoRootFromBackend = repoRootFromBackend;
exports.syncGeoCatalog = syncGeoCatalog;
const fs = require("fs");
const path = require("path");
const GEO_SQL_FILES = [
    'db/datosgeograficos_postgres.sql',
    'db/migrations/20260525_geo_catalog_gaps.sql',
    'db/migrations/20260526_sync_geo_from_referencia.sql',
];
function repoRootFromBackend() {
    return path.join(process.cwd(), '..');
}
async function syncGeoCatalog(dataSource) {
    const root = repoRootFromBackend();
    for (const rel of GEO_SQL_FILES) {
        const filePath = path.join(root, rel);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Archivo SQL no encontrado: ${filePath}`);
        }
        const sql = fs.readFileSync(filePath, 'utf-8');
        console.log(`→ Sincronizando catálogo geo: ${rel}`);
        await dataSource.query(sql);
    }
    const [counts] = await dataSource.query(`
    SELECT
      (SELECT count(*)::int FROM provincias) AS provincias,
      (SELECT count(*)::int FROM distritos) AS distritos,
      (SELECT count(*)::int FROM corregimientos) AS corregimientos
  `);
    console.log(`✓ Catálogo geográfico operativo: ${counts.provincias} provincias, ${counts.distritos} distritos, ${counts.corregimientos} corregimientos`);
}
//# sourceMappingURL=sync-geo-catalog.js.map