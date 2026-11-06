import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { basename } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { DatasetProcessingService } from './dataset-processing.service';
import type { UploadFile } from '../upload/upload-file.interface';
import type { ListDatasetsDto } from './dto/list-datasets.dto';
import type { PreviewDatasetDto } from './dto/preview-dataset.dto';
import type { PatchDatasetDto } from './dto/patch-dataset.dto';
import { FileStorageService } from '../storage/file-storage.service';

const ROW_BATCH_SIZE = 500;

@Injectable()
export class DatasetsService {
  private readonly logger = new Logger(DatasetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly processing: DatasetProcessingService,
    private readonly storage: FileStorageService,
  ) {}

  async create(userId: string, file?: UploadFile) {
    const parsed = this.processing.parse(file);
    if (!file) throw new NotFoundException('File wajib diunggah dengan key "file".');
    const originalFilename = Array.from(basename(file!.originalname.replace(/\\/g, '/')))
      .filter((character) => character.charCodeAt(0) >= 32)
      .join('').slice(0, 255) || 'dataset';
    const extension = originalFilename.slice(originalFilename.lastIndexOf('.') + 1).toLowerCase();
    const metadata = {
      name: originalFilename.replace(/\.[^.]+$/, '').slice(0, 255) || originalFilename,
      originalFilename,
      fileType: extension,
      mimeType: file.mimetype,
      fileSize: file!.size,
      rowCount: parsed.totalRows,
      columnCount: parsed.columns.length,
      columns: parsed.columns as Prisma.InputJsonValue,
      columnMetadata: parsed.columnMetadata as unknown as Prisma.InputJsonValue,
      profiling: parsed.profiling as unknown as Prisma.InputJsonValue,
    };
    const storageKey = await this.storage.store(file.buffer, `.${extension}`);
    let dataset;
    try {
      dataset = await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.dataset.create({
          data: { ...metadata, storageKey, userId },
        });
        for (let start = 0; start < parsed.rows.length; start += ROW_BATCH_SIZE) {
          const batch = parsed.rows.slice(start, start + ROW_BATCH_SIZE);
          await transaction.datasetRow.createMany({
            data: batch.map((values, offset) => ({
              datasetId: created.id,
              rowIndex: start + offset,
              values: values as Prisma.InputJsonValue,
            })),
          });
        }
        return created;
      });
    } catch (error) {
      try {
        await this.storage.remove(storageKey);
      } catch {
        this.logger.error('Failed to clean up a stored file after dataset creation failed.');
      }
      throw error;
    }
    return {
      success: true,
      dataset: {
        ...this.toPublicDataset(dataset),
        sheetName: parsed.dataset.sheetName,
      },
      columns: parsed.columns,
      totalRows: parsed.totalRows,
      preview: parsed.preview,
      columnMetadata: parsed.columnMetadata,
      profiling: parsed.profiling,
    };
  }

  async findAll(userId: string, query: ListDatasetsDto) {
    const where: Prisma.DatasetWhereInput = {
      userId,
      ...(query.search ? { OR: [
        { name: { contains: query.search, mode: 'insensitive' } },
        { originalFilename: { contains: query.search, mode: 'insensitive' } },
      ] } : {}),
      ...(query.fileType ? { fileType: query.fileType } : {}),
    };
    const orderBy: Prisma.DatasetOrderByWithRelationInput = {
      [query.sortBy]: query.sortOrder,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.dataset.findMany({ where, orderBy, skip: (query.page - 1) * query.limit, take: query.limit }),
      this.prisma.dataset.count({ where }),
    ]);
    return {
      success: true,
      data: items.map((item) => this.toPublicDataset(item)),
      pagination: this.pagination(query.page, query.limit, total),
    };
  }

  async findOne(userId: string, id: string) {
    const dataset = await this.prisma.dataset.findFirst({ where: { id, userId } });
    if (!dataset) throw new NotFoundException('Dataset tidak ditemukan.');
    return { success: true, data: this.toPublicDataset(dataset) };
  }

  async preview(userId: string, id: string, query: PreviewDatasetDto) {
    const dataset = await this.prisma.dataset.findFirst({
      where: { id, userId },
      select: { id: true, name: true, fileType: true, rowCount: true, columnCount: true, columns: true, columnMetadata: true },
    });
    if (!dataset) throw new NotFoundException('Dataset tidak ditemukan.');
    const rows = await this.prisma.datasetRow.findMany({
      where: { datasetId: id }, orderBy: { rowIndex: 'asc' },
      skip: (query.page - 1) * query.limit, take: query.limit,
    });
    return {
      success: true,
      dataset: {
        id: dataset.id,
        name: dataset.name,
        fileType: dataset.fileType,
        rowCount: dataset.rowCount,
        columnCount: dataset.columnCount,
        columns: dataset.columns,
        columnMetadata: dataset.columnMetadata,
      },
      data: rows.map((row) => row.values),
      pagination: this.pagination(query.page, query.limit, dataset.rowCount),
    };
  }

  async update(userId: string, id: string, input: PatchDatasetDto) {
    const name = input.name.trim();
    if (!name) throw new BadRequestException('Nama dataset tidak boleh kosong.');
    const result = await this.prisma.dataset.updateMany({
      where: { id, userId },
      data: { name },
    });
    if (result.count === 0) throw new NotFoundException('Dataset tidak ditemukan.');
    return this.findOne(userId, id);
  }

  async download(userId: string, id: string) {
    const dataset = await this.prisma.dataset.findFirst({
      where: { id, userId },
      select: { originalFilename: true, mimeType: true, storageKey: true },
    });
    if (!dataset?.storageKey) throw new NotFoundException('File dataset tidak ditemukan.');
    try {
      return {
        buffer: await this.storage.read(dataset.storageKey),
        filename: dataset.originalFilename,
        mimeType: dataset.mimeType ?? 'application/octet-stream',
      };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
        throw new NotFoundException('File dataset tidak ditemukan.');
      }
      throw error;
    }
  }

  async remove(userId: string, id: string) {
    const dataset = await this.prisma.dataset.findFirst({
      where: { id, userId },
      select: { id: true, storageKey: true },
    });
    if (!dataset) throw new NotFoundException('Dataset tidak ditemukan.');
    const result = await this.prisma.dataset.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new NotFoundException('Dataset tidak ditemukan.');
    if (dataset.storageKey) {
      try {
        await this.storage.remove(dataset.storageKey);
      } catch {
        this.logger.error('Failed to remove a dataset file after its database record was deleted.');
        throw new InternalServerErrorException('Dataset berhasil dihapus, tetapi file penyimpanan gagal dibersihkan.');
      }
    }
    return { success: true, message: 'Dataset berhasil dihapus.' };
  }

  private pagination(page: number, limit: number, total: number) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  private toPublicDataset<T extends { userId: string; storageKey?: string | null }>(dataset: T) {
    const { userId: _userId, storageKey: _storageKey, ...publicDataset } = dataset;
    return publicDataset;
  }
}
