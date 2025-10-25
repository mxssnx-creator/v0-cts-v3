/**
 * Pseudo Position Manager
 * Manages pseudo positions (paper trading) with volume calculations
 */

import { sql } from "@/lib/db"
import { VolumeCalculator } from "@/lib/volume-calculator"

export class PseudoPositionManager {
  private connectionId: string

  constructor(connectionId: string) {
    this.connectionId = connectionId
  }

  /**
   * Create new pseudo position with proper volume calculation
   */
  async createPosition(params: {
    symbol: string
    indicationType: string
    side: "long" | "short"
    entryPrice: number
    takeprofitFactor: number
    stoplossRatio: number
    profitFactor: number
    trailingEnabled: boolean
  }): Promise<number | null> {
    try {
      const canCreate = await this.canCreatePosition(
        params.symbol,
        params.indicationType,
        params.side,
        params.takeprofitFactor,
        params.stoplossRatio,
        params.trailingEnabled,
      )

      if (!canCreate) {
        console.log(
          `[v0] Cannot create ${params.side} position for ${params.symbol} (TP=${params.takeprofitFactor}, SL=${params.stoplossRatio}, trailing=${params.trailingEnabled}): max positions for this specific config reached`,
        )
        return null
      }

      // Calculate volume for this position
      const volumeCalc = await VolumeCalculator.calculateVolumeForConnection(
        this.connectionId,
        params.symbol,
        params.entryPrice,
      )

      // Calculate take profit and stop loss prices
      const takeProfitPrice =
        params.side === "long"
          ? params.entryPrice * (1 + params.takeprofitFactor / 100)
          : params.entryPrice * (1 - params.takeprofitFactor / 100)

      const stopLossPrice =
        params.side === "long"
          ? params.entryPrice * (1 - params.stoplossRatio / 100)
          : params.entryPrice * (1 + params.stoplossRatio / 100)

      // Calculate position cost
      const positionCost = (volumeCalc.finalVolume * params.entryPrice) / volumeCalc.leverage

      // Insert position
      const [result] = await sql`
        INSERT INTO pseudo_positions (
          connection_id, symbol, indication_type, side,
          entry_price, current_price, quantity, position_cost,
          takeprofit_factor, stoploss_ratio, profit_factor,
          trailing_enabled
        )
        VALUES (
          ${this.connectionId}, ${params.symbol}, ${params.indicationType}, ${params.side},
          ${params.entryPrice}, ${params.entryPrice}, ${volumeCalc.finalVolume}, ${positionCost},
          ${params.takeprofitFactor}, ${params.stoplossRatio}, ${params.profitFactor},
          ${params.trailingEnabled}
        )
        RETURNING id
      `

      console.log(`[v0] Created pseudo position for ${params.symbol} with volume ${volumeCalc.finalVolume}`)

      // Update active positions count
      await this.updateActivePositionsCount()

      return result.id
    } catch (error) {
      console.error("[v0] Failed to create pseudo position:", error)
      return null
    }
  }

  /**
   * Get active pseudo positions
   */
  async getActivePositions(): Promise<any[]> {
    try {
      const positions = await sql`
        SELECT * FROM pseudo_positions
        WHERE connection_id = ${this.connectionId}
          AND status = 'active'
        ORDER BY opened_at DESC
      `
      return positions
    } catch (error) {
      console.error("[v0] Failed to get active positions:", error)
      return []
    }
  }

  /**
   * Update position with current price and calculate metrics
   */
  async updatePosition(positionId: number, currentPrice: number): Promise<void> {
    try {
      // Get position details
      const [position] = await sql`
        SELECT * FROM pseudo_positions WHERE id = ${positionId}
      `

      if (!position) return

      // Calculate risk metrics
      const metrics = VolumeCalculator.calculateRiskMetrics({
        entryPrice: Number.parseFloat(position.entry_price),
        currentPrice,
        volume: Number.parseFloat(position.quantity),
        leverage: 125 / Number.parseFloat(position.profit_factor), // Approximate leverage
        side: position.side,
        stopLossPrice: Number.parseFloat(position.entry_price) * (1 - Number.parseFloat(position.stoploss_ratio) / 100),
        takeProfitPrice:
          Number.parseFloat(position.entry_price) * (1 + Number.parseFloat(position.takeprofit_factor) / 100),
      })

      // Update position
      await sql`
        UPDATE pseudo_positions
        SET 
          current_price = ${currentPrice},
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${positionId}
      `
    } catch (error) {
      console.error(`[v0] Failed to update position ${positionId}:`, error)
    }
  }

  /**
   * Close position with final calculations
   */
  async closePosition(positionId: number, reason: string): Promise<void> {
    try {
      // Get position details
      const [position] = await sql`
        SELECT * FROM pseudo_positions WHERE id = ${positionId}
      `

      if (!position) return

      // Calculate final PnL
      const finalMetrics = VolumeCalculator.calculateRiskMetrics({
        entryPrice: Number.parseFloat(position.entry_price),
        currentPrice: Number.parseFloat(position.current_price),
        volume: Number.parseFloat(position.quantity),
        leverage: 125 / Number.parseFloat(position.profit_factor),
        side: position.side,
      })

      // Close position
      await sql`
        UPDATE pseudo_positions
        SET 
          status = 'closed',
          closed_at = CURRENT_TIMESTAMP,
          close_reason = ${reason}
        WHERE id = ${positionId}
      `

      console.log(`[v0] Closed position ${positionId}: ${reason} (PnL: ${finalMetrics.unrealizedPnL.toFixed(2)})`)

      // Update active positions count
      await this.updateActivePositionsCount()
    } catch (error) {
      console.error(`[v0] Failed to close position ${positionId}:`, error)
    }
  }

