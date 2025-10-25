import { type NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { nanoid } from "nanoid"
import { SystemLogger } from "@/lib/system-logger"

export async function GET() {
  try {
    console.log("[v0] Fetching all connections...")
    await SystemLogger.logAPI("Fetching all connections", "info", "GET /api/settings/connections")

    const connections = await query(`
      SELECT 
        ec.*
      FROM exchange_connections ec
      WHERE ec.is_active = true
      ORDER BY ec.created_at DESC
    `)

    console.log("[v0] Found connections:", connections.length)
    await SystemLogger.logAPI(`Found ${connections.length} connections`, "info", "GET /api/settings/connections")

    return NextResponse.json(connections, { status: 200 })
  } catch (error) {
    console.error("[v0] Error fetching connections:", error)
    await SystemLogger.logError(error, "api", "GET /api/settings/connections")

    return NextResponse.json({ error: "Failed to fetch connections", connections: [] }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("[v0] Creating new connection:", {
      name: body.name,
      exchange: body.exchange,
      api_type: body.api_type,
    })

    await SystemLogger.logAPI(
      `Creating connection: ${body.name} (${body.exchange})`,
      "info",
      "POST /api/settings/connections",
      { exchange: body.exchange, api_type: body.api_type },
    )

    if (!body.name || !body.exchange) {
      await SystemLogger.logAPI("Missing required fields", "warn", "POST /api/settings/connections")
      return NextResponse.json(
        { error: "Missing required fields", details: "Connection name and exchange are required" },
        { status: 400 },
      )
    }

    if (!body.api_key || !body.api_secret) {
      await SystemLogger.logAPI("Missing API credentials", "warn", "POST /api/settings/connections")
      return NextResponse.json(
        { error: "Missing API credentials", details: "Both API key and API secret are required" },
        { status: 400 },
      )
    }

    const connectionId = nanoid()

    await execute(
      `INSERT INTO exchange_connections (
        id, user_id, name, exchange, api_type, connection_method,
        connection_library, api_key, api_secret, margin_type, position_mode, 
        is_testnet, is_enabled, is_live_trade, is_preset_trade, is_active
      ) VALUES ($1, 1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false, false, false, true)`,
      [
        connectionId,
        body.name,
        body.exchange,
        body.api_type || "perpetual_futures",
        body.connection_method || "rest",
        body.connection_library || "rest",
        body.api_key,
        body.api_secret,
        body.margin_type || "cross",
        body.position_mode || "hedge",
        body.is_testnet || false,
      ],
    )

    console.log("[v0] Connection created successfully:", connectionId)
    await SystemLogger.logConnection(`Connection created: ${body.name}`, connectionId, "info", {
      exchange: body.exchange,
      testnet: body.is_testnet,
    })

    return NextResponse.json(
      {
        success: true,
        id: connectionId,
        message: "Connection created successfully",
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[v0] Error creating connection:", error)
    await SystemLogger.logError(error, "api", "POST /api/settings/connections")

    return NextResponse.json(
      {
        error: "Failed to create connection",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
