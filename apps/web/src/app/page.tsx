/**
 * 마케팅 랜딩 페이지 (비로그인 사용자).
 * Route: /
 */
import {
  Tv,
  Search,
  Globe,
  FileText,
  ArrowRight,
  CheckCircle2,
  Users,
  Shield,
  TrendingUp,
} from "lucide-react";
import { ScrollLink } from "@/components/landing/scroll-link";

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-white/10 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-6 py-28 text-center sm:py-36 lg:py-44">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
          채널 성과부터 검색 의도까지,
          <br className="hidden sm:block" />
          소셜 인텔리전스의 모든 것
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-indigo-100 sm:text-lg">
          X2는 채널 분석, 검색 의도 탐색, AI 검색 가시성을 하나의 플랫폼에서
          제공합니다
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
          >
            무료로 시작하기
            <ArrowRight className="h-4 w-4" />
          </a>
          <ScrollLink
            targetId="hubs"
            className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
          >
            서비스 둘러보기
          </ScrollLink>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Hub Cards                                                          */
/* ------------------------------------------------------------------ */
const hubs = [
  {
    icon: Tv,
    title: "채널 & 콘텐츠 분석",
    tagline: "우리 채널의 성과를 한눈에 보고, 경쟁사와 비교하세요",
    description:
      "YouTube, Instagram, TikTok 채널 성과 추적, 댓글 감성 분석, 경쟁사 비교",
  },
  {
    icon: Search,
    title: "검색 의도 & 고객 여정",
    tagline: "고객이 무엇을 검색하고, 어떤 경로로 결정하는지 파악하세요",
    description:
      "키워드 하나로 검색 의도, 클러스터, 고객 여정, 소비자 페르소나 자동 분석",
  },
  {
    icon: Globe,
    title: "AI 가시성 & 인용",
    tagline: "AI 검색에서 우리 콘텐츠가 제대로 인용되고 있나요?",
    description: "ChatGPT, Gemini 등 AI 검색 시대에 맞춘 인용 추적과 최적화",
  },
  {
    icon: FileText,
    title: "실행 & 리포트",
    tagline: "분석 결과를 실행 가능한 액션과 리포트로 전환하세요",
    description:
      "AI가 핵심 발견, 추천 액션, 위험 시그널을 자동 도출하고 리포트 생성",
  },
] as const;

function HubCards() {
  return (
    <section id="hubs" className="bg-gray-50 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          하나의 플랫폼, 네 가지 관점
        </h2>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {hubs.map((hub) => (
            <div
              key={hub.title}
              className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition group-hover:bg-indigo-600 group-hover:text-white">
                <hub.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-gray-900">
                {hub.title}
              </h3>
              <p className="mt-2 text-sm font-medium text-indigo-600">
                {hub.tagline}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {hub.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How it works                                                       */
/* ------------------------------------------------------------------ */
const steps = [
  {
    num: "01",
    title: "채널 또는 키워드를 입력하세요",
    description: "URL을 붙여넣거나 키워드를 입력하면 즉시 분석이 시작됩니다",
  },
  {
    num: "02",
    title: "AI가 자동으로 분석합니다",
    description: "감성, 트렌드, 검색 의도, 경쟁 현황을 한눈에 파악하세요",
  },
  {
    num: "03",
    title: "인사이트를 행동으로 전환하세요",
    description: "리포트, 알림, 추천 액션으로 실제 업무에 바로 활용하세요",
  },
] as const;

function HowItWorks() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          이렇게 시작하세요
        </h2>

        <div className="mt-14 grid gap-10 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.num} className="text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                {step.num}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-gray-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Use cases                                                          */
/* ------------------------------------------------------------------ */
const useCases = [
  {
    icon: TrendingUp,
    title: "마케팅 팀",
    description: "채널 성과 분석, 경쟁사 모니터링, 콘텐츠 전략 수립",
  },
  {
    icon: Shield,
    title: "브랜드 매니저",
    description: "브랜드 언급 추적, 감성 분석, 위기 감지",
  },
  {
    icon: Users,
    title: "검색 최적화 담당자",
    description: "검색 의도 분석, AI 검색 가시성, 키워드 전략",
  },
] as const;

function UseCases() {
  return (
    <section className="bg-gray-50 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          이런 팀에게 필요해요
        </h2>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {useCases.map((uc) => (
            <div
              key={uc.title}
              className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <uc.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-gray-900">
                {uc.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {uc.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA Footer                                                         */
/* ------------------------------------------------------------------ */
function CtaFooter() {
  return (
    <section className="bg-gradient-to-br from-indigo-600 to-violet-600 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-6 text-center text-white">
        <h2 className="text-2xl font-bold sm:text-3xl">지금 바로 시작하세요</h2>
        <p className="mt-4 text-indigo-100">
          복잡한 설정 없이, 채널 URL이나 키워드만 입력하면 됩니다.
        </p>
        <a
          href="/login"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
        >
          무료로 시작하기
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
        <p className="text-sm text-gray-500">
          X2 &mdash; 올인원 소셜 인텔리전스 플랫폼
        </p>
        <div className="flex gap-6 text-sm text-gray-400">
          <a href="#" className="transition hover:text-gray-600">
            이용약관
          </a>
          <a href="#" className="transition hover:text-gray-600">
            개인정보처리방침
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Hero />
      <HubCards />
      <HowItWorks />
      <UseCases />
      <CtaFooter />
      <Footer />
    </main>
  );
}
