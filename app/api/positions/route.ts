import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, insertReturning } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const portfolioId = searchParams.get("portfolio_id")
    const status = searchParams.get("status") || "open"

    let queryText = `
      SELECT p.*, tp.symbol, tp.base_currency, tp.quote_currency, e.name as exchange_name
      FROM positions p
      JOIN trading_pairs tp ON p.trading_pair_id = tp.id
      JOIN exchanges e ON tp.exchange_id = e.id
      JOIN portfolios pf ON p.portfolio_id = pf.id
      WHERE pf.user_id = $1 AND p.status = $2
    `
    const params: any[] = [user.id, status]

    if (portfolioId) {
      queryText += " AND p.portfolio_id = $3"
      params.push(portfolioId)
    }

    queryText += " ORDER BY p.opened_at DESC"

    const positions = await query(queryText, params)

    return NextResponse.json({
      success: true,
      data: positions,
    })
  } catch (error) {
    console.error("[v0] Get positions error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { portfolio_id, trading_pair_id, position_type, entry_price, quantity, leverage, stop_loss, take_profit } =
      await request.json()

    // Validate required fields
    if (!portfolio_id || !trading_pair_id || !position_type || !entry_price || !quantity) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Verify portfolio belongs to user
    const portfolios = await query("SELECT id FROM portfolios WHERE id = ? AND user_id = ?", [portfolio_id, user.id])

    if (portfolios.length === 0) {
      return NextResponse.json({ success: false, error: "Portfolio not found" }, { status: 404 })
    }

    const result = await insertReturning(
      "positions",
      [
        "portfolio_id",
        "trading_pair_id",
        "position_type",
        "entry_price",
        "current_price",
        "quantity",
        "leverage",
        "stop_loss",
        "take_profit",
        "status",
      ],
      [
        portfolio_id,
        trading_pair_id,
        position_type,
        entry_price,
        entry_price,
        quantity,
        leverage || 1.0,
        stop_loss || null,
        take_profit || null,
        "open",
      ],
    )

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("[v0] Create position error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
