import Link from "next/link";

export const metadata = { title: "개인정보처리방침" };

export default function PrivacyPage() {
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
          개인정보처리방침
        </h1>
        <p className="mt-2 text-[13px] text-[var(--muted-foreground)]">
          최종 업데이트: 2026년 3월 1일
        </p>

        <div className="mt-8 space-y-8 text-[13px] leading-relaxed text-[var(--foreground)]">
          <section>
            <h2 className="mb-3 text-[16px] font-semibold">
              1. 수집하는 개인정보
            </h2>
            <p>X2는 서비스 제공을 위해 다음의 개인정보를 수집합니다:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>필수 항목: 이메일 주소, 이름</li>
              <li>선택 항목: 프로필 이미지, 조직명</li>
              <li>자동 수집: 접속 로그, IP 주소, 브라우저 정보</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[16px] font-semibold">
              2. 개인정보의 이용 목적
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>서비스 제공 및 계정 관리</li>
              <li>서비스 이용 현황 분석 및 개선</li>
              <li>고객 문의 및 기술 지원</li>
              <li>서비스 관련 공지 및 안내</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-[16px] font-semibold">
              3. 개인정보의 보유 및 파기
            </h2>
            <p>
              회원 탈퇴 시 즉시 파기하며, 관련 법령에 따라 보존이 필요한 경우
              해당 기간 동안 보관합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[16px] font-semibold">
              4. 개인정보의 제3자 제공
            </h2>
            <p>
              X2는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
              다만, 법령에 의한 경우는 예외로 합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[16px] font-semibold">5. 이용자의 권리</h2>
            <p>
              이용자는 언제든지 자신의 개인정보에 대해 열람, 수정, 삭제를 요청할
              수 있습니다. 설정 페이지 또는 고객 지원을 통해 요청할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-[16px] font-semibold">6. 문의</h2>
            <p>개인정보 관련 문의는 아래 연락처로 문의해 주세요.</p>
            <p className="mt-2 text-[var(--muted-foreground)]">
              이메일: privacy@x2.app
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
