import { NextResponse } from "next/server"
import { query, queryOne } from "@/lib/db"

export async function GET() {
  try {
    const result = await queryOne(`
      SELECT 
        COUNT(DISTINCT ec.id) as active_connections,
        COUNT(DISTINCT i.id) as total_indications,
        SUM(CASE WHEN i.is_active = 1 THEN 1 ELSE 0 END) as active_indications,
        COUNT(DISTINCT ps.id) as total_strategies,
        SUM(CASE WHEN ps.is_active = 1 THEN 1 ELSE 0 END) as active_strategies,
        COUNT(DISTINCT pp.id) as total_positions,
        SUM(CASE WHEN pp.type = 'base' THEN 1 ELSE 0 END) as base_positions,
        SUM(CASE WHEN pp.type = 'main' THEN 1 ELSE 0 END) as main_positions,
        SUM(CASE WHEN pp.type = 'real' THEN 1 ELSE 0 END) as real_positions,
        SUM(CASE WHEN pp.type = 'active' THEN 1 ELSE 0 END) as active_positions,
        COUNT(DISTINCT pp.symbol) as active_symbols,
        COALESCE(SUM(pp.position_cost), 0) as total_volume_24h,
        SUM(CASE WHEN datetime(pp.created_at) > datetime('now', '-1 hour') THEN 1 ELSE 0 END) as trades_per_hour
      FROM exchange_connections ec
      LEFT JOIN indications i ON i.connection_id = ec.id
      LEFT JOIN pseudo_positions pp ON pp.connection_id = ec.id AND pp.status = 'active'
      LEFT JOIN preset_strategies ps ON ps.connection_id = ec.id
      WHERE ec.is_enabled = 1
    `)

    const profitFactorByTypeResult = await query(`
      SELECT 
        type,
        AVG(CASE WHEN datetime(closed_at) > datetime('now', '-20 hours') THEN profit_factor END) as pf_last_20h,
        AVG(profit_factor) as pf_last_25
      FROM (
        SELECT type, profit_factor, closed_at
        FROM pseudo_positions
        WHERE status = 'closed'
        ORDER BY closed_at DESC
        LIMIT 100
      )
      GROUP BY type
    `)

    const profitFactorResult = await queryOne(`
      SELECT 
        AVG(CASE WHEN datetime(closed_at) > datetime('now', '-20 hours') THEN profit_factor END) as pf_last_20h,
        AVG(profit_factor) as pf_last_50
      FROM (
        SELECT profit_factor, closed_at
        FROM pseudo_positions
        WHERE status = 'closed'
        ORDER BY closed_at DESC
        LIMIT 50
      )
    `)

    const profitMetrics25 = await queryOne(`
      SELECT AVG(profit_factor) as pf_last_25
      FROM (
        SELECT profit_factor
        FROM pseudo_positions
        WHERE status = 'closed'
        ORDER BY closed_at DESC
        LIMIT 25
      )
    `)

    const liveMetrics = await queryOne(`
      SELECT COUNT(*) as live_count
      FROM positions
      WHERE status = 'open'
    `)

    const metrics = result || {}
    const profitMetrics = profitFactorResult || {}
    const profitMetrics25Result = profitMetrics25 || {}
    const liveMetricsResult = liveMetrics || {}

    const pfByType = {
      base: { pf20h: 0, pf25: 0 },
      main: { pf20h: 0, pf25: 0 },
      real: { pf20h: 0, pf25: 0 },
      active: { pf20h: 0, pf25: 0 },
    }

    profitFactorByTypeResult.forEach((row: any) => {
      if (row.type === "base") {
        pfByType.base.pf20h = Number.parseFloat(row.pf_last_20h) || 0
        pfByType.base.pf25 = Number.parseFloat(row.pf_last_25) || 0
      } else if (row.type === "main") {
        pfByType.main.pf20h = Number.parseFloat(row.pf_last_20h) || 0
        pfByType.main.pf25 = Number.parseFloat(row.pf_last_25) || 0
      } else if (row.type === "real") {
        pfByType.real.pf20h = Number.parseFloat(row.pf_last_20h) || 0
        pfByType.real.pf25 = Number.parseFloat(row.pf_last_25) || 0
      } else if (row.type === "active") {
        pfByType.active.pf20h = Number.parseFloat(row.pf_last_20h) || 0
        pfByType.active.pf25 = Number.parseFloat(row.pf_last_25) || 0
      }
    })

    const memoryUsage = process.memoryUsage()
    const cpuUsage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100

    return NextResponse.json({
      activeConnections: Number.parseInt(metrics.active_connections) || 0,
      totalPositions: Number.parseInt(metrics.total_positions) || 0,
      dailyPnL: 0,
      totalBalance: 0,
      indicationsActive: Number.parseInt(metrics.active_indications) || 0,
      indicationsTotal: Number.parseInt(metrics.total_indications) || 0,
      strategiesActive: Number.parseInt(metrics.active_strategies) || 0,
      strategiesTotal: Number.parseInt(metrics.total_strategies) || 0,
      systemLoad: Math.round(cpuUsage),
      databaseSize: 45,
      activeSymbols: Number.parseInt(metrics.active_symbols) || 0,
      realPositions: Number.parseInt(metrics.real_positions) || 0,
      pseudoPositionsBase: Number.parseInt(metrics.base_positions) || 0,
      pseudoPositionsMain: Number.parseInt(metrics.main_positions) || 0,
      pseudoPositionsReal: Number.parseInt(metrics.real_positions) || 0,
      pseudoPositionsActive: Number.parseInt(metrics.active_positions) || 0,
      profitFactorLast20h: Number.parseFloat(profitMetrics.pf_last_20h) || 0,
      profitFactorLast50: Number.parseFloat(profitMetrics.pf_last_50) || 0,
      profitFactorLast25: Number.parseFloat(profitMetrics25Result.pf_last_25) || 0,
      livePositions: Number.parseInt(liveMetricsResult.live_count) || 0,
      pseudoBasePF20h: pfByType.base.pf20h,
      pseudoBasePF25: pfByType.base.pf25,
      pseudoMainPF20h: pfByType.main.pf20h,
      pseudoMainPF25: pfByType.main.pf25,
      pseudoRealPF20h: pfByType.real.pf20h,
      pseudoRealPF25: pfByType.real.pf25,
      pseudoActivePF20h: pfByType.active.pf20h,
      pseudoActivePF25: pfByType.active.pf25,
    })
  } catch (error) {
    console.error("[v0] Error fetching structure metrics:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch structure metrics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
