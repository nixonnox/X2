"use client";

import { useState } from "react";

type ActionItem = {
  id: string;
  action: string;
  reason: string;
  priority: "critical" | "high" | "medium" | "low";
  deadline: string;
  completed: boolean;
};

const MOCK_ACTIONS: ActionItem[] = [
  {
    id: "1",
    action: "고위험 댓글 3건 즉시 대응",
    reason: "부정적 확산 방지",
    priority: "critical",
    deadline: "오늘",
    completed: false,
  },
  {
    id: "2",
    action: "쇼츠 콘텐츠 주 2회 발행",
    reason: "쇼츠 조회수가 긴 영상 대비 2.3배",
    priority: "high",
    deadline: "이번 주",
    completed: false,
  },
  {
    id: "3",
    action: "수/목 오후 3시 업로드 최적화",
    reason: "데이터 기반 최적 참여율 시간대",
    priority: "medium",
    deadline: "다음 주",
    completed: true,
  },
  {
    id: "4",
    action: "튜토리얼 시리즈 기획",
    reason: "경쟁사 대비 차별화 기회",
    priority: "high",
    deadline: "2주 내",
    completed: false,
  },
  {
    id: "5",
    action: "가격 FAQ 고정 댓글 추가",
    reason: "가격 문의 댓글 45% 증가",
    priority: "medium",
    deadline: "이번 주",
    completed: true,
  },
  {
    id: "6",
    action: "Instagram 릴스 테스트 시작",
    reason: "릴스 알고리즘 노출 확대",
    priority: "low",
    deadline: "이번 달",
    completed: false,
  },
];

const PRIO_STYLE: Record<string, { label: string; cls: string }> = {
  critical: { label: "긴급", cls: "bg-red-50 text-red-600" },
  high: { label: "높음", cls: "bg-orange-50 text-orange-600" },
  medium: { label: "보통", cls: "bg-blue-50 text-blue-600" },
  low: { label: "낮음", cls: "bg-gray-50 text-gray-600" },
};

export default function InsightActionsPage() {
  const [actions, setActions] = useState(MOCK_ACTIONS);

  const toggleComplete = (id: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, completed: !a.completed } : a)),
    );
  };

  const pending = actions.filter((a) => !a.completed);
  const completed = actions.filter((a) => a.completed);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold text-[var(--foreground)]">
          추천 액션
        </h1>
        <p className="mt-0.5 text-[13px] text-[var(--muted-foreground)]">
          AI가 분석한 실행 가능한 행동 목록입니다.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-[11px] text-[var(--muted-foreground)]">
            전체 액션
          </p>
          <p className="mt-1 text-[22px] font-semibold text-[var(--foreground)]">
            {actions.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] text-[var(--muted-foreground)]">진행 중</p>
          <p className="mt-1 text-[22px] font-semibold text-orange-600">
            {pending.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] text-[var(--muted-foreground)]">완료</p>
          <p className="mt-1 text-[22px] font-semibold text-emerald-600">
            {completed.length}
          </p>
        </div>
      </div>

      {/* Pending Actions */}
      <div>
        <h2 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
          진행 필요
        </h2>
        <div className="space-y-2">
          {pending.map((a) => {
            const style = PRIO_STYLE[a.priority]!;
            return (
              <div key={a.id} className="card flex items-start gap-3 p-4">
                <input
                  type="checkbox"
                  checked={a.completed}
                  onChange={() => toggleComplete(a.id)}
                  className="mt-0.5 rounded border-[var(--border)]"
                />
                <div className="flex-1">
                  <p className="text-[13px] font-medium text-[var(--foreground)]">
                    {a.action}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                    {a.reason}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`badge text-[9px] ${style.cls}`}>
                    {style.label}
                  </span>
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    {a.deadline}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <h2 className="mb-3 text-[14px] font-semibold text-[var(--muted-foreground)]">
            완료됨
          </h2>
          <div className="space-y-2">
            {completed.map((a) => (
              <div
                key={a.id}
                className="card flex items-start gap-3 p-4 opacity-60"
              >
                <input
                  type="checkbox"
                  checked={a.completed}
                  onChange={() => toggleComplete(a.id)}
                  className="mt-0.5 rounded border-[var(--border)]"
                />
                <p className="flex-1 text-[13px] text-[var(--muted-foreground)] line-through">
                  {a.action}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
