import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const presetId = searchParams.get("presetId")
    const connectionId = searchParams.get("connectionId")
    const status = searchParams.get("status")

    let query = sql`SELECT * FROM backtest_results WHERE 1=1`

    if (presetId) {
      query = sql`${query} AND preset_id = ${presetId}`
    }

    if (connectionId) {
      query = sql`${query} AND connection_id = ${connectionId}`
    }

    if (status) {
      query = sql`${query} AND status = ${status}`
    }

    const results = await sql`
      ${query}
      ORDER BY created_at DESC
      LIMIT 100
    `

    return NextResponse.json(results)
  } catch (error) {
    console.error("[v0] Failed to fetch backtest results:", error)
    return NextResponse.json({ error: "Failed to fetch backtest results" }, { status: 500 })
  }
}
