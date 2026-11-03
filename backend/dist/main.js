"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const cors_origins_1 = require("./security/cors-origins");
const safe_exception_filter_1 = require("./security/safe-exception.filter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalFilters(new safe_exception_filter_1.SafeExceptionFilter());
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    const corsOrigins = (0, cors_origins_1.parseCorsOrigins)(process.env.CORS_ORIGINS);
    app.enableCors({
        origin: corsOrigins.length ? corsOrigins : false,
        credentials: corsOrigins.length > 0,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Authorization', 'Content-Type'],
    });
    const openApiConfig = new swagger_1.DocumentBuilder()
        .setTitle('MatikSight Backend API')
        .setDescription('Dataset upload, authentication, analysis, visualization, and saved artifacts API.')
        .setVersion('1.0.0')
        .addBearerAuth()
        .build();
    swagger_1.SwaggerModule.setup('api', app, () => swagger_1.SwaggerModule.createDocument(app, openApiConfig), {
        jsonDocumentUrl: 'api-json',
        customSiteTitle: 'MatikSight API',
    });
    await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
//# sourceMappingURL=main.js.map