"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCorsOrigins = parseCorsOrigins;
function parseCorsOrigins(value = '') {
    const origins = value.split(',').map((origin) => origin.trim()).filter(Boolean);
    for (const origin of origins) {
        let parsed;
        try {
            parsed = new URL(origin);
        }
        catch {
            throw new Error('CORS_ORIGINS must contain comma-separated http(s) origins.');
        }
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin || origin === '*') {
            throw new Error('CORS_ORIGINS must contain exact http(s) origins; wildcard origins are not allowed.');
        }
    }
    return origins;
}
//# sourceMappingURL=cors-origins.js.map