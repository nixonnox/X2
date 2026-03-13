import { auth } from "@x2/auth";
import { redirect } from "next/navigation";

/**
 * 서버 컴포넌트에서 현재 세션을 가져온다.
 * 인증되지 않으면 /login으로 리다이렉트한다.
 */
export async function getRequiredSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

/**
 * 서버 컴포넌트에서 현재 세션을 가져온다.
 * 인증되지 않아도 null을 반환한다.
 */
export async function getOptionalSession() {
  return auth();
}
