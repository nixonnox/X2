"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { trpc } from "@/lib/trpc";
import { useCurrentProject } from "@/hooks";
import { FolderOpen, Plus, Loader2, Check } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const { workspace, project, isLoading, projectId } = useCurrentProject();

  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const utils = trpc.useUtils();
  const router = useRouter();

  const createProject = trpc.project.create.useMutation({
    onSuccess: () => {
      setCreated(true);
      setNewProjectName("");
      // 워크스페이스 + 프로젝트 캐시 모두 무효화
      utils.project.list.invalidate();
      utils.workspace.list.invalidate();
      // 2초 후 채널 등록 페이지로 이동
      setTimeout(() => {
        router.push("/channels/new");
      }, 1500);
    },
    onSettled: () => setCreating(false),
  });

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim() || !workspace?.id) return;
    setCreating(true);
    createProject.mutate({
      workspaceId: workspace.id,
      name: newProjectName.trim(),
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="설정"
        description="워크스페이스, 프로젝트, 알림 설정을 관리합니다."
      />

      {/* 플랫폼 사용 흐름 */}
      <div className="card p-5">
        <h3 className="mb-3 text-[13px] font-semibold text-[var(--foreground)]">
          서비스 사용 순서
        </h3>
        <div className="flex items-center gap-2">
          {[
            {
              step: "1",
              label: "워크스페이스",
              desc: "팀/조직 단위",
              done: !!workspace,
            },
            {
              step: "2",
              label: "프로젝트",
              desc: "분석 단위",
              done: !!project,
            },
            { step: "3", label: "채널 등록", desc: "소셜 채널", done: false },
            {
              step: "4",
              label: "분석 시작",
              desc: "인사이트 확인",
              done: false,
            },
          ].map((s, i) => (
            <div key={s.step} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold ${
                    s.done
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-[var(--secondary)] text-[var(--muted-foreground)]"
                  }`}
                >
                  {s.done ? <Check className="h-4 w-4" /> : s.step}
                </div>
                <p className="text-[11px] font-medium text-[var(--foreground)]">
                  {s.label}
                </p>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  {s.desc}
                </p>
              </div>
              {i < 3 && <div className="mb-5 h-px w-8 bg-[var(--border)]" />}
            </div>
          ))}
        </div>
      </div>

      {/* 프로필 */}
      <div className="card p-5">
        <h3 className="mb-3 text-[13px] font-semibold text-[var(--foreground)]">
          프로필
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[13px] text-[var(--muted-foreground)]">
              이름
            </label>
            <input
              type="text"
              defaultValue={session?.user?.name ?? ""}
              className="input w-56"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-[13px] text-[var(--muted-foreground)]">
              이메일
            </label>
            <input
              type="email"
              defaultValue={session?.user?.email ?? ""}
              className="input w-56"
              readOnly
            />
          </div>
        </div>
      </div>

      {/* 워크스페이스 */}
      <div className="card p-5">
        <h3 className="mb-3 text-[13px] font-semibold text-[var(--foreground)]">
          워크스페이스
        </h3>
        {isLoading ? (
          <div className="flex items-center gap-2 text-[13px] text-[var(--muted-foreground)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            불러오는 중...
          </div>
        ) : workspace ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium">{workspace.name}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-md bg-amber-50 p-3">
            <p className="text-[12px] text-amber-700">
              워크스페이스가 없습니다.{" "}
              <a href="/onboarding" className="font-medium underline">
                온보딩에서 생성하세요 →
              </a>
            </p>
          </div>
        )}
      </div>

      {/* 프로젝트 */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
            프로젝트
          </h3>
          {project && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
              현재: {project.name}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-[13px] text-[var(--muted-foreground)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            불러오는 중...
          </div>
        ) : !workspace ? (
          <p className="text-[12px] text-[var(--muted-foreground)]">
            워크스페이스를 먼저 만들어야 프로젝트를 생성할 수 있어요.
          </p>
        ) : (
          <div className="space-y-3">
            {!project && (
              <div className="flex items-start gap-3 rounded-md bg-amber-50 p-3">
                <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-[12px] text-amber-700">
                  아직 프로젝트가 없어요. 채널을 등록하려면 프로젝트가
                  필요합니다. 아래에서 첫 번째 프로젝트를 만들어보세요.
                </p>
              </div>
            )}

            {/* 프로젝트 생성 폼 */}
            <form
              onSubmit={handleCreateProject}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="새 프로젝트 이름 (예: 더크림유니언 채널 분석)"
                className="input flex-1"
              />
              <button
                type="submit"
                disabled={!newProjectName.trim() || creating}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : created ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                {created ? "생성됨!" : "프로젝트 만들기"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 알림 설정 */}
      <div className="card p-5">
        <h3 className="mb-3 text-[13px] font-semibold text-[var(--foreground)]">
          알림 설정
        </h3>
        <div className="space-y-3">
          {[
            { label: "이메일 알림", desc: "분석 완료 및 이상 감지 시" },
            { label: "주간 리포트", desc: "매주 월요일 이메일로 발송" },
            { label: "트렌드 알림", desc: "급상승 키워드 감지 시" },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium">{n.label}</p>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  {n.desc}
                </p>
              </div>
              <div className="h-5 w-9 cursor-pointer rounded-full bg-[var(--foreground)] p-0.5">
                <div className="h-4 w-4 translate-x-4 rounded-full bg-white shadow-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button className="btn-primary">저장</button>
      </div>
    </div>
  );
}
