"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  Mail,
  Globe,
  Shield,
  AlertTriangle,
  Check,
  Loader2,
  Settings,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────

type ChannelState = {
  IN_APP: boolean;
  EMAIL: boolean;
  WEBHOOK: boolean;
};

type AlertTypeState = {
  WARNING_SPIKE: boolean;
  LOW_CONFIDENCE: boolean;
  BENCHMARK_DECLINE: boolean;
  PROVIDER_COVERAGE_LOW: boolean;
};

type ThresholdState = {
  warningSpike_minCount: number;
  lowConfidence_threshold: number;
  benchmarkDecline_threshold: number;
};

type GuardrailState = {
  globalCooldownMinutes: number;
  maxAlertsPerDay: number;
};

type FormState = {
  channels: ChannelState;
  alertTypes: AlertTypeState;
  thresholds: ThresholdState;
  guardrails: GuardrailState;
  webhookUrl: string;
};

const DEFAULT_FORM: FormState = {
  channels: { IN_APP: true, EMAIL: false, WEBHOOK: false },
  alertTypes: {
    WARNING_SPIKE: true,
    LOW_CONFIDENCE: true,
    BENCHMARK_DECLINE: true,
    PROVIDER_COVERAGE_LOW: false,
  },
  thresholds: {
    warningSpike_minCount: 3,
    lowConfidence_threshold: 0.4,
    benchmarkDecline_threshold: 15,
  },
  guardrails: {
    globalCooldownMinutes: 60,
    maxAlertsPerDay: 20,
  },
  webhookUrl: "",
};

// ─── Page ───────────────────────────────────────────────────────

