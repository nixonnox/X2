import Link from "next/link";

export const metadata = { title: "이용약관" };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/"
          className="mb-8 inline-block text-[13px] text-blue-600 hover:text-blue-800"
        >
          &larr; 홈으로
        </Link>

        <h1 className="text-[24px] font-bold text-[var(--foreground)]">
          서비스 이용약관
        </h1>
        <p className="mt-2 text-[13px] text-[var(--muted-foreground)]">
          최종 업데이트: 2026년 3월 1일
        </p>

        <div className="mt-8 space-y-8 text-[13px] leading-relaxed text-[var(--foreground)]">
          <section>
            <h2 className="mb-3 text-[16px] font-semibold">제1조 (목적)</h2>
            <p>
              본 약관은 X2(이하 &quot;서비스&quot;)가 제공하는 소셜 미디어 분석
              및 소셜 리스닝 서비스의 이용에 관한 기본적인 사항을 규정함을
              목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[16px] font-semibold">제2조 (정의)</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                &quot;서비스&quot;란 X2가 제공하는 소셜 미디어 데이터 수집,
                분석, 리포트 생성 등의 기능을 의미합니다.
              </li>
              <li>
                &quot;이용자&quot;란 본 약관에 동의하고 서비스를 이용하는 자를
                의미합니다.
              </li>
              <li>
                &quot;콘텐츠&quot;란 서비스를 통해 분석되는 소셜 미디어 데이터를
                의미합니다.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[16px] font-semibold">
              제3조 (서비스의 제공)
            </h2>
            <p>서비스는 다음의 기능을 제공합니다:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>소셜 미디어 채널 분석 및 성과 모니터링</li>
              <li>댓글 수집 및 감성 분석</li>
              <li>경쟁 채널 비교 분석</li>
              <li>소셜 리스닝 및 키워드 모니터링</li>
              <li>AI 기반 인사이트 및 전략 제안</li>
              <li>자동 리포트 생성 및 공유</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[16px] font-semibold">
              제4조 (이용자의 의무)
            </h2>
            <p>
              이용자는 서비스를 이용함에 있어 관련 법령을 준수하여야 하며,
              타인의 권리를 침해하거나 서비스의 정상적인 운영을 방해하는 행위를
              하여서는 안 됩니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[16px] font-semibold">
              제5조 (개인정보 보호)
            </h2>
            <p>
              서비스의 개인정보 처리에 관한 사항은{" "}
              <Link
                href="/privacy"
                className="text-blue-600 underline hover:text-blue-800"
              >
                개인정보처리방침
              </Link>
              에 따릅니다.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
