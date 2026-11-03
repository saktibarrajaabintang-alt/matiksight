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
exports.DatasetsService = void 0;
const common_1 = require("@nestjs/common");
const node_path_1 = require("node:path");
const prisma_service_1 = require("../prisma/prisma.service");
const dataset_processing_service_1 = require("./dataset-processing.service");
const ROW_BATCH_SIZE = 500;
let DatasetsService = class DatasetsService {
    prisma;
    processing;
    constructor(prisma, processing) {
        this.prisma = prisma;
        this.processing = processing;
    }
    async create(userId, file) {
        const parsed = this.processing.parse(file);
        const originalFilename = Array.from((0, node_path_1.basename)(file.originalname.replace(/\\/g, '/')))
            .filter((character) => character.charCodeAt(0) >= 32)
            .join('').slice(0, 255) || 'dataset';
        const extension = originalFilename.slice(originalFilename.lastIndexOf('.') + 1).toLowerCase();
        const metadata = {
            name: originalFilename.replace(/\.[^.]+$/, '').slice(0, 255) || originalFilename,
            originalFilename,
            fileType: extension,
            fileSize: file.size,
            rowCount: parsed.totalRows,
            columnCount: parsed.columns.length,
            columns: parsed.columns,
            columnMetadata: parsed.columnMetadata,
            profiling: parsed.profiling,
        };
        const dataset = await this.prisma.$transaction(async (transaction) => {
            const created = await transaction.dataset.create({ data: { ...metadata, userId } });
            for (let start = 0; start < parsed.rows.length; start += ROW_BATCH_SIZE) {
                const batch = parsed.rows.slice(start, start + ROW_BATCH_SIZE);
                await transaction.datasetRow.createMany({
                    data: batch.map((values, offset) => ({
                        datasetId: created.id,
                        rowIndex: start + offset,
                        values: values,
                    })),
                });
            }
            return created;
        });
        return {
            success: true,
            dataset: {
                ...this.toPublicDataset(dataset),
                mimeType: file.mimetype,
                sheetName: parsed.dataset.sheetName,
            },
            columns: parsed.columns,
            totalRows: parsed.totalRows,
            preview: parsed.preview,
            columnMetadata: parsed.columnMetadata,
            profiling: parsed.profiling,
        };
    }
    async findAll(userId, query) {
        const where = {
            userId,
            ...(query.search ? { OR: [
                    { name: { contains: query.search, mode: 'insensitive' } },
                    { originalFilename: { contains: query.search, mode: 'insensitive' } },
                ] } : {}),
        };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.dataset.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.limit, take: query.limit }),
            this.prisma.dataset.count({ where }),
        ]);
        return {
            success: true,
            data: items.map((item) => this.toPublicDataset(item)),
            pagination: this.pagination(query.page, query.limit, total),
        };
    }
    async findOne(userId, id) {
        const dataset = await this.prisma.dataset.findFirst({ where: { id, userId } });
        if (!dataset)
            throw new common_1.NotFoundException('Dataset tidak ditemukan.');
        return { success: true, data: this.toPublicDataset(dataset) };
    }
    async preview(userId, id, query) {
        const dataset = await this.prisma.dataset.findFirst({ where: { id, userId }, select: { id: true, rowCount: true } });
        if (!dataset)
            throw new common_1.NotFoundException('Dataset tidak ditemukan.');
        const rows = await this.prisma.datasetRow.findMany({
            where: { datasetId: id }, orderBy: { rowIndex: 'asc' },
            skip: (query.page - 1) * query.limit, take: query.limit,
        });
        return {
            success: true,
            data: rows.map((row) => row.values),
            pagination: this.pagination(query.page, query.limit, dataset.rowCount),
        };
    }
    async remove(userId, id) {
        const result = await this.prisma.dataset.deleteMany({ where: { id, userId } });
        if (result.count === 0)
            throw new common_1.NotFoundException('Dataset tidak ditemukan.');
        return { success: true, message: 'Dataset berhasil dihapus.' };
    }
    pagination(page, limit, total) {
        return { page, limit, total, totalPages: Math.ceil(total / limit) };
    }
    toPublicDataset(dataset) {
        const { userId: _userId, ...publicDataset } = dataset;
        return publicDataset;
    }
};
exports.DatasetsService = DatasetsService;
exports.DatasetsService = DatasetsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, dataset_processing_service_1.DatasetProcessingService])
], DatasetsService);
//# sourceMappingURL=datasets.service.js.map