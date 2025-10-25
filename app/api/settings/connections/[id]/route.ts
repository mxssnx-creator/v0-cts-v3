import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

// DELETE connection
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Delete connection (cascade will handle related records)
    await sql`
      DELETE FROM exchange_connections
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to delete connection:", error)
    return NextResponse.json({ error: "Failed to delete connection" }, { status: 500 })
  }
}

// PATCH update connection
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    await sql`
      UPDATE exchange_connections
      SET 
        name = COALESCE(${body.name}, name),
        api_key = COALESCE(${body.api_key}, api_key),
        api_secret = COALESCE(${body.api_secret}, api_secret),
        is_enabled = COALESCE(${body.is_enabled}, is_enabled),
        is_live_trade = COALESCE(${body.is_live_trade}, is_live_trade),
        preset_type_id = ${body.preset_type_id !== undefined ? body.preset_type_id : sql`preset_type_id`},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to update connection:", error)
    return NextResponse.json({ error: "Failed to update connection" }, { status: 500 })
  }
}
