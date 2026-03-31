"use client";

import { useState, useCallback, type RefObject } from "react";
import { Camera, Loader2 } from "lucide-react";

type Props = {
  /** 캡처할 DOM 요소의 ref */
  targetRef: RefObject<HTMLElement | null>;
  /** 저장 파일명 (확장자 제외) */
  filename?: string;
  /** 버튼 라벨 */
  label?: string;
  /** 이미지 배율 (기본 2x for retina) */
  scale?: number;
  /** 배경색 (기본 흰색) */
  backgroundColor?: string;
};

/**
 * 차트/DOM 영역을 PNG 이미지로 캡처하여 다운로드하는 버튼.
 *
 * 사용법:
 * ```tsx
 * const chartRef = useRef<HTMLDivElement>(null);
 * <div ref={chartRef}><ResponsiveContainer>...</ResponsiveContainer></div>
 * <ChartExportButton targetRef={chartRef} filename="mention-trend" />
 * ```
 */
export function ChartExportButton({
  targetRef,
  filename = "chart",
  label = "이미지 저장",
  scale = 2,
  backgroundColor = "#ffffff",
}: Props) {
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = useCallback(async () => {
    const target = targetRef.current;
    if (!target) return;

    setIsCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;

      const canvas = await html2canvas(target, {
        scale,
        backgroundColor,
        useCORS: true,
        logging: false,
        // SVG 내부 텍스트 렌더링 보정
        onclone: (clonedDoc) => {
          const svgs = clonedDoc.querySelectorAll("svg");
          svgs.forEach((svg) => {
            svg.setAttribute("width", svg.getBoundingClientRect().width.toString());
            svg.setAttribute("height", svg.getBoundingClientRect().height.toString());
          });
        },
      });

      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}-${new Date().toISOString().split("T")[0]}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // Silent fail — can add toast later
    } finally {
      setIsCapturing(false);
    }
  }, [targetRef, filename, scale, backgroundColor]);

  return (
    <button
      onClick={handleCapture}
      disabled={isCapturing}
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40"
      title={label}
    >
      {isCapturing ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Camera className="h-3 w-3" />
      )}
      {label}
    </button>
  );
}
