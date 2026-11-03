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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavedArtifactsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma/prisma.service");
const dataset_analysis_service_1 = require("../datasets/analysis/dataset-analysis.service");
const MAX_VISUALIZATION_CONFIG_BYTES = 32 * 1024;
const MAX_REPORT_CONFIG_BYTES = 48 * 1024;
const MAX_REPORT_SNAPSHOT_BYTES = 32 * 1024;
let SavedArtifactsService = class SavedArtifactsService {
    prisma;
    datasetAnalysis;
    constructor(prisma, datasetAnalysis) {
        this.prisma = prisma;
        this.datasetAnalysis = datasetAnalysis;
    }
    async createVisualization(userId, input) {
        this.assertName(input.name);
        if (!input.configuration || typeof input.configuration !== 'object')
            throw new common_1.BadRequestException('configuration harus berupa object chart.');
        this.assertSize(input.configuration, MAX_VISUALIZATION_CONFIG_BYTES, 'Konfigurasi visualisasi');
        const config = await this.validateVisualization(userId, input.datasetId, input.configuration);
        const saved = await this.prisma.savedVisualization.create({
            data: {
                userId,
                datasetId: input.datasetId,
                name: input.name.trim(),
                description: input.description?.trim() || null,
                chartType: config.chartType,
                configuration: config,
            },
        });
        return { success: true, data: this.toPublicArtifact(saved) };
    }
    async listVisualizations(userId, query) {
        const where = {
            userId,
            ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.savedVisualization.findMany({
                where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit,
            }),
            this.prisma.savedVisualization.count({ where }),
        ]);
        return { success: true, data: items.map((item) => this.toPublicArtifact(item)), pagination: this.pagination(query.page, query.limit, total) };
    }
    async visualization(userId, id) {
        const item = await this.prisma.savedVisualization.findFirst({ where: { id, userId } });
        if (!item)
            throw new common_1.NotFoundException('Saved visualization tidak ditemukan.');
        return { success: true, data: this.toPublicArtifact(item) };
    }
    async patchVisualization(userId, id, input) {
        this.assertPatchHasFields(input);
        if (input.datasetId !== undefined && typeof input.datasetId !== 'string')
            throw new common_1.BadRequestException('datasetId harus UUID.');
        if (input.configuration !== undefined && (!input.configuration || typeof input.configuration !== 'object')) {
            throw new common_1.BadRequestException('configuration harus berupa object chart.');
        }
        const existing = await this.prisma.savedVisualization.findFirst({ where: { id, userId } });
        if (!existing)
            throw new common_1.NotFoundException('Saved visualization tidak ditemukan.');
        const datasetId = input.datasetId ?? existing.datasetId;
        const rawConfig = input.configuration ?? existing.configuration;
        this.assertSize(rawConfig, MAX_VISUALIZATION_CONFIG_BYTES, 'Konfigurasi visualisasi');
        const config = await this.validateVisualization(userId, datasetId, rawConfig);
        const update = await this.prisma.savedVisualization.updateMany({
            where: { id, userId },
            data: {
                ...(input.datasetId ? { datasetId } : {}),
                ...(input.name !== undefined ? { name: this.checkedName(input.name) } : {}),
                ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
                ...(input.configuration !== undefined || input.datasetId !== undefined
                    ? { chartType: config.chartType, configuration: config }
                    : {}),
            },
        });
        if (update.count === 0)
            throw new common_1.NotFoundException('Saved visualization tidak ditemukan.');
        return this.visualization(userId, id);
    }
    async removeVisualization(userId, id) {
        const result = await this.prisma.savedVisualization.deleteMany({ where: { id, userId } });
        if (result.count === 0)
            throw new common_1.NotFoundException('Saved visualization tidak ditemukan.');
        return { success: true, message: 'Saved visualization berhasil dihapus.' };
    }
    async createReport(userId, input) {
        this.assertName(input.name);
        await this.assertDatasetOwner(userId, input.datasetId);
        if (!input.configuration || typeof input.configuration !== 'object' || Array.isArray(input.configuration)) {
            throw new common_1.BadRequestException('configuration harus berupa object.');
        }
        this.assertSize(input.configuration, MAX_REPORT_CONFIG_BYTES, 'Konfigurasi report');
        if (input.snapshot !== undefined)
            this.assertSize(input.snapshot, MAX_REPORT_SNAPSHOT_BYTES, 'Snapshot report');
        const saved = await this.prisma.savedReport.create({
            data: {
                userId,
                datasetId: input.datasetId,
                name: input.name.trim(),
                description: input.description?.trim() || null,
                configuration: input.configuration,
                ...(input.snapshot !== undefined ? { snapshot: input.snapshot } : {}),
            },
        });
        return { success: true, data: this.toPublicArtifact(saved) };
    }
    async listReports(userId, query) {
        const where = {
            userId,
            ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.savedReport.findMany({
                where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit,
                select: { id: true, datasetId: true, name: true, description: true, configuration: true, createdAt: true, updatedAt: true },
            }),
            this.prisma.savedReport.count({ where }),
        ]);
        return { success: true, data: items.map((item) => this.toPublicArtifact(item)), pagination: this.pagination(query.page, query.limit, total) };
    }
    async report(userId, id) {
        const item = await this.prisma.savedReport.findFirst({ where: { id, userId } });
        if (!item)
            throw new common_1.NotFoundException('Report tidak ditemukan.');
        return { success: true, data: this.toPublicArtifact(item) };
    }
    async patchReport(userId, id, input) {
        this.assertPatchHasFields(input);
        if (input.datasetId !== undefined && typeof input.datasetId !== 'string')
            throw new common_1.BadRequestException('datasetId harus UUID.');
        if (input.configuration !== undefined && (!input.configuration || typeof input.configuration !== 'object' || Array.isArray(input.configuration))) {
            throw new common_1.BadRequestException('configuration harus berupa object.');
        }
        const existing = await this.prisma.savedReport.findFirst({ where: { id, userId } });
        if (!existing)
            throw new common_1.NotFoundException('Report tidak ditemukan.');
        const datasetId = input.datasetId ?? existing.datasetId;
        if (input.datasetId !== undefined)
            await this.assertDatasetOwner(userId, datasetId);
        const configuration = input.configuration ?? existing.configuration;
        const snapshot = input.snapshot === undefined ? existing.snapshot : input.snapshot;
        this.assertSize(configuration, MAX_REPORT_CONFIG_BYTES, 'Konfigurasi report');
        if (snapshot !== null)
            this.assertSize(snapshot, MAX_REPORT_SNAPSHOT_BYTES, 'Snapshot report');
        const update = await this.prisma.savedReport.updateMany({
            where: { id, userId },
            data: {
                ...(input.datasetId ? { datasetId } : {}),
                ...(input.name !== undefined ? { name: this.checkedName(input.name) } : {}),
                ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
                ...(input.configuration !== undefined ? { configuration: input.configuration } : {}),
                ...(input.snapshot !== undefined ? { snapshot: input.snapshot === null ? client_1.Prisma.DbNull : input.snapshot } : {}),
            },
        });
        if (update.count === 0)
            throw new common_1.NotFoundException('Report tidak ditemukan.');
        return this.report(userId, id);
    }
    async removeReport(userId, id) {
        const result = await this.prisma.savedReport.deleteMany({ where: { id, userId } });
        if (result.count === 0)
            throw new common_1.NotFoundException('Report tidak ditemukan.');
        return { success: true, message: 'Report berhasil dihapus.' };
    }
    async validateVisualization(userId, datasetId, configuration) {
        const normalized = await this.datasetAnalysis.validateSavedVisualization(userId, datasetId, configuration);
        return normalized;
    }
    async assertDatasetOwner(userId, datasetId) {
        const dataset = await this.prisma.dataset.findFirst({ where: { id: datasetId, userId }, select: { id: true } });
        if (!dataset)
            throw new common_1.NotFoundException('Dataset tidak ditemukan.');
    }
    assertName(name) {
        this.checkedName(name);
    }
    checkedName(name) {
        if (typeof name !== 'string')
            throw new common_1.BadRequestException('Nama harus berupa teks.');
        const normalized = name.trim();
        if (!normalized)
            throw new common_1.BadRequestException('Nama wajib diisi.');
        return normalized;
    }
    assertSize(value, maxBytes, label) {
        const serialized = JSON.stringify(value);
        if (serialized === undefined || Buffer.byteLength(serialized, 'utf8') > maxBytes) {
            throw new common_1.BadRequestException(`${label} melebihi batas ${maxBytes} byte atau tidak valid.`);
        }
    }
    assertPatchHasFields(value) {
        if (!Object.values(value).some((field) => field !== undefined)) {
            throw new common_1.BadRequestException('PATCH harus berisi minimal satu field.');
        }
    }
    toPublicArtifact(item) {
        const { userId: _userId, ...publicRecord } = item;
        return publicRecord;
    }
    pagination(page, limit, total) {
        return { page, limit, total, totalPages: Math.ceil(total / limit) };
    }
};
exports.SavedArtifactsService = SavedArtifactsService;
exports.SavedArtifactsService = SavedArtifactsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        dataset_analysis_service_1.DatasetAnalysisService])
], SavedArtifactsService);
//# sourceMappingURL=saved-artifacts.service.js.map