import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const [result] = await sql`
      SELECT * FROM backtest_results WHERE id = ${id}
    `

    if (!result) {
      return NextResponse.json({ error: "Backtest result not found" }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Failed to fetch backtest result:", error)
    return NextResponse.json({ error: "Failed to fetch backtest result" }, { status: 500 })
  }
}