export default function NotificationSettingsPage() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [toast, setToast] = useState<string | null>(null);
  const [serverWarnings, setServerWarnings] = useState<string[]>([]);

  const prefsQuery = trpc.notification.getPreferences.useQuery();
  const saveMutation = trpc.notification.savePreferences.useMutation({
    onSuccess: (data: any) => {
      setServerWarnings(data?.warnings ?? []);
      setToast("설정이 저장되었습니다");
      setTimeout(() => setToast(null), 3000);
    },
  });

  // Hydrate form from server (flat → nested)
  useEffect(() => {
    if (prefsQuery.data) {
      const d = prefsQuery.data as any;
      setForm({
        channels: {
          IN_APP: true,
          EMAIL: d.channelEmail ?? false,
          WEBHOOK: d.channelWebhook ?? false,
        },
        alertTypes: {
          WARNING_SPIKE: d.enableWarningSpike ?? true,
          LOW_CONFIDENCE: d.enableLowConfidence ?? true,
          BENCHMARK_DECLINE: d.enableBenchmarkDecline ?? true,
          PROVIDER_COVERAGE_LOW: d.enableProviderCoverage ?? false,
        },
        thresholds: {
          warningSpike_minCount: d.warningSpike_minCount ?? 3,
          lowConfidence_threshold: d.lowConfidence_threshold ?? 0.4,
          benchmarkDecline_threshold: d.benchmarkDecline_threshold ?? 15,
        },
        guardrails: {
          globalCooldownMinutes: d.globalCooldownMinutes ?? 60,
          maxAlertsPerDay: d.maxAlertsPerDay ?? 20,
        },
        webhookUrl: d.webhookUrl ?? "",
      });
    }
  }, [prefsQuery.data]);

  const handleSave = () => {
    setServerWarnings([]);
    // Flatten nested form to match API schema
    saveMutation.mutate({
      channelInApp: true,
      channelEmail: form.channels.EMAIL,
      channelWebhook: form.channels.WEBHOOK,
      webhookUrl: form.channels.WEBHOOK ? form.webhookUrl : "",
      enableWarningSpike: form.alertTypes.WARNING_SPIKE,
      enableLowConfidence: form.alertTypes.LOW_CONFIDENCE,
      enableBenchmarkDecline: form.alertTypes.BENCHMARK_DECLINE,
      enableProviderCoverage: form.alertTypes.PROVIDER_COVERAGE_LOW,
      warningSpike_minCount: form.thresholds.warningSpike_minCount,
      lowConfidence_threshold: form.thresholds.lowConfidence_threshold,
      benchmarkDecline_threshold: form.thresholds.benchmarkDecline_threshold,
      globalCooldownMinutes: form.guardrails.globalCooldownMinutes,
      maxAlertsPerDay: form.guardrails.maxAlertsPerDay,
    });
  };

  // ─── Helpers ────────────────────────────────────────────────

  const updateChannel = (key: keyof ChannelState, val: boolean) =>
    setForm((f) => ({ ...f, channels: { ...f.channels, [key]: val } }));

  const updateAlertType = (key: keyof AlertTypeState, val: boolean) =>
    setForm((f) => ({ ...f, alertTypes: { ...f.alertTypes, [key]: val } }));

  const updateThreshold = (key: keyof ThresholdState, val: number) =>
    setForm((f) => ({ ...f, thresholds: { ...f.thresholds, [key]: val } }));

  const updateGuardrail = (key: keyof GuardrailState, val: number) =>
    setForm((f) => ({ ...f, guardrails: { ...f.guardrails, [key]: val } }));

  // ─── Loading / Error ────────────────────────────────────────

  if (prefsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-400">설정을 불러오는 중이에요</span>
      </div>
    );
  }

  if (prefsQuery.isError) {
    return (
      <div className="py-16 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-red-400 mb-2" />
        <p className="text-sm text-red-500">설정을 불러오지 못했어요</p>
        <button
          onClick={() => prefsQuery.refetch()}
          className="mt-2 text-xs text-blue-600 hover:underline"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-500" />
          <h1 className="text-xl font-bold text-gray-900">알림 설정</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          알림 방식, 알림 종류, 알림 기준을 설정해요.
        </p>
      </div>

      {/* Server warnings */}
      {serverWarnings.length > 0 && (
        <div className="mb-4 space-y-2">
          {serverWarnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span className="text-sm text-amber-700">{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Section 1: 알림 채널 */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-900">알림 채널</h2>
        </div>

        <div className="space-y-3">
          {/* IN_APP */}
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked
              disabled
              className="h-4 w-4 rounded border-gray-300 text-indigo-600"
            />
            <div>
              <span className="text-sm text-gray-700">인앱 알림</span>
              <span className="ml-2 text-[11px] text-gray-400">항상 켜져 있어요</span>
            </div>
          </label>

          {/* EMAIL */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.channels.EMAIL}
                onChange={(e) => updateChannel("EMAIL", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
              />
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-sm text-gray-700">이메일 알림</span>
              </div>
            </label>
            {form.channels.EMAIL && (
              <p className="ml-7 mt-1 text-[11px] text-amber-600">
                이메일 발송을 위한 API 키 설정이 필요해요
              </p>
            )}
          </div>

          {/* WEBHOOK */}
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.channels.WEBHOOK}
                onChange={(e) => updateChannel("WEBHOOK", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
              />
              <div className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-sm text-gray-700">외부 연동 알림</span>
              </div>
            </label>
            {form.channels.WEBHOOK && (
              <div className="ml-7 mt-2">
                <input
                  type="text"
                  value={form.webhookUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, webhookUrl: e.target.value }))
                  }
                  placeholder="https://example.com/webhook"
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: 알림 유형 */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-gray-900">알림 유형</h2>
        </div>

        <div className="space-y-4">
          {(
            [
              {
                key: "WARNING_SPIKE" as const,
                label: "경고가 늘어날 때",
                desc: "경고 수가 기준보다 많아지면 알려드려요",
              },
              {
                key: "LOW_CONFIDENCE" as const,
                label: "신뢰도가 낮을 때",
                desc: "분석 신뢰도가 기준 아래로 떨어지면 알려드려요",
              },
              {
                key: "BENCHMARK_DECLINE" as const,
                label: "기준 점수가 떨어질 때",
                desc: "업종 기준 점수가 많이 내려가면 알려드려요",
              },
              {
                key: "PROVIDER_COVERAGE_LOW" as const,
                label: "데이터 연결이 부족할 때",
                desc: "연결된 데이터가 적고 신뢰도도 낮으면 알려드려요",
              },
            ] as const
          ).map(({ key, label, desc }) => (
            <div key={key} className="flex items-start justify-between gap-3">
              <div>
                <span className="text-sm font-medium text-gray-700">
                  {label}
                </span>
                <p className="mt-0.5 text-[11px] text-gray-400">{desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.alertTypes[key]}
                onClick={() => updateAlertType(key, !form.alertTypes[key])}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                  form.alertTypes[key] ? "bg-indigo-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    form.alertTypes[key] ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: 임계값 */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-900">알림 기준</h2>
        </div>

        <div className="space-y-5">
          {/* warningSpike_minCount */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              최소 경고 수
            </label>
            <p className="mb-2 text-[11px] text-gray-400">
              이 수 이상 경고가 생기면 알림을 보내요
            </p>
            <input
              type="number"
              min={1}
              max={20}
              value={form.thresholds.warningSpike_minCount}
              onChange={(e) =>
                updateThreshold(
                  "warningSpike_minCount",
                  Math.min(20, Math.max(1, Number(e.target.value) || 1))
                )
              }
              className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
            />
          </div>

          {/* lowConfidence_threshold */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              신뢰도 기준
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0.1}
                max={0.9}
                step={0.05}
                value={form.thresholds.lowConfidence_threshold}
                onChange={(e) =>
                  updateThreshold(
                    "lowConfidence_threshold",
                    Number(e.target.value)
                  )
                }
                className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-indigo-600"
              />
              <span className="w-10 text-right text-sm font-medium text-indigo-600">
                {form.thresholds.lowConfidence_threshold.toFixed(2)}
              </span>
            </div>
            {form.thresholds.lowConfidence_threshold > 0.7 && (
              <p className="mt-1 text-[11px] text-amber-600">
                기준이 높으면 분석할 때마다 알림이 올 수 있어요
              </p>
            )}
          </div>

          {/* benchmarkDecline_threshold */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              기준 점수 하락폭 (점)
            </label>
            <input
              type="number"
              min={5}
              max={50}
              value={form.thresholds.benchmarkDecline_threshold}
              onChange={(e) =>
                updateThreshold(
                  "benchmarkDecline_threshold",
                  Math.min(50, Math.max(5, Number(e.target.value) || 5))
                )
              }
              className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
            />
            {form.thresholds.benchmarkDecline_threshold < 5 && (
              <p className="mt-1 text-[11px] text-amber-600">
                너무 작으면 자연스러운 변동에도 알림이 와요
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section 4: 제한 설정 */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-500" />
          <h2 className="text-sm font-semibold text-gray-900">알림 빈도 조절</h2>
        </div>

        <div className="space-y-5">
          {/* globalCooldownMinutes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              같은 알림 쉬는 시간 (분)
            </label>
            <p className="mb-2 text-[11px] text-gray-400">
              같은 경고가 반복되지 않게 쉬는 시간이에요
            </p>
            <input
              type="number"
              min={10}
              max={1440}
              value={form.guardrails.globalCooldownMinutes}
              onChange={(e) =>
                updateGuardrail(
                  "globalCooldownMinutes",
                  Math.min(1440, Math.max(10, Number(e.target.value) || 10))
                )
              }
              className="w-28 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
            />
            {form.guardrails.globalCooldownMinutes < 30 && (
              <p className="mt-1 text-[11px] text-amber-600">
                너무 짧으면 알림이 자주 와서 피로할 수 있어요
              </p>
            )}
          </div>

          {/* maxAlertsPerDay */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              하루 최대 알림 수
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={form.guardrails.maxAlertsPerDay}
              onChange={(e) =>
                updateGuardrail(
                  "maxAlertsPerDay",
                  Math.min(100, Math.max(1, Number(e.target.value) || 1))
                )
              }
              className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-indigo-300"
            />
            {form.guardrails.maxAlertsPerDay > 50 && (
              <p className="mt-1 text-[11px] text-amber-600">
                너무 많으면 알림이 넘칠 수 있어요
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div>
          {toast && (
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <Check className="h-4 w-4" />
              {toast}
            </div>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              저장하고 있어요
            </>
          ) : (
            "설정 저장"
          )}
        </button>
      </div>
    </div>
  );
}
