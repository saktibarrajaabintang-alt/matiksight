"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const list_datasets_dto_1 = require("./dto/list-datasets.dto");
const preview_dataset_dto_1 = require("./dto/preview-dataset.dto");
const datasets_service_1 = require("./datasets.service");
const dataset_analysis_service_1 = require("./analysis/dataset-analysis.service");
const analysis_request_dto_1 = require("./analysis/dto/analysis-request.dto");
const swagger_1 = require("@nestjs/swagger");
const api_contract_1 = require("../swagger/api-contract");
const scalarValueSchema = {
    oneOf: [
        { type: 'string' }, { type: 'number' }, { type: 'boolean' },
        { type: 'string', nullable: true }, { type: 'number', nullable: true },
    ],
};
const aggregateResponseSchema = {
    type: 'object', required: ['success', 'data'],
    properties: {
        success: { type: 'boolean' },
        data: {
            type: 'object',
            required: ['datasetId', 'groupBy', 'metrics', 'filters', 'totalGroups', 'limit', 'results'],
            properties: {
                datasetId: { type: 'string', format: 'uuid' }, groupBy: { type: 'array', items: { type: 'string' } },
                metrics: { type: 'array', items: { type: 'object', properties: { key: { type: 'string' }, column: { type: 'string', nullable: true }, operation: { type: 'string', enum: ['count', 'sum', 'average', 'minimum', 'maximum', 'distinct_count'] } } } },
                filters: { type: 'array', items: { type: 'object', additionalProperties: true } },
                totalGroups: { type: 'integer' }, limit: { type: 'integer' },
                results: { type: 'array', items: { type: 'object', additionalProperties: scalarValueSchema } },
            },
        },
    },
};
const visualizationResponseSchema = {
    type: 'object', required: ['success', 'chart', 'data'],
    properties: {
        success: { type: 'boolean' },
        chart: { type: 'object', properties: { type: { type: 'string', enum: ['bar', 'line', 'pie', 'area', 'scatter'] }, xAxis: { type: 'string' }, yAxis: { type: 'string' }, aggregation: { type: 'string', nullable: true }, groupBy: { type: 'array', items: { type: 'string' } }, totalGroups: { type: 'integer' }, limit: { type: 'integer' } } },
        data: { type: 'array', items: { type: 'object', additionalProperties: scalarValueSchema } },
    },
};
let DatasetsController = class DatasetsController {
    datasets;
    analysisService;
    constructor(datasets, analysisService) {
        this.datasets = datasets;
        this.analysisService = analysisService;
    }
    upload(request, file) {
        return this.datasets.create(request.user.id, file);
    }
    list(request, query) {
        return this.datasets.findAll(request.user.id, query);
    }
    preview(request, id, query) {
        return this.datasets.preview(request.user.id, id, query);
    }
    detail(request, id) {
        return this.datasets.findOne(request.user.id, id);
    }
    remove(request, id) {
        return this.datasets.remove(request.user.id, id);
    }
    analysis(request, id) {
        return this.analysisService.analysis(request.user.id, id);
    }
    aggregate(request, id, body) {
        return this.analysisService.aggregate(request.user.id, id, body);
    }
    visualizationData(request, id, body) {
        return this.analysisService.visualizationData(request.user.id, id, body);
    }
};
exports.DatasetsController = DatasetsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, api_contract_1.ApiMultipartFileRequest)(),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'Upload and profile a dataset',
        description: 'Requires Bearer JWT ownership. Accepts CSV/XLSX/XLS up to 20 MiB as multipart field `file`; persists dataset rows and returns preview and dynamic profiling.',
        successStatus: 201,
        successDescription: 'Dataset and profiling response.',
        successExample: {
            success: true,
            dataset: { id: '<uuid>', name: 'custom', originalFilename: 'custom.csv', fileType: 'csv', fileSize: 42, rowCount: 1, columnCount: 2, createdAt: '2026-11-03T00:00:00.000Z', mimeType: 'text/csv', sheetName: null },
            columns: ['area', 'measure'], totalRows: 1, preview: [{ area: 'North', measure: '2' }],
            columnMetadata: [{ name: 'measure', type: 'number', nullable: false, uniqueCount: 1, nullCount: 0, min: 2, max: 2, mean: 2 }],
            profiling: { totalRows: 1, totalColumns: 2, duplicateRows: 0, missingValues: 0, dateRange: [], dataQuality: { score: 100, missingValues: 0, duplicateRows: 0 } },
        },
        errors: [400, 401, 413, 415, 500],
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 20 * 1024 * 1024, files: 1 } })),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DatasetsController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)(),
    (0, api_contract_1.ApiListQuery)(true),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'List owned datasets',
        description: 'Requires Bearer JWT. `page` defaults to 1, `limit` to 20 and is capped at 100; optional `search` matches dataset name or filename.',
        successStatus: 200,
        successDescription: 'Paginated dataset metadata owned by the caller.',
        successExample: { success: true, data: [{ id: '<uuid>', name: 'custom', originalFilename: 'custom.csv', fileType: 'csv', fileSize: 42, rowCount: 1, columnCount: 2, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
        errors: [400, 401, 500],
    }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_datasets_dto_1.ListDatasetsDto]),
    __metadata("design:returntype", void 0)
], DatasetsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id/preview'),
    (0, api_contract_1.ApiUuidPath)(),
    (0, api_contract_1.ApiListQuery)(),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'Preview dataset rows',
        description: 'Requires Bearer JWT and dataset ownership. `page` defaults to 1; `limit` defaults to 20 and is capped at 100.',
        successStatus: 200,
        successDescription: 'Rows with pagination metadata.',
        successExample: { success: true, data: [{ area: 'North', measure: '2' }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
        errors: [400, 401, 404, 500],
    }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, preview_dataset_dto_1.PreviewDatasetDto]),
    __metadata("design:returntype", void 0)
], DatasetsController.prototype, "preview", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, api_contract_1.ApiUuidPath)(),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'Get dataset metadata',
        description: 'Requires Bearer JWT and dataset ownership.',
        successStatus: 200,
        successDescription: 'Dataset metadata, schema and profiling.',
        successExample: { success: true, data: { id: '<uuid>', name: 'custom', originalFilename: 'custom.csv', fileType: 'csv', fileSize: 42, rowCount: 1, columnCount: 2, columns: ['area', 'measure'], columnMetadata: [{ name: 'measure', type: 'number', nullable: false, uniqueCount: 1, nullCount: 0, min: 2, max: 2, mean: 2 }], profiling: { totalRows: 1, totalColumns: 2, duplicateRows: 0, missingValues: 0 }, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' } },
        errors: [400, 401, 404, 500],
    }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DatasetsController.prototype, "detail", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, api_contract_1.ApiUuidPath)(),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'Delete a dataset',
        description: 'Requires Bearer JWT and dataset ownership. Related rows and saved artifacts cascade with the dataset.',
        successStatus: 200,
        successDescription: 'Dataset deleted.',
        successExample: { success: true, message: 'Dataset berhasil dihapus.' },
        errors: [400, 401, 404, 500],
    }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DatasetsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/analysis'),
    (0, api_contract_1.ApiUuidPath)(),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'Analyze a dataset',
        description: 'Requires Bearer JWT and dataset ownership. Scans at most 500,000 rows per request and returns dynamic column statistics and chart recommendations.',
        successStatus: 200,
        successDescription: 'Overview, column statistics, data quality and recommendations.',
        successExample: { success: true, data: { overview: { id: '<uuid>', name: 'custom', totalRows: 120, totalColumns: 3 }, columnTypes: { category: 1, number: 1, date: 1 }, columns: [{ name: 'measure', type: 'number', nullable: false, uniqueCount: 40, nullCount: 0, min: 2, max: 90, mean: 24.5 }], numericStatistics: [{ name: 'measure', nullCount: 0, uniqueCount: 40, min: 2, max: 90, mean: 24.5 }], categoricalSummary: [{ name: 'segment', type: 'category', nullCount: 0, uniqueCount: 4 }], dateRange: [{ column: 'period', min: '2026-01-01T00:00:00.000Z', max: '2026-04-30T00:00:00.000Z' }], dataQuality: { score: 98, missingValues: 2, duplicateRows: 0 }, recommendations: [{ chartType: 'line', xAxis: 'period', yAxis: 'measure', aggregation: 'average', reason: 'Date values can show change over time.' }] } },
        errors: [401, 404, 413, 500],
    }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DatasetsController.prototype, "analysis", null);
