import type { PrismaClient } from "@prisma/client";

export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type DateRange = {
  from: Date;
  to: Date;
};

/**
 * Abstract base class for all repositories.
 * Provides common pagination utilities and holds the Prisma client reference.
 */
export abstract class BaseRepository {
  constructor(protected readonly prisma: PrismaClient) {}

  /**
   * Calculate skip/take values from pagination parameters.
   * Defaults to page 1 with 20 items per page.
   */
  protected paginate(params?: PaginationParams) {
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;
    return {
      skip: (page - 1) * pageSize,
      take: pageSize,
      page,
      pageSize,
    };
  }

  /**
   * Wrap raw data and total count into a standardized paginated result.
   */
  protected toPaginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    pageSize: number,
  ): PaginatedResult<T> {
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
