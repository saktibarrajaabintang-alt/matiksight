import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { parseCorsOrigins } from './security/cors-origins';
import { SafeExceptionFilter } from './security/safe-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new SafeExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : false,
    credentials: corsOrigins.length > 0,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });
  const openApiConfig = new DocumentBuilder()
    .setTitle('MatikSight Backend API')
    .setDescription('Dataset upload, authentication, analysis, visualization, and saved artifacts API.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api', app, () => SwaggerModule.createDocument(app, openApiConfig), {
    jsonDocumentUrl: 'api-json',
    customSiteTitle: 'MatikSight API',
  });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
