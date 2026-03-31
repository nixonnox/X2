"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Database,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Server,
  Wifi,
} from "lucide-react";

type ProviderStatus = {
  name: string;
  platform: string;
  configured: boolean;
  lastCheck?: string;
  error?: string;
};

type PipelineStatus = {
  redis: { connected: boolean; version: string };
  database: { connected: boolean; tables: number };
  worker: { running: boolean; lastHeartbeat?: string };
  providers: ProviderStatus[];
  keywords: { total: number; saved: number };
  snapshots: { today: number; total: number };
  mentions: { today: number; total: number };
};

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 ${
      ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
    }`}>
      {ok
        ? <CheckCircle className="h-4 w-4 text-emerald-500" />
        : <XCircle className="h-4 w-4 text-red-500" />}
      <span className={`text-sm font-medium ${ok ? "text-emerald-700" : "text-red-700"}`}>
        {label}
      </span>
    </div>
  );
}

export default function PipelineMonitorPage() {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pipeline-status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-5 w-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">파이프라인 모니터링</h1>
          </div>
          <p className="text-sm text-gray-500">데이터 수집 인프라 상태를 확인합니다.</p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          새로고침
        </button>
      </div>

      {status ? (
        <div className="space-y-6">
          {/* Infrastructure */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-600">인프라 상태</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatusBadge ok={status.database.connected} label={`PostgreSQL (${status.database.tables} tables)`} />
              <StatusBadge ok={status.redis.connected} label={`Redis ${status.redis.version}`} />
              <StatusBadge ok={status.worker.running} label={status.worker.running ? "Worker 실행 중" : "Worker 중지"} />
            </div>
          </section>

          {/* Data Providers */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-600">데이터 소스</h2>
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">소스</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">플랫폼</th>
                    <th className="px-4 py-2.5 text-center font-medium text-gray-600">상태</th>
                    <th className="px-4 py-2.5 text-left font-medium text-gray-600">비고</th>
                  </tr>
                </thead>
                <tbody>
                  {status.providers.map((p) => (
                    <tr key={p.name} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-2.5 text-gray-500">{p.platform}</td>
                      <td className="px-4 py-2.5 text-center">
                        {p.configured
                          ? <span className="inline-flex items-center gap-1 text-emerald-600"><Wifi className="h-3 w-3" /> 연결됨</span>
                          : <span className="inline-flex items-center gap-1 text-gray-400"><XCircle className="h-3 w-3" /> 미설정</span>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">{p.error ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Data Stats */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-600">데이터 현황</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <Database className="mx-auto h-5 w-5 text-gray-400 mb-1" />
                <p className="text-2xl font-bold text-gray-900">{status.keywords.saved}</p>
                <p className="text-[11px] text-gray-500">저장된 키워드</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <Server className="mx-auto h-5 w-5 text-gray-400 mb-1" />
                <p className="text-2xl font-bold text-gray-900">{status.mentions.total}</p>
                <p className="text-[11px] text-gray-500">총 멘션</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <Clock className="mx-auto h-5 w-5 text-gray-400 mb-1" />
                <p className="text-2xl font-bold text-indigo-600">{status.mentions.today}</p>
                <p className="text-[11px] text-gray-500">오늘 수집</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <Activity className="mx-auto h-5 w-5 text-gray-400 mb-1" />
                <p className="text-2xl font-bold text-indigo-600">{status.snapshots.today}</p>
                <p className="text-[11px] text-gray-500">오늘 스냅샷</p>
              </div>
            </div>
          </section>

          {/* Warnings */}
          {(!status.redis.connected || !status.worker.running || status.keywords.saved === 0) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-amber-700">
                <AlertTriangle className="h-4 w-4" /> 주의사항
              </div>
              <ul className="space-y-1 text-[12px] text-amber-600">
                {!status.redis.connected && <li>Redis 5.0+ 필요 (현재 미연결 또는 버전 부족)</li>}
                {!status.worker.running && <li>Worker가 실행되지 않고 있습니다. `pnpm --filter @x2/analyzer dev` 실행 필요</li>}
                {status.keywords.saved === 0 && <li>저장된 키워드가 없습니다. Intelligence 허브에서 키워드를 북마크하세요</li>}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          {loading
            ? <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
            : <Activity className="mx-auto h-8 w-8 text-gray-300 mb-3" />}
          <p className="text-sm text-gray-500 mt-2">
            {loading ? "상태 확인 중..." : "파이프라인 상태를 불러오지 못했어요"}
          </p>
        </div>
      )}
    </div>
  );
}
