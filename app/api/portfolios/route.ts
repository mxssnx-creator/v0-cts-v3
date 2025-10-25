import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, insertReturning } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const portfolios = await query(
      `SELECT p.*, 
        (SELECT COUNT(*) FROM positions WHERE portfolio_id = p.id AND status = 'open') as open_positions
       FROM portfolios p 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [user.id],
    )

    return NextResponse.json({
      success: true,
      data: portfolios,
    })
  } catch (error) {
    console.error("[v0] Get portfolios error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { name, description, initial_value } = await request.json()

    if (!name) {
      return NextResponse.json({ success: false, error: "Portfolio name is required" }, { status: 400 })
    }

    const result = await insertReturning(
      "portfolios",
      ["user_id", "name", "description", "initial_value", "total_value"],
      [user.id, name, description || null, initial_value || 0, initial_value || 0],
    )

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("[v0] Create portfolio error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
