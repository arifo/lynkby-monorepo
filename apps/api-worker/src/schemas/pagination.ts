import { z } from "zod";

// Pagination query parameters
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

// Pagination response metadata
export const PaginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  pages: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

// Helper function to calculate pagination metadata
export function calculatePaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const pages = Math.ceil(total / limit);
  const hasNext = page < pages;
  const hasPrev = page > 1;

  return {
    page,
    limit,
    total,
    pages,
    hasNext,
    hasPrev,
  };
}

// Helper function to apply pagination to an array
export function paginateArray<T>(
  array: T[],
  page: number,
  limit: number
): { data: T[]; meta: PaginationMeta } {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const data = array.slice(startIndex, endIndex);
  const meta = calculatePaginationMeta(page, limit, array.length);

  return { data, meta };
}
