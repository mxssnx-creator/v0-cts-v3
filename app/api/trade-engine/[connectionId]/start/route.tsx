import { type NextRequest, NextResponse } from "next/server"
import { TradeEngine } from "@/lib/trade-engine/trade-engine"
import { sql } from "@/lib/db"

// Store active engines in memory
const activeEngines = new Map<string, TradeEngine>()

export async function POST(request: NextRequest, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    const { connectionId } = await params

    // Check if engine already running
    if (activeEngines.has(connectionId)) {
      return NextResponse.json({ error: "Engine already running" }, { status: 400 })
    }

    const settings = await sql`
      SELECT key, value FROM system_settings
      WHERE key IN ('tradeEngineInterval', 'realPositionsInterval', 'timeRangeHistoryDays')
    `

    const config = {
      connectionId,
      tradeInterval: Number.parseFloat(settings.find((s: any) => s.key === "tradeEngineInterval")?.value || "1.0"),
      realInterval: Number.parseFloat(settings.find((s: any) => s.key === "realPositionsInterval")?.value || "0.3"),
      historyDays: Number.parseInt(settings.find((s: any) => s.key === "timeRangeHistoryDays")?.value || "5"),
    }

    // Create and start unified trade engine
    const engine = new TradeEngine(config)
    await engine.start(config)

    // Store engine
    activeEngines.set(connectionId, engine)

    return NextResponse.json({
      success: true,
      message: "Unified trade engine started",
      config: {
        tradeInterval: config.tradeInterval,
        realInterval: config.realInterval,
        historyDays: config.historyDays,
      },
    })
  } catch (error) {
    console.error("[v0] Failed to start trade engine:", error)
    return NextResponse.json({ error: "Failed to start trade engine" }, { status: 500 })
  }
}
