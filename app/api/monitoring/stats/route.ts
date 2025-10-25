import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function GET() {
  try {
    const isNeon = !!process.env.DATABASE_URL

    let logStats, errorRate, topErrors, criticalErrors

    if (isNeon) {
      // PostgreSQL/Neon syntax
      logStats = await query(`
        SELECT 
          level,
          COUNT(*) as count
        FROM site_logs
        WHERE timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY level
      `)

      errorRate = await query(`
        SELECT 
          DATE_TRUNC('hour', timestamp) as hour,
          COUNT(*) as count
        FROM site_logs
        WHERE level = 'error' AND timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY hour
        ORDER BY hour DESC
      `)

      topErrors = await query(`
        SELECT 
          category,
          COUNT(*) as count
        FROM site_logs
        WHERE level = 'error' AND timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY category
        ORDER BY count DESC
        LIMIT 10
      `)

      criticalErrors = await query(`
        SELECT *
        FROM site_logs
        WHERE level = 'error' AND timestamp > NOW() - INTERVAL '1 hour'
        ORDER BY timestamp DESC
        LIMIT 20
      `)
    } else {
      // SQLite syntax
      logStats = await query(`
        SELECT 
          level,
          COUNT(*) as count
        FROM site_logs
        WHERE timestamp > datetime('now', '-24 hours')
        GROUP BY level
      `)

      errorRate = await query(`
        SELECT 
          strftime('%Y-%m-%d %H:00:00', timestamp) as hour,
          COUNT(*) as count
        FROM site_logs
        WHERE level = 'error' AND timestamp > datetime('now', '-24 hours')
        GROUP BY hour
        ORDER BY hour DESC
      `)

      topErrors = await query(`
        SELECT 
          category,
          COUNT(*) as count
        FROM site_logs
        WHERE level = 'error' AND timestamp > datetime('now', '-24 hours')
        GROUP BY category
        ORDER BY count DESC
        LIMIT 10
      `)

      criticalErrors = await query(`
        SELECT *
        FROM site_logs
        WHERE level = 'error' AND timestamp > datetime('now', '-1 hour')
        ORDER BY timestamp DESC
        LIMIT 20
      `)
    }

    return NextResponse.json({
      stats: {
        byLevel: logStats,
        errorRate,
        topErrors,
        criticalErrors,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error fetching monitoring stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
