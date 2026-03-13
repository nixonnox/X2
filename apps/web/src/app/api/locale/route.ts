import { NextRequest, NextResponse } from "next/server";
import { locales, type Locale } from "@/i18n/config";

export async function POST(req: NextRequest) {
  const { locale } = (await req.json()) as { locale: string };

  if (!locales.includes(locale as Locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const res = NextResponse.json({ locale });
  res.cookies.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return res;
}
