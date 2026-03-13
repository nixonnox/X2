/**
 * Auth.js API 라우트.
 * GET/POST /api/auth/* 요청을 Auth.js가 처리한다.
 */
import { handlers } from "@x2/auth";

export const { GET, POST } = handlers;
