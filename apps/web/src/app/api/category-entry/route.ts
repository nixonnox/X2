import { NextRequest, NextResponse } from "next/server";
import { CategoryEntryEngine } from "@x2/api/services/engines/category-entry-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { seedKeyword, keywords = [] } = body;

    if (!seedKeyword) {
      return NextResponse.json({ error: "seedKeyword 필요" }, { status: 400 });
    }

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
