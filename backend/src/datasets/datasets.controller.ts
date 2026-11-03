import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { UploadFile } from '../upload/upload-file.interface';
import { ListDatasetsDto } from './dto/list-datasets.dto';
import { PreviewDatasetDto } from './dto/preview-dataset.dto';
import { DatasetsService } from './datasets.service';
import { DatasetAnalysisService } from './analysis/dataset-analysis.service';
import { AggregateRequestDto, VisualizationRequestDto } from './analysis/dto/analysis-request.dto';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ApiEndpointDocs, ApiJsonRequest, ApiListQuery, ApiMultipartFileRequest, ApiUuidPath } from '../swagger/api-contract';

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

@Controller('datasets')
@UseGuards(JwtAuthGuard)
@ApiTags('datasets')
@ApiBearerAuth()
export class DatasetsController {
  constructor(
    private readonly datasets: DatasetsService,
    private readonly analysisService: DatasetAnalysisService,
  ) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiMultipartFileRequest()
  @ApiEndpointDocs({
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
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024, files: 1 } }))
  upload(@Req() request: AuthenticatedRequest, @UploadedFile() file?: UploadFile) {
    return this.datasets.create(request.user.id, file);
  }

  @Get()
  @ApiListQuery(true)
  @ApiEndpointDocs({
    summary: 'List owned datasets',
    description: 'Requires Bearer JWT. `page` defaults to 1, `limit` to 20 and is capped at 100; optional `search` matches dataset name or filename.',
    successStatus: 200,
    successDescription: 'Paginated dataset metadata owned by the caller.',
    successExample: { success: true, data: [{ id: '<uuid>', name: 'custom', originalFilename: 'custom.csv', fileType: 'csv', fileSize: 42, rowCount: 1, columnCount: 2, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
    errors: [400, 401, 500],
  })
  list(@Req() request: AuthenticatedRequest, @Query() query: ListDatasetsDto) {
    return this.datasets.findAll(request.user.id, query);
  }

  @Get(':id/preview')
  @ApiUuidPath()
  @ApiListQuery()
  @ApiEndpointDocs({
    summary: 'Preview dataset rows',
    description: 'Requires Bearer JWT and dataset ownership. `page` defaults to 1; `limit` defaults to 20 and is capped at 100.',
    successStatus: 200,
    successDescription: 'Rows with pagination metadata.',
    successExample: { success: true, data: [{ area: 'North', measure: '2' }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
    errors: [400, 401, 404, 500],
  })
  preview(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string, @Query() query: PreviewDatasetDto) {
    return this.datasets.preview(request.user.id, id, query);
  }

  @Get(':id')
  @ApiUuidPath()
  @ApiEndpointDocs({
    summary: 'Get dataset metadata',
    description: 'Requires Bearer JWT and dataset ownership.',
    successStatus: 200,
    successDescription: 'Dataset metadata, schema and profiling.',
    successExample: { success: true, data: { id: '<uuid>', name: 'custom', originalFilename: 'custom.csv', fileType: 'csv', fileSize: 42, rowCount: 1, columnCount: 2, columns: ['area', 'measure'], columnMetadata: [{ name: 'measure', type: 'number', nullable: false, uniqueCount: 1, nullCount: 0, min: 2, max: 2, mean: 2 }], profiling: { totalRows: 1, totalColumns: 2, duplicateRows: 0, missingValues: 0 }, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' } },
    errors: [400, 401, 404, 500],
  })
  detail(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.datasets.findOne(request.user.id, id);
  }

  @Delete(':id')
  @ApiUuidPath()
  @ApiEndpointDocs({
    summary: 'Delete a dataset',
    description: 'Requires Bearer JWT and dataset ownership. Related rows and saved artifacts cascade with the dataset.',
    successStatus: 200,
    successDescription: 'Dataset deleted.',
    successExample: { success: true, message: 'Dataset berhasil dihapus.' },
    errors: [400, 401, 404, 500],
  })
  remove(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.datasets.remove(request.user.id, id);
  }

  @Get(':id/analysis')
  @ApiUuidPath()
  @ApiEndpointDocs({
    summary: 'Analyze a dataset',
    description: 'Requires Bearer JWT and dataset ownership. Scans at most 500,000 rows per request and returns dynamic column statistics and chart recommendations.',
    successStatus: 200,
    successDescription: 'Overview, column statistics, data quality and recommendations.',
    successExample: { success: true, data: { overview: { id: '<uuid>', name: 'custom', totalRows: 120, totalColumns: 3 }, columnTypes: { category: 1, number: 1, date: 1 }, columns: [{ name: 'measure', type: 'number', nullable: false, uniqueCount: 40, nullCount: 0, min: 2, max: 90, mean: 24.5 }], numericStatistics: [{ name: 'measure', nullCount: 0, uniqueCount: 40, min: 2, max: 90, mean: 24.5 }], categoricalSummary: [{ name: 'segment', type: 'category', nullCount: 0, uniqueCount: 4 }], dateRange: [{ column: 'period', min: '2026-01-01T00:00:00.000Z', max: '2026-04-30T00:00:00.000Z' }], dataQuality: { score: 98, missingValues: 2, duplicateRows: 0 }, recommendations: [{ chartType: 'line', xAxis: 'period', yAxis: 'measure', aggregation: 'average', reason: 'Date values can show change over time.' }] } },
    errors: [401, 404, 413, 500],
  })
  analysis(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.analysisService.analysis(request.user.id, id);
  }

  @Post(':id/aggregate')
  @ApiUuidPath()
  @ApiEndpointDocs({
    summary: 'Aggregate dataset rows',
    description: 'Requires Bearer JWT and dataset ownership. Supports count, sum, average, minimum, maximum, and distinct_count; at most 3 groupBy columns, 10 metrics, 20 filters, and 1,000 result rows.',
    successStatus: 201,
    successDescription: 'Aggregated rows with metric keys in request order.',
    successSchema: aggregateResponseSchema,
    successExample: { success: true, data: { datasetId: '<uuid>', groupBy: ['segment'], metrics: [{ key: 'metric_1', column: 'measure', operation: 'sum' }], filters: [], totalGroups: 2, limit: 50, results: [{ segment: 'A', metric_1: 420 }, { segment: 'B', metric_1: 310 }] } },
    errors: [400, 401, 404, 413, 500],
  })
  @ApiJsonRequest({
    type: 'object', required: ['metrics'],
    properties: {
      groupBy: { type: 'array', maxItems: 3, items: { type: 'string' } },
      metrics: { type: 'array', minItems: 1, maxItems: 10, items: { type: 'object', required: ['operation'], properties: { column: { type: 'string' }, operation: { type: 'string', enum: ['count', 'sum', 'average', 'minimum', 'maximum', 'distinct_count'] } } } },
      filters: { type: 'array', maxItems: 20, items: { type: 'object', required: ['column', 'operator'], properties: { column: { type: 'string' }, operator: { type: 'string', enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in', 'isNull'] }, value: {} } } },
      sort: { type: 'object', required: ['column', 'direction'], properties: { column: { type: 'string' }, direction: { type: 'string', enum: ['asc', 'desc'] } } },
      limit: { type: 'integer', minimum: 1, maximum: 1000, default: 100 },
    },
  }, { groupBy: ['segment'], metrics: [{ column: 'measure', operation: 'sum' }, { operation: 'count' }], filters: [{ column: 'measure', operator: 'gte', value: 10 }], sort: { column: 'metric_1', direction: 'desc' }, limit: 50 })
  aggregate(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AggregateRequestDto,
  ) {
    return this.analysisService.aggregate(request.user.id, id, body);
  }

  @Post(':id/visualizations/data')
  @ApiUuidPath()
  @ApiEndpointDocs({
    summary: 'Get visualization data',
    description: 'Requires Bearer JWT and dataset ownership. Supports bar, line, area, pie and scatter; response is JSON data suitable for Recharts.',
    successStatus: 201,
    successDescription: 'Chart metadata and data points.',
    successSchema: visualizationResponseSchema,
    successExample: { success: true, chart: { type: 'bar', xAxis: 'segment', yAxis: 'measure', aggregation: 'average', groupBy: ['segment'], totalGroups: 2, limit: 100 }, data: [{ segment: 'A', value: 12.5 }, { segment: 'B', value: 10.3 }] },
    errors: [400, 401, 404, 413, 500],
  })
  @ApiJsonRequest({
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
  }, { chartType: 'bar', xAxis: 'segment', yAxis: 'measure', aggregation: 'average', filters: [{ column: 'measure', operator: 'gt', value: 0 }], sort: { column: 'value', direction: 'desc' }, limit: 100 })
  visualizationData(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: VisualizationRequestDto,
  ) {
    return this.analysisService.visualizationData(request.user.id, id, body);
  }
}
