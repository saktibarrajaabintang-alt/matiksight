import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AggregationOperation, ChartType, FilterDto, SortDto } from '../../datasets/analysis/dto/analysis-request.dto';

export class SavedVisualizationConfigurationDto {
  @IsEnum(ChartType)
  chartType: ChartType;

  @IsString()
  @MaxLength(255)
  xAxis: string;

  @IsString()
  @MaxLength(255)
  yAxis: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsString({ each: true })
  groupBy: string[] = [];

  @IsOptional()
  @IsEnum(AggregationOperation)
  aggregation: AggregationOperation = AggregationOperation.Average;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => FilterDto)
  filters: FilterDto[] = [];

  @IsOptional()
  @ValidateNested()
  @Type(() => SortDto)
  sort?: SortDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  limit = 100;
}

export class CreateSavedVisualizationDto {
  @IsUUID()
  datasetId: string;

  @IsString()
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ValidateNested()
  @Type(() => SavedVisualizationConfigurationDto)
  configuration: SavedVisualizationConfigurationDto;
}

export class PatchSavedVisualizationDto {
  @IsOptional()
  @IsUUID()
  datasetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SavedVisualizationConfigurationDto)
  configuration?: SavedVisualizationConfigurationDto;
}

export class CreateSavedReportDto {
  @IsUUID()
  datasetId: string;

  @IsString()
  @MaxLength(160)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsObject()
  @Allow()
  configuration: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  @Allow()
  snapshot?: Record<string, unknown>;
}

export class PatchSavedReportDto {
  @IsOptional()
  @IsUUID()
  datasetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsObject()
  @Allow()
  configuration?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  @Allow()
  snapshot?: Record<string, unknown> | null;
}

export class ListSavedArtifactsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
