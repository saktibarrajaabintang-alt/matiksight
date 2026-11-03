import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SavedArtifactsService } from './saved-artifacts.service';

describe('SavedArtifactsService', () => {
  let prisma: any;
  let analysis: any;
  let service: SavedArtifactsService;

  beforeEach(() => {
    prisma = {
      dataset: { findFirst: jest.fn(async ({ where }: any) => where.userId === 'owner' ? { id: where.id } : null) },
      savedVisualization: {
        create: jest.fn(async ({ data }: any) => ({ id: 'visual-1', ...data })),
        findFirst: jest.fn(async ({ where }: any) => where.userId === 'owner' ? { id: where.id, userId: 'owner', datasetId: 'dataset-1', configuration: { chartType: 'bar', xAxis: 'category', yAxis: 'value' } } : null),
        updateMany: jest.fn(async () => ({ count: 1 })),
        deleteMany: jest.fn(async () => ({ count: 1 })),
      },
      savedReport: {
        create: jest.fn(async ({ data }: any) => ({ id: 'report-1', ...data })),
        findFirst: jest.fn(async ({ where }: any) => where.userId === 'owner' ? { id: where.id, userId: 'owner' } : null),
        updateMany: jest.fn(async () => ({ count: 1 })),
        deleteMany: jest.fn(async () => ({ count: 1 })),
      },
    };
    analysis = {
      validateSavedVisualization: jest.fn(async (_userId: string, _datasetId: string, config: any) => ({
        ...config, groupBy: [config.xAxis], aggregation: config.aggregation ?? 'average', filters: [], limit: 100,
      })),
    };
    service = new SavedArtifactsService(prisma, analysis);
  });

  it('stores validated visualization config with the JWT owner', async () => {
    const result = await service.createVisualization('owner', {
      datasetId: 'dataset-1', name: 'By category',
      configuration: { chartType: 'bar', xAxis: 'category', yAxis: 'value' } as any,
    });
    expect(result.data).toMatchObject({ id: 'visual-1', datasetId: 'dataset-1', chartType: 'bar' });
    expect(result.data).not.toHaveProperty('userId');
    expect(prisma.savedVisualization.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'owner' }),
    }));
    expect(analysis.validateSavedVisualization).toHaveBeenCalledWith('owner', 'dataset-1', expect.any(Object));
  });

  it('requires an owned dataset for reports and bounds report configuration size', async () => {
    await expect(service.createReport('intruder', {
      datasetId: 'dataset-1', name: 'No access', configuration: {},
    })).rejects.toThrow(NotFoundException);
    await expect(service.createReport('owner', {
      datasetId: 'dataset-1', name: 'Too large', configuration: { blob: 'x'.repeat(70 * 1024) },
    })).rejects.toThrow(BadRequestException);
    expect(prisma.savedReport.create).not.toHaveBeenCalled();
  });

  it('does not update or delete a visualization owned by another user', async () => {
    await expect(service.patchVisualization('intruder', 'visual-1', { name: 'Changed' })).rejects.toThrow(NotFoundException);
    prisma.savedVisualization.deleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.removeVisualization('intruder', 'visual-1')).rejects.toThrow(NotFoundException);
    expect(prisma.savedVisualization.updateMany).not.toHaveBeenCalled();
  });
});
