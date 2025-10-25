import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { DatabaseInitializer } from "@/lib/db-initializer"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Initializing default predefined connections (Bybit and BingX)")

    const dbReady = await DatabaseInitializer.initialize(5, 60000)
    if (!dbReady) {
      console.error("[v0] Database initialization failed after retries")
      return NextResponse.json(
        { error: "Database not ready", details: "Failed to initialize database" },
        { status: 503 },
      )
    }

    // Check if predefined connections already exist
    const existing = await sql`
      SELECT id FROM exchange_connections 
      WHERE is_predefined = true AND exchange IN ('bybit', 'bingx')
    `

    if (existing.length >= 2) {
      console.log("[v0] Default predefined connections already exist:", existing.length)
      return NextResponse.json({
        success: true,
        message: "Default predefined connections already initialized",
        count: existing.length,
      })
    }

    // Ensure exchanges exist
    await sql`
      INSERT INTO exchanges (name, display_name, supports_spot, supports_futures, supports_margin, is_active, api_endpoint, websocket_endpoint)
      VALUES 
        ('bybit', 'Bybit', true, true, false, true, 'https://api.bybit.com', 'wss://stream.bybit.com'),
        ('bingx', 'BingX', true, true, false, true, 'https://open-api.bingx.com', 'wss://open-api-swap.bingx.com')
      ON CONFLICT (name) DO UPDATE SET 
        is_active = EXCLUDED.is_active,
        display_name = EXCLUDED.display_name,
        supports_spot = EXCLUDED.supports_spot,
        supports_futures = EXCLUDED.supports_futures,
        supports_margin = EXCLUDED.supports_margin,
        api_endpoint = EXCLUDED.api_endpoint,
        websocket_endpoint = EXCLUDED.websocket_endpoint
    `

    // Get exchange IDs
    const exchanges = await sql`
      SELECT id, name FROM exchanges 
      WHERE name IN ('bybit', 'bingx')
    `

    const exchangeMap = Object.fromEntries(exchanges.map((e: any) => [e.name, e.id]))

    console.log("[v0] Creating default inactive connections for Bybit and BingX")

    const defaultConnections = [
      {
        id: "default-bybit-x03",
        name: "Bybit X03 (Default)",
        exchange: "bybit",
        exchange_id: exchangeMap["bybit"],
        api_type: "unified",
        connection_library: "bybit-api",
        api_key: "4Gba1MjGbrTTfDAauP",
        api_secret: "QYtOgsHZThh3koyBUDK0DCMUjq3ihmD7YBB2",
        capabilities: '["unified", "perpetual_futures", "spot", "leverage", "hedge_mode", "trailing"]',
        rate_limits: '{"requests_per_second": 10, "requests_per_minute": 120}',
        max_leverage: 125,
      },
      {
        id: "default-bingx-x01",
        name: "BingX X01 (Default)",
        exchange: "bingx",
        exchange_id: exchangeMap["bingx"],
        api_type: "perpetual_futures",
        connection_library: "bingx-api",
        api_key: "5MdpxA3eWbqSH3JZ5w6cdCK3Sd19Z2mPiNpmfAPfa5kmPB5bquHn8D8qDXzx2HhnyRLmrCQgpphI8DbLLZQw",
        api_secret: "5uRfPgalVBD9DFAD5McQfbpAWmtiYGiinwiWSMX4Bii9SNPigJXsM1KnLCXT1reH5Wzcvj6RQmIvJrCUgaIhuw",
        capabilities: '["futures", "perpetual_futures", "leverage", "hedge_mode"]',
        rate_limits: '{"requests_per_second": 5, "requests_per_minute": 300}',
        max_leverage: 150,
      },
    ]

    for (const conn of defaultConnections) {
      await sql`
        INSERT INTO exchange_connections (
          id, user_id, name, exchange_id, exchange, api_type, connection_method,
          connection_library, api_key, api_secret, margin_type, position_mode, 
          is_testnet, is_enabled, is_predefined, is_active,
          api_capabilities, rate_limits
        )
        VALUES (
          ${conn.id},
          1,
          ${conn.name},
          ${conn.exchange_id},
          ${conn.exchange},
          ${conn.api_type},
          'typescript',
          ${conn.connection_library},
          ${conn.api_key},
          ${conn.api_secret},
          'cross',
          'hedge',
          false,
          false,
          true,
          true,
          ${conn.capabilities}::jsonb,
          ${conn.rate_limits}::jsonb
        )
        ON CONFLICT (id) DO UPDATE SET
          is_predefined = true,
          is_active = true,
          is_enabled = false,
          exchange = ${conn.exchange},
          connection_library = ${conn.connection_library},
          api_key = ${conn.api_key},
          api_secret = ${conn.api_secret},
          api_capabilities = ${conn.capabilities}::jsonb,
          rate_limits = ${conn.rate_limits}::jsonb
      `

      // Initialize volume configuration
      await sql`
        INSERT INTO volume_configuration (connection_id, base_volume_factor)
        VALUES (${conn.id}, 1.0)
        ON CONFLICT (connection_id) DO UPDATE SET base_volume_factor = 1.0
      `

      // Initialize trade engine state
      await sql`
        INSERT INTO trade_engine_state (connection_id, status)
        VALUES (${conn.id}, 'stopped')
        ON CONFLICT (connection_id) DO NOTHING
      `
    }

    console.log("[v0] Default connections initialized successfully")
    return NextResponse.json({
      success: true,
      message: "Default connections (Bybit and BingX) initialized - active in Settings but disabled on Dashboard",
      connections: defaultConnections.map((c) => c.name),
      count: defaultConnections.length,
    })
  } catch (error) {
    console.error("[v0] Failed to initialize default connections:", error)
    console.error("[v0] Error details:", error instanceof Error ? error.message : "Unknown error")
    return NextResponse.json(
      {
        error: "Failed to initialize default connections",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
