import { type NextRequest, NextResponse } from "next/server"
import { query, execute } from "@/lib/db"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Resetting database...")

    const tables = await query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`, [])

    let droppedCount = 0
    for (const table of tables) {
      try {
        await execute(`DROP TABLE IF EXISTS ${table.tablename} CASCADE`, [])
        console.log(`[v0] Dropped table: ${table.tablename}`)
        droppedCount++
      } catch (error) {
        console.error(`[v0] Failed to drop table ${table.tablename}:`, error)
      }
    }

    console.log("[v0] Database reset successfully")

    return NextResponse.json({
      success: true,
      tables_dropped: droppedCount,
      message: "Database reset successfully",
    })
  } catch (error) {
    console.error("[v0] Database reset failed:", error)
    return NextResponse.json(
      {
        error: "Database reset failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
