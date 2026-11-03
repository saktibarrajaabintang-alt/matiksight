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
exports.ListSavedArtifactsDto = exports.PatchSavedReportDto = exports.CreateSavedReportDto = exports.PatchSavedVisualizationDto = exports.CreateSavedVisualizationDto = exports.SavedVisualizationConfigurationDto = void 0;
const openapi = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const analysis_request_dto_1 = require("../../datasets/analysis/dto/analysis-request.dto");
class SavedVisualizationConfigurationDto {
    chartType;
    xAxis;
    yAxis;
    groupBy = [];
    aggregation = analysis_request_dto_1.AggregationOperation.Average;
    filters = [];
    sort;
    limit = 100;
    static _OPENAPI_METADATA_FACTORY() {
        return { chartType: { required: true, enum: require("../../datasets/analysis/dto/analysis-request.dto").ChartType }, xAxis: { required: true, type: () => String, maxLength: 255 }, yAxis: { required: true, type: () => String, maxLength: 255 }, groupBy: { required: true, type: () => [String], default: [], maxItems: 3 }, aggregation: { required: true, default: analysis_request_dto_1.AggregationOperation.Average, enum: require("../../datasets/analysis/dto/analysis-request.dto").AggregationOperation }, filters: { required: true, type: () => [require("../../datasets/analysis/dto/analysis-request.dto").FilterDto], default: [], maxItems: 20 }, sort: { required: false, type: () => require("../../datasets/analysis/dto/analysis-request.dto").SortDto }, limit: { required: true, type: () => Object, default: 100, minimum: 1, maximum: 1000 } };
    }
}
exports.SavedVisualizationConfigurationDto = SavedVisualizationConfigurationDto;
__decorate([
    (0, class_validator_1.IsEnum)(analysis_request_dto_1.ChartType),
    __metadata("design:type", String)
], SavedVisualizationConfigurationDto.prototype, "chartType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], SavedVisualizationConfigurationDto.prototype, "xAxis", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], SavedVisualizationConfigurationDto.prototype, "yAxis", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(3),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], SavedVisualizationConfigurationDto.prototype, "groupBy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(analysis_request_dto_1.AggregationOperation),
    __metadata("design:type", String)
], SavedVisualizationConfigurationDto.prototype, "aggregation", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ArrayMaxSize)(20),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => analysis_request_dto_1.FilterDto),
    __metadata("design:type", Array)
], SavedVisualizationConfigurationDto.prototype, "filters", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => analysis_request_dto_1.SortDto),
    __metadata("design:type", analysis_request_dto_1.SortDto)
], SavedVisualizationConfigurationDto.prototype, "sort", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(1000),
    __metadata("design:type", Object)
], SavedVisualizationConfigurationDto.prototype, "limit", void 0);
class CreateSavedVisualizationDto {
    datasetId;
    name;
    description;
    configuration;
    static _OPENAPI_METADATA_FACTORY() {
        return { datasetId: { required: true, type: () => String, format: "uuid" }, name: { required: true, type: () => String, maxLength: 160 }, description: { required: false, type: () => String, maxLength: 2000 }, configuration: { required: true, type: () => require("./saved-artifact.dto").SavedVisualizationConfigurationDto } };
    }
}
exports.CreateSavedVisualizationDto = CreateSavedVisualizationDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateSavedVisualizationDto.prototype, "datasetId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(160),
    __metadata("design:type", String)
], CreateSavedVisualizationDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateSavedVisualizationDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => SavedVisualizationConfigurationDto),
    __metadata("design:type", SavedVisualizationConfigurationDto)
], CreateSavedVisualizationDto.prototype, "configuration", void 0);
class PatchSavedVisualizationDto {
    datasetId;
    name;
    description;
    configuration;
    static _OPENAPI_METADATA_FACTORY() {
        return { datasetId: { required: false, type: () => String, format: "uuid" }, name: { required: false, type: () => String, maxLength: 160 }, description: { required: false, type: () => String, maxLength: 2000 }, configuration: { required: false, type: () => require("./saved-artifact.dto").SavedVisualizationConfigurationDto } };
    }
}
exports.PatchSavedVisualizationDto = PatchSavedVisualizationDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PatchSavedVisualizationDto.prototype, "datasetId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(160),
    __metadata("design:type", String)
], PatchSavedVisualizationDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], PatchSavedVisualizationDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => SavedVisualizationConfigurationDto),
    __metadata("design:type", SavedVisualizationConfigurationDto)
], PatchSavedVisualizationDto.prototype, "configuration", void 0);
class CreateSavedReportDto {
    datasetId;
    name;
    description;
    configuration;
    snapshot;
    static _OPENAPI_METADATA_FACTORY() {
        return { datasetId: { required: true, type: () => String, format: "uuid" }, name: { required: true, type: () => String, maxLength: 160 }, description: { required: false, type: () => String, maxLength: 2000 }, configuration: { required: true, type: "object", additionalProperties: true }, snapshot: { required: false, type: "object", additionalProperties: true } };
    }
}
exports.CreateSavedReportDto = CreateSavedReportDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateSavedReportDto.prototype, "datasetId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(160),
    __metadata("design:type", String)
], CreateSavedReportDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], CreateSavedReportDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.Allow)(),
    __metadata("design:type", Object)
], CreateSavedReportDto.prototype, "configuration", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.Allow)(),
    __metadata("design:type", Object)
], CreateSavedReportDto.prototype, "snapshot", void 0);
class PatchSavedReportDto {
    datasetId;
    name;
    description;
    configuration;
    snapshot;
    static _OPENAPI_METADATA_FACTORY() {
        return { datasetId: { required: false, type: () => String, format: "uuid" }, name: { required: false, type: () => String, maxLength: 160 }, description: { required: false, type: () => String, maxLength: 2000 }, configuration: { required: false, type: "object", additionalProperties: true }, snapshot: { required: false, type: "object", additionalProperties: true, nullable: true } };
    }
}
exports.PatchSavedReportDto = PatchSavedReportDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], PatchSavedReportDto.prototype, "datasetId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(160),
    __metadata("design:type", String)
], PatchSavedReportDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(2000),
    __metadata("design:type", String)
], PatchSavedReportDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.Allow)(),
    __metadata("design:type", Object)
], PatchSavedReportDto.prototype, "configuration", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.Allow)(),
    __metadata("design:type", Object)
], PatchSavedReportDto.prototype, "snapshot", void 0);
class ListSavedArtifactsDto {
    page = 1;
    limit = 20;
    search;
    static _OPENAPI_METADATA_FACTORY() {
        return { page: { required: true, type: () => Object, default: 1, minimum: 1, maximum: 1000000 }, limit: { required: true, type: () => Object, default: 20, minimum: 1, maximum: 100 }, search: { required: false, type: () => String, maxLength: 100 } };
    }
}
exports.ListSavedArtifactsDto = ListSavedArtifactsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(1000000),
    __metadata("design:type", Object)
], ListSavedArtifactsDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Object)
], ListSavedArtifactsDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], ListSavedArtifactsDto.prototype, "search", void 0);
//# sourceMappingURL=saved-artifact.dto.js.map