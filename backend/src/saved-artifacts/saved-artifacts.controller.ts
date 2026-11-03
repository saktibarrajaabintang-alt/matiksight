import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreateSavedReportDto,
  CreateSavedVisualizationDto,
  ListSavedArtifactsDto,
  PatchSavedReportDto,
  PatchSavedVisualizationDto,
} from './dto/saved-artifact.dto';
import { SavedArtifactsService } from './saved-artifacts.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiEndpointDocs, ApiJsonRequest, ApiListQuery, ApiUuidPath } from '../swagger/api-contract';

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

@Controller('visualizations')
@UseGuards(JwtAuthGuard)
@ApiTags('saved visualizations')
@ApiBearerAuth()
export class SavedVisualizationsController {
  constructor(private readonly saved: SavedArtifactsService) {}

  @Post()
  @ApiEndpointDocs({
    summary: 'Save a visualization configuration',
    description: 'Requires Bearer JWT and ownership of `datasetId`. Stores chart configuration only; generated data is requested through the visualization data endpoint.',
    successStatus: 201,
    successDescription: 'Saved visualization record.',
    successExample: { success: true, data: { id: '<uuid>', datasetId: '<uuid>', name: 'Average by region', description: null, chartType: 'bar', configuration: { chartType: 'bar', xAxis: 'region', yAxis: 'amount', groupBy: ['region'], aggregation: 'average', filters: [], sort: null, limit: 100 }, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' } },
    errors: [400, 401, 404, 413, 500],
  })
  @ApiJsonRequest({
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
  }, { datasetId: '<uuid>', name: 'Average by region', description: 'Compare values by region', configuration: { chartType: 'bar', xAxis: 'region', yAxis: 'amount', groupBy: [], aggregation: 'average', filters: [], sort: { column: 'value', direction: 'desc' }, limit: 100 } })
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateSavedVisualizationDto) {
    return this.saved.createVisualization(request.user.id, body);
  }

  @Get()
  @ApiListQuery(true)
  @ApiEndpointDocs({
    summary: 'List saved visualizations',
    description: 'Requires Bearer JWT. Lists only the caller’s visualizations; page defaults to 1, limit to 20 (maximum 100), with optional name search.',
    successStatus: 200,
    successDescription: 'Paginated saved visualization records.',
    successExample: { success: true, data: [{ id: '<uuid>', datasetId: '<uuid>', name: 'Average by region', description: null, chartType: 'bar', configuration: { chartType: 'bar', xAxis: 'region', yAxis: 'amount', groupBy: ['region'], aggregation: 'average', filters: [], sort: null, limit: 100 }, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
    errors: [400, 401, 500],
  })
  list(@Req() request: AuthenticatedRequest, @Query() query: ListSavedArtifactsDto) {
    return this.saved.listVisualizations(request.user.id, query);
  }

  @Get(':id')
  @ApiUuidPath()
  @ApiEndpointDocs({
    summary: 'Get a saved visualization',
    description: 'Requires Bearer JWT and visualization ownership.',
    successStatus: 200,
    successDescription: 'Saved visualization configuration.',
    successExample: { success: true, data: { id: '<uuid>', datasetId: '<uuid>', name: 'Average by region', description: null, chartType: 'bar', configuration: { chartType: 'bar', xAxis: 'region', yAxis: 'amount', groupBy: ['region'], aggregation: 'average', filters: [], sort: null, limit: 100 }, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' } },
    errors: [400, 401, 404, 500],
  })
  detail(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.saved.visualization(request.user.id, id);
  }

  @Patch(':id')
  @ApiUuidPath()
  @ApiEndpointDocs({
    summary: 'Update a saved visualization',
    description: 'Requires Bearer JWT and ownership. PATCH accepts one or more fields; a provided configuration must be complete and valid.',
    successStatus: 200,
    successDescription: 'Updated saved visualization.',
    successExample: { success: true, data: { id: '<uuid>', datasetId: '<uuid>', name: 'Updated chart', description: 'Updated', chartType: 'bar', configuration: { chartType: 'bar', xAxis: 'region', yAxis: 'amount', groupBy: ['region'], aggregation: 'average', filters: [], sort: null, limit: 100 }, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:01:00.000Z' } },
    errors: [400, 401, 404, 413, 500],
  })
  @ApiJsonRequest({
    type: 'object', minProperties: 1,
    properties: {
      datasetId: { type: 'string', format: 'uuid' }, name: { type: 'string', maxLength: 160 }, description: { type: 'string', nullable: true, maxLength: 2000 },
      configuration: { type: 'object', required: ['chartType', 'xAxis', 'yAxis'], properties: { chartType: { type: 'string', enum: ['bar', 'line', 'pie', 'area', 'scatter'] }, xAxis: { type: 'string' }, yAxis: { type: 'string' }, groupBy: { type: 'array', maxItems: 3, items: { type: 'string' } }, aggregation: { type: 'string', enum: ['count', 'sum', 'average', 'minimum', 'maximum', 'distinct_count'] }, filters: { type: 'array', maxItems: 20, items: { type: 'object', additionalProperties: true } }, sort: { type: 'object', additionalProperties: true }, limit: { type: 'integer', minimum: 1, maximum: 1000 } } },
    },
  }, { name: 'Updated chart' })
  patch(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PatchSavedVisualizationDto,
  ) {
    return this.saved.patchVisualization(request.user.id, id, body);
  }

  @Delete(':id')
  @ApiUuidPath()
  @ApiEndpointDocs({
    summary: 'Delete a saved visualization',
    description: 'Requires Bearer JWT and visualization ownership.',
    successStatus: 200,
    successDescription: 'Saved visualization deleted.',
    successExample: { success: true, message: 'Saved visualization berhasil dihapus.' },
    errors: [400, 401, 404, 500],
  })
  remove(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.saved.removeVisualization(request.user.id, id);
  }
}

@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiTags('saved reports')
@ApiBearerAuth()
export class SavedReportsController {
  constructor(private readonly saved: SavedArtifactsService) {}

  @Post()
  @ApiEndpointDocs({
    summary: 'Create a saved report',
    description: 'Requires Bearer JWT and ownership of `datasetId`. Configuration is generic JSON; snapshot is optional. The dataset rows are not copied.',
    successStatus: 201,
    successDescription: 'Saved report record.',
    successSchema: savedReportResponseSchema,
    successExample: { success: true, data: { id: '<uuid>', datasetId: '<uuid>', name: 'Quarterly overview', description: null, configuration: { sections: [{ title: 'Overview', visualizationIds: ['<uuid>'] }] }, snapshot: { totalRows: 120, generatedAt: '2026-11-03T00:00:00.000Z' }, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' } },
    errors: [400, 401, 404, 413, 500],
  })
  @ApiJsonRequest({
    type: 'object', required: ['datasetId', 'name', 'configuration'],
    properties: { datasetId: { type: 'string', format: 'uuid' }, name: { type: 'string', minLength: 1, maxLength: 160 }, description: { type: 'string', maxLength: 2000 }, configuration: { type: 'object', additionalProperties: true }, snapshot: { type: 'object', additionalProperties: true } },
  }, { datasetId: '<uuid>', name: 'Quarterly overview', description: 'Custom report summary', configuration: { sections: [{ title: 'Overview', visualizationIds: ['<uuid>'] }] }, snapshot: { totalRows: 120, generatedAt: '2026-11-03T00:00:00.000Z' } })
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateSavedReportDto) {
    return this.saved.createReport(request.user.id, body);
  }

  @Get()
  @ApiListQuery(true)
  @ApiEndpointDocs({
    summary: 'List saved reports',
    description: 'Requires Bearer JWT. Lists only the caller’s reports; page defaults to 1, limit to 20 (maximum 100), with optional name search. List response omits snapshots.',
    successStatus: 200,
    successDescription: 'Paginated saved reports.',
    successSchema: savedReportsListResponseSchema,
    successExample: { success: true, data: [{ id: '<uuid>', datasetId: '<uuid>', name: 'Quarterly overview', description: null, configuration: { sections: [] }, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' }], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
    errors: [400, 401, 500],
  })
  list(@Req() request: AuthenticatedRequest, @Query() query: ListSavedArtifactsDto) {
    return this.saved.listReports(request.user.id, query);
  }

  @Get(':id')
  @ApiUuidPath()
  @ApiEndpointDocs({
    summary: 'Get a saved report',
    description: 'Requires Bearer JWT and report ownership.',
    successStatus: 200,
    successDescription: 'Saved report configuration and optional snapshot.',
    successSchema: savedReportResponseSchema,
    successExample: { success: true, data: { id: '<uuid>', datasetId: '<uuid>', name: 'Quarterly overview', description: null, configuration: { sections: [] }, snapshot: { totalRows: 120 }, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:00:00.000Z' } },
    errors: [400, 401, 404, 500],
  })
  detail(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.saved.report(request.user.id, id);
  }

  @Patch(':id')
  @ApiUuidPath()
  @ApiEndpointDocs({
    summary: 'Update a saved report',
    description: 'Requires Bearer JWT and ownership. PATCH accepts one or more fields; configuration and snapshot remain bounded JSON objects.',
    successStatus: 200,
    successDescription: 'Updated report.',
    successSchema: savedReportResponseSchema,
    successExample: { success: true, data: { id: '<uuid>', datasetId: '<uuid>', name: 'Updated report', description: null, configuration: { sections: [] }, snapshot: null, createdAt: '2026-11-03T00:00:00.000Z', updatedAt: '2026-11-03T00:01:00.000Z' } },
    errors: [400, 401, 404, 413, 500],
  })
  @ApiJsonRequest({
    type: 'object', minProperties: 1,
    properties: { datasetId: { type: 'string', format: 'uuid' }, name: { type: 'string', maxLength: 160 }, description: { type: 'string', maxLength: 2000 }, configuration: { type: 'object', additionalProperties: true }, snapshot: { type: 'object', nullable: true, additionalProperties: true } },
  }, { name: 'Updated report', configuration: { sections: [] } })
  patch(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PatchSavedReportDto,
  ) {
    return this.saved.patchReport(request.user.id, id, body);
  }

  @Delete(':id')
  @ApiUuidPath()
  @ApiEndpointDocs({
    summary: 'Delete a saved report',
    description: 'Requires Bearer JWT and report ownership.',
    successStatus: 200,
    successDescription: 'Report deleted.',
    successExample: { success: true, message: 'Report berhasil dihapus.' },
    errors: [400, 401, 404, 500],
  })
  remove(@Req() request: AuthenticatedRequest, @Param('id', ParseUUIDPipe) id: string) {
    return this.saved.removeReport(request.user.id, id);
  }
}
