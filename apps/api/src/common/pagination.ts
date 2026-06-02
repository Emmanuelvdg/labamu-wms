export interface PaginationParams {
    take: number;
    skip: number;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    limit: number;
    offset: number;
}

/**
 * Parse limit/offset query strings into Prisma-compatible take/skip values.
 * Default: limit=50, max: 500.
 */
export function parsePagination(limit?: string, offset?: string): PaginationParams {
    const take = Math.min(Math.max(parseInt(limit ?? '50', 10) || 50, 1), 500);
    const skip = Math.max(parseInt(offset ?? '0', 10) || 0, 0);
    return { take, skip };
}

export function paginated<T>(data: T[], total: number, { take, skip }: PaginationParams): PaginatedResult<T> {
    return { data, total, limit: take, offset: skip };
}
