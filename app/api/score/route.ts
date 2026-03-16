import { NextRequest, NextResponse } from "next/server";
import { calculateScore, ScoreRequest } from "@/lib/scoring";

export async function POST(req: NextRequest) {
  try {
    const body: ScoreRequest = await req.json();
    const result = calculateScore(body);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ detail: msg }, { status: 422 });
  }
}
