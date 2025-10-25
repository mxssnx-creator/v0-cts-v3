import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const presetType = db.prepare("SELECT * FROM preset_types WHERE id = ?").get(id)

    if (!presetType) {
      return NextResponse.json({ error: "Preset type not found" }, { status: 404 })
    }

    return NextResponse.json(presetType)
  } catch (error) {
    console.error("[v0] Failed to fetch preset type:", error)
    return NextResponse.json({ error: "Failed to fetch preset type" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    db.prepare(`
      UPDATE preset_types SET
        name = ?,
        description = ?,
        preset_trade_type = ?,
        max_positions_per_indication = ?,
        max_positions_per_direction = ?,
        max_positions_per_range = ?,
        timeout_per_indication = ?,
        timeout_after_position = ?,
        block_enabled = ?,
        block_only = ?,
        dca_enabled = ?,
        dca_only = ?,
        auto_evaluate = ?,
        evaluation_interval_hours = ?,
        is_active = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      body.name,
      body.description || null,
      body.preset_trade_type || "automatic",
      body.max_positions_per_indication || 1,
      body.max_positions_per_direction || 1,
      body.max_positions_per_range || 1,
      body.timeout_per_indication || 5,
      body.timeout_after_position || 10,
      body.block_enabled ? 1 : 0,
      body.block_only ? 1 : 0,
      body.dca_enabled ? 1 : 0,
      body.dca_only ? 1 : 0,
      body.auto_evaluate !== false ? 1 : 0,
      body.evaluation_interval_hours || 3,
      body.is_active !== false ? 1 : 0,
      id,
    )

    const presetType = db.prepare("SELECT * FROM preset_types WHERE id = ?").get(id)

    return NextResponse.json(presetType)
  } catch (error) {
    console.error("[v0] Failed to update preset type:", error)
    return NextResponse.json({ error: "Failed to update preset type" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    db.prepare("DELETE FROM preset_types WHERE id = ?").run(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to delete preset type:", error)
    return NextResponse.json({ error: "Failed to delete preset type" }, { status: 500 })
  }
}
