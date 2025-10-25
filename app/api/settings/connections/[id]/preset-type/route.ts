import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

// PATCH /api/settings/connections/[id]/preset-type - Assign preset type to connection
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { preset_type_id } = body

    console.log(`[v0] Assigning preset type ${preset_type_id} to connection ${id}`)

    // Validate preset type exists if provided
    if (preset_type_id) {
      const [presetType] = await sql`
        SELECT id FROM preset_types WHERE id = ${preset_type_id}
      `

      if (!presetType) {
        return NextResponse.json({ error: "Preset type not found" }, { status: 404 })
      }
    }

    // Update connection
    await sql`
      UPDATE exchange_connections
      SET preset_type_id = ${preset_type_id || null},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `

    console.log(`[v0] Successfully assigned preset type to connection ${id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to assign preset type:", error)
    return NextResponse.json({ error: "Failed to assign preset type" }, { status: 500 })
  }
}
