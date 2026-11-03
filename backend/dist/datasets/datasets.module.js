"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetsModule = void 0;
const common_1 = require("@nestjs/common");
const datasets_controller_1 = require("./datasets.controller");
const dataset_processing_service_1 = require("./dataset-processing.service");
const datasets_service_1 = require("./datasets.service");
const auth_module_1 = require("../auth/auth.module");
const dataset_analysis_service_1 = require("./analysis/dataset-analysis.service");
let DatasetsModule = class DatasetsModule {
};
exports.DatasetsModule = DatasetsModule;
exports.DatasetsModule = DatasetsModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [datasets_controller_1.DatasetsController],
        providers: [dataset_processing_service_1.DatasetProcessingService, datasets_service_1.DatasetsService, dataset_analysis_service_1.DatasetAnalysisService],
        exports: [dataset_analysis_service_1.DatasetAnalysisService],
    })
], DatasetsModule);
//# sourceMappingURL=datasets.module.js.map