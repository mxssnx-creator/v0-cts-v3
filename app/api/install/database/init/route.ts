import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { DatabaseInitializer } from "@/lib/db-initializer"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting database initialization...")

    const success = await DatabaseInitializer.initialize()

    if (!success) {
      throw new Error("Database initialization failed")
    }

    const tables = await query(
      `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`,
      [],
    )
    const tableCount = tables[0]?.count || 0

    console.log(`[v0] Database initialized successfully. Tables: ${tableCount}`)

    return NextResponse.json({
      success: true,
      tables_created: tableCount,
      message: "Database initialized successfully",
    })
  } catch (error) {
    console.error("[v0] Database initialization failed:", error)
    return NextResponse.json(
      {
        error: "Database initialization failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
