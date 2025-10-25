import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

// PATCH update volume factor
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    // Update or insert volume configuration
    await sql`
      INSERT INTO volume_configuration (connection_id, base_volume_factor)
      VALUES (${id}, ${body.volume_factor})
      ON CONFLICT (connection_id)
      DO UPDATE SET 
        base_volume_factor = ${body.volume_factor},
        updated_at = CURRENT_TIMESTAMP
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to update volume factor:", error)
    return NextResponse.json({ error: "Failed to update volume factor" }, { status: 500 })
  }
}
