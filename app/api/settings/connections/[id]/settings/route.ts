import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

// GET connection-specific settings
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const connectionId = id

    // Get connection settings from JSON column or separate table
    const [connection] = await sql`
      SELECT 
        id,
        name,
        connection_settings
      FROM exchange_connections
      WHERE id = ${connectionId}
    `

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    // Parse settings or return defaults
    const settings = connection.connection_settings
      ? JSON.parse(connection.connection_settings)
      : {
          baseVolumeFactorLive: 1.0,
          baseVolumeFactorPreset: 1.0,
          profitFactorMinBase: 0.6,
          profitFactorMinMain: 0.6,
          profitFactorMinReal: 0.6,
          trailingWithTrailing: true,
          trailingOnly: false,
          blockEnabled: true,
          blockOnly: false,
          dcaEnabled: false,
          dcaOnly: false,
        }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("[v0] Failed to fetch connection settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

// PATCH update connection-specific settings
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const connectionId = id
    const settings = await request.json()

    console.log("[v0] Saving connection settings for:", connectionId, settings)

    // Update connection settings in JSON column
    await sql`
      UPDATE exchange_connections
      SET 
        connection_settings = ${JSON.stringify(settings)},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${connectionId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to update connection settings:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}
