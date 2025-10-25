import { NextResponse } from "next/server"
import { query, execute } from "@/lib/db"
import { DatabaseInitializer } from "@/lib/db-initializer"
import { ErrorLogger } from "@/lib/error-logger"

async function ensureSiteLogsTable() {
  try {
    await DatabaseInitializer.ensureInitialized()

    console.log("[v0] Checking if site_logs table exists...")

    // Check if table exists in Neon
    const result = await query<{ exists: boolean }>(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1) as exists",
      ["site_logs"],
    )
    const tableExists = result[0]?.exists || false

    if (!tableExists) {
      console.log("[v0] Creating site_logs table...")

      await execute(`
        CREATE TABLE site_logs (
          id SERIAL PRIMARY KEY,
          level VARCHAR(20) NOT NULL,
          category VARCHAR(50) NOT NULL,
          message TEXT NOT NULL,
          context TEXT,
          user_id INTEGER,
          connection_id TEXT,
          error_message TEXT,
          error_stack TEXT,
          metadata JSONB,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      await execute("CREATE INDEX IF NOT EXISTS idx_site_logs_level ON site_logs(level)")
      await execute("CREATE INDEX IF NOT EXISTS idx_site_logs_category ON site_logs(category)")
      await execute("CREATE INDEX IF NOT EXISTS idx_site_logs_timestamp ON site_logs(timestamp DESC)")

      console.log("[v0] site_logs table created successfully")
    }
  } catch (error) {
    await ErrorLogger.logError(error, "ensureSiteLogsTable", {
      category: "Database",
      severity: "critical",
    })
    throw error
  }
}

export async function GET(request: Request) {
  try {
    await ensureSiteLogsTable()

    const url = new URL(request.url)
    const { searchParams } = url
    const level = searchParams.get("level")
    const category = searchParams.get("category")
    const limit = Number.parseInt(searchParams.get("limit") || "1000")

    console.log("[v0] Fetching site logs:", { level, category, limit })

    let logs

    if (level && level !== "all" && category && category !== "all") {
      logs = await query(
        "SELECT * FROM site_logs WHERE level = $1 AND category = $2 ORDER BY timestamp DESC LIMIT $3",
        [level, category, limit],
      )
    } else if (level && level !== "all") {
      logs = await query("SELECT * FROM site_logs WHERE level = $1 ORDER BY timestamp DESC LIMIT $2", [level, limit])
    } else if (category && category !== "all") {
      logs = await query("SELECT * FROM site_logs WHERE category = $1 ORDER BY timestamp DESC LIMIT $2", [
        category,
        limit,
      ])
    } else {
      logs = await query("SELECT * FROM site_logs ORDER BY timestamp DESC LIMIT $1", [limit])
    }

    console.log("[v0] Fetched", logs.length, "site logs")
    return NextResponse.json(logs)
  } catch (error) {
    await ErrorLogger.logError(error, "GET /api/monitoring/site", {
      category: "Monitoring",
      severity: "medium",
    })
    return NextResponse.json({ error: "Failed to fetch logs", details: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await ensureSiteLogsTable()

    const body = await request.json()
    const { level, category, message, context, userId, connectionId, errorMessage, errorStack, metadata } = body

    console.log("[v0] Inserting site log:", { level, category, message })

    const result = await execute(
      `INSERT INTO site_logs (
        level, category, message, context, user_id, connection_id, 
        error_message, error_stack, metadata, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        level,
        category,
        message,
        context || null,
        userId || null,
        connectionId || null,
        errorMessage || null,
        errorStack || null,
        metadata ? JSON.stringify(metadata) : null,
      ],
    )

    console.log("[v0] Site log inserted successfully:", result)
    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error("[v0] Site log insert error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    await ErrorLogger.logError(error, "POST /api/monitoring/site", {
      category: "Monitoring",
      severity: "medium",
    })

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        stack: errorStack,
      },
      { status: 500 },
    )
  }
}

export const runtime = "nodejs"
