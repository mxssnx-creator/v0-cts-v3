import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL || ""
    const isConnected = !!databaseUrl

    // Test the connection
    let connectionWorks = false
    let tableCount = 0

    if (isConnected) {
      try {
        const result = await query(
          `SELECT COUNT(*) as count 
           FROM information_schema.tables 
           WHERE table_schema = 'public'`,
        )
        tableCount = Number.parseInt(result.rows[0]?.count || "0")
        connectionWorks = true
      } catch (error) {
        console.error("[v0] Database connection test failed:", error)
      }
    }

    // Mask the URL for security (show only the host)
    let maskedUrl = ""
    if (databaseUrl) {
      try {
        const url = new URL(databaseUrl)
        maskedUrl = `postgresql://*****:*****@${url.host}${url.pathname}`
      } catch {
        maskedUrl = "postgresql://*****:*****@*****.neon.tech/*****"
      }
    }

    return NextResponse.json({
      type: "neon",
      isConfigured: isConnected,
      isConnected: connectionWorks,
      url: maskedUrl,
      tableCount,
      envVars: {
        DATABASE_URL: isConnected,
        POSTGRES_URL: !!process.env.POSTGRES_URL,
        POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
      },
    })
  } catch (error) {
    console.error("[v0] Failed to get database status:", error)
    return NextResponse.json(
      {
        type: "neon",
        isConfigured: false,
        isConnected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
