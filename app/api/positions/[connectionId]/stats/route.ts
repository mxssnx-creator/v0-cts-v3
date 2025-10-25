import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: Request, { params }: { params: Promise<{ connectionId: string }> }) {
  try {
    const { connectionId } = await params

    // Get position statistics for specific connection
    const stats = db
      .prepare(`
      SELECT 
        COUNT(*) as total_positions,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as active_positions,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_positions,
        SUM(CASE WHEN status = 'open' THEN unrealized_pnl ELSE 0 END) as total_pnl,
        AVG(CASE WHEN status = 'closed' AND realized_pnl > 0 THEN realized_pnl ELSE NULL END) as avg_profit,
        AVG(CASE WHEN status = 'closed' AND realized_pnl < 0 THEN realized_pnl ELSE NULL END) as avg_loss,
        (SUM(CASE WHEN status = 'closed' AND realized_pnl > 0 THEN 1 ELSE 0 END) * 100.0 / 
         NULLIF(SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END), 0)) as win_rate
      FROM pseudo_positions
      WHERE connection_id = ?
    `)
      .get(connectionId) as any

    return NextResponse.json({
      stats: {
        total_positions: stats.total_positions || 0,
        active_positions: stats.active_positions || 0,
        closed_positions: stats.closed_positions || 0,
        total_pnl: stats.total_pnl || 0,
        win_rate: stats.win_rate || 0,
        avg_profit: stats.avg_profit || 0,
        avg_loss: stats.avg_loss || 0,
      },
    })
  } catch (error) {
    console.error("[v0] Failed to fetch connection position stats:", error)
    return NextResponse.json({ error: "Failed to fetch position stats" }, { status: 500 })
  }
}
