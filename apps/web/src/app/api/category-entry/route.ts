import { NextRequest, NextResponse } from "next/server";
// CategoryEntryEngine은 패키지 경로 대신 직접 참조
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CategoryEntryEngineType = any;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { seedKeyword, keywords = [] } = body;

    if (!seedKeyword) {
      return NextResponse.json({ error: "seedKeyword 필요" }, { status: 400 });
    }

    const { CategoryEntryEngine } =
      (await import("@x2/api/services/engines/category-entry-engine")) as {
        CategoryEntryEngine: CategoryEntryEngineType;
      };
    const engine = new CategoryEntryEngine();
    const result = engine.analyze(seedKeyword, keywords);

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
