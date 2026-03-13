// ============================================
// 공통 유틸리티 타입
// ============================================

/** 페이지네이션 요청 파라미터 */
export type PaginationParams = {
  page: number;
  limit: number;
};

/** 페이지네이션 응답 메타 */
export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/** 페이지네이션 포함 응답 래퍼 */
export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

/** 날짜 범위 필터 */
export type DateRange = {
  from: Date;
  to: Date;
};

/** API 에러 응답 */
export type ApiError = {
  code: string;
  message: string;
};

/** 요금제 티어 */
export type PlanTier = "free" | "pro" | "business";
