/**
 * 루트 페이지.
 * 인증된 사용자 → /dashboard 리다이렉트
 * 미인증 사용자 → 마케팅 랜딩 페이지 (데모 분석 포함)
 */
import { redirect } from "next/navigation";
import { auth } from "@x2/auth";
import { LandingPage } from "./landing";

export default async function RootPage() {
  const session = await auth();
  if (session) redirect("/dashboard");
  return <LandingPage />;
}
