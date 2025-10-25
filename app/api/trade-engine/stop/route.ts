import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getTradeEngine } from "@/lib/trade-engine"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { connectionId } = body

    console.log("[v0] [Trade Engine] Stopping trade engine for connection:", connectionId)

    const tradeEngine = getTradeEngine()

    if (!tradeEngine) {
      console.error("[v0] [Trade Engine] No trade engine instance found")
      return NextResponse.json({ error: "Trade engine not running" }, { status: 404 })
    }

    await tradeEngine.removeConnection(connectionId)

    await sql`
      UPDATE trade_engine_state
      SET status = 'stopped', stopped_at = NOW(), last_update = NOW()
      WHERE connection_id = ${connectionId}
    `

    console.log("[v0] [Trade Engine] Stopped successfully for connection:", connectionId)

    const activeConnections = await sql`
      SELECT COUNT(*) as count FROM trade_engine_state 
      WHERE status = 'running'
    `

    const shouldStopEngine = activeConnections[0]?.count === 0

    if (shouldStopEngine && tradeEngine.isRunning()) {
      console.log("[v0] [Trade Engine] No active connections remaining, stopping engine")
      await tradeEngine.stop()
    }

    return NextResponse.json({
      success: true,
      message: "Trade engine stopped successfully for connection",
      engineStillRunning: !shouldStopEngine,
    })
  } catch (error) {
    console.error("[v0] [Trade Engine] Failed to stop:", error)
    return NextResponse.json(
      {
        error: "Failed to stop trade engine",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
