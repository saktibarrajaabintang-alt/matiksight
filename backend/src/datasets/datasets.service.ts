import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { basename } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { DatasetProcessingService } from './dataset-processing.service';
import type { UploadFile } from '../upload/upload-file.interface';
import type { ListDatasetsDto } from './dto/list-datasets.dto';
import type { PreviewDatasetDto } from './dto/preview-dataset.dto';

const ROW_BATCH_SIZE = 500;

@Injectable()
export class DatasetsService {
  constructor(private readonly prisma: PrismaService, private readonly processing: DatasetProcessingService) {}

  async create(userId: string, file?: UploadFile) {
    const parsed = this.processing.parse(file);
    const originalFilename = Array.from(basename(file!.originalname.replace(/\\/g, '/')))
      .filter((character) => character.charCodeAt(0) >= 32)
      .join('').slice(0, 255) || 'dataset';
    const extension = originalFilename.slice(originalFilename.lastIndexOf('.') + 1).toLowerCase();
    const metadata = {
      name: originalFilename.replace(/\.[^.]+$/, '').slice(0, 255) || originalFilename,
      originalFilename,
      fileType: extension,
      fileSize: file!.size,
      rowCount: parsed.totalRows,
      columnCount: parsed.columns.length,
      columns: parsed.columns as Prisma.InputJsonValue,
      columnMetadata: parsed.columnMetadata as unknown as Prisma.InputJsonValue,
      profiling: parsed.profiling as unknown as Prisma.InputJsonValue,
    };
    const dataset = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.dataset.create({ data: { ...metadata, userId } });
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
    return {
      success: true,
      dataset: {
        ...this.toPublicDataset(dataset),
        mimeType: file!.mimetype,
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

  async findOne(userId: string, id: string) {
    const dataset = await this.prisma.dataset.findFirst({ where: { id, userId } });
    if (!dataset) throw new NotFoundException('Dataset tidak ditemukan.');
    return { success: true, data: this.toPublicDataset(dataset) };
  }

  async preview(userId: string, id: string, query: PreviewDatasetDto) {
    const dataset = await this.prisma.dataset.findFirst({ where: { id, userId }, select: { id: true, rowCount: true } });
    if (!dataset) throw new NotFoundException('Dataset tidak ditemukan.');
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

  async remove(userId: string, id: string) {
    const result = await this.prisma.dataset.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new NotFoundException('Dataset tidak ditemukan.');
    return { success: true, message: 'Dataset berhasil dihapus.' };
  }

  private pagination(page: number, limit: number, total: number) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  private toPublicDataset<T extends { userId: string }>(dataset: T) {
    const { userId: _userId, ...publicDataset } = dataset;
    return publicDataset;
  }
}
