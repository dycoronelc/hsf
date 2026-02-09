"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const express = require("express");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ limit: '50mb', extended: true }));
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const corsOrigins = [frontendUrl, 'http://localhost:3000', 'http://localhost:3001'];
    app.enableCors({
        origin: corsOrigins,
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.setGlobalPrefix('api');
    const port = parseInt(process.env.PORT || '8000', 10);
    await app.listen(port);
    console.log(`🚀 Backend running on port ${port}`);
    console.log(`📚 API Documentation: /api`);
}
bootstrap();
//# sourceMappingURL=main.js.map