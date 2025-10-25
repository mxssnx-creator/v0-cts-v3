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
    const status = searchParams.get("status")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    let queryText = `
      SELECT o.*, tp.symbol, tp.base_currency, tp.quote_currency, e.name as exchange_name
      FROM orders o
      JOIN trading_pairs tp ON o.trading_pair_id = tp.id
      JOIN exchanges e ON tp.exchange_id = e.id
      WHERE o.user_id = $1
    `
    const params: any[] = [user.id]
    let paramIndex = 2

    if (portfolioId) {
      queryText += ` AND o.portfolio_id = $${paramIndex}`
      params.push(portfolioId)
      paramIndex++
    }

    if (status) {
      queryText += ` AND o.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    queryText += ` ORDER BY o.created_at DESC LIMIT $${paramIndex}`
    params.push(limit)

    const orders = await query(queryText, params)

    return NextResponse.json({
      success: true,
      data: orders,
    })
  } catch (error) {
    console.error("[v0] Get orders error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { portfolio_id, trading_pair_id, order_type, side, price, quantity, time_in_force } = await request.json()

    // Validate required fields
    if (!portfolio_id || !trading_pair_id || !order_type || !side || !quantity) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Verify portfolio belongs to user
    const portfolios = await query("SELECT id FROM portfolios WHERE id = ? AND user_id = ?", [portfolio_id, user.id])

    if (portfolios.length === 0) {
      return NextResponse.json({ success: false, error: "Portfolio not found" }, { status: 404 })
    }

    const result = await insertReturning(
      "orders",
      [
        "user_id",
        "portfolio_id",
        "trading_pair_id",
        "order_type",
        "side",
        "price",
        "quantity",
        "remaining_quantity",
        "time_in_force",
        "status",
      ],
      [
        user.id,
        portfolio_id,
        trading_pair_id,
        order_type,
        side,
        price || null,
        quantity,
        quantity,
        time_in_force || "GTC",
        "pending",
      ],
    )

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("[v0] Create order error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
