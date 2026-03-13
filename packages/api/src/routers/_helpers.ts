import { TRPCError } from "@trpc/server";

/**
 * 공유 접근 제어 헬퍼.
 * 모든 라우터에서 워크스페이스 멤버십을 검증할 때 사용한다.
 */

/** 워크스페이스 멤버인지 검증 */
export async function verifyWorkspaceAccess(
  db: any,
  userId: string,
  workspaceId: string,
): Promise<void> {
  const member = await db.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
  if (!member) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "이 워크스페이스에 대한 접근 권한이 없습니다.",
    });
  }
}

/** 프로젝트 소속 워크스페이스의 멤버인지 검증 → workspaceId 반환 */
export async function verifyProjectAccess(
  db: any,
  userId: string,
  projectId: string,
): Promise<string> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  if (!project) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "프로젝트를 찾을 수 없습니다.",
    });
  }
  await verifyWorkspaceAccess(db, userId, project.workspaceId);
  return project.workspaceId;
}

/** 채널의 소속 프로젝트를 통해 워크스페이스 멤버십 검증 */
export async function verifyChannelAccess(
  db: any,
  userId: string,
  channelId: string,
): Promise<void> {
  const channel = await db.channel.findUnique({
    where: { id: channelId },
    select: { projectId: true },
  });
  if (!channel) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "채널을 찾을 수 없습니다.",
    });
  }
  await verifyProjectAccess(db, userId, channel.projectId);
}

/** ServiceResult를 tRPC 응답으로 변환 (실패 시 TRPCError throw) */
export function unwrapResult<T>(result: {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}): T {
  if (!result.success) {
    const code =
      result.code === "NOT_FOUND"
        ? "NOT_FOUND"
        : result.code === "FORBIDDEN"
          ? "FORBIDDEN"
          : result.code === "INVALID_INPUT"
            ? "BAD_REQUEST"
            : "INTERNAL_SERVER_ERROR";
    throw new TRPCError({
      code: code as any,
      message: result.error ?? "알 수 없는 오류가 발생했습니다.",
    });
  }
  if (result.data === undefined || result.data === null) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "서비스에서 데이터를 반환하지 않았습니다.",
    });
  }
  return result.data;
}
