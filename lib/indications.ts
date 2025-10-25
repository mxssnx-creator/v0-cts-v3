import { v4 as uuidv4 } from "uuid"
import type { IndicationConfig, PseudoPosition } from "./types"

export interface IndicationResult {
  id: string
  type: "direction" | "move" | "active"
  symbol: string
  range: number
  config: IndicationConfig
  signal_strength: number
  entry_price: number
  timestamp: Date
  pseudo_positions: PseudoPosition[]
}

export class IndicationEngine {
  private marketData: Map<string, number[]> = new Map()
  private activeIndications: Map<string, IndicationResult> = new Map()

  // Direction Change Indication
  calculateDirectionIndication(symbol: string, prices: number[], config: IndicationConfig): IndicationResult | null {
    if (prices.length < config.range * 2) return null

    const recentPrices = prices.slice(-config.range * 2)
    const firstHalf = recentPrices.slice(0, config.range)
    const secondHalf = recentPrices.slice(config.range)

    // Calculate direction change
    const firstDirection = this.calculateDirection(firstHalf)
    const secondDirection = this.calculateDirection(secondHalf)

    // Check for opposite direction change with same length
    if (Math.abs(firstDirection) > 0.1 && Math.abs(secondDirection) > 0.1) {
      if ((firstDirection > 0 && secondDirection < 0) || (firstDirection < 0 && secondDirection > 0)) {
        const signalStrength = Math.abs(firstDirection) + Math.abs(secondDirection)

        if (signalStrength >= (config.price_change_ratio || 0.1)) {
          return this.createIndicationResult("direction", symbol, config, signalStrength, prices[prices.length - 1])
        }
      }
    }

    return null
  }

  // Move Indication (without opposite direction requirement)
  calculateMoveIndication(symbol: string, prices: number[], config: IndicationConfig): IndicationResult | null {
    if (prices.length < config.range) return null

    const recentPrices = prices.slice(-config.range)
    const direction = this.calculateDirection(recentPrices)
    const priceChange = Math.abs(direction)

    if (priceChange >= (config.price_change_ratio || 0.1)) {
      return this.createIndicationResult("move", symbol, config, priceChange, prices[prices.length - 1])
    }

    return null
  }

  // Active Indication (fast price change)
  calculateActiveIndication(symbol: string, prices: number[], config: IndicationConfig): IndicationResult | null {
    if (prices.length < 2) return null

    const currentPrice = prices[prices.length - 1]
    const previousPrice = prices[prices.length - 2]
    const priceChangeRatio = Math.abs((currentPrice - previousPrice) / previousPrice)

    // Check if price change meets active threshold (0.5-2.5)
    const threshold = config.price_change_ratio || 0.5
    if (priceChangeRatio >= threshold / 100) {
      // Convert to percentage
      return this.createIndicationResult("active", symbol, config, priceChangeRatio * 100, currentPrice)
    }

    return null
  }

  private calculateDirection(prices: number[]): number {
    if (prices.length < 2) return 0

    const start = prices[0]
    const end = prices[prices.length - 1]
    return (end - start) / start
  }

  private createIndicationResult(
    type: "direction" | "move" | "active",
    symbol: string,
    config: IndicationConfig,
    signalStrength: number,
    entryPrice: number,
  ): IndicationResult {
    const id = uuidv4()
    const pseudoPositions = this.generatePseudoPositions(symbol, entryPrice, config)

    return {
      id,
      type,
      symbol,
      range: config.range,
      config,
      signal_strength: signalStrength,
      entry_price: entryPrice,
      timestamp: new Date(),
      pseudo_positions: pseudoPositions,
    }
  }

  private generatePseudoPositions(symbol: string, entryPrice: number, config: IndicationConfig): PseudoPosition[] {
    const positions: PseudoPosition[] = []
    const positionCost = 0.001 // 0.1% as specified

    // Generate all possible combinations
    for (let tpFactor = 2; tpFactor <= 22; tpFactor++) {
      for (let slRatio = 0.2; slRatio <= 2.2; slRatio += 0.1) {
        // Without trailing
        positions.push(
          this.createPseudoPosition(symbol, entryPrice, tpFactor, slRatio, false, positionCost, config.type),
        )

        // With trailing variations
        const trailStarts = [0.3, 0.6, 1.0]
        const trailStops = [0.1, 0.2, 0.3]

        trailStarts.forEach((trailStart) => {
          trailStops.forEach((trailStop) => {
            positions.push(
              this.createPseudoPosition(
                symbol,
                entryPrice,
                tpFactor,
                slRatio,
                true,
                positionCost,
                config.type,
                trailStart,
                trailStop,
              ),
            )
          })
        })
      }
    }

    // Limit to 250 positions and rearrange if needed
    return positions.slice(0, 250)
  }

  private createPseudoPosition(
    symbol: string,
    entryPrice: number,
    tpFactor: number,
    slRatio: number,
    trailingEnabled: boolean,
    positionCost: number,
    indicationType: string,
    trailStart?: number,
    trailStop?: number,
  ): PseudoPosition {
    const validIndicationType = ["direction", "move", "active"].includes(indicationType)
      ? (indicationType as "direction" | "move" | "active")
      : "direction"

    return {
      id: uuidv4(),
      connection_id: "system",
      symbol,
      indication_type: validIndicationType,
      takeprofit_factor: tpFactor,
      stoploss_ratio: slRatio,
      trailing_enabled: trailingEnabled,
      trail_start: trailStart,
      trail_stop: trailStop,
      entry_price: entryPrice,
      current_price: entryPrice,
      profit_factor: 0,
      position_cost: positionCost,
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  // Update pseudo positions with current market data
  updatePseudoPositions(positions: PseudoPosition[], currentPrice: number): PseudoPosition[] {
    return positions.map((position) => {
      const priceDiff = currentPrice - position.entry_price
      const profitFactor = priceDiff / (position.entry_price * position.position_cost)

      return {
        ...position,
        current_price: currentPrice,
        profit_factor: profitFactor,
        updated_at: new Date().toISOString(),
      }
    })
  }

  // Get indication statistics
  getIndicationStats(positions: PseudoPosition[]) {
    const profitable = positions.filter((p) => p.profit_factor > 0).length
    const total = positions.length
    const avgProfitFactor = positions.reduce((sum, p) => sum + p.profit_factor, 0) / total

    return {
      total_positions: total,
      profitable_positions: profitable,
      profit_ratio: profitable / total,
      avg_profit_factor: avgProfitFactor,
      last_8_avg: this.calculateLastNAverage(positions, 8),
      last_20_avg: this.calculateLastNAverage(positions, 20),
      last_50_avg: this.calculateLastNAverage(positions, 50),
    }
  }

  private calculateLastNAverage(positions: PseudoPosition[], n: number): number {
    const recent = positions.slice(-n)
    return recent.reduce((sum, p) => sum + p.profit_factor, 0) / recent.length
  }
}
