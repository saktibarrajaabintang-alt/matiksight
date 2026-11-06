import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { FileStorageService } from '../src/storage/file-storage.service';
import { ValidationPipe } from '@nestjs/common';
import { SafeExceptionFilter } from '../src/security/safe-exception.filter';

function memoryDatabase() {
  const users: Array<Record<string, any>> = [];
  const datasets: Array<Record<string, any>> = [];
  const rows: Array<Record<string, any>> = [];
  const visualizations: Array<Record<string, any>> = [];
  const reports: Array<Record<string, any>> = [];
  const uploadedFiles: Array<Record<string, any>> = [];
  const user = {
    create: jest.fn(async ({ data, select }: any) => {
      if (users.some((u) => u.username === data.username || u.email === data.email)) {
        throw { code: 'P2002' };
      }
      const created = { id: `00000000-0000-4000-8000-${String(users.length + 1).padStart(12, '0')}`, profilePhotoUrl: null, accountStatus: 'active', ...data, createdAt: new Date(), updatedAt: new Date() };
      users.push(created);
      return select ? Object.fromEntries(Object.keys(select).map((key) => [key, created[key]])) : created;
    }),
    findFirst: jest.fn(async ({ where }: any) => users.find((item) => where.OR.some((condition: any) =>
      Object.entries(condition).every(([key, value]) => item[key] === value))) ?? null),
    findUnique: jest.fn(async ({ where, select }: any) => {
      const found = users.find((item) => item.id === where.id);
      return found && select ? Object.fromEntries(Object.keys(select).map((key) => [key, found[key]])) : found ?? null;
    }),
    update: jest.fn(async ({ where, data, select }: any) => {
      const found = users.find((item) => item.id === where.id);
      if (!found) throw { code: 'P2025' };
      Object.assign(found, data, { updatedAt: new Date() });
      return select ? Object.fromEntries(Object.keys(select).map((key) => [key, found[key]])) : found;
    }),
  };
  const dataset = {
    create: jest.fn(async ({ data }: any) => {
      const created = { id: `10000000-0000-4000-8000-${String(datasets.length + 1).padStart(12, '0')}`, ...data, createdAt: new Date(), updatedAt: new Date() };
      datasets.push(created);
      return created;
    }),
    findMany: jest.fn(async ({ where, skip = 0, take = 20 }: any) => datasets
      .filter((item) => item.userId === where.userId && (!where.OR || where.OR.some((clause: any) =>
        item.name.toLowerCase().includes(clause.name?.contains?.toLowerCase() ?? '\u0000') ||
        item.originalFilename.toLowerCase().includes(clause.originalFilename?.contains?.toLowerCase() ?? '\u0000'))))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(skip, skip + take)),
    count: jest.fn(async ({ where }: any) => datasets.filter((item) => item.userId === where.userId).length),
    findFirst: jest.fn(async ({ where, select }: any) => {
      const found = datasets.find((item) => item.id === where.id && item.userId === where.userId);
      return found && select ? Object.fromEntries(Object.keys(select).map((key) => [key, found[key]])) : found ?? null;
    }),
    deleteMany: jest.fn(async ({ where }: any) => {
      const index = datasets.findIndex((item) => item.id === where.id && item.userId === where.userId);
      if (index < 0) return { count: 0 };
      datasets.splice(index, 1);
      for (let row = rows.length - 1; row >= 0; row--) if (rows[row].datasetId === where.id) rows.splice(row, 1);
      return { count: 1 };
    }),
    updateMany: jest.fn(async ({ where, data }: any) => {
      const found = datasets.find((item) => item.id === where.id && item.userId === where.userId);
      if (!found) return { count: 0 };
      Object.assign(found, data, { updatedAt: new Date() });
      return { count: 1 };
    }),
  };
  const datasetRow = {
    createMany: jest.fn(async ({ data }: any) => { rows.push(...data); return { count: data.length }; }),
    findMany: jest.fn(async ({ where, skip = 0, take = 20 }: any) => rows
      .filter((row) => row.datasetId === where.datasetId).sort((a, b) => a.rowIndex - b.rowIndex)
      .slice(skip, skip + take)),
  };
  const artifactDelegate = (items: Array<Record<string, any>>, idPrefix: string) => ({
    create: jest.fn(async ({ data }: any) => {
      const saved = { id: `${idPrefix}-0000-4000-8000-${String(items.length + 1).padStart(12, '0')}`, ...data, createdAt: new Date(), updatedAt: new Date() };
      items.push(saved);
      return saved;
    }),
    findFirst: jest.fn(async ({ where, select }: any) => {
      const saved = items.find((item) => item.id === where.id && item.userId === where.userId);
      if (!saved) return null;
      return select ? Object.fromEntries(Object.keys(select).map((key) => [key, saved[key]])) : saved;
    }),
    findMany: jest.fn(async ({ where, skip = 0, take = 20, select }: any) => items
      .filter((item) => item.userId === where.userId && (!where.name || item.name.toLowerCase().includes(where.name.contains.toLowerCase())))
      .slice(skip, skip + take)
      .map((item) => select ? Object.fromEntries(Object.keys(select).map((key) => [key, item[key]])) : item)),
    count: jest.fn(async ({ where }: any) => items.filter((item) => item.userId === where.userId).length),
    updateMany: jest.fn(async ({ where, data }: any) => {
      const item = items.find((entry) => entry.id === where.id && entry.userId === where.userId);
      if (!item) return { count: 0 };
      Object.assign(item, data, { updatedAt: new Date() });
      return { count: 1 };
    }),
    deleteMany: jest.fn(async ({ where }: any) => {
      const index = items.findIndex((item) => item.id === where.id && item.userId === where.userId);
      if (index < 0) return { count: 0 };
      items.splice(index, 1);
      return { count: 1 };
    }),
  });
  const uploadedFile = {
    create: jest.fn(async ({ data, select }: any) => {
      const created = { id: `40000000-0000-4000-8000-${String(uploadedFiles.length + 1).padStart(12, '0')}`, ...data, createdAt: new Date() };
      uploadedFiles.push(created);
      return select ? Object.fromEntries(Object.keys(select).map((key) => [key, created[key]])) : created;
    }),
    findFirst: jest.fn(async ({ where, select }: any) => {
      const found = uploadedFiles.find((item) => item.id === where.id && item.userId === where.userId);
      return found && select ? Object.fromEntries(Object.keys(select).map((key) => [key, found[key]])) : found ?? null;
    }),
    deleteMany: jest.fn(async ({ where }: any) => {
      const index = uploadedFiles.findIndex((item) => item.id === where.id && item.userId === where.userId);
      if (index < 0) return { count: 0 };
      uploadedFiles.splice(index, 1);
      return { count: 1 };
    }),
  };
  return {
    user, dataset, datasetRow, uploadedFile,
    savedVisualization: artifactDelegate(visualizations, '20000000'),
    savedReport: artifactDelegate(reports, '30000000'),
    $transaction: jest.fn(async (operation: any) => typeof operation === 'function'
      ? operation({ dataset, datasetRow })
      : Promise.all(operation)),
  };
}

