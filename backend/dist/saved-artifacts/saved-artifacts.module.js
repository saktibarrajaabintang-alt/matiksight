"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavedArtifactsModule = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("../auth/auth.module");
const datasets_module_1 = require("../datasets/datasets.module");
const saved_artifacts_controller_1 = require("./saved-artifacts.controller");
const saved_artifacts_service_1 = require("./saved-artifacts.service");
let SavedArtifactsModule = class SavedArtifactsModule {
};
exports.SavedArtifactsModule = SavedArtifactsModule;
exports.SavedArtifactsModule = SavedArtifactsModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule, datasets_module_1.DatasetsModule],
        controllers: [saved_artifacts_controller_1.SavedVisualizationsController, saved_artifacts_controller_1.SavedReportsController],
        providers: [saved_artifacts_service_1.SavedArtifactsService],
    })
], SavedArtifactsModule);
//# sourceMappingURL=saved-artifacts.module.js.map