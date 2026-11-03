"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SafeExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let SafeExceptionFilter = SafeExceptionFilter_1 = class SafeExceptionFilter {
    logger = new common_1.Logger(SafeExceptionFilter_1.name);
    catch(exception, host) {
        const context = host.switchToHttp();
        const response = context.getResponse();
        if (exception instanceof common_1.HttpException) {
            response.status(exception.getStatus()).json(exception.getResponse());
            return;
        }
        this.logger.error('Unhandled request failure');
        response.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
            statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
            error: 'Internal Server Error',
        });
    }
};
exports.SafeExceptionFilter = SafeExceptionFilter;
exports.SafeExceptionFilter = SafeExceptionFilter = SafeExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], SafeExceptionFilter);
//# sourceMappingURL=safe-exception.filter.js.map