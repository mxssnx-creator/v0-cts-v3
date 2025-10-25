import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    const { connectionId } = await params

    const positions = await sql`
      SELECT 
        id, symbol, indication_type, side,
        entry_price, current_price, quantity, position_cost,
        takeprofit_factor, stoploss_ratio, profit_factor,
        trailing_enabled, opened_at, updated_at
      FROM pseudo_positions
      WHERE connection_id = ${connectionId}
        AND status = 'active'
      ORDER BY opened_at DESC
    `

    // Calculate PnL for each position
    const positionsWithPnL = positions.map((position: any) => {
      const entryPrice = Number.parseFloat(position.entry_price)
      const currentPrice = Number.parseFloat(position.current_price)
      const quantity = Number.parseFloat(position.quantity)

      let pnl = 0
      if (position.side === "long") {
        pnl = (currentPrice - entryPrice) * quantity
      } else {
        pnl = (entryPrice - currentPrice) * quantity
      }

      const pnlPercent = (pnl / (entryPrice * quantity)) * 100

      return {
        id: position.id,
        symbol: position.symbol,
        side: position.side,
        entryPrice,
        currentPrice,
        quantity,
        pnl,
        pnlPercent,
      }
    })

    return NextResponse.json(positionsWithPnL)
  } catch (error) {
    console.error("[v0] Failed to get positions:", error)
    return NextResponse.json({ error: "Failed to get positions" }, { status: 500 })
  }
}
