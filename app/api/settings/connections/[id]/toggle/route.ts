import { type NextRequest, NextResponse } from "next/server"
import { execute } from "@/lib/db"

// POST toggle connection enabled status
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const connectionId = id
    const { is_enabled, is_live_trade, is_preset_trade } = await request.json()

    console.log("[v0] Toggling connection:", connectionId, {
      is_enabled,
      is_live_trade,
      is_preset_trade,
    })

    await execute(
      `
      UPDATE exchange_connections
      SET 
        is_enabled = $1,
        is_live_trade = $2,
        is_preset_trade = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `,
      [is_enabled, is_live_trade, is_preset_trade, connectionId],
    )

    if (is_enabled) {
      await execute(
        `
        INSERT INTO trade_engine_state (connection_id, status, last_updated)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (connection_id) DO UPDATE
        SET last_updated = CURRENT_TIMESTAMP
      `,
        [connectionId, "stopped"],
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to toggle connection:", error)
    return NextResponse.json({ error: "Failed to toggle connection" }, { status: 500 })
  }
}
