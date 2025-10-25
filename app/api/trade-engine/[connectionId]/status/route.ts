import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    const { connectionId } = await params

    const [state] = await sql`
      SELECT * FROM trade_engine_state
      WHERE connection_id = ${connectionId}
    `

    if (!state) {
      return NextResponse.json({ error: "Engine state not found" }, { status: 404 })
    }

    return NextResponse.json(state)
  } catch (error) {
    console.error("[v0] Failed to get engine status:", error)
    return NextResponse.json({ error: "Failed to get engine status" }, { status: 500 })
  }
}
