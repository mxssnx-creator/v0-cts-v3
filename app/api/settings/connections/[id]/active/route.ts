import { type NextRequest, NextResponse } from "next/server"
import { execute, queryOne } from "@/lib/db"

// POST - Toggle active status for connections
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { is_active } = body

    console.log("[v0] [Connection] Toggling active status for connection:", id, "to:", is_active)

    await execute(
      `
      UPDATE exchange_connections
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `,
      [is_active, id],
    )

    if (is_active) {
      await execute(
        `
        INSERT INTO trade_engine_state (connection_id, status, last_update)
        VALUES ($1, 'stopped', CURRENT_TIMESTAMP)
        ON CONFLICT (connection_id) DO UPDATE SET status = 'stopped', last_update = CURRENT_TIMESTAMP
      `,
        [id],
      )
      console.log("[v0] [Connection] Trade engine state initialized for connection:", id)
    } else {
      const engineState = await queryOne(
        `
        SELECT status FROM trade_engine_state WHERE connection_id = $1
      `,
        [id],
      )

      if (engineState?.status === "running") {
        console.log("[v0] [Connection] Stopping trade engine for deactivated connection:", id)

        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/trade-engine/stop`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ connectionId: id }),
            },
          )

          if (!response.ok) {
            console.error("[v0] [Connection] Failed to stop trade engine via API")
          }
        } catch (error) {
          console.error("[v0] [Connection] Error calling stop API:", error)
          await execute(
            `
            UPDATE trade_engine_state
            SET status = 'stopped', stopped_at = CURRENT_TIMESTAMP, last_update = CURRENT_TIMESTAMP
            WHERE connection_id = $1
          `,
            [id],
          )
        }
      }
    }

    console.log("[v0] [Connection] Active status updated successfully")

    return NextResponse.json({
      success: true,
      message: is_active ? "Connection activated" : "Connection deactivated",
    })
  } catch (error) {
    console.error("[v0] [Connection] Failed to toggle active status:", error)
    return NextResponse.json(
      {
        error: "Failed to toggle active status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
