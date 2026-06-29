"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const typeorm_1 = require("typeorm");
const app_module_1 = require("./app.module");
const sync_geo_catalog_1 = require("./init/sync-geo-catalog");
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    try {
        const dataSource = app.get(typeorm_1.DataSource);
        await (0, sync_geo_catalog_1.syncGeoCatalog)(dataSource);
    }
    catch (error) {
        console.error('✗ Error sincronizando catálogo geo:', error);
        process.exitCode = 1;
    }
    finally {
        await app.close();
    }
}
bootstrap();
//# sourceMappingURL=sync-geo-cli.js.map