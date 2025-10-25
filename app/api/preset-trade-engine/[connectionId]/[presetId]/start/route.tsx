import { type NextRequest, NextResponse } from "next/server"
import { PresetTradeEngine } from "@/lib/preset-trade-engine"
import { sql } from "@/lib/db"

// Store active engines
const activeEngines = new Map<string, PresetTradeEngine>()

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string; presetId: string }> },
) {
  try {
    const { connectionId, presetId } = await params
    const engineKey = `${connectionId}-${presetId}`

    // Check if already running
    if (activeEngines.has(engineKey)) {
      return NextResponse.json({ error: "Engine already running" }, { status: 400 })
    }

    // Get preset configuration
    const [preset] = await sql`
      SELECT * FROM presets WHERE id = ${presetId}
    `

    if (!preset) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 })
    }

    // Get connection
    const [connection] = await sql`
      SELECT * FROM exchange_connections WHERE id = ${connectionId}
    `

    if (!connection) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    const [useMainSymbols] = await sql`
      SELECT value FROM system_settings WHERE key = 'useMainSymbols'
    `

    const [forcedSymbolsSetting] = await sql`
      SELECT value FROM system_settings WHERE key = 'forcedSymbols'
    `

    const forcedSymbols = forcedSymbolsSetting ? JSON.parse(forcedSymbolsSetting.value) : []

    let symbols: string[] = [...forcedSymbols] // Always include forced symbols

    if (useMainSymbols?.value === "true") {
      const [mainSymbols] = await sql`
        SELECT value FROM system_settings WHERE key = 'mainSymbols'
      `
      const mainSymbolsList = JSON.parse(mainSymbols.value)
      symbols = [...new Set([...forcedSymbols, ...mainSymbolsList])] // Merge and deduplicate
    } else {
      // Default symbols merged with forced
      const defaultSymbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT"]
      symbols = [...new Set([...forcedSymbols, ...defaultSymbols])]
    }

    // Create and start engine
    const engine = new PresetTradeEngine(connectionId, presetId)

    await engine.start({
      connectionId,
      presetId,
      symbols,
      mode: preset.preset_type || "automatic",
      minProfitFactor: preset.min_profit_factor || 0.6,
      maxDrawdownHours: preset.max_drawdown_hours || 12,
      useTopSymbols: false,
      topSymbolsCount: 25,
    })

    // Store engine instance
    activeEngines.set(engineKey, engine)

    return NextResponse.json({
      success: true,
      message: "Preset trade engine started",
      symbols: symbols.length,
      forcedSymbols: forcedSymbols.length,
    })
  } catch (error) {
    console.error("[v0] Failed to start preset trade engine:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start engine" },
      { status: 500 },
    )
  }
}
