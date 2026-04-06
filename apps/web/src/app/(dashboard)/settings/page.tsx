"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/shared";
import { Loader2, Check, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const { data: session } = useSession();

  // ── Workspace data ──
  const { data: workspaces, isLoading: wsLoading } =
    trpc.workspace.list.useQuery(undefined, { staleTime: 60_000 });
  const workspace = workspaces?.[0];

  // ── Form state ──
  const [workspaceName, setWorkspaceName] = useState("");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Hydrate form when workspace loads
  useEffect(() => {
    if (workspace) {
      setWorkspaceName(workspace.name);
    }
  }, [workspace]);

  // ── Mutation ──
  const updateWorkspace = trpc.workspace.update.useMutation({
    onSuccess: () => {
      setToast({ type: "success", message: "설정이 저장되었어요" });
      setTimeout(() => setToast(null), 3000);
    },
    onError: (err) => {
      setToast({
        type: "error",
        message: err.message || "저장에 실패했어요",
      });
      setTimeout(() => setToast(null), 4000);
    },
  });

  const handleSave = () => {
    if (!workspace) return;
    updateWorkspace.mutate({ id: workspace.id, name: workspaceName });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("title")}
        description={t("description")}
        guide={t("guide")}
      />

      <div className="space-y-4">
        {/* 프로필 */}
        <div className="card p-5">
          <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
            프로필
          </h3>
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-[var(--muted-foreground)]">
                이름
              </label>
              <input
                type="text"
                defaultValue={session?.user?.name || ""}
                disabled
                className="input w-56 opacity-60"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-medium text-[var(--muted-foreground)]">
                이메일
              </label>
              <input
                type="email"
                defaultValue={session?.user?.email || ""}
                disabled
                className="input w-56 opacity-60"
              />
            </div>
          </div>
        </div>

        {/* 워크스페이스 */}
        <div className="card p-5">
          <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
            워크스페이스
          </h3>
          <div className="mt-3 space-y-3">
            {wsLoading ? (
              <div className="flex items-center gap-2 py-2 text-[13px] text-[var(--muted-foreground)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                불러오는 중...
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-medium text-[var(--muted-foreground)]">
                    워크스페이스 이름
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="input w-56"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-medium text-[var(--muted-foreground)]">
                    고유 주소
                  </label>
                  <input
                    type="text"
                    defaultValue={workspace?.slug || ""}
                    disabled
                    className="input w-56 opacity-60"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* 알림 */}
        <div className="card p-5">
          <h3 className="text-[13px] font-semibold text-[var(--foreground)]">
            알림
          </h3>
          <div className="mt-3 space-y-3">
            {["이메일 알림", "주간 리포트", "트렌드 알림"].map((label) => (
              <div key={label} className="flex items-center justify-between">
                <label className="text-[13px] font-medium text-[var(--muted-foreground)]">
                  {label}
                </label>
                <div className="h-5 w-9 rounded-full bg-[var(--foreground)] p-0.5">
                  <div className="h-4 w-4 translate-x-4 rounded-full bg-white shadow-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div>
            {toast && (
              <div
                className={`flex items-center gap-1.5 text-[13px] ${
                  toast.type === "success" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {toast.type === "success" ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
                {toast.message}
              </div>
            )}
          </div>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={updateWorkspace.isPending || !workspace}
          >
            {updateWorkspace.isPending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                저장 중...
              </span>
            ) : (
              tc("save")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
