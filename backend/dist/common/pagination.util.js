"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePagination = parsePagination;
function parsePagination(skip, limit, defaultLimit = 100, maxLimit = 200) {
    const parsedSkip = Math.max(0, parseInt(String(skip ?? '0'), 10) || 0);
    const parsedLimit = Math.min(Math.max(1, parseInt(String(limit ?? defaultLimit), 10) || defaultLimit), maxLimit);
    return { skip: parsedSkip, take: parsedLimit };
}
//# sourceMappingURL=pagination.util.js.map