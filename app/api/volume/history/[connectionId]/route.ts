import { type NextRequest, NextResponse } from "next/server"
import { VolumeCalculator } from "@/lib/volume-calculator"

export async function GET(request: NextRequest, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    const { connectionId } = await params
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get("symbol") || undefined
    const limit = Number.parseInt(searchParams.get("limit") || "100")

    const history = await VolumeCalculator.getVolumeHistory(connectionId, symbol, limit)

    return NextResponse.json(history)
  } catch (error) {
    console.error("[v0] Failed to get volume history:", error)
    return NextResponse.json({ error: "Failed to get volume history" }, { status: 500 })
  }
}
