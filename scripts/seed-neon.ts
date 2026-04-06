/**
 * X2 Neon DB Seed Script
 *
 * Neon 클라우드 DB에 기본 데이터를 생성합니다.
 * 실행: npx tsx scripts/seed-neon.ts
 *
 * 환경변수: DATABASE_URL이 Neon DB를 가리켜야 합니다.
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("=== X2 Neon DB Seed ===\n");

  // 1. 사용자 확인
  const user = await db.user.findFirst();
  if (!user) {
    console.log("❌ 사용자가 없습니다. 먼저 로그인해주세요.");
    return;
  }
  console.log(`✅ 사용자: ${user.email} (${user.id})`);

  // 2. 워크스페이스 확인/생성
  let workspace = await db.workspace.findFirst({
    where: { members: { some: { userId: user.id } } },
  });
  if (!workspace) {
    workspace = await db.workspace.create({
      data: {
        name: "내 워크스페이스",
        slug: "my-workspace",
        plan: "FREE",
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });
    console.log(`✅ 워크스페이스 생성: ${workspace.id}`);
  } else {
    console.log(`✅ 워크스페이스: ${workspace.name} (${workspace.id})`);
  }

  // 3. 프로젝트 확인/생성
  let project = await db.project.findFirst({
    where: { workspaceId: workspace.id },
  });
  if (!project) {
    project = await db.project.create({
      data: { name: "내 프로젝트", workspaceId: workspace.id },
    });
    console.log(`✅ 프로젝트 생성: ${project.id}`);
  } else {
    console.log(`✅ 프로젝트: ${project.name} (${project.id})`);
  }

  // 4. 샘플 채널 확인/생성
  const channelCount = await db.channel.count({
    where: { projectId: project.id },
  });
  if (channelCount === 0) {
    const channels = [
      {
        projectId: project.id,
        platform: "YOUTUBE" as const,
        platformChannelId: "@thecreamunion",
        name: "더크림유니언",
        url: "https://www.youtube.com/@thecreamunion",
      },
      {
        projectId: project.id,
        platform: "INSTAGRAM" as const,
        platformChannelId: "genus_offcl",
        name: "@genus_offcl",
        url: "https://www.instagram.com/genus_offcl/",
      },
    ];
    for (const ch of channels) {
      await db.channel.create({ data: ch });
      console.log(`✅ 채널 생성: ${ch.name} (${ch.platform})`);
    }
  } else {
    console.log(`✅ 채널 ${channelCount}개 이미 존재`);
  }

  // 5. 샘플 키워드 생성
  const kwCount = await db.intelligenceKeyword.count({
    where: { projectId: project.id },
  });
  if (kwCount === 0) {
    const keywords = ["더크림유니언 추천", "소셜 미디어 분석", "AI 마케팅"];
    for (const kw of keywords) {
      await db.intelligenceKeyword.create({
        data: {
          projectId: project.id,
          keyword: kw,
          isSaved: true,
          analysisCount: 0,
        },
      });
      console.log(`✅ 키워드 생성: ${kw}`);
    }
  } else {
    console.log(`✅ 키워드 ${kwCount}개 이미 존재`);
  }

  // 6. 샘플 리포트 생성
  const reportCount = await db.insightReport.count({
    where: { projectId: project.id },
  });
  if (reportCount === 0) {
    await db.insightReport.create({
      data: {
        projectId: project.id,
        generatedBy: user.id,
        type: "SHORT_TERM",
        title: "주간 채널 분석 리포트",
        summary: "이번 주 채널 성과와 주요 인사이트를 정리했어요.",
        content: {
          kpiSummary: [
            {
              label: "총 조회수",
              value: "12,340",
              change: "+8%",
              changeType: "positive",
            },
            {
              label: "구독자",
              value: "1,250",
              change: "+32",
              changeType: "positive",
            },
            {
              label: "참여율",
              value: "4.2%",
              change: "+0.3pp",
              changeType: "positive",
            },
            {
              label: "게시물",
              value: "7",
              change: "+2",
              changeType: "positive",
            },
          ],
          insights: [
            {
              id: "i1",
              title: "숏폼 콘텐츠 반응 급증",
              description:
                "릴스/쇼츠 형식의 콘텐츠가 전주 대비 조회수 40% 증가했어요.",
            },
            {
              id: "i2",
              title: "화요일 오후 업로드 최적",
              description:
                "이번 주 가장 높은 참여율을 기록한 게시물은 화요일 14시에 업로드됐어요.",
            },
            {
              id: "i3",
              title: "댓글 긍정 비율 상승",
              description:
                "전체 댓글 중 긍정 비율이 72%로, 전주(65%) 대비 7pp 상승했어요.",
            },
          ],
        },
        period: "2026.03.25 ~ 2026.03.31",
        confidence: 0.85,
        status: "PUBLISHED",
        shareToken: "sample-share-token-12345678901234",
        sections: {
          create: [
            {
              title: "채널 성과 요약",
              narrative:
                "이번 주 전체 채널의 조회수는 12,340회로 전주 대비 8% 증가했어요. 특히 릴스 콘텐츠가 전체 도달의 62%를 차지했어요.",
              order: 1,
            },
            {
              title: "콘텐츠 분석",
              narrative:
                "총 7개의 콘텐츠가 게시됐으며, 숏폼(릴스/쇼츠) 5개, 일반 게시물 2개였어요. 숏폼의 평균 참여율(5.1%)이 일반 게시물(2.8%)보다 높았어요.",
              order: 2,
            },
            {
              title: "추천 액션",
              narrative:
                "1. 숏폼 비율을 현재 71%에서 80%로 확대하세요.\n2. 화요일/목요일 오후 2-4시에 업로드 시간을 집중하세요.\n3. 댓글에 첫 1시간 이내 답변율을 높이세요.",
              order: 3,
            },
          ],
        },
      },
    });
    console.log("✅ 샘플 리포트 생성");
  } else {
    console.log(`✅ 리포트 ${reportCount}개 이미 존재`);
  }

  console.log("\n=== Seed 완료 ===");
  console.log(`프로젝트 ID: ${project.id}`);
  console.log(`워크스페이스 ID: ${workspace.id}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
