import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const level = searchParams.get("level") || undefined
    const category = searchParams.get("category") || undefined

    let sql = "SELECT * FROM site_logs WHERE 1=1"
    const params: any[] = []

    if (level) {
      params.push(level)
      sql += ` AND level = $${params.length}`
    }

    if (category) {
      params.push(category)
      sql += ` AND category = $${params.length}`
    }

    params.push(limit)
    sql += ` ORDER BY timestamp DESC LIMIT $${params.length}`

    const logs = await query(sql, params)

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("[v0] Error fetching site logs:", error)
    return NextResponse.json({ error: "Failed to fetch logs", logs: [] }, { status: 500 })
  }
}
