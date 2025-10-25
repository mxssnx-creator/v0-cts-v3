import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL || ""
    const remotePostgresUrl = process.env.REMOTE_POSTGRES_URL || ""
    const isConnected = !!(databaseUrl || remotePostgresUrl)

    let dbType = "sqlite"
    if (databaseUrl.startsWith("postgresql://") || remotePostgresUrl.startsWith("postgresql://")) {
      dbType = "postgresql"
    }

    // Test the connection
    let connectionWorks = false
    let tableCount = 0

    if (isConnected) {
      try {
        if (dbType === "postgresql") {
          const result = await query(
            `SELECT COUNT(*) as count 
             FROM information_schema.tables 
             WHERE table_schema = 'public'`,
          )
          tableCount = Number.parseInt(result.rows[0]?.count || "0")
        } else {
          const result = await query(
            `SELECT COUNT(*) as count 
             FROM sqlite_master 
             WHERE type='table'`,
          )
          tableCount = Number.parseInt(result.rows[0]?.count || "0")
        }
        connectionWorks = true
      } catch (error) {
        console.error("[v0] Database connection test failed:", error)
      }
    }

    // Mask the URL for security (show only the host)
    let maskedUrl = ""
    const activeUrl = databaseUrl || remotePostgresUrl
    if (activeUrl) {
      try {
        if (activeUrl.startsWith("postgresql://")) {
          const url = new URL(activeUrl)
          maskedUrl = `postgresql://*****:*****@${url.host}${url.pathname}`
        } else {
          maskedUrl = "sqlite://./data/cts.db"
        }
      } catch {
        maskedUrl = dbType === "postgresql" ? "postgresql://*****:*****@*****/*****" : "sqlite://./data/cts.db"
      }
    }

    return NextResponse.json({
      type: dbType,
      isConfigured: isConnected,
      isConnected: connectionWorks,
      url: maskedUrl,
      tableCount,
      envVars: {
        DATABASE_URL: !!databaseUrl,
        REMOTE_POSTGRES_URL: !!remotePostgresUrl,
      },
    })
  } catch (error) {
    console.error("[v0] Failed to get database status:", error)
    return NextResponse.json(
      {
        type: "unknown",
        isConfigured: false,
        isConnected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
