import { AlertTriangle } from "lucide-react";

/**
 * Mock/데모 데이터를 사용하는 화면 상단에 표시하는 배너.
 * 사용자에게 현재 보고 있는 데이터가 실제 데이터가 아님을 명확히 알린다.
 */
export function DemoBanner({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-amber-800">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <p className="text-[12px] font-medium">
        {message ??
          "현재 화면은 데모 데이터를 표시하고 있습니다. 실제 서비스 데이터와 다를 수 있습니다."}
      </p>
    </div>
  );
}
