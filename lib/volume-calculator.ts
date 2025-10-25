/**
 * Volume Calculator
 * Calculates position volume based on base volume factor, leverage, and risk management
 */

import { sql } from "@/lib/db"

interface VolumeCalculationParams {
  baseVolumeFactor: number // 1-10, where 1 = lowest volume, 10 = highest volume
  positionsAverage: number // Target number of running positions
  riskPercentage: number // Market movement % that triggers loss at factor 1
  maxLeverage: number // Maximum leverage allowed
  exchangeMinVolume?: number // Exchange minimum volume requirement
  accountBalance?: number // Account balance for calculation
  currentPrice?: number // Current market price
}

interface VolumeCalculationResult {
  calculatedVolume: number
  finalVolume: number
  leverage: number
  positionSize: number
  volumeAdjusted: boolean
  adjustmentReason?: string
  riskAmount: number
}

export class VolumeCalculator {
  /**
   * Calculate position volume with risk management
   */
  static calculatePositionVolume(params: VolumeCalculationParams): VolumeCalculationResult {
    const {
      baseVolumeFactor,
      positionsAverage,
      riskPercentage,
      maxLeverage,
      exchangeMinVolume = 0,
      accountBalance = 10000,
      currentPrice = 1,
    } = params

    const leverage = maxLeverage

    // Calculate risk per position
    // At factor 1 with positionsAverage positions, can lose if market goes riskPercentage% negative
    const totalRiskAmount = accountBalance * (riskPercentage / 100)
    const riskPerPosition = totalRiskAmount / positionsAverage

    const adjustedRisk = riskPerPosition * baseVolumeFactor

    // Calculate position size in USD
    // Position size = risk amount / (risk percentage per position)
    const positionSize = adjustedRisk / (riskPercentage / 100)

    // Calculate volume (quantity) with leverage
    // Volume = Position Size / (Current Price * Leverage)
    const calculatedVolume = positionSize / (currentPrice * leverage)

    // Check if volume meets exchange minimum
    let finalVolume = calculatedVolume
    let volumeAdjusted = false
    let adjustmentReason: string | undefined

    if (exchangeMinVolume > 0 && calculatedVolume < exchangeMinVolume) {
      finalVolume = exchangeMinVolume
      volumeAdjusted = true
      adjustmentReason = "Adjusted to meet exchange minimum volume requirement"
    }

    return {
      calculatedVolume,
      finalVolume,
      leverage,
      positionSize,
      volumeAdjusted,
      adjustmentReason,
      riskAmount: adjustedRisk,
    }
  }

  /**
   * Calculate volume for a specific connection and symbol
   */
  static async calculateVolumeForConnection(
    connectionId: string,
    symbol: string,
    currentPrice: number,
  ): Promise<VolumeCalculationResult> {
    try {
      // Get volume configuration for connection
      const [volumeConfig] = await sql`
        SELECT base_volume_factor, max_leverage, positions_average, risk_percentage
        FROM volume_configuration
        WHERE connection_id = ${connectionId}
      `

      if (!volumeConfig) {
        throw new Error("Volume configuration not found")
      }

      // Get exchange minimum volume for symbol
      const [tradingPair] = await sql`
        SELECT min_order_size FROM trading_pairs
        WHERE symbol = ${symbol}
        LIMIT 1
      `

      const exchangeMinVolume = tradingPair?.min_order_size ? Number.parseFloat(tradingPair.min_order_size) : undefined

      // Get account balance (TODO: implement actual balance fetching)
      const accountBalance = 10000

      // Calculate volume
      const result = this.calculatePositionVolume({
        baseVolumeFactor: Number.parseFloat(volumeConfig.base_volume_factor),
        positionsAverage: Number.parseInt(volumeConfig.positions_average || "50"),
        riskPercentage: Number.parseFloat(volumeConfig.risk_percentage || "20"),
        maxLeverage: Number.parseFloat(volumeConfig.max_leverage || "125"),
        exchangeMinVolume,
        accountBalance,
        currentPrice,
      })

      // Log the calculation
      await this.logVolumeCalculation(connectionId, symbol, result)

      return result
    } catch (error) {
      console.error("[v0] Failed to calculate volume for connection:", error)
      throw error
    }
  }

  /**
   * Log volume calculation to database
   */
  static async logVolumeCalculation(
    connectionId: string,
    symbol: string,
    calculation: VolumeCalculationResult,
  ): Promise<void> {
    try {
      await sql`
        INSERT INTO position_volume_calculations (
          connection_id, symbol, base_volume_factor, leverage,
          calculated_volume, exchange_min_volume, final_volume,
          volume_adjusted, adjustment_reason
        )
        VALUES (
          ${connectionId}, ${symbol}, ${calculation.leverage / 125}, ${calculation.leverage},
          ${calculation.calculatedVolume}, ${0}, ${calculation.finalVolume},
          ${calculation.volumeAdjusted}, ${calculation.adjustmentReason || null}
        )
      `
    } catch (error) {
      console.error("[v0] Failed to log volume calculation:", error)
    }
  }

  /**
   * Get volume calculation history
   */
  static async getVolumeHistory(connectionId: string, symbol?: string, limit = 100) {
    try {
      let query = sql`
        SELECT * FROM position_volume_calculations
        WHERE connection_id = ${connectionId}
      `

      if (symbol) {
        query = sql`
          SELECT * FROM position_volume_calculations
          WHERE connection_id = ${connectionId} AND symbol = ${symbol}
        `
      }

      const history = await sql`
        ${query}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `

      return history
    } catch (error) {
      console.error("[v0] Failed to get volume history:", error)
      return []
    }
  }

  /**
   * Calculate risk metrics for a position
   */
  static calculateRiskMetrics(params: {
    entryPrice: number
    currentPrice: number
    volume: number
    leverage: number
    side: "long" | "short"
    stopLossPrice?: number
    takeProfitPrice?: number
  }) {
    const { entryPrice, currentPrice, volume, leverage, side, stopLossPrice, takeProfitPrice } = params

    // Calculate position value
    const positionValue = volume * currentPrice

    // Calculate unrealized PnL
    let unrealizedPnL = 0
    if (side === "long") {
      unrealizedPnL = (currentPrice - entryPrice) * volume * leverage
    } else {
      unrealizedPnL = (entryPrice - currentPrice) * volume * leverage
    }

    // Calculate unrealized PnL percentage
    const unrealizedPnLPercent = (unrealizedPnL / (entryPrice * volume)) * 100

    // Calculate potential loss if stop loss hit
    let potentialLoss = 0
    if (stopLossPrice) {
      if (side === "long") {
        potentialLoss = (stopLossPrice - entryPrice) * volume * leverage
      } else {
        potentialLoss = (entryPrice - stopLossPrice) * volume * leverage
      }
    }

    // Calculate potential profit if take profit hit
    let potentialProfit = 0
    if (takeProfitPrice) {
      if (side === "long") {
        potentialProfit = (takeProfitPrice - entryPrice) * volume * leverage
      } else {
        potentialProfit = (entryPrice - takeProfitPrice) * volume * leverage
      }
    }

    // Calculate risk/reward ratio
    let riskRewardRatio = 0
    if (potentialLoss !== 0) {
      riskRewardRatio = Math.abs(potentialProfit / potentialLoss)
    }

    return {
      positionValue,
      unrealizedPnL,
      unrealizedPnLPercent,
      potentialLoss,
      potentialProfit,
      riskRewardRatio,
    }
  }
}
