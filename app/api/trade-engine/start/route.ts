import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getTradeEngine, initializeTradeEngine } from "@/lib/trade-engine"
import type { ExchangeConfig } from "@/lib/exchanges"
import type { StrategyResult } from "@/lib/strategies"
import type { IndicationResult } from "@/lib/indications"
import { SystemLogger } from "@/lib/system-logger"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { connectionId } = body

    console.log("[v0] [Trade Engine] Starting trade engine for connection:", connectionId)
    await SystemLogger.logTradeEngine(`Starting trade engine for connection: ${connectionId}`, "info", { connectionId })

    let tradeEngine = getTradeEngine()

    if (!tradeEngine) {
      // Load strategies and indications once
      const strategies = (await sql`
        SELECT * FROM strategies WHERE is_enabled = true
      `) as StrategyResult[]

      const indications = (await sql`
        SELECT * FROM indications WHERE is_enabled = true
      `) as IndicationResult[]

      console.log("[v0] [Trade Engine] Loaded", strategies.length, "strategies and", indications.length, "indications")
      await SystemLogger.logTradeEngine(
        `Loaded ${strategies.length} strategies and ${indications.length} indications`,
        "info",
      )

      tradeEngine = initializeTradeEngine(strategies, indications)
      await tradeEngine.start()
    }

    const [connection] = await sql`
      SELECT ec.*, vc.base_volume_factor
      FROM exchange_connections ec
      LEFT JOIN volume_configuration vc ON ec.id = vc.connection_id
      WHERE ec.id = ${connectionId} AND ec.is_active = true
    `

    if (!connection) {
      console.error("[v0] [Trade Engine] Connection not found or not active:", connectionId)
      await SystemLogger.logTradeEngine(`Connection not found or not active: ${connectionId}`, "error", {
        connectionId,
      })
      return NextResponse.json({ error: "Connection not found or not active" }, { status: 404 })
    }

    const exchangeConfig: ExchangeConfig = {
      id: connection.id,
      name: connection.name,
      apiKey: connection.api_key,
      apiSecret: connection.api_secret,
      testnet: connection.is_testnet,
      status: "connected",
      connectionMethod: connection.connection_method,
      marginMode: connection.margin_type,
      hedgingMode: connection.position_mode === "hedge" ? "hedge" : "single",
    }

    await tradeEngine.addConnection(exchangeConfig)

    await sql`
      INSERT INTO trade_engine_state (connection_id, status, last_started_at, updated_at)
      VALUES (${connectionId}, 'running', NOW(), NOW())
      ON CONFLICT (connection_id) 
      DO UPDATE SET status = 'running', last_started_at = NOW(), updated_at = NOW()
    `

    console.log("[v0] [Trade Engine] Started successfully for connection:", connectionId)
    await SystemLogger.logTradeEngine(`Trade engine started successfully for connection: ${connection.name}`, "info", {
      connectionId,
      connectionName: connection.name,
    })

    const connectionStatus = tradeEngine.getConnectionStatus(connectionId)

    return NextResponse.json({
      success: true,
      message: "Trade engine started successfully for connection",
      status: connectionStatus,
    })
  } catch (error) {
    console.error("[v0] [Trade Engine] Failed to start:", error)
    await SystemLogger.logError(error, "trade-engine", "POST /api/trade-engine/start")

    return NextResponse.json(
      {
        error: "Failed to start trade engine",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
