import { type NextRequest, NextResponse } from "next/server"
import type { PresetTradeEngine } from "@/lib/preset-trade-engine"

// Access the same engine map
declare global {
  var activePresetEngines: Map<string, PresetTradeEngine>
}

if (!global.activePresetEngines) {
  global.activePresetEngines = new Map()
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string; presetId: string }> },
) {
  try {
    const { connectionId, presetId } = await params
    const engineKey = `${connectionId}-${presetId}`

    const engine = global.activePresetEngines.get(engineKey)

    if (!engine) {
      return NextResponse.json({ error: "Engine not running" }, { status: 400 })
    }

    await engine.stop()
    global.activePresetEngines.delete(engineKey)

    return NextResponse.json({
      success: true,
      message: "Preset trade engine stopped",
    })
  } catch (error) {
    console.error("[v0] Failed to stop preset trade engine:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to stop engine" },
      { status: 500 },
    )
  }
}
