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
exports.SavedReportsController = exports.SavedVisualizationsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const saved_artifact_dto_1 = require("./dto/saved-artifact.dto");
const saved_artifacts_service_1 = require("./saved-artifacts.service");
const swagger_1 = require("@nestjs/swagger");
const api_contract_1 = require("../swagger/api-contract");
const savedReportRecordSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        datasetId: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        description: { type: 'string', nullable: true },
        configuration: { type: 'object', additionalProperties: true },
        snapshot: { type: 'object', nullable: true, additionalProperties: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
    },
    additionalProperties: false,
};
const savedReportResponseSchema = {
    type: 'object',
    required: ['success', 'data'],
    properties: { success: { type: 'boolean' }, data: savedReportRecordSchema },
};
const savedReportsListResponseSchema = {
    type: 'object',
    required: ['success', 'data', 'pagination'],
    properties: {
        success: { type: 'boolean' },
        data: { type: 'array', items: { ...savedReportRecordSchema, properties: Object.fromEntries(Object.entries(savedReportRecordSchema.properties).filter(([key]) => key !== 'snapshot')) } },
        pagination: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' } } },
    },
};
let SavedVisualizationsController = class SavedVisualizationsController {
    saved;
    constructor(saved) {
        this.saved = saved;
    }
    create(request, body) {
        return this.saved.createVisualization(request.user.id, body);
    }
    list(request, query) {
        return this.saved.listVisualizations(request.user.id, query);
    }
    detail(request, id) {
        return this.saved.visualization(request.user.id, id);
    }
    patch(request, id, body) {
        return this.saved.patchVisualization(request.user.id, id, body);
    }
    remove(request, id) {
        return this.saved.removeVisualization(request.user.id, id);
    }
};
exports.SavedVisualizationsController = SavedVisualizationsController;
__decorate([
    (0, common_1.Post)(),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'Save a visualization configuration',
        description: 'Requires Bearer JWT and ownership of `datasetId`. Stores chart configuration only; generated data is requested through the visualization data endpoint.',
        successStatus: 201,
        successDescription: 'Saved visualization record.',
        successExample: { success: true, data: { id: '<uuid>', datasetId: '<uuid>', name: 'Average by region', description: null, chartType: 'bar', configuration: { chartType: 'bar', xAxis: 'region', yAxis: 'amount', groupBy: ['region'], aggregation: 'average', filters: [], sort: null, limit: 100 }, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' } },
        errors: [400, 401, 404, 413, 500],
    }),
    (0, api_contract_1.ApiJsonRequest)({
        type: 'object', required: ['datasetId', 'name', 'configuration'],
        properties: {
            datasetId: { type: 'string', format: 'uuid' }, name: { type: 'string', minLength: 1, maxLength: 160 }, description: { type: 'string', nullable: true, maxLength: 2000 },
            configuration: {
                type: 'object', required: ['chartType', 'xAxis', 'yAxis'],
                properties: {
                    chartType: { type: 'string', enum: ['bar', 'line', 'pie', 'area', 'scatter'] }, xAxis: { type: 'string', maxLength: 255 }, yAxis: { type: 'string', maxLength: 255 },
                    groupBy: { type: 'array', maxItems: 3, items: { type: 'string' } }, aggregation: { type: 'string', enum: ['count', 'sum', 'average', 'minimum', 'maximum', 'distinct_count'] },
                    filters: { type: 'array', maxItems: 20, items: { type: 'object', required: ['column', 'operator'], properties: { column: { type: 'string' }, operator: { type: 'string', enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'isNull'] }, value: {} } } },
                    sort: { type: 'object', properties: { column: { type: 'string' }, direction: { type: 'string', enum: ['asc', 'desc'] } } }, limit: { type: 'integer', minimum: 1, maximum: 1000 },
                },
            },
        },
    }, { datasetId: '<uuid>', name: 'Average by region', description: 'Compare values by region', configuration: { chartType: 'bar', xAxis: 'region', yAxis: 'amount', groupBy: [], aggregation: 'average', filters: [], sort: { column: 'value', direction: 'desc' }, limit: 100 } }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, saved_artifact_dto_1.CreateSavedVisualizationDto]),
    __metadata("design:returntype", void 0)
], SavedVisualizationsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, api_contract_1.ApiListQuery)(true),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'List saved visualizations',
        description: 'Requires Bearer JWT. Lists only the caller’s visualizations; page defaults to 1, limit to 20 (maximum 100), with optional name search.',
        successStatus: 200,
        successDescription: 'Paginated saved visualization records.',
        successExample: { success: true, data: [{ id: '<uuid>', datasetId: '<uuid>', name: 'Average by region', description: null, chartType: 'bar', configuration: { chartType: 'bar', xAxis: 'region', yAxis: 'amount', groupBy: ['region'], aggregation: 'average', filters: [], sort: null, limit: 100 }, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
        errors: [400, 401, 500],
    }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, saved_artifact_dto_1.ListSavedArtifactsDto]),
    __metadata("design:returntype", void 0)
], SavedVisualizationsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, api_contract_1.ApiUuidPath)(),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'Get a saved visualization',
        description: 'Requires Bearer JWT and visualization ownership.',
        successStatus: 200,
        successDescription: 'Saved visualization configuration.',
        successExample: { success: true, data: { id: '<uuid>', datasetId: '<uuid>', name: 'Average by region', description: null, chartType: 'bar', configuration: { chartType: 'bar', xAxis: 'region', yAxis: 'amount', groupBy: ['region'], aggregation: 'average', filters: [], sort: null, limit: 100 }, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' } },
        errors: [400, 401, 404, 500],
    }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SavedVisualizationsController.prototype, "detail", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, api_contract_1.ApiUuidPath)(),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'Update a saved visualization',
        description: 'Requires Bearer JWT and ownership. PATCH accepts one or more fields; a provided configuration must be complete and valid.',
        successStatus: 200,
        successDescription: 'Updated saved visualization.',
        successExample: { success: true, data: { id: '<uuid>', datasetId: '<uuid>', name: 'Updated chart', description: 'Updated', chartType: 'bar', configuration: { chartType: 'bar', xAxis: 'region', yAxis: 'amount', groupBy: ['region'], aggregation: 'average', filters: [], sort: null, limit: 100 }, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:01:00.000Z' } },
        errors: [400, 401, 404, 413, 500],
    }),
    (0, api_contract_1.ApiJsonRequest)({
        type: 'object', minProperties: 1,
        properties: {
            datasetId: { type: 'string', format: 'uuid' }, name: { type: 'string', maxLength: 160 }, description: { type: 'string', nullable: true, maxLength: 2000 },
            configuration: { type: 'object', required: ['chartType', 'xAxis', 'yAxis'], properties: { chartType: { type: 'string', enum: ['bar', 'line', 'pie', 'area', 'scatter'] }, xAxis: { type: 'string' }, yAxis: { type: 'string' }, groupBy: { type: 'array', maxItems: 3, items: { type: 'string' } }, aggregation: { type: 'string', enum: ['count', 'sum', 'average', 'minimum', 'maximum', 'distinct_count'] }, filters: { type: 'array', maxItems: 20, items: { type: 'object', additionalProperties: true } }, sort: { type: 'object', additionalProperties: true }, limit: { type: 'integer', minimum: 1, maximum: 1000 } } },
        },
    }, { name: 'Updated chart' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, saved_artifact_dto_1.PatchSavedVisualizationDto]),
    __metadata("design:returntype", void 0)
], SavedVisualizationsController.prototype, "patch", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, api_contract_1.ApiUuidPath)(),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'Delete a saved visualization',
        description: 'Requires Bearer JWT and visualization ownership.',
        successStatus: 200,
        successDescription: 'Saved visualization deleted.',
        successExample: { success: true, message: 'Saved visualization berhasil dihapus.' },
        errors: [400, 401, 404, 500],
    }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SavedVisualizationsController.prototype, "remove", null);
