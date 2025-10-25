import { type NextRequest, NextResponse } from "next/server"
import { query, execute, queryOne } from "@/lib/db"
import { nanoid } from "nanoid"

// GET /api/preset-types - Get all preset types
export async function GET(request: NextRequest) {
  try {
    console.log("[v0] GET /api/preset-types - Fetching preset types...")

    const types = await query(`
      SELECT 
        pt.*,
        COUNT(DISTINCT pts.configuration_set_id) as sets_count
      FROM preset_types pt
      LEFT JOIN preset_type_sets pts ON pt.id = pts.preset_type_id AND pts.is_active = true
      GROUP BY pt.id
      ORDER BY pt.created_at DESC
    `)

    console.log("[v0] Successfully fetched", types.length, "preset types")
    return NextResponse.json(types)
  } catch (error) {
    console.error("[v0] Failed to fetch preset types:", error)
    return NextResponse.json(
      { error: "Failed to fetch preset types", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

// POST /api/preset-types - Create new preset type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const id = nanoid()

    await execute(
      `
      INSERT INTO preset_types (
        id, name, description, preset_trade_type,
        max_positions_per_indication, max_positions_per_direction, max_positions_per_range,
        timeout_per_indication, timeout_after_position,
        block_enabled, block_only, dca_enabled, dca_only,
        auto_evaluate, evaluation_interval_hours,
        is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9,
        $10, $11, $12, $13,
        $14, $15,
        $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `,
      [
        id,
        body.name,
        body.description || null,
        body.preset_trade_type || "automatic",
        body.max_positions_per_indication || 1,
        body.max_positions_per_direction || 1,
        body.max_positions_per_range || 1,
        body.timeout_per_indication || 5,
        body.timeout_after_position || 10,
        body.block_enabled || false,
        body.block_only || false,
        body.dca_enabled || false,
        body.dca_only || false,
        body.auto_evaluate !== false,
        body.evaluation_interval_hours || 3,
        body.is_active !== false,
      ],
    )

    const presetType = await queryOne("SELECT * FROM preset_types WHERE id = $1", [id])

    console.log("[v0] Preset type created successfully:", id)
    return NextResponse.json(presetType, { status: 201 })
  } catch (error) {
    console.error("[v0] Failed to create preset type:", error)
    return NextResponse.json(
      { error: "Failed to create preset type", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
