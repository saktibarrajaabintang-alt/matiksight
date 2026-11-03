import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import * as XLSX from 'xlsx';
import { PrismaService } from '../src/prisma/prisma.service';
import { SafeExceptionFilter } from '../src/security/safe-exception.filter';

describe('PostgreSQL full-stack integration (dedicated TEST_DATABASE_URL)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userId: string | undefined;
  let otherUserId: string | undefined;
  const suffix = randomUUID().replace(/-/g, '').slice(0, 12);
  const username = `itest_${suffix}`;
  const email = `itest_${suffix}@example.test`;
  const otherUsername = `itest_other_${suffix}`;
  const otherEmail = `itest_other_${suffix}@example.test`;

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module');
    const fixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = fixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new SafeExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.$connect();
  }, 30000);

  afterAll(async () => {
    try {
      const createdUserIds = [userId, otherUserId].filter((id): id is string => Boolean(id));
      if (createdUserIds.length && prisma) {
        await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
      }
    } finally {
      if (app) await app.close();
    }
  }, 30000);

  it('covers authenticated CSV/XLSX persistence, ownership, analysis, artifacts, and cascades', async () => {
    const register = await request(app.getHttpServer()).post('/auth/register')
      .send({ username, email, password: 'integration-test-password' });
    if (register.status === 201) userId = register.body.data.user.id;
    expect(register.status).toBe(201);
    const login = await request(app.getHttpServer()).post('/auth/login')
      .send({ identifier: username, password: 'integration-test-password' }).expect(201);
    const token = login.body.data.accessToken as string;
    const auth = { Authorization: `Bearer ${token}` };

    const profile = await request(app.getHttpServer()).get('/auth/me').set(auth).expect(200);
    expect(profile.body.data.user).toMatchObject({ id: userId, username });

    const registerOther = await request(app.getHttpServer()).post('/auth/register')
      .send({ username: otherUsername, email: otherEmail, password: 'integration-test-password' });
    if (registerOther.status === 201) otherUserId = registerOther.body.data.user.id;
    expect(registerOther.status).toBe(201);
    const otherLogin = await request(app.getHttpServer()).post('/auth/login')
      .send({ identifier: otherUsername, password: 'integration-test-password' }).expect(201);
    const otherAuth = { Authorization: `Bearer ${otherLogin.body.data.accessToken as string}` };

    const upload = await request(app.getHttpServer()).post('/datasets').set(auth)
      .attach('file', Buffer.from('region,amount\nEast,10\nWest,20\nEast,30\n'), {
        filename: 'integration.csv', contentType: 'text/csv',
      }).expect(201);
    const datasetId = upload.body.dataset.id as string;
    expect(upload.body.profiling.totalRows).toBe(3);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ['region', 'amount'], ['North', 5], ['South', 15],
    ]), 'Data');
    const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const xlsxUpload = await request(app.getHttpServer()).post('/datasets').set(auth)
      .attach('file', xlsxBuffer, {
        filename: 'integration.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }).expect(201);
    const xlsxDatasetId = xlsxUpload.body.dataset.id as string;
    expect(xlsxUpload.body.dataset.sheetName).toBe('Data');
    expect(xlsxUpload.body.profiling.totalRows).toBe(2);

    const datasetList = await request(app.getHttpServer()).get('/datasets').set(auth).expect(200);
    expect(datasetList.body.data).toHaveLength(2);
    expect(datasetList.body.data.map((item: { id: string }) => item.id)).toEqual(expect.arrayContaining([datasetId, xlsxDatasetId]));

    const detail = await request(app.getHttpServer()).get(`/datasets/${datasetId}`).set(auth).expect(200);
    expect(detail.body.data.rowCount).toBe(3);
    const preview = await request(app.getHttpServer()).get(`/datasets/${datasetId}/preview?limit=2`).set(auth).expect(200);
    expect(preview.body.data).toHaveLength(2);
    const secondPage = await request(app.getHttpServer()).get(`/datasets/${datasetId}/preview?page=2&limit=2`).set(auth).expect(200);
    expect(secondPage.body.data).toHaveLength(1);
    expect(secondPage.body.pagination).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });

    await request(app.getHttpServer()).get(`/datasets/${datasetId}`).set(otherAuth).expect(404);
    await request(app.getHttpServer()).get(`/datasets/${datasetId}/preview`).set(otherAuth).expect(404);
    const analysis = await request(app.getHttpServer()).get(`/datasets/${datasetId}/analysis`).set(auth).expect(200);
    expect(analysis.body.data.numericStatistics).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'amount', min: 10, max: 30 }),
    ]));
    const aggregate = await request(app.getHttpServer()).post(`/datasets/${datasetId}/aggregate`).set(auth)
      .send({ groupBy: ['region'], metrics: [{ column: 'amount', operation: 'sum' }] }).expect(201);
    expect(aggregate.body.data.totalGroups).toBe(2);
    const chart = await request(app.getHttpServer()).post(`/datasets/${datasetId}/visualizations/data`).set(auth)
      .send({ chartType: 'bar', xAxis: 'region', yAxis: 'amount', aggregation: 'average' }).expect(201);
    expect(chart.body.data).toHaveLength(2);

    const visualization = await request(app.getHttpServer()).post('/visualizations').set(auth).send({
      datasetId,
      name: 'Integration chart',
      configuration: { chartType: 'bar', xAxis: 'region', yAxis: 'amount', aggregation: 'average' },
    }).expect(201);
    const visualizationId = visualization.body.data.id as string;
    const visualizationList = await request(app.getHttpServer()).get('/visualizations').set(auth).expect(200);
    expect(visualizationList.body.data).toHaveLength(1);
    await request(app.getHttpServer()).get(`/visualizations/${visualizationId}`).set(auth).expect(200);
    await request(app.getHttpServer()).get(`/visualizations/${visualizationId}`).set(otherAuth).expect(404);
    const cascadeVisualization = await request(app.getHttpServer()).post('/visualizations').set(auth).send({
      datasetId,
      name: 'Cascade chart',
      configuration: { chartType: 'bar', xAxis: 'region', yAxis: 'amount', aggregation: 'sum' },
    }).expect(201);
    const cascadeVisualizationId = cascadeVisualization.body.data.id as string;
    const report = await request(app.getHttpServer()).post('/reports').set(auth).send({
      datasetId,
      name: 'Integration report',
      configuration: { sections: [{ visualizationId }] },
      snapshot: { totalRows: 3 },
    }).expect(201);
    const reportId = report.body.data.id as string;
    const reportList = await request(app.getHttpServer()).get('/reports').set(auth).expect(200);
    expect(reportList.body.data).toHaveLength(1);
    await request(app.getHttpServer()).get(`/reports/${reportId}`).set(auth).expect(200);
    await request(app.getHttpServer()).get(`/reports/${reportId}`).set(otherAuth).expect(404);
    const cascadeReport = await request(app.getHttpServer()).post('/reports').set(auth).send({
      datasetId,
      name: 'Cascade report',
      configuration: { sections: [] },
    }).expect(201);
    const cascadeReportId = cascadeReport.body.data.id as string;
    await request(app.getHttpServer()).get(`/datasets/${datasetId}/analysis`).set(otherAuth).expect(404);
    await request(app.getHttpServer()).post('/visualizations').set(otherAuth).send({
      datasetId,
      name: 'Not owned',
      configuration: { chartType: 'bar', xAxis: 'region', yAxis: 'amount', aggregation: 'sum' },
    }).expect(404);
    await request(app.getHttpServer()).post('/reports').set(otherAuth).send({
      datasetId,
      name: 'Not owned',
      configuration: { sections: [] },
    }).expect(404);

    await request(app.getHttpServer()).patch(`/visualizations/${visualizationId}`).set(auth)
      .send({ name: 'Updated integration chart' }).expect(200);
    await request(app.getHttpServer()).patch(`/reports/${reportId}`).set(auth)
      .send({ name: 'Updated integration report' }).expect(200);
    await request(app.getHttpServer()).delete(`/visualizations/${visualizationId}`).set(auth).expect(200);
    await request(app.getHttpServer()).get(`/visualizations/${visualizationId}`).set(auth).expect(404);
    await request(app.getHttpServer()).delete(`/reports/${reportId}`).set(auth).expect(200);
    await request(app.getHttpServer()).get(`/reports/${reportId}`).set(auth).expect(404);

    await request(app.getHttpServer()).delete(`/datasets/${datasetId}`).set(auth).expect(200);
    await request(app.getHttpServer()).get(`/datasets/${datasetId}`).set(auth).expect(404);
    await request(app.getHttpServer()).get(`/reports/${cascadeReportId}`).set(auth).expect(404);
    await request(app.getHttpServer()).get(`/visualizations/${cascadeVisualizationId}`).set(auth).expect(404);
    expect(await prisma.datasetRow.count({ where: { datasetId } })).toBe(0);
    expect(await prisma.savedReport.count({ where: { id: cascadeReportId } })).toBe(0);
    expect(await prisma.savedVisualization.count({ where: { id: cascadeVisualizationId } })).toBe(0);

    await request(app.getHttpServer()).delete(`/datasets/${xlsxDatasetId}`).set(auth).expect(200);
    expect(await prisma.datasetRow.count({ where: { datasetId: xlsxDatasetId } })).toBe(0);
  }, 60000);
});
