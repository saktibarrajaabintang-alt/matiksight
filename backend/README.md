<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Setup database dan environment

Backend menggunakan PostgreSQL dengan Prisma ORM. Schema metadata dataset
bersifat generik; tiap baris disimpan terpisah dalam kolom JSONB berindeks
(`dataset_id`, `row_index`) agar preview bisa dipaginasi tanpa menaruh seluruh
file dalam satu nilai JSON. Penghapusan user atau dataset menghapus data terkait
melalui foreign key cascade.

1. Siapkan PostgreSQL dan buat database `matiksight`.
2. Salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL` dengan kredensial
   lokal dan `JWT_SECRET` dengan random secret minimal 32 karakter. Jangan commit
   `.env`.
3. Jalankan `npm install`, `npm run prisma:generate`, lalu `npm run prisma:migrate`
   untuk membuat tabel dari migration.
4. Jalankan `npm run start:dev`.

Untuk deployment gunakan `npm run prisma:deploy`. Perubahan schema dibuat lewat
Prisma migration. File `.env.example` hanya memiliki nilai contoh.

## Authentication API

Register menerima username 3–30 karakter (huruf, angka, underscore), email,
dan password minimal 8 karakter. Password disimpan sebagai bcrypt hash. Batas
password adalah 72 byte UTF-8 agar bcrypt tidak mengabaikan byte sisanya.
Register dibatasi 5 request per IP dalam 15 menit; login dibatasi 10 request per
IP dalam 15 menit. Ketika terlampaui, API mengembalikan HTTP 429 dan header
`Retry-After`.

```http
POST /auth/register
Content-Type: application/json
```

```json
{"username":"analyst01","email":"analyst@example.com","password":"secure-pass-123"}
```

Login menerima `identifier` berupa username atau email:

```http
POST /auth/login
Content-Type: application/json
```

```json
{"identifier":"analyst01","password":"secure-pass-123"}
```

Respons login berisi `data.accessToken`, `tokenType: "Bearer"`, waktu berlaku
satu jam, dan profil tanpa password hash. Kirim token pada endpoint terproteksi:

```http
Authorization: Bearer <accessToken>
```

`GET /auth/me` mengembalikan profil akun aktif. Semua endpoint `/datasets`
membutuhkan Bearer token dan hanya mengembalikan dataset milik pengguna itu.
Token salah atau kedaluwarsa menghasilkan HTTP 401. Kredensial login salah
menghasilkan pesan generik yang tidak membedakan akun atau password.

## Dataset management API

Semua endpoint berikut membutuhkan autentikasi. Dataset membaca satu file CSV,
XLSX, atau XLS per request, maksimum 20 MB. Ekstensi dan konten file diperiksa;
Excel menggunakan worksheet pertama. CSV harus UTF-8. Baris kosong dilewati,
header kosong dan duplikat dinormalisasi. Profil dinamis Phase 1 tetap menjadi
bagian dari upload response.

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| POST | `/datasets` | Upload dan simpan dataset dan profil |
| GET | `/datasets?page=1&limit=20&search=...` | Daftar milik pengguna dengan pencarian nama/file |
| GET | `/datasets/:id` | Metadata, schema, dan profil |
| GET | `/datasets/:id/preview?page=1&limit=20` | Baris data dengan pagination |
| DELETE | `/datasets/:id` | Hapus dataset dan baris terkait |

`limit` maksimal 100; preview default 20 baris. ID harus berupa UUID. Dataset
milik pengguna lain dan ID yang tidak ditemukan sama-sama menghasilkan 404.
Parameter tidak valid menghasilkan HTTP 400; request tanpa token menghasilkan
401. Error NestJS memakai bentuk standar `{ "statusCode", "message", "error" }`.

Upload tetap mempertahankan response Phase 1 di root JSON dan menambahkan ID
serta informasi penyimpanan ke `dataset`:

```json
{
  "success": true,
  "dataset": {"id":"<uuid>","name":"custom","originalFilename":"custom.csv","fileType":"csv","fileSize":42,"rowCount":1,"columnCount":2,"createdAt":"<timestamp>","mimeType":"text/csv","sheetName":null},
  "columns": ["area", "measure"],
  "totalRows": 1,
  "preview": [{"area":"North","measure":"2"}],
  "columnMetadata": [{"name":"measure","type":"number","nullable":false,"uniqueCount":1,"nullCount":0,"min":2,"max":2,"mean":2}],
  "profiling": {"totalRows":1,"totalColumns":2,"duplicateRows":0,"missingValues":0,"dateRange":[],"dataQuality":{"score":100,"missingValues":0,"duplicateRows":0}}
}
```

Contoh list, detail, preview, dan delete response:

```json
{"success":true,"data":[{"id":"<uuid>","name":"custom","rowCount":1,"columnCount":2,"createdAt":"<timestamp>"}],"pagination":{"page":1,"limit":20,"total":1,"totalPages":1}}
```

```json
{"success":true,"data":{"id":"<uuid>","name":"custom","columns":["area","measure"],"columnMetadata":[],"profiling":{},"rowCount":1}}
```

```json
{"success":true,"data":[{"area":"North","measure":"2"}],"pagination":{"page":1,"limit":20,"total":1,"totalPages":1}}
```

```json
{"success":true,"message":"Dataset berhasil dihapus."}
```

## Dynamic analysis dan visualization API

Semua endpoint berikut memerlukan `Authorization: Bearer <accessToken>` dan
dataset harus dimiliki oleh akun tersebut. Data dibaca lewat halaman database
500 baris per batch. Untuk menjaga batas waktu dan memori, satu request analisis
maksimal memindai 500.000 baris; dataset yang lebih besar mendapat HTTP 413.
Limit response agregasi dan grafik maksimal 1.000; `groupBy` maksimal 3 kolom,
metrics maksimal 10, filters maksimal 20, dan operator `in` menerima maksimal
100 nilai. Tidak ada SQL yang disusun dari input kolom.

### `GET /datasets/:id/analysis`

Mengembalikan overview dataset, ringkasan tipe, statistik numerik, ringkasan
kategorikal, rentang tanggal, kualitas data, dan rekomendasi chart beserta
alasannya. Tipe kolom dan rekomendasi berasal dari metadata profiling aktual.

Contoh response:

```json
{
  "success": true,
  "data": {
    "overview": {"id":"<uuid>","name":"custom","totalRows":120,"totalColumns":3},
    "columnTypes": {"category":1,"number":1,"date":1},
    "columns": [],
    "numericStatistics": [{"name":"measure","nullCount":0,"uniqueCount":40,"min":2,"max":90,"mean":24.5}],
    "categoricalSummary": [{"name":"segment","type":"category","nullCount":0,"uniqueCount":4}],
    "dateRange": [{"column":"period","min":"2026-01-01T00:00:00.000Z","max":"2026-04-30T00:00:00.000Z"}],
    "dataQuality": {"score":98,"missingValues":2,"duplicateRows":0},
    "recommendations": [{"chartType":"line","xAxis":"period","yAxis":"measure","aggregation":"average","reason":"Kolom tanggal period dapat menunjukkan perubahan measure dari waktu ke waktu."}]
  }
}
```

### `POST /datasets/:id/aggregate`

Request menerima `groupBy` (opsional), `metrics`, `filters` (opsional), `sort`
(opsional), dan `limit` (default 100). Metric key di hasil bernama `metric_1`,
`metric_2`, sesuai urutan request. Operasi `sum`, `average`, `minimum`, dan
`maximum` hanya menerima kolom numerik; `distinct_count` menerima semua tipe.
`count` tanpa kolom menghitung baris, dengan kolom menghitung nilai yang tidak
kosong.

```json
{
  "groupBy": ["segment"],
  "metrics": [
    {"column":"measure","operation":"sum"},
    {"column":"measure","operation":"average"},
    {"operation":"count"}
  ],
  "filters": [{"column":"measure","operator":"gte","value":10}],
  "sort": {"column":"metric_1","direction":"desc"},
  "limit": 50
}
```

Operator filter: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `in`,
`isNull`. Operator perbandingan hanya untuk kolom numerik atau tanggal;
`contains` untuk teks/kategori. Sort memakai nama kolom `groupBy` atau metric
key (`metric_1`, dst).

```json
{"success":true,"data":{"datasetId":"<uuid>","groupBy":["segment"],"metrics":[{"key":"metric_1","column":"measure","operation":"sum"}],"filters":[],"totalGroups":2,"limit":50,"results":[{"segment":"A","metric_1":420},{"segment":"B","metric_1":310}]}}
```

Tanpa `groupBy`, hasil berisi satu baris agregat. Dataset kosong menghasilkan
count `0`, sum `0`, serta average/minimum/maximum `null`.

### `POST /datasets/:id/visualizations/data`

Mendukung `bar`, `line`, `area`, `pie`, dan `scatter`. Untuk chart selain
scatter, xAxis menjadi group key dan yAxis diagregasi. Request contoh:

```json
{
  "chartType":"bar",
  "xAxis":"segment",
  "yAxis":"measure",
  "aggregation":"average",
  "filters":[{"column":"measure","operator":"gt","value":0}],
  "sort":{"column":"value","direction":"desc"},
  "limit":100
}
```

Untuk grafik kategori, tiap item memakai field `value` agar dapat dipakai
langsung pada Recharts:

```json
{"success":true,"chart":{"type":"bar","xAxis":"segment","yAxis":"measure","aggregation":"average","groupBy":["segment"],"totalGroups":2,"limit":100},"data":[{"segment":"A","value":12.5},{"segment":"B","value":10.3}]}
```

Scatter mengembalikan pasangan nilai numerik `{ "<xAxis>": number,
"<yAxis>": number }` dan tidak melakukan agregasi. Line/area/bar memerlukan
xAxis kategori, boolean, atau tanggal; pie memerlukan paling banyak 20 kategori;
scatter memerlukan dua kolom numerik. Tipe chart atau kolom yang tidak cocok,
kolom tidak dikenal, operasi yang tidak didukung, dan parameter di luar batas
mendapat HTTP 400. Dataset tak ditemukan atau milik akun lain mendapat 404,
token tidak valid mendapat 401. Error memakai format NestJS standar.

## Saved visualizations dan reports

Semua endpoint di bagian ini memerlukan Bearer token. `userId` berasal dari JWT
dan tidak diterima dari request body. Dataset pada create atau ketika datasetId
diubah harus dimiliki akun pemanggil. Resource yang tidak ada atau dimiliki akun
lain menghasilkan 404.

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| POST | `/visualizations` | Simpan konfigurasi chart |
| GET | `/visualizations?page=1&limit=20&search=...` | Daftar chart milik user |
| GET | `/visualizations/:id` | Detail konfigurasi chart |
| PATCH | `/visualizations/:id` | Ubah nama, deskripsi, dataset, atau konfigurasi |
| DELETE | `/visualizations/:id` | Hapus chart tersimpan |
| POST | `/reports` | Simpan konfigurasi report |
| GET | `/reports?page=1&limit=20&search=...` | Daftar report milik user |
| GET | `/reports/:id` | Detail report dan snapshot opsional |
| PATCH | `/reports/:id` | Ubah metadata, dataset, konfigurasi, atau snapshot |
| DELETE | `/reports/:id` | Hapus report tersimpan |

Pagination memakai `page` minimal 1 dan `limit` maksimal 100 (default 20).
Konfigurasi visualization disimpan sebagai JSONB maksimal 32 KiB; isinya opsi
chart, bukan hasil query atau deretan data grafik. Chart type, axis, grouping,
filter, sort, dan agregasi divalidasi terhadap schema dataset. Data grafik terbaru
dapat diminta melalui `POST /datasets/:id/visualizations/data`.

Contoh create visualization:

```json
{
  "datasetId":"<uuid>",
  "name":"Average by region",
  "description":"Perbandingan kategori",
  "configuration":{
    "chartType":"bar",
    "xAxis":"region",
    "yAxis":"amount",
    "groupBy":[],
    "aggregation":"average",
    "filters":[],
    "sort":{"column":"value","direction":"desc"},
    "limit":100
  }
}
```

PATCH menerima subset field; jika `configuration` dikirim, seluruh konfigurasi
chart harus lengkap dan valid. Create mengembalikan HTTP 201 dengan record pada
`data`; list menyertakan `pagination`. Body/config tidak valid mendapat HTTP 400.

Report menyimpan konfigurasi generik dan snapshot ringkasan opsional; report
tidak menyalin baris dataset. Batas konfigurasi 48 KiB dan snapshot 32 KiB.

```json
{
  "datasetId":"<uuid>",
  "name":"Quarterly overview",
  "description":"Ringkasan dataset custom",
  "configuration":{"sections":[{"title":"Overview","visualizationIds":["<uuid>"]}]},
  "snapshot":{"totalRows":120,"generatedAt":"2026-11-03T00:00:00.000Z"}
}
```

Migration additive untuk kedua tabel ada di
`prisma/migrations/20261103010000_saved_artifacts`. Setelah memastikan
`DATABASE_URL` menunjuk target yang benar, jalankan `npm run prisma:migrate`
untuk development atau `npm run prisma:deploy` untuk deployment. Backend tidak
menjalankan migration otomatis.

### Test dengan Thunder Client

Register lalu login; salin `data.accessToken`. Gunakan header `Authorization:
Bearer <token>` untuk mengirim file pada `POST /datasets`, lalu coba list,
detail, preview, dan delete memakai ID yang dikembalikan. Pada multipart form,
field file harus bernama `file`.

Tes dijalankan dengan `npm test -- --runInBand`,
`npm run test:e2e -- --runInBand`, `npm run build`, dan `npm run lint`.

## Phase 5: OpenAPI, security settings, and PostgreSQL integration

Swagger UI is available at `GET /api`; its machine-readable document is at
`GET /api-json`. Requests to protected routes use the same Bearer JWT described
above. DTO validation rejects unknown fields and transforms query parameters.
The Nest error response is `{ "statusCode": number, "message": string | string[], "error": string }`;
validation errors are 400, missing or invalid JWT is 401, and missing or
non-owned resources are 404. Unexpected server errors return a generic 500
response; internal exception details should not be sent to clients.

| Area | Routes | Authentication | Request/response |
| --- | --- | --- | --- |
| Health | `GET /`, `GET /health` | No | Root greeting and health status JSON |
| Authentication | `POST /auth/register`, `POST /auth/login` | No | JSON credentials; login returns `data.accessToken` |
| Profile | `GET /auth/me` | Bearer JWT | Returns the authenticated profile |
| Dataset | `POST /datasets` | Bearer JWT | Multipart `file`; JSON upload/profile response |
| Legacy upload | `POST /upload` | Bearer JWT | Multipart `file`; preserves upload metadata response |
| Dataset | `GET /datasets?page=1&limit=20&search=...` | Bearer JWT | Paginated owned dataset list |
| Dataset | `GET /datasets/:id` | Bearer JWT | Dataset metadata and profiling |
| Dataset | `GET /datasets/:id/preview?page=1&limit=20` | Bearer JWT | Paginated rows |
| Dataset | `DELETE /datasets/:id` | Bearer JWT | Deletes owned dataset and cascaded rows/artifacts |
| Analysis | `GET /datasets/:id/analysis` | Bearer JWT | Dynamic dataset analysis and chart recommendations |
| Aggregation | `POST /datasets/:id/aggregate` | Bearer JWT | JSON aggregate DTO; grouped results |
| Visualization data | `POST /datasets/:id/visualizations/data` | Bearer JWT | JSON chart config; Recharts-ready data |
| Saved visualization | `POST/GET /visualizations`, `GET/PATCH/DELETE /visualizations/:id` | Bearer JWT | JSON DTOs; lists include pagination |
| Saved report | `POST/GET /reports`, `GET/PATCH/DELETE /reports/:id` | Bearer JWT | JSON DTOs; lists include pagination |

Detailed request/response schemas, status codes, authentication, examples, and
error bodies are available from Swagger. For chart configuration and aggregate
filters/metrics, see the examples in the preceding sections. `POST /datasets`
accepts CSV, XLSX, or XLS up to 20 MiB; legacy `POST /upload` accepts CSV,
XLSX, XLS, PNG, or JPEG up to 20 MiB. Both use multipart field `file` and
require Bearer JWT. File extension, MIME type, and content are checked. CSV
must be UTF-8; the first spreadsheet worksheet is processed.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL Prisma connection string |
| `JWT_SECRET` | Yes | Random secret of at least 32 characters |
| `PORT` | No | HTTP port; defaults to 3000 |
| `CORS_ORIGINS` | No | Comma-separated exact `http://` or `https://` origins; CORS is disabled when empty |
| `TEST_DATABASE_URL` | Integration tests | Separate PostgreSQL test database; its database name must contain a `test` segment and differ from process and `.env` `DATABASE_URL` targets |

