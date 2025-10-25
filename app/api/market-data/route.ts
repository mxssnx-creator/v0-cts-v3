// API endpoint for fetching market data
import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const symbol = searchParams.get("symbol")
    const interval = searchParams.get("interval") || "1m"
    const limit = Number.parseInt(searchParams.get("limit") || "100")

    let queryText = `
      SELECT md.*, tp.symbol, tp.base_currency, tp.quote_currency
      FROM market_data md
      JOIN trading_pairs tp ON md.trading_pair_id = tp.id
      WHERE md.interval = $1
    `
    const params: any[] = [interval]
    let paramIndex = 2

    if (symbol) {
      queryText += ` AND tp.symbol = $${paramIndex}`
      params.push(symbol)
      paramIndex++
    }

    queryText += ` ORDER BY md.timestamp DESC LIMIT $${paramIndex}`
    params.push(limit)

    const marketData = await query(queryText, params)

    return NextResponse.json({
      success: true,
      data: marketData,
    })
  } catch (error) {
    console.error("[v0] Error fetching market data:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
