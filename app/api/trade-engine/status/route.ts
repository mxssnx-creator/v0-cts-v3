import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getTradeEngine } from "@/lib/trade-engine"

export async function GET() {
  try {
    console.log("[v0] [Trade Engine] Fetching trade engine status...")

    const tradeEngine = getTradeEngine()

    if (!tradeEngine) {
      console.log("[v0] [Trade Engine] No trade engine instance found")
      return NextResponse.json({
        running: false,
        message: "Trade engine not initialized",
        connections: [],
      })
    }

    const status = tradeEngine.getStatus()

    let engineStates: any[] = []
    try {
      const result = await sql`
        SELECT 
          tes.*,
          ec.name as connection_name,
          ec.exchange
        FROM trade_engine_state tes
        JOIN exchange_connections ec ON tes.connection_id = ec.id
        WHERE ec.is_active = true
      `
      engineStates = result as any[]
    } catch (dbError) {
      console.error("[v0] [Trade Engine] Failed to fetch engine states:", dbError)
      // Continue with empty array
    }

    console.log("[v0] [Trade Engine] Status retrieved:", status)

    return NextResponse.json({
      ...status,
      connections: engineStates,
    })
  } catch (error) {
    console.error("[v0] [Trade Engine] Failed to get status:", error)
    return NextResponse.json({
      running: false,
      message: "Failed to get status",
      connections: [],
    })
  }
}