### Migrations and database safety

The migrations are ordered `20261103000000_init` then
`20261103010000_saved_artifacts`. Both use foreign keys with cascade relations;
dataset rows have a `(dataset_id, row_index)` index, saved artifacts have
owner/dataset indexes, and flexible artifact configuration/snapshot fields map
to PostgreSQL JSONB. Review the target in `DATABASE_URL` before any migration.
`npm run prisma:migrate` is for a confirmed development database;
`npm run prisma:deploy` applies checked-in migrations to a confirmed deployment
database. Neither command resets a database. Do not point integration tests at
the development database.

```bash
npm run prisma:generate
npx prisma validate
npx prisma migrate status
npm run prisma:migrate
```

For the full flow test, create and migrate a dedicated PostgreSQL database such
as `matiksight_test`, then set `TEST_DATABASE_URL` to that database. Before
loading any Prisma service, Jest setup checks this URL against both the process
`DATABASE_URL` and `DATABASE_URL` parsed from `.env`; it also requires a test
database name. If no application URL is available to compare or the target is
ambiguous, setup fails. The test creates a uniquely named user and only cleans
that user's data; it never resets or truncates a database. A missing or unsafe
target fails setup instead of silently skipping. Run the integration test only
after verifying the dedicated database target:
`npm run test:integration -- --runInBand`.

