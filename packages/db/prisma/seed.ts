import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 개발용 사용자
  const user = await prisma.user.upsert({
    where: { email: "dev@x2.local" },
    update: {},
    create: {
      email: "dev@x2.local",
      name: "개발자",
      emailVerified: new Date(),
    },
  });
  console.log(`  User: ${user.email} (${user.id})`);

  // 기본 워크스페이스
  const workspace = await prisma.workspace.upsert({
    where: { slug: "dev-workspace" },
    update: {},
    create: {
      name: "개발 워크스페이스",
      slug: "dev-workspace",
      plan: "FREE",
    },
  });
  console.log(`  Workspace: ${workspace.name} (${workspace.id})`);

  // 멤버 연결
  await prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: workspace.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      role: "OWNER",
    },
  });
  console.log("  Member: OWNER");

  // 샘플 프로젝트
  const project = await prisma.project.upsert({
    where: { id: "seed-project-1" },
    update: {},
    create: {
      id: "seed-project-1",
      name: "유튜브 채널 분석",
      description: "메인 유튜브 채널 성과를 추적합니다",
      workspaceId: workspace.id,
    },
  });
  console.log(`  Project: ${project.name} (${project.id})`);

  console.log("Seed complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