  /**
   * Get position count
   */
  async getPositionCount(): Promise<number> {
    try {
      const [result] = await sql`
        SELECT COUNT(*) as count
        FROM pseudo_positions
        WHERE connection_id = ${this.connectionId}
          AND status = 'active'
      `
      return Number.parseInt(result.count)
    } catch (error) {
      console.error("[v0] Failed to get position count:", error)
      return 0
    }
  }

  /**
   * Update active positions count in engine state
   */
  private async updateActivePositionsCount(): Promise<void> {
    try {
      const count = await this.getPositionCount()

      await sql`
        UPDATE trade_engine_state
        SET active_positions_count = ${count}
        WHERE connection_id = ${this.connectionId}
      `
    } catch (error) {
      console.error("[v0] Failed to update active positions count:", error)
    }
  }

  /**
   * Get position statistics with direction breakdown
   */
  async getPositionStats() {
    try {
      const [stats] = await sql`
        SELECT 
          COUNT(*) as total_positions,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_positions,
          SUM(CASE WHEN status = 'active' AND side = 'long' THEN 1 ELSE 0 END) as active_long,
          SUM(CASE WHEN status = 'active' AND side = 'short' THEN 1 ELSE 0 END) as active_short,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_positions,
          AVG(CASE WHEN status = 'closed' THEN 
            (current_price - entry_price) * quantity 
          END) as avg_pnl,
          AVG(CASE WHEN status = 'closed' AND side = 'long' THEN 
            (current_price - entry_price) * quantity 
          END) as avg_pnl_long,
          AVG(CASE WHEN status = 'closed' AND side = 'short' THEN 
            (entry_price - current_price) * quantity 
          END) as avg_pnl_short
        FROM pseudo_positions
        WHERE connection_id = ${this.connectionId}
      `

      return stats
    } catch (error) {
      console.error("[v0] Failed to get position stats:", error)
      return null
    }
  }

  /**
   * Get position count by direction
   */
  async getPositionCountByDirection(side: "long" | "short"): Promise<number> {
    try {
      const [result] = await sql`
        SELECT COUNT(*) as count
        FROM pseudo_positions
        WHERE connection_id = ${this.connectionId}
          AND side = ${side}
          AND status = 'active'
      `
      return Number.parseInt(result.count)
    } catch (error) {
      console.error(`[v0] Failed to get ${side} position count:`, error)
      return 0
    }
  }

  /**
   * Get max positions allowed per direction from configuration
   */
  private async getMaxPositionsPerDirection(
    symbol: string,
    indicationType: string,
    side: "long" | "short",
  ): Promise<number> {
    try {
      const [config] = await sql`
        SELECT max_positions_per_direction
        FROM trade_engine_config
        WHERE connection_id = ${this.connectionId}
          AND symbol = ${symbol}
          AND indication_type = ${indicationType}
          AND side = ${side}
      `
      return config ? Number.parseInt(config.max_positions_per_direction) : 0
    } catch (error) {
      console.error("[v0] Failed to get max positions per direction:", error)
      return 0
    }
  }

  /**
   * Check if can create new position for SPECIFIC config combination
   * Each unique (symbol, indication_type, direction, TP, SL, trailing) is independent
   */
  private async canCreatePosition(
    symbol: string,
    indicationType: string,
    side: "long" | "short",
    takeprofitFactor?: number,
    stoplossRatio?: number,
    trailingEnabled?: boolean,
  ): Promise<boolean> {
    try {
      const [settingRow] = await sql`
        SELECT value FROM system_settings
        WHERE key = 'maxPositionsPerConfigSet'
      `
      const maxPerConfig = settingRow ? Number.parseInt(settingRow.value) : 1

      // If TP/SL/trailing params are provided, check that exact combination
      // Otherwise, check at the indication + direction level
      let countResult

      if (takeprofitFactor !== undefined && stoplossRatio !== undefined && trailingEnabled !== undefined) {
        // Check specific config combination
        countResult = await sql`
          SELECT COUNT(*) as count
          FROM pseudo_positions
          WHERE connection_id = ${this.connectionId}
            AND symbol = ${symbol}
            AND indication_type = ${indicationType}
            AND side = ${side}
            AND takeprofit_factor = ${takeprofitFactor}
            AND stoploss_ratio = ${stoplossRatio}
            AND trailing_enabled = ${trailingEnabled}
            AND status = 'active'
        `
      } else {
        // Check at indication + direction level (for backward compatibility)
        countResult = await sql`
          SELECT COUNT(*) as count
          FROM pseudo_positions
          WHERE connection_id = ${this.connectionId}
            AND symbol = ${symbol}
            AND indication_type = ${indicationType}
            AND side = ${side}
            AND status = 'active'
        `
      }

      const currentCount = Number.parseInt(countResult[0].count)
      const canCreate = currentCount < maxPerConfig

      const configStr =
        takeprofitFactor !== undefined
          ? `${side} TP=${takeprofitFactor} SL=${stoplossRatio} trailing=${trailingEnabled}`
          : `${side} (any config)`

      console.log(
        `[v0] Position check for ${symbol} ${indicationType} ${configStr}: ${currentCount}/${maxPerConfig} (can create: ${canCreate})`,
      )

      return canCreate
    } catch (error) {
      console.error("[v0] Failed to check if can create position:", error)
      return false
    }
  }
}
