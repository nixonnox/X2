"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  FolderOpen,
  Check,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

type Step = "workspace" | "project" | "done";

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("workspace");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState({ name: "", slug: "" });
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [project, setProject] = useState({ name: "", description: "" });

  function handleWorkspaceName(name: string) {
    setWorkspace({
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9가-힣]+/g, "-")
        .replace(/^-|-$/g, ""),
    });
  }

  const createWorkspace = trpc.workspace.create.useMutation();
  const createProject = trpc.project.create.useMutation();

  async function handleCreateWorkspace() {
    if (!workspace.name.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const result = await createWorkspace.mutateAsync({
        name: workspace.name,
        slug:
          workspace.slug ||
          workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      });
      setWorkspaceId(result.id);
      setStep("project");
    } catch (e: any) {
      setError(e.message ?? "워크스페이스 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject() {
    if (!project.name.trim() || !workspaceId) return;
    setLoading(true);
    setError(null);

    try {
      await createProject.mutateAsync({
        workspaceId,
        name: project.name,
        description: project.description || undefined,
      });
      setStep("done");
    } catch (e: any) {
      setError(e.message ?? "프로젝트 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function handleFinish() {
    router.push("/dashboard");
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-6">
      {/* 스텝 인디케이터 */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {(["workspace", "project", "done"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                step === s
                  ? "bg-[var(--primary)] text-white"
                  : i < ["workspace", "project", "done"].indexOf(step)
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-[var(--secondary)] text-[var(--muted-foreground)]"
              }`}
            >
              {i < ["workspace", "project", "done"].indexOf(step) ? (
                <Check className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < 2 && <div className="h-px w-8 bg-[var(--border)]" />}
          </div>
        ))}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Workspace */}
      {step === "workspace" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="font-semibold">워크스페이스 만들기</h2>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            팀 이름 또는 회사 이름을 입력하세요. 개인 사용이면 본인 이름도
            좋습니다.
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">워크스페이스 이름</label>
              <input
                type="text"
                value={workspace.name}
                onChange={(e) => handleWorkspaceName(e.target.value)}
                placeholder="예: 마케팅 팀"
                className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] px-3 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                autoFocus
              />
            </div>
            {workspace.slug && (
              <p className="text-xs text-[var(--muted-foreground)]">
                URL: x2.app/<strong>{workspace.slug}</strong>
              </p>
            )}
          </div>
          <button
            onClick={handleCreateWorkspace}
            disabled={!workspace.name.trim() || loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "생성 중..." : "다음"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* Step 2: Project */}
      {step === "project" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="font-semibold">첫 프로젝트 만들기</h2>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            프로젝트는 분석할 채널을 묶는 단위입니다. 나중에 추가할 수 있어요.
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">프로젝트 이름</label>
              <input
                type="text"
                value={project.name}
                onChange={(e) =>
                  setProject({ ...project, name: e.target.value })
                }
                placeholder="예: 유튜브 채널 분석"
                className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] px-3 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">설명 (선택)</label>
              <input
                type="text"
                value={project.description}
                onChange={(e) =>
                  setProject({ ...project, description: e.target.value })
                }
                placeholder="예: 메인 채널 성과 추적"
                className="mt-1 h-10 w-full rounded-lg border border-[var(--border)] px-3 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
              />
            </div>
          </div>
          <button
            onClick={handleCreateProject}
            disabled={!project.name.trim() || loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "생성 중..." : "프로젝트 만들기"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      )}

      {/* Step 3: Done */}
      {step === "done" && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold">모든 준비가 완료되었습니다!</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            <strong>{workspace.name}</strong> 워크스페이스와{" "}
            <strong>{project.name}</strong> 프로젝트가 생성되었습니다.
          </p>
          <button
            onClick={handleFinish}
            className="w-full rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            대시보드로 이동
          </button>
        </div>
      )}
    </div>
  );
}
