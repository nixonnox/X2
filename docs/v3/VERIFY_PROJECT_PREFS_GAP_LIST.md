# Verify: Project-Scoped Prefs Gap List

> Date: 2026-03-16
> Total: 0 S0, 1 S1, 1 S2, 1 S3

## S0
**없음**

## S1

### S1-1. prisma generate 미완료
- **현상:** dev 서버가 query engine dll을 잠가서 `prisma generate` 실패
- **영향:** TypeScript 타입에 projectId 미반영 (runtime은 DB push로 동작)
- **수정:** dev 서버 정지 → `pnpm --filter @x2/db generate` → dev 서버 재시작

## S2

### S2-1. notification router에 projectId 미추가
- **현상:** `getPreferences`/`savePreferences` tRPC endpoint에 projectId 파라미터 없음
- **영향:** Settings UI에서 project-specific 설정 저장/조회 불가 (global만)
- **수정:** router input에 `projectId: z.string().optional()` 추가

## S3

### S3-1. Settings UI에 프로젝트 선택 없음
- **현상:** `/settings/notifications` 페이지에 프로젝트 드롭다운 없음
- **영향:** 사용자가 project-specific 설정을 UI에서 만들 수 없음
- **수정:** 프로젝트 선택 → 설정 저장 시 projectId 포함
