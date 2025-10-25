import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import os from "os"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Running system diagnostics...")

    const connections = await query(`SELECT COUNT(*) as count FROM exchange_connections`, [])

    const databaseUrl = process.env.DATABASE_URL || process.env.REMOTE_POSTGRES_URL || ""
    let dbType = "SQLite"
    if (databaseUrl.startsWith("postgresql://")) {
      dbType = "PostgreSQL"
    }

    const diagnostics = {
      system: {
        platform: os.platform(),
        version: os.release(),
        arch: os.arch(),
      },
      node: {
        version: process.version,
      },
      database: {
        status: "connected",
        type: dbType,
      },
      connections: {
        count: connections[0]?.count || 0,
      },
    }

    console.log("[v0] Diagnostics completed successfully")

    return NextResponse.json(diagnostics)
  } catch (error) {
    console.error("[v0] Diagnostics failed:", error)
    return NextResponse.json(
      {
        error: "Diagnostics failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
