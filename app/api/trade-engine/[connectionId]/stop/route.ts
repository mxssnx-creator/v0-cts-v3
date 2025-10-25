import { type NextRequest, NextResponse } from "next/server"
import type { TradeEngineManager } from "@/lib/trade-engine/engine-manager"

// Access the same engine map
declare global {
  var activeEngines: Map<string, TradeEngineManager>
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    const { connectionId } = await params

    // Get engine from global map
    const engine = global.activeEngines?.get(connectionId)

    if (!engine) {
      return NextResponse.json({ error: "Engine not running" }, { status: 400 })
    }

    // Stop engine
    await engine.stop()

    // Remove from map
    global.activeEngines?.delete(connectionId)

    return NextResponse.json({ success: true, message: "Trade engine stopped" })
  } catch (error) {
    console.error("[v0] Failed to stop trade engine:", error)
    return NextResponse.json({ error: "Failed to stop trade engine" }, { status: 500 })
  }
}
