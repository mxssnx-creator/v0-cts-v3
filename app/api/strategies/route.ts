import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { query, insertReturning } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const strategies = await query("SELECT * FROM strategies WHERE user_id = $1 ORDER BY created_at DESC", [user.id])

    return NextResponse.json({
      success: true,
      data: strategies,
    })
  } catch (error) {
    console.error("[v0] Get strategies error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    const { name, description, strategy_type, parameters } = await request.json()

    if (!name || !strategy_type) {
      return NextResponse.json({ success: false, error: "Name and strategy type are required" }, { status: 400 })
    }

    const result = await insertReturning(
      "strategies",
      ["user_id", "name", "description", "strategy_type", "parameters"],
      [user.id, name, description || null, strategy_type, JSON.stringify(parameters || {})],
    )

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("[v0] Create strategy error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
