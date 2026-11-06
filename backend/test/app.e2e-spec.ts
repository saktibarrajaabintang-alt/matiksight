import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as XLSX from 'xlsx';
import { AppModule } from './../src/app.module';
import { DatasetProcessingService } from '../src/datasets/dataset-processing.service';
import { DatasetsService } from '../src/datasets/datasets.service';
import { UploadService } from '../src/upload/upload.service';
import { JwtService } from '@nestjs/jwt';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SafeExceptionFilter } from '../src/security/safe-exception.filter';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let authToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatasetsService)
      .useFactory({ factory: (processing: DatasetProcessingService) => ({ create: (_userId: string, file?: any) => processing.process(file) }), inject: [DatasetProcessingService] })
      .overrideProvider(UploadService)
      .useValue({
        upload: (_userId: string, file?: any) => ({
          success: true,
          message: 'File berhasil diterima.',
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new SafeExceptionFilter());
    const swaggerConfig = new DocumentBuilder().setTitle('Test API').setVersion('1').addBearerAuth().build();
    SwaggerModule.setup('api', app, () => SwaggerModule.createDocument(app, swaggerConfig), { jsonDocumentUrl: 'api-json' });
    await app.init();
    authToken = await app.get(JwtService).signAsync({ sub: '00000000-0000-4000-8000-000000000001' });
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({
      success: true,
      message: 'MatikSight Backend is running!',
      status: 'healthy',
      timestamp: expect.any(String),
    });
    expect(new Date(response.body.timestamp).toISOString()).toBe(
      response.body.timestamp,
    );
  });

  it('serves an OpenAPI document for the complete API surface', async () => {
    const response = await request(app.getHttpServer()).get('/api-json').expect(200);
    expect(response.body.paths).toHaveProperty('/datasets/{id}/analysis');
    expect(response.body.paths).toHaveProperty('/datasets/{id}/aggregate');
    expect(response.body.paths['/upload'].post.security).toEqual([{ bearer: [] }]);
    expect(response.body.paths).toHaveProperty('/visualizations');
    expect(response.body.paths).toHaveProperty('/reports');
    expect(response.body.components.securitySchemes.bearer).toBeDefined();
  });

  it('documents every route with success/error schemas, request examples, and JWT requirements', async () => {
    const response = await request(app.getHttpServer()).get('/api-json').expect(200);
    const paths = response.body.paths;
    const expectedOperations: Array<[string, string]> = [
      ['/', 'get'], ['/health', 'get'],
      ['/auth/register', 'post'], ['/auth/login', 'post'], ['/auth/me', 'get'],
      ['/upload', 'post'],
      ['/datasets', 'post'], ['/datasets', 'get'], ['/datasets/{id}', 'get'],
      ['/datasets/{id}', 'delete'], ['/datasets/{id}/preview', 'get'],
      ['/datasets/{id}/analysis', 'get'], ['/datasets/{id}/aggregate', 'post'],
      ['/datasets/{id}/visualizations/data', 'post'],
      ['/visualizations', 'post'], ['/visualizations', 'get'],
      ['/visualizations/{id}', 'get'], ['/visualizations/{id}', 'patch'], ['/visualizations/{id}', 'delete'],
      ['/reports', 'post'], ['/reports', 'get'],
      ['/reports/{id}', 'get'], ['/reports/{id}', 'patch'], ['/reports/{id}', 'delete'],
    ];
    const protectedOperations = new Set([
      'get /auth/me', 'post /upload', 'post /datasets', 'get /datasets',
      'get /datasets/{id}', 'delete /datasets/{id}', 'get /datasets/{id}/preview',
      'get /datasets/{id}/analysis', 'post /datasets/{id}/aggregate',
      'post /datasets/{id}/visualizations/data', 'post /visualizations',
      'get /visualizations', 'get /visualizations/{id}', 'patch /visualizations/{id}',
      'delete /visualizations/{id}', 'post /reports', 'get /reports',
      'get /reports/{id}', 'patch /reports/{id}', 'delete /reports/{id}',
    ]);
    for (const [path, method] of expectedOperations) {
      const operation = paths[path]?.[method];
      expect(operation).toBeDefined();
      expect(operation.summary).toBeTruthy();
      const success = Object.entries(operation.responses).find(([status]) => !['400', '401', '404', '409', '413', '415', '429', '500'].includes(status))?.[1] as any;
      expect(success).toBeDefined();
      expect(success.description).toBeTruthy();
      const successContent = Object.values(success.content ?? {}) as any[];
      expect(successContent.some((content) => content.schema?.example !== undefined)).toBe(true);
      for (const status of ['400', '401', '404', '409', '413', '415', '429', '500']) {
        if (operation.responses[status]) {
          expect(operation.responses[status].content['application/json'].schema.properties.statusCode).toBeDefined();
          expect(operation.responses[status].content['application/json'].schema.example.statusCode).toBe(Number(status));
        }
      }
      const key = `${method} ${path}`;
      if (protectedOperations.has(key)) expect(operation.security).toEqual([{ bearer: [] }]);
      else expect(operation.security).toBeUndefined();
    }
    for (const path of ['/datasets', '/datasets/{id}/preview', '/visualizations', '/reports']) {
      expect(paths[path].get.parameters.map((parameter: any) => parameter.name)).toEqual(expect.arrayContaining(['page', 'limit']));
    }
    expect(paths['/datasets'].get.parameters.map((parameter: any) => parameter.name)).toContain('search');
    expect(paths['/visualizations'].post.requestBody.content['application/json'].schema.example.configuration.chartType).toBe('bar');
    expect(paths['/datasets/{id}/aggregate'].post.requestBody.content['application/json'].schema.example.metrics).toBeDefined();
    expect(paths['/upload'].post.requestBody.content['multipart/form-data'].schema.properties.file.format).toBe('binary');
  });

  it('requires JWT authentication for POST /upload and preserves its response contract', async () => {
    const content = Buffer.from('a,b');
    await request(app.getHttpServer()).post('/upload')
      .attach('file', content, { filename: 'legacy.csv', contentType: 'text/csv' })
      .expect(401);
    await request(app.getHttpServer()).post('/upload')
      .set('Authorization', 'Bearer invalid.token.value')
      .attach('file', content, { filename: 'legacy.csv', contentType: 'text/csv' })
      .expect(401);
    const response = await request(app.getHttpServer()).post('/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', content, { filename: 'legacy.csv', contentType: 'text/csv' })
      .expect(201);
    expect(response.body).toEqual({
      success: true,
      message: 'File berhasil diterima.',
      originalName: 'legacy.csv',
      size: content.length,
      mimeType: 'text/csv',
    });
  });

  it('POST /datasets parses CSV and returns its preview', async () => {
    const response = await request(app.getHttpServer())
      .post('/datasets')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('nama,jumlah\nApel,3\n'), {
        filename: 'data.csv',
        contentType: 'text/csv',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      columns: ['nama', 'jumlah'],
      totalRows: 1,
      preview: [{ nama: 'Apel', jumlah: '3' }],
      dataset: { originalName: 'data.csv', sheetName: null },
    });
  });

  it.each(['xlsx', 'xls'] as const)('POST /datasets accepts Excel %s', async (bookType) => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([['nama'], ['Apel']]),
      'Sheet1',
    );
    const content = XLSX.write(workbook, { type: 'buffer', bookType }) as Buffer;
    await request(app.getHttpServer())
      .post('/datasets')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', content, {
        filename: `data.${bookType}`,
        contentType: 'application/octet-stream',
      })
      .expect(201);
  });

  it('POST /datasets returns clear errors for unsupported, empty, and malformed files', async () => {
    await request(app.getHttpServer())
      .post('/datasets')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('x'), { filename: 'image.png', contentType: 'image/png' })
      .expect(415);
    await request(app.getHttpServer())
      .post('/datasets')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.alloc(0), { filename: 'empty.csv', contentType: 'text/csv' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/datasets')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.from('bad'), {
        filename: 'broken.xlsx',
        contentType: 'application/octet-stream',
      })
      .expect(400);
  });

  it('POST /datasets enforces the 20 MB limit', async () => {
    await request(app.getHttpServer())
      .post('/datasets')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', Buffer.alloc(20 * 1024 * 1024 + 1), {
        filename: 'large.csv',
        contentType: 'text/csv',
      })
      .expect(413);
  });

  afterEach(async () => {
    await app.close();
  });
});
