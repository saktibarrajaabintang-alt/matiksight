"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const XLSX = __importStar(require("xlsx"));
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = {
    '.xlsx': [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    '.xls': ['application/vnd.ms-excel', 'application/x-cdf'],
    '.csv': ['text/csv', 'application/csv', 'application/vnd.ms-excel'],
    '.png': ['image/png'],
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
};
let UploadService = class UploadService {
    upload(file) {
        if (!file) {
            throw new common_1.BadRequestException('File wajib diunggah dengan key "file".');
        }
        if (typeof file.originalname !== 'string' || file.originalname.trim().length === 0) {
            throw new common_1.BadRequestException('Nama file tidak valid.');
        }
        if (!Number.isInteger(file.size) || file.size < 0) {
            throw new common_1.BadRequestException('Ukuran file tidak valid.');
        }
        if (file.size > MAX_FILE_SIZE) {
            throw new common_1.PayloadTooLargeException('Ukuran file maksimal 20 MB.');
        }
        const extension = file.originalname
            .slice(file.originalname.lastIndexOf('.'))
            .toLowerCase();
        const acceptedMimeTypes = ALLOWED_TYPES[extension];
        if (!acceptedMimeTypes) {
            throw new common_1.UnsupportedMediaTypeException('Format file tidak didukung.');
        }
        if (typeof file.mimetype !== 'string' || !acceptedMimeTypes.includes(file.mimetype.toLowerCase())) {
            throw new common_1.UnsupportedMediaTypeException('Ekstensi file dan MIME type tidak sesuai atau tidak didukung.');
        }
        if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
            throw new common_1.BadRequestException('File kosong atau tidak memiliki isi.');
        }
        if (file.size !== file.buffer.length) {
            throw new common_1.BadRequestException('Ukuran file tidak sesuai dengan isinya.');
        }
        this.validateFileContent(extension, file.buffer);
        return {
            success: true,
            message: 'File berhasil diterima.',
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
        };
    }
    validateFileContent(extension, buffer) {
        if (extension === '.csv') {
            try {
                const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
                if (text.includes('\0') || text.trim().length === 0)
                    throw new Error('Empty or binary CSV');
            }
            catch {
                throw new common_1.BadRequestException('File CSV harus berupa teks UTF-8 yang tidak kosong.');
            }
            return;
        }
        if (extension === '.png') {
            const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
            if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature) || buffer.toString('ascii', 12, 16) !== 'IHDR'
                || buffer.readUInt32BE(16) === 0 || buffer.readUInt32BE(20) === 0) {
                throw new common_1.BadRequestException('Isi file tidak sesuai dengan format PNG.');
            }
            return;
        }
        if (extension === '.jpg' || extension === '.jpeg') {
            if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff
                || buffer[buffer.length - 2] !== 0xff || buffer[buffer.length - 1] !== 0xd9) {
                throw new common_1.BadRequestException('Isi file tidak sesuai dengan format JPEG.');
            }
            return;
        }
        const isXlsx = extension === '.xlsx' && buffer[0] === 0x50 && buffer[1] === 0x4b;
        const isXls = extension === '.xls' && buffer.subarray(0, 8).equals(Buffer.from('D0CF11E0A1B11AE1', 'hex'));
        if (!isXlsx && !isXls) {
            throw new common_1.BadRequestException('Isi file tidak sesuai dengan format spreadsheet.');
        }
        try {
            const workbook = XLSX.read(buffer, { type: 'buffer', bookSheets: true });
            if (workbook.SheetNames.length === 0)
                throw new Error('Missing worksheets');
        }
        catch {
            throw new common_1.BadRequestException('Isi file spreadsheet tidak dapat dibaca.');
        }
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = __decorate([
    (0, common_1.Injectable)()
], UploadService);
//# sourceMappingURL=upload.service.js.map