describe('Auth and dataset ownership (e2e with isolated in-memory database)', () => {
  let app: INestApplication<App>;
  let db: ReturnType<typeof memoryDatabase>;
  const files = new Map<string, Buffer>();
  const storage = {
    store: jest.fn(async (buffer: Buffer, extension: string) => {
      const key = `50000000-0000-4000-8000-${String(files.size + 1).padStart(12, '0')}${extension}`;
      files.set(key, buffer);
      return key;
    }),
    read: jest.fn(async (key: string) => {
      const buffer = files.get(key);
      if (!buffer) throw Object.assign(new Error('Missing file'), { code: 'ENOENT' });
      return buffer;
    }),
    remove: jest.fn(async (key: string) => { files.delete(key); }),
  };

  beforeEach(async () => {
    files.clear();
    storage.store.mockClear();
    storage.read.mockClear();
    storage.remove.mockClear();
    db = memoryDatabase();
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue(db)
      .overrideProvider(FileStorageService).useValue(storage)
      .compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new SafeExceptionFilter());
    await app.init();
  });

  afterEach(async () => app.close());

  async function register(username: string, email: string) {
    return request(app.getHttpServer()).post('/auth/register')
      .send({ username, email, password: 'secure-pass-123' }).expect(201);
  }

  async function login(identifier: string) {
    const response = await request(app.getHttpServer()).post('/auth/login')
      .send({ identifier, password: 'secure-pass-123' }).expect(201);
    return response.body.data.accessToken as string;
  }

  it('registers without returning the password hash and rejects duplicate usernames or emails', async () => {
    const created = await register('userone', 'one@example.com');
    expect(created.body.data.user).not.toHaveProperty('passwordHash');
    await request(app.getHttpServer()).post('/auth/register')
      .send({ username: 'userone', email: 'another@example.com', password: 'secure-pass-123' }).expect(409);
    await request(app.getHttpServer()).post('/auth/register')
      .send({ username: 'otheruser', email: 'one@example.com', password: 'secure-pass-123' }).expect(409);
  });

  it('logs in using username or email, rejects bad passwords, and returns /auth/me', async () => {
    await register('userone', 'one@example.com');
    const usernameToken = await login('userone');
    const emailToken = await login('one@example.com');
    expect(usernameToken).toBeTruthy();
    expect(emailToken).toBeTruthy();
    await request(app.getHttpServer()).post('/auth/login')
      .send({ identifier: 'userone', password: 'wrong-password' }).expect(401);
    const expiredToken = await request(app.getHttpServer()).get('/auth/me')
      .set('Authorization', `Bearer ${await app.get(JwtService).signAsync({ sub: 'missing' }, { expiresIn: '-1s' })}`)
      .expect(401);
    expect(expiredToken.body.statusCode).toBe(401);
    const me = await request(app.getHttpServer()).get('/auth/me')
      .set('Authorization', `Bearer ${usernameToken}`).expect(200);
    expect(me.body.data.user).toMatchObject({ username: 'userone', email: 'one@example.com' });
    expect(me.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('updates the authenticated profile and changes passwords only after verifying the current password', async () => {
    await register('profileuser', 'profile@example.com');
    const token = await login('profileuser');
    await request(app.getHttpServer()).get('/users/me').expect(401);
    const updated = await request(app.getHttpServer()).patch('/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Profile User', username: 'profileuser2', email: 'PROFILE@example.com', profilePhotoUrl: 'https://cdn.example.com/profile.jpg' })
      .expect(200);
    expect(updated.body.data.user).toMatchObject({
      fullName: 'Profile User',
      username: 'profileuser2',
      email: 'profile@example.com',
      profilePhotoUrl: 'https://cdn.example.com/profile.jpg',
      accountStatus: 'active',
    });
    expect(updated.body.data.user).not.toHaveProperty('passwordHash');
    await request(app.getHttpServer()).patch('/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'wrong-password', newPassword: 'next-secure-pass-456' })
      .expect(401);
    await request(app.getHttpServer()).patch('/users/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'secure-pass-123', newPassword: 'next-secure-pass-456' })
      .expect(200);
    await request(app.getHttpServer()).post('/auth/login')
      .send({ identifier: 'profileuser2', password: 'secure-pass-123' }).expect(401);
    await request(app.getHttpServer()).post('/auth/login')
      .send({ identifier: 'profileuser2', password: 'next-secure-pass-456' }).expect(201);
    await request(app.getHttpServer()).post('/auth/logout')
      .set('Authorization', `Bearer ${token}`).expect(201);
  });

  it('persists image uploads and restricts retrieval and deletion to the file owner', async () => {
    await register('imageowner', 'imageowner@example.com');
    const ownerToken = await login('imageowner');
    await register('imageguest', 'imageguest@example.com');
    const guestToken = await login('imageguest');
    const png = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png, 0);
    png.write('IHDR', 12, 'ascii');
    png.writeUInt32BE(1, 16);
    png.writeUInt32BE(1, 20);
    const uploaded = await request(app.getHttpServer()).post('/upload')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', png, { filename: 'avatar.png', contentType: 'image/png' })
      .expect(201);
    const fileId = uploaded.body.id as string;
    expect(uploaded.body).toMatchObject({ originalName: 'avatar.png', mimeType: 'image/png' });
    expect(files.size).toBe(1);
    await request(app.getHttpServer()).get(`/upload/${fileId}`)
      .set('Authorization', `Bearer ${guestToken}`).expect(404);
    await request(app.getHttpServer()).delete(`/upload/${fileId}`)
      .set('Authorization', `Bearer ${guestToken}`).expect(404);
    await request(app.getHttpServer()).get(`/upload/${fileId}`)
      .set('Authorization', `Bearer ${ownerToken}`).expect(200)
      .expect('Content-Disposition', /attachment/);
    await request(app.getHttpServer()).delete(`/upload/${fileId}`)
      .set('Authorization', `Bearer ${ownerToken}`).expect(200);
    expect(files.size).toBe(0);
  });

  it('requires a valid token and enforces dataset ownership across upload, list, detail, preview and delete', async () => {
    await request(app.getHttpServer()).get('/datasets').expect(401);
    await request(app.getHttpServer()).get('/datasets/10000000-0000-4000-8000-000000000001/analysis').expect(401);
    await register('userone', 'one@example.com');
    const tokenA = await login('userone');
    await register('usertwo', 'two@example.com');
    const tokenB = await login('usertwo');
    const uploaded = await request(app.getHttpServer()).post('/datasets')
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('file', Buffer.from('place,value\nNorth,2\nSouth,3\n'), { filename: 'custom.csv', contentType: 'text/csv' })
      .expect(201);
    const id = uploaded.body.dataset.id as string;
    expect(uploaded.body.dataset).not.toHaveProperty('storageKey');
    expect(files.size).toBe(1);
    const downloaded = await request(app.getHttpServer()).get(`/datasets/${id}/download`)
      .set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(downloaded.text).toBe('place,value\nNorth,2\nSouth,3\n');
    await request(app.getHttpServer()).get(`/datasets/${id}/download`)
      .set('Authorization', `Bearer ${tokenB}`).expect(404);
    await request(app.getHttpServer()).patch(`/datasets/${id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Hijack' }).expect(404);
    const renamed = await request(app.getHttpServer()).patch(`/datasets/${id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Renamed dataset' }).expect(200);
    expect(renamed.body.data.name).toBe('Renamed dataset');
    expect(uploaded.body.profiling.totalRows).toBe(2);
    const analysis = await request(app.getHttpServer()).get(`/datasets/${id}/analysis`)
      .set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(analysis.body.data.overview).toMatchObject({ totalRows: 2, totalColumns: 2 });
    expect(analysis.body.data.columnTypes).toMatchObject({ category: 1, number: 1 });
    const aggregate = await request(app.getHttpServer()).post(`/datasets/${id}/aggregate`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        groupBy: ['place'],
        metrics: [{ column: 'value', operation: 'sum' }, { operation: 'count' }],
        filters: [{ column: 'value', operator: 'gte', value: 2 }],
        sort: { column: 'metric_1', direction: 'desc' },
        limit: 10,
      }).expect(201);
    expect(aggregate.body.data.results).toEqual([
      { place: 'South', metric_1: 3, metric_2: 1 },
      { place: 'North', metric_1: 2, metric_2: 1 },
    ]);
    await request(app.getHttpServer()).post(`/datasets/${id}/aggregate`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ metrics: [{ column: 'missing', operation: 'sum' }] }).expect(400);
    await request(app.getHttpServer()).post(`/datasets/${id}/aggregate`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ metrics: [{ column: 'value', operation: 'median' }] }).expect(400);
    const visualization = await request(app.getHttpServer()).post(`/datasets/${id}/visualizations/data`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ chartType: 'bar', xAxis: 'place', yAxis: 'value', aggregation: 'average' });
    expect(visualization.body).toMatchObject({ success: true, chart: { type: 'bar' } });
    expect(visualization.body.data).toEqual([{ place: 'North', value: 2 }, { place: 'South', value: 3 }]);
    expect((await request(app.getHttpServer()).get('/datasets').set('Authorization', `Bearer ${tokenA}`).expect(200)).body.data).toHaveLength(1);
    expect((await request(app.getHttpServer()).get('/datasets?page=1&limit=1').set('Authorization', `Bearer ${tokenA}`).expect(200)).body.pagination).toMatchObject({ page: 1, limit: 1, total: 1 });
    expect((await request(app.getHttpServer()).get(`/datasets/${id}`).set('Authorization', `Bearer ${tokenA}`).expect(200)).body.data.id).toBe(id);
    expect((await request(app.getHttpServer()).get(`/datasets/${id}/preview?page=2&limit=1`).set('Authorization', `Bearer ${tokenA}`).expect(200)).body.data).toEqual([{ place: 'South', value: '3' }]);
    await request(app.getHttpServer()).get(`/datasets/${id}`).set('Authorization', `Bearer ${tokenB}`).expect(404);
    await request(app.getHttpServer()).get(`/datasets/${id}/preview`).set('Authorization', `Bearer ${tokenB}`).expect(404);
    await request(app.getHttpServer()).get(`/datasets/${id}/analysis`).set('Authorization', `Bearer ${tokenB}`).expect(404);
    await request(app.getHttpServer()).post(`/datasets/${id}/aggregate`).set('Authorization', `Bearer ${tokenB}`)
      .send({ metrics: [{ column: 'value', operation: 'sum' }] }).expect(404);
    await request(app.getHttpServer()).delete(`/datasets/${id}`).set('Authorization', `Bearer ${tokenB}`).expect(404);
    await request(app.getHttpServer()).delete(`/datasets/${id}`).set('Authorization', `Bearer ${tokenA}`).expect(200);
    expect(files.size).toBe(0);
    await request(app.getHttpServer()).get(`/datasets/${id}`).set('Authorization', `Bearer ${tokenA}`).expect(404);
    await request(app.getHttpServer()).get('/datasets').set('Authorization', 'Bearer invalid.token.value').expect(401);
  });

  it('validates registration and pagination input', async () => {
    await request(app.getHttpServer()).post('/auth/register')
      .send({ username: 'x', email: 'not-email', password: 'x' }).expect(400);
    await register('userone', 'one@example.com');
    const token = await login('userone');
    await request(app.getHttpServer()).get('/datasets?page=0')
      .set('Authorization', `Bearer ${token}`).expect(400);
  });

  it('rate limits auth registration and login requests with HTTP 429', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer()).post('/auth/register').send({}).expect(400);
    }
    const registerLimited = await request(app.getHttpServer()).post('/auth/register').send({}).expect(429);
    expect(registerLimited.headers['retry-after']).toBeDefined();

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await request(app.getHttpServer()).post('/auth/login').send({}).expect(400);
    }
    const loginLimited = await request(app.getHttpServer()).post('/auth/login').send({}).expect(429);
    expect(loginLimited.headers['retry-after']).toBeDefined();
  });

  it('creates, lists, reads, updates and deletes owned visualizations and reports', async () => {
    await request(app.getHttpServer()).get('/visualizations').expect(401);
    await request(app.getHttpServer()).get('/reports').expect(401);
    await register('ownerone', 'owner@example.com');
    const ownerToken = await login('ownerone');
    await register('ownertwo', 'other@example.com');
    const otherToken = await login('ownertwo');
    const upload = await request(app.getHttpServer()).post('/datasets')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', Buffer.from('place,value\nNorth,2\nSouth,3\n'), { filename: 'custom.csv', contentType: 'text/csv' })
      .expect(201);
    const datasetId = upload.body.dataset.id as string;
    const config = { chartType: 'bar', xAxis: 'place', yAxis: 'value', aggregation: 'average', filters: [], groupBy: [], limit: 50 };

    await request(app.getHttpServer()).post('/visualizations')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ datasetId, name: 'Foreign dataset', configuration: config }).expect(404);
    const visual = await request(app.getHttpServer()).post('/visualizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ datasetId, name: '  By place  ', description: 'Initial', configuration: config }).expect(201);
    const visualId = visual.body.data.id as string;
    expect(visual.body.data).toMatchObject({ name: 'By place', chartType: 'bar', datasetId });
    expect(visual.body.data.configuration).not.toHaveProperty('data');
    expect((await request(app.getHttpServer()).get('/visualizations?limit=1')
      .set('Authorization', `Bearer ${ownerToken}`).expect(200)).body.pagination).toMatchObject({ total: 1, limit: 1 });
    expect((await request(app.getHttpServer()).get(`/visualizations/${visualId}`)
      .set('Authorization', `Bearer ${ownerToken}`).expect(200)).body.data.id).toBe(visualId);
    await request(app.getHttpServer()).get(`/visualizations/${visualId}`)
      .set('Authorization', `Bearer ${otherToken}`).expect(404);
    await request(app.getHttpServer()).patch(`/visualizations/${visualId}`)
      .set('Authorization', `Bearer ${otherToken}`).send({ name: 'Hijack' }).expect(404);
    await request(app.getHttpServer()).patch(`/visualizations/${visualId}`)
      .set('Authorization', `Bearer ${ownerToken}`).send({}).expect(400);
    const updatedVisual = await request(app.getHttpServer()).patch(`/visualizations/${visualId}`)
      .set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Updated chart', description: 'Revised' }).expect(200);
    expect(updatedVisual.body.data).toMatchObject({ name: 'Updated chart', description: 'Revised' });
    await request(app.getHttpServer()).post('/visualizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ datasetId, name: 'Invalid', configuration: { ...config, chartType: 'pie', xAxis: 'value' } }).expect(400);
    await request(app.getHttpServer()).post('/visualizations')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ datasetId, userId: 'spoofed', name: 'Spoof', configuration: config }).expect(400);

    const report = await request(app.getHttpServer()).post('/reports')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ datasetId, name: 'Analysis report', description: 'Custom summary', configuration: { sections: [{ title: 'Overview', columns: ['place', 'value'] }] }, snapshot: { totalRows: 2, note: 'summary only' } })
      .expect(201);
    const reportId = report.body.data.id as string;
    expect(report.body.data).not.toHaveProperty('userId');
    await request(app.getHttpServer()).post('/reports')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ datasetId, name: 'Foreign report', configuration: {} }).expect(404);
    await request(app.getHttpServer()).post('/reports')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ datasetId, name: 'Too large', configuration: { details: 'x'.repeat(50 * 1024) } }).expect(400);
    expect((await request(app.getHttpServer()).get('/reports?limit=1')
      .set('Authorization', `Bearer ${ownerToken}`).expect(200)).body.pagination).toMatchObject({ total: 1, limit: 1 });
    expect((await request(app.getHttpServer()).get(`/reports/${reportId}`)
      .set('Authorization', `Bearer ${ownerToken}`).expect(200)).body.data.snapshot).toMatchObject({ totalRows: 2 });
    await request(app.getHttpServer()).get(`/reports/${reportId}`)
      .set('Authorization', `Bearer ${otherToken}`).expect(404);
    await request(app.getHttpServer()).patch(`/reports/${reportId}`)
      .set('Authorization', `Bearer ${otherToken}`).send({ name: 'Hijack' }).expect(404);
    const updatedReport = await request(app.getHttpServer()).patch(`/reports/${reportId}`)
      .set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Updated report', configuration: { sections: [] } }).expect(200);
    expect(updatedReport.body.data).toMatchObject({ name: 'Updated report', configuration: { sections: [] } });
    await request(app.getHttpServer()).delete(`/reports/${reportId}`)
      .set('Authorization', `Bearer ${otherToken}`).expect(404);
    await request(app.getHttpServer()).delete(`/visualizations/${visualId}`)
      .set('Authorization', `Bearer ${otherToken}`).expect(404);
    await request(app.getHttpServer()).delete(`/visualizations/${visualId}`)
      .set('Authorization', `Bearer ${ownerToken}`).expect(200);
    await request(app.getHttpServer()).delete(`/reports/${reportId}`)
      .set('Authorization', `Bearer ${ownerToken}`).expect(200);
  }, 60000);

  it('does not expose database failure details to clients', async () => {
    db.user.create.mockRejectedValueOnce(new Error('private database connection detail'));
    const response = await request(app.getHttpServer()).post('/auth/register')
      .send({ username: 'userone', email: 'one@example.com', password: 'secure-pass-123' })
      .expect(500);
    expect(JSON.stringify(response.body)).not.toContain('private database connection detail');
  });
});