exports.SavedVisualizationsController = SavedVisualizationsController = __decorate([
    (0, common_1.Controller)('visualizations'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiTags)('saved visualizations'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [saved_artifacts_service_1.SavedArtifactsService])
], SavedVisualizationsController);
let SavedReportsController = class SavedReportsController {
    saved;
    constructor(saved) {
        this.saved = saved;
    }
    create(request, body) {
        return this.saved.createReport(request.user.id, body);
    }
    list(request, query) {
        return this.saved.listReports(request.user.id, query);
    }
    detail(request, id) {
        return this.saved.report(request.user.id, id);
    }
    patch(request, id, body) {
        return this.saved.patchReport(request.user.id, id, body);
    }
    remove(request, id) {
        return this.saved.removeReport(request.user.id, id);
    }
};
exports.SavedReportsController = SavedReportsController;
__decorate([
    (0, common_1.Post)(),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'Create a saved report',
        description: 'Requires Bearer JWT and ownership of `datasetId`. Configuration is generic JSON; snapshot is optional. The dataset rows are not copied.',
        successStatus: 201,
        successDescription: 'Saved report record.',
        successSchema: savedReportResponseSchema,
        successExample: { success: true, data: { id: '<uuid>', datasetId: '<uuid>', name: 'Quarterly overview', description: null, configuration: { sections: [{ title: 'Overview', visualizationIds: ['<uuid>'] }] }, snapshot: { totalRows: 120, generatedAt: '2026-11-03T00:00:00.000Z' }, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' } },
        errors: [400, 401, 404, 413, 500],
    }),
    (0, api_contract_1.ApiJsonRequest)({
        type: 'object', required: ['datasetId', 'name', 'configuration'],
        properties: { datasetId: { type: 'string', format: 'uuid' }, name: { type: 'string', minLength: 1, maxLength: 160 }, description: { type: 'string', maxLength: 2000 }, configuration: { type: 'object', additionalProperties: true }, snapshot: { type: 'object', additionalProperties: true } },
    }, { datasetId: '<uuid>', name: 'Quarterly overview', description: 'Custom report summary', configuration: { sections: [{ title: 'Overview', visualizationIds: ['<uuid>'] }] }, snapshot: { totalRows: 120, generatedAt: '2026-11-03T00:00:00.000Z' } }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, saved_artifact_dto_1.CreateSavedReportDto]),
    __metadata("design:returntype", void 0)
], SavedReportsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, api_contract_1.ApiListQuery)(true),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'List saved reports',
        description: 'Requires Bearer JWT. Lists only the caller’s reports; page defaults to 1, limit to 20 (maximum 100), with optional name search. List response omits snapshots.',
        successStatus: 200,
        successDescription: 'Paginated saved reports.',
        successSchema: savedReportsListResponseSchema,
        successExample: { success: true, data: [{ id: '<uuid>', datasetId: '<uuid>', name: 'Quarterly overview', description: null, configuration: { sections: [] }, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
        errors: [400, 401, 500],
    }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, saved_artifact_dto_1.ListSavedArtifactsDto]),
    __metadata("design:returntype", void 0)
], SavedReportsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, api_contract_1.ApiUuidPath)(),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'Get a saved report',
        description: 'Requires Bearer JWT and report ownership.',
        successStatus: 200,
        successDescription: 'Saved report configuration and optional snapshot.',
        successSchema: savedReportResponseSchema,
        successExample: { success: true, data: { id: '<uuid>', datasetId: '<uuid>', name: 'Quarterly overview', description: null, configuration: { sections: [] }, snapshot: { totalRows: 120 }, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' } },
        errors: [400, 401, 404, 500],
    }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SavedReportsController.prototype, "detail", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, api_contract_1.ApiUuidPath)(),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'Update a saved report',
        description: 'Requires Bearer JWT and ownership. PATCH accepts one or more fields; configuration and snapshot remain bounded JSON objects.',
        successStatus: 200,
        successDescription: 'Updated report.',
        successSchema: savedReportResponseSchema,
        successExample: { success: true, data: { id: '<uuid>', datasetId: '<uuid>', name: 'Updated report', description: null, configuration: { sections: [] }, snapshot: null, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:01:00.000Z' } },
        errors: [400, 401, 404, 413, 500],
    }),
    (0, api_contract_1.ApiJsonRequest)({
        type: 'object', minProperties: 1,
        properties: { datasetId: { type: 'string', format: 'uuid' }, name: { type: 'string', maxLength: 160 }, description: { type: 'string', maxLength: 2000 }, configuration: { type: 'object', additionalProperties: true }, snapshot: { type: 'object', nullable: true, additionalProperties: true } },
    }, { name: 'Updated report', configuration: { sections: [] } }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, saved_artifact_dto_1.PatchSavedReportDto]),
    __metadata("design:returntype", void 0)
], SavedReportsController.prototype, "patch", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, api_contract_1.ApiUuidPath)(),
    (0, api_contract_1.ApiEndpointDocs)({
        summary: 'Delete a saved report',
        description: 'Requires Bearer JWT and report ownership.',
        successStatus: 200,
        successDescription: 'Report deleted.',
        successExample: { success: true, message: 'Report berhasil dihapus.' },
        errors: [400, 401, 404, 500],
    }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SavedReportsController.prototype, "remove", null);
exports.SavedReportsController = SavedReportsController = __decorate([
    (0, common_1.Controller)('reports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiTags)('saved reports'),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [saved_artifacts_service_1.SavedArtifactsService])
], SavedReportsController);
//# sourceMappingURL=saved-artifacts.controller.js.map