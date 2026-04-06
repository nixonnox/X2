"use client";

import { Settings, Info, FlaskConical } from "lucide-react";
import type {
  CollectionSettings,
  ScheduleFrequency,
  RetryPolicy,
} from "@/lib/collection";
import { FREQUENCY_LABELS } from "@/lib/collection";

type Props = {
  settings: CollectionSettings;
  onChange?: (settings: CollectionSettings) => void;
};

const RETRY_POLICIES: { value: RetryPolicy; label: string }[] = [
  { value: "none", label: "재시도 안 함" },
  { value: "linear", label: "선형 (고정 간격)" },
  { value: "exponential", label: "지수적 (점진 증가)" },
];

export function CollectionSettingsPanel({ settings, onChange }: Props) {
  function update<K extends keyof CollectionSettings>(
    key: K,
    value: CollectionSettings[K],
  ) {
    onChange?.({ ...settings, [key]: value });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4 text-[var(--muted-foreground)]" />
        <h3 className="text-[14px] font-semibold text-[var(--foreground)]">
          수집 설정
        </h3>
      </div>

      {/* Dev mode banner */}
      {settings.devMode && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <FlaskConical className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-[12px] font-medium text-amber-800">
              개발/테스트 모드 활성
            </p>
            <p className="mt-0.5 text-[11px] text-amber-700">
              실제 API를 호출하지 않고 모의 데이터로 수집 흐름을 테스트합니다.
              운영 환경에서는 이 설정을 비활성화하세요.
            </p>
          </div>
        </div>
      )}

      <div className="card divide-y divide-[var(--border-subtle)]">
        {/* Global enable */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-[var(--foreground)]">
              전체 수집
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              모든 자동 수집을 활성화/비활성화합니다
            </p>
          </div>
          <button
            onClick={() => update("globalEnabled", !settings.globalEnabled)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              settings.globalEnabled ? "bg-emerald-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                settings.globalEnabled ? "translate-x-4.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Dev mode */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-[var(--foreground)]">
              개발 모드
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              모의 커넥터로 수집 테스트
            </p>
          </div>
          <button
            onClick={() => update("devMode", !settings.devMode)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              settings.devMode ? "bg-emerald-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                settings.devMode ? "translate-x-4.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Mock fallback */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-[var(--foreground)]">
              모의 폴백
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              API 실패 시 자동으로 모의 데이터 사용
            </p>
          </div>
          <button
            onClick={() => update("mockFallback", !settings.mockFallback)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              settings.mockFallback ? "bg-emerald-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                settings.mockFallback ? "translate-x-4.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Default frequency */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-[var(--foreground)]">
              기본 수집 주기
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              새 스케줄 생성 시 기본 주기
            </p>
          </div>
          <select
            value={settings.defaultFrequency}
            onChange={(e) =>
              update("defaultFrequency", e.target.value as ScheduleFrequency)
            }
            className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[12px]"
          >
            {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {/* Retry policy */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-[var(--foreground)]">
              재시도 정책
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              수집 실패 시 재시도 방식
            </p>
          </div>
          <select
            value={settings.defaultRetryPolicy}
            onChange={(e) =>
              update("defaultRetryPolicy", e.target.value as RetryPolicy)
            }
            className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[12px]"
          >
            {RETRY_POLICIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Max retries */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-[var(--foreground)]">
              최대 재시도 횟수
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              작업당 최대 재시도 수
            </p>
          </div>
          <select
            value={settings.defaultMaxRetries}
            onChange={(e) =>
              update("defaultMaxRetries", parseInt(e.target.value))
            }
            className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[12px]"
          >
            {[0, 1, 2, 3, 5].map((n) => (
              <option key={n} value={n}>
                {n}회
              </option>
            ))}
          </select>
        </div>

        {/* Rate limit */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-[var(--foreground)]">
              요청 제한
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              분당 최대 API 요청 수
            </p>
          </div>
          <select
            value={settings.rateLimitPerMinute}
            onChange={(e) =>
              update("rateLimitPerMinute", parseInt(e.target.value))
            }
            className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[12px]"
          >
            {[10, 30, 60, 120].map((n) => (
              <option key={n} value={n}>
                {n}/분
              </option>
            ))}
          </select>
        </div>

        {/* Data retention */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-[var(--foreground)]">
              데이터 보관 기간
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              수집 데이터 자동 삭제 기간
            </p>
          </div>
          <select
            value={settings.dataRetentionDays}
            onChange={(e) =>
              update("dataRetentionDays", parseInt(e.target.value))
            }
            className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[12px]"
          >
            {[30, 60, 90, 180, 365].map((n) => (
              <option key={n} value={n}>
                {n}일
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Help text */}
      <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
        <div className="space-y-1 text-[11px] text-blue-700">
          <p>수집 설정 변경은 다음 수집 주기부터 적용됩니다.</p>
          <p>
            운영 환경에서는 각 플랫폼의 API 사용 정책과 요청 제한을
            확인해주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
