"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    try {
        const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
        console.log('✓ Conexión a BD exitosa - tablas creadas (synchronize)');
        await app.close();
    }
    catch (error) {
        console.error('✗ Error al conectar a la base de datos:', error);
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=sync-db.js.map