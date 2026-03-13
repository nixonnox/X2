import { OnboardingWizard } from "./onboarding-wizard";

export const metadata = { title: "시작하기" };

export default function OnboardingPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)] text-lg font-bold text-white">
          X2
        </div>
        <h1 className="mt-4 text-2xl font-bold">워크스페이스 설정</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          팀 또는 개인 워크스페이스를 만들고 첫 프로젝트를 시작하세요.
        </p>
      </div>

      <OnboardingWizard />
    </div>
  );
}
