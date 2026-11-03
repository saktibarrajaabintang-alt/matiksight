import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DatasetAnalysisService } from '../datasets/analysis/dataset-analysis.service';
import { VisualizationRequestDto } from '../datasets/analysis/dto/analysis-request.dto';
import {
  CreateSavedReportDto,
  CreateSavedVisualizationDto,
  ListSavedArtifactsDto,
  PatchSavedReportDto,
  PatchSavedVisualizationDto,
} from './dto/saved-artifact.dto';

const MAX_VISUALIZATION_CONFIG_BYTES = 32 * 1024;
const MAX_REPORT_CONFIG_BYTES = 48 * 1024;
const MAX_REPORT_SNAPSHOT_BYTES = 32 * 1024;

@Injectable()
export class SavedArtifactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly datasetAnalysis: DatasetAnalysisService,
  ) {}

  async createVisualization(userId: string, input: CreateSavedVisualizationDto) {
    this.assertName(input.name);
    if (!input.configuration || typeof input.configuration !== 'object') throw new BadRequestException('configuration harus berupa object chart.');
    this.assertSize(input.configuration, MAX_VISUALIZATION_CONFIG_BYTES, 'Konfigurasi visualisasi');
    const config = await this.validateVisualization(userId, input.datasetId, input.configuration);
    const saved = await this.prisma.savedVisualization.create({
      data: {
        userId,
        datasetId: input.datasetId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        chartType: config.chartType,
        configuration: config as unknown as Prisma.InputJsonValue,
      },
    });
    return { success: true, data: this.toPublicArtifact(saved) };
  }

  async listVisualizations(userId: string, query: ListSavedArtifactsDto) {
    const where: Prisma.SavedVisualizationWhereInput = {
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

  async visualization(userId: string, id: string) {
    const item = await this.prisma.savedVisualization.findFirst({ where: { id, userId } });
    if (!item) throw new NotFoundException('Saved visualization tidak ditemukan.');
    return { success: true, data: this.toPublicArtifact(item) };
  }

  async patchVisualization(userId: string, id: string, input: PatchSavedVisualizationDto) {
    this.assertPatchHasFields(input);
    if (input.datasetId !== undefined && typeof input.datasetId !== 'string') throw new BadRequestException('datasetId harus UUID.');
    if (input.configuration !== undefined && (!input.configuration || typeof input.configuration !== 'object')) {
      throw new BadRequestException('configuration harus berupa object chart.');
    }
    const existing = await this.prisma.savedVisualization.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Saved visualization tidak ditemukan.');
    const datasetId = input.datasetId ?? existing.datasetId;
    const rawConfig = input.configuration ?? existing.configuration as unknown as VisualizationRequestDto;
    this.assertSize(rawConfig, MAX_VISUALIZATION_CONFIG_BYTES, 'Konfigurasi visualisasi');
    const config = await this.validateVisualization(userId, datasetId, rawConfig);
    const update = await this.prisma.savedVisualization.updateMany({
      where: { id, userId },
      data: {
        ...(input.datasetId ? { datasetId } : {}),
        ...(input.name !== undefined ? { name: this.checkedName(input.name) } : {}),
        ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
        ...(input.configuration !== undefined || input.datasetId !== undefined
          ? { chartType: config.chartType, configuration: config as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });
    if (update.count === 0) throw new NotFoundException('Saved visualization tidak ditemukan.');
    return this.visualization(userId, id);
  }

  async removeVisualization(userId: string, id: string) {
    const result = await this.prisma.savedVisualization.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new NotFoundException('Saved visualization tidak ditemukan.');
    return { success: true, message: 'Saved visualization berhasil dihapus.' };
  }

  async createReport(userId: string, input: CreateSavedReportDto) {
    this.assertName(input.name);
    await this.assertDatasetOwner(userId, input.datasetId);
    if (!input.configuration || typeof input.configuration !== 'object' || Array.isArray(input.configuration)) {
      throw new BadRequestException('configuration harus berupa object.');
    }
    this.assertSize(input.configuration, MAX_REPORT_CONFIG_BYTES, 'Konfigurasi report');
    if (input.snapshot !== undefined) this.assertSize(input.snapshot, MAX_REPORT_SNAPSHOT_BYTES, 'Snapshot report');
    const saved = await this.prisma.savedReport.create({
      data: {
        userId,
        datasetId: input.datasetId,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        configuration: input.configuration as Prisma.InputJsonValue,
        ...(input.snapshot !== undefined ? { snapshot: input.snapshot as Prisma.InputJsonValue } : {}),
      },
    });
    return { success: true, data: this.toPublicArtifact(saved) };
  }

  async listReports(userId: string, query: ListSavedArtifactsDto) {
    const where: Prisma.SavedReportWhereInput = {
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

  async report(userId: string, id: string) {
    const item = await this.prisma.savedReport.findFirst({ where: { id, userId } });
    if (!item) throw new NotFoundException('Report tidak ditemukan.');
    return { success: true, data: this.toPublicArtifact(item) };
  }

  async patchReport(userId: string, id: string, input: PatchSavedReportDto) {
    this.assertPatchHasFields(input);
    if (input.datasetId !== undefined && typeof input.datasetId !== 'string') throw new BadRequestException('datasetId harus UUID.');
    if (input.configuration !== undefined && (!input.configuration || typeof input.configuration !== 'object' || Array.isArray(input.configuration))) {
      throw new BadRequestException('configuration harus berupa object.');
    }
    const existing = await this.prisma.savedReport.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Report tidak ditemukan.');
    const datasetId = input.datasetId ?? existing.datasetId;
    if (input.datasetId !== undefined) await this.assertDatasetOwner(userId, datasetId);
    const configuration = input.configuration ?? existing.configuration;
    const snapshot = input.snapshot === undefined ? existing.snapshot : input.snapshot;
    this.assertSize(configuration, MAX_REPORT_CONFIG_BYTES, 'Konfigurasi report');
    if (snapshot !== null) this.assertSize(snapshot, MAX_REPORT_SNAPSHOT_BYTES, 'Snapshot report');
    const update = await this.prisma.savedReport.updateMany({
      where: { id, userId },
      data: {
        ...(input.datasetId ? { datasetId } : {}),
        ...(input.name !== undefined ? { name: this.checkedName(input.name) } : {}),
        ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
        ...(input.configuration !== undefined ? { configuration: input.configuration as Prisma.InputJsonValue } : {}),
        ...(input.snapshot !== undefined ? { snapshot: input.snapshot === null ? Prisma.DbNull : input.snapshot as Prisma.InputJsonValue } : {}),
      },
    });
    if (update.count === 0) throw new NotFoundException('Report tidak ditemukan.');
    return this.report(userId, id);
  }

  async removeReport(userId: string, id: string) {
    const result = await this.prisma.savedReport.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new NotFoundException('Report tidak ditemukan.');
    return { success: true, message: 'Report berhasil dihapus.' };
  }

  private async validateVisualization(userId: string, datasetId: string, configuration: VisualizationRequestDto) {
    const normalized = await this.datasetAnalysis.validateSavedVisualization(userId, datasetId, configuration);
    return normalized;
  }

  private async assertDatasetOwner(userId: string, datasetId: string) {
    const dataset = await this.prisma.dataset.findFirst({ where: { id: datasetId, userId }, select: { id: true } });
    if (!dataset) throw new NotFoundException('Dataset tidak ditemukan.');
  }

  private assertName(name: string) {
    this.checkedName(name);
  }

  private checkedName(name: string) {
    if (typeof name !== 'string') throw new BadRequestException('Nama harus berupa teks.');
    const normalized = name.trim();
    if (!normalized) throw new BadRequestException('Nama wajib diisi.');
    return normalized;
  }

  private assertSize(value: unknown, maxBytes: number, label: string) {
    const serialized = JSON.stringify(value);
    if (serialized === undefined || Buffer.byteLength(serialized, 'utf8') > maxBytes) {
      throw new BadRequestException(`${label} melebihi batas ${maxBytes} byte atau tidak valid.`);
    }
  }

  private assertPatchHasFields(value: object) {
    if (!Object.values(value).some((field) => field !== undefined)) {
      throw new BadRequestException('PATCH harus berisi minimal satu field.');
    }
  }

  private toPublicArtifact<T extends object>(item: T) {
    const { userId: _userId, ...publicRecord } = item as T & { userId?: string };
    return publicRecord;
  }

  private pagination(page: number, limit: number, total: number) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) };
  }
}