### Verification commands

```bash
npm test -- --runInBand
npm run test:e2e -- --runInBand
npm run test:integration -- --runInBand
npx prisma validate
npx prisma migrate status
npm run build
npm run lint
git diff --check
```

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Observability

In production applications, observability is essential for understanding how your system behaves, detecting issues early, and maintaining reliable performance.

[NestJS Observe](https://observe.nestjs.com) automatically instruments your NestJS application, giving you deep visibility into your system with minimal setup:

- **Distributed tracing:** Follow requests across services and understand how they flow through your system.
- **Waterfall analysis:** Visualize request execution and identify slow operations, bottlenecks, and unexpected delays.
- **Performance analysis:** Analyze application performance in real time and quickly pinpoint areas that need optimization.
- **Metrics:** Track key application and infrastructure metrics to understand system health and performance trends.
- **Logging:** Centralize and correlate logs with traces and other telemetry to make debugging easier.
- **Error tracking:** Detect errors quickly and investigate their root causes with the surrounding context.
- **SLA monitoring:** Track service-level objectives and identify when your application is approaching or exceeding defined thresholds.
- **Alarms and alerts:** Set up alerts for critical errors, performance degradation, SLA violations, and other anomalies so your team can react quickly.

To add it to this project, run this and approve the code it prints at [observe.nestjs.com/link](https://observe.nestjs.com/link) - signing up for free if you have no account:

```bash
$ npx @nestjs/observe link
```

It installs `@nestjs/observe`, wires it into `AppModule` and `main.ts`, and writes the app key and secret into `.env`, which every `nest start` script (`start`, `start:dev`, `start:debug`) then loads. In production, set `OBSERVE_APP_KEY` and `OBSERVE_APP_SECRET` in the environment instead.

Or do it by hand:

```bash
$ npm install @nestjs/observe
```

Then follow the [setup guide](https://docs.nestjs.com/observability/sdk) - it takes a single import and an app key.

The free plan needs no payment details and covers 300,000 events a month. You can also browse the [live demo](https://www.observe-demo.nestjs.com/dashboard) first - the whole dashboard over a busy service's data, with nothing to install.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Auto-instrument your application with [NestJS Observe](https://observe.nestjs.com). Distributed tracing, metrics, and logging made easy. Error tracking and performance monitoring for your NestJS applications.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