__decorate([
    (0, common_1.Post)(':id/aggregate'),
    (0, api_contract_1.ApiUuidPath)(),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'Aggregate dataset rows',
        description: 'Requires Bearer JWT and dataset ownership. Supports count, sum, average, minimum, maximum, and distinct_count; at most 3 groupBy columns, 10 metrics, 20 filters, and 1,000 result rows.',
        successStatus: 201,
        successDescription: 'Aggregated rows with metric keys in request order.',
        successSchema: aggregateResponseSchema,
        successExample: { success: true, data: { datasetId: '<uuid>', groupBy: ['segment'], metrics: [{ key: 'metric_1', column: 'measure', operation: 'sum' }], filters: [], totalGroups: 2, limit: 50, results: [{ segment: 'A', metric_1: 420 }, { segment: 'B', metric_1: 310 }] } },
        errors: [400, 401, 404, 413, 500],
    }),
    (0, api_contract_1.ApiJsonRequest)({
        type: 'object', required: ['metrics'],
        properties: {
            groupBy: { type: 'array', maxItems: 3, items: { type: 'string' } },
            metrics: { type: 'array', minItems: 1, maxItems: 10, items: { type: 'object', required: ['operation'], properties: { column: { type: 'string' }, operation: { type: 'string', enum: ['count', 'sum', 'average', 'minimum', 'maximum', 'distinct_count'] } } } },
            filters: { type: 'array', maxItems: 20, items: { type: 'object', required: ['column', 'operator'], properties: { column: { type: 'string' }, operator: { type: 'string', enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'isNull'] }, value: {} } } },
            sort: { type: 'object', required: ['column', 'direction'], properties: { column: { type: 'string' }, direction: { type: 'string', enum: ['asc', 'desc'] } } },
            limit: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
        },
    }, { groupBy: ['segment'], metrics: [{ column: 'measure', operation: 'sum' }, { operation: 'count' }], filters: [{ column: 'measure', operator: 'gte', value: 10 }], sort: { column: 'metric_1', direction: 'desc' }, limit: 50 }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, analysis_request_dto_1.AggregateRequestDto]),
    __metadata("design:returntype", void 0)
], DatasetsController.prototype, "aggregate", null);
__decorate([
    (0, common_1.Post)(':id/visualizations/data'),
    (0, api_contract_1.ApiUuidPath)(),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'Get visualization data',
        description: 'Requires Bearer JWT and dataset ownership. Supports bar, line, area, pie and scatter; response is JSON data suitable for Recharts.',
        successStatus: 201,
        successDescription: 'Chart metadata and data points.',
        successSchema: visualizationResponseSchema,
        successExample: { success: true, chart: { type: 'bar', xAxis: 'segment', yAxis: 'measure', aggregation: 'average', groupBy: ['segment'], totalGroups: 2, limit: 100 }, data: [{ segment: 'A', value: 12.5 }, { segment: 'B', value: 10.3 }] },
        errors: [400, 401, 404, 413, 500],
    }),
    (0, api_contract_1.ApiJsonRequest)({
        type: 'object', required: ['chartType', 'xAxis', 'yAxis'],
        properties: {
            chartType: { type: 'string', enum: ['bar', 'line', 'pie', 'area', 'scatter'] },
            xAxis: { type: 'string' }, yAxis: { type: 'string' },
            groupBy: { type: 'array', maxItems: 3, items: { type: 'string' } },
            aggregation: { type: 'string', enum: ['count', 'sum', 'average', 'minimum', 'maximum', 'distinct_count'], default: 'average' },
            filters: { type: 'array', maxItems: 20, items: { type: 'object', required: ['column', 'operator'], properties: { column: { type: 'string' }, operator: { type: 'string', enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'isNull'] }, value: {} } } },
            sort: { type: 'object', required: ['column', 'direction'], properties: { column: { type: 'string' }, direction: { type: 'string', enum: ['asc', 'desc'] } } },
            limit: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
        },
    }, { chartType: 'bar', xAxis: 'segment', yAxis: 'measure', aggregation: 'average', filters: [{ column: 'measure', operator: 'gt', value: 0 }], sort: { column: 'value', direction: 'desc' }, limit: 100 }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, analysis_request_dto_1.VisualizationRequestDto]),
    __metadata("design:returntype", void 0)
], DatasetsController.prototype, "visualizationData", null);
exports.DatasetsController = DatasetsController = __decorate([
    (0, common_1.Controller)('datasets'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiTags)('datasets'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [datasets_service_1.DatasetsService,
        dataset_analysis_service_1.DatasetAnalysisService])
], DatasetsController);
//# sourceMappingURL=datasets.controller.js.map