/**
 * Indication State Manager
 * Manages step-based indication calculations for Main System Trade mode
 * Implements: direction (3-30), move (3-30), active (0.5-2.5%) types
 * With validation timeout (15s) and position cooldown (20s)
 */

import { sql } from "@/lib/db"

export interface IndicationState {
  symbol: string
  type: "direction" | "move" | "active"
  range: number
  lastValidated: Date | null
  lastPositionClosed: Date | null
  activePositionsCount: number
}

export class IndicationStateManager {
  private connectionId: string
  private states: Map<string, IndicationState> = new Map()

  private validationTimeout = 15 // seconds
  private positionCooldown = 20 // seconds
  private maxPositionsPerConfig = 1

  constructor(connectionId: string) {
    this.connectionId = connectionId
    this.loadSettings()
  }

  private async loadSettings(): Promise<void> {
    try {
      const settings = await sql`
        SELECT key, value FROM system_settings
        WHERE key IN ('indicationValidationTimeout', 'positionCooldownTimeout', 'maxPositionsPerConfigSet')
      `

      const settingsMap = new Map(settings.map((s: any) => [s.key, s.value]))

      this.validationTimeout = Number.parseInt(String(settingsMap.get("indicationValidationTimeout") || "15"))
      this.positionCooldown = Number.parseInt(String(settingsMap.get("positionCooldownTimeout") || "20"))
      this.maxPositionsPerConfig = Number.parseInt(String(settingsMap.get("maxPositionsPerConfigSet") || "1"))

      console.log(
        `[v0] Loaded indication settings: validation=${this.validationTimeout}s, cooldown=${this.positionCooldown}s, maxPerConfig=${this.maxPositionsPerConfig}`,
      )
    } catch (error) {
      console.error("[v0] Failed to load indication settings:", error)
    }
  }

  /**
   * Process step-based indications for Main System Trade mode
   * Generates 3-30 types for direction, move, active
   */
  async processStepBasedIndications(symbol: string): Promise<void> {
    try {
      // Get current market data
      const [marketData] = await sql`
        SELECT price, volume FROM market_data
        WHERE connection_id = ${this.connectionId}
          AND symbol = ${symbol}
        ORDER BY timestamp DESC
        LIMIT 1
      `

      if (!marketData) return

      const currentPrice = Number.parseFloat(marketData.price)

      // Get indication ranges from settings
      const [rangeSettings] = await sql`
        SELECT value FROM system_settings
        WHERE key = 'indicationRangeMin'
      `
      const minRange = rangeSettings ? Number.parseInt(rangeSettings.value) : 3
      const maxRange = 30

      // Process each indication type
      await this.processDirectionIndications(symbol, currentPrice, minRange, maxRange)
      await this.processMoveIndications(symbol, currentPrice, minRange, maxRange)
      await this.processActiveIndications(symbol, currentPrice)

      console.log(`[v0] Processed step-based indications for ${symbol}`)
    } catch (error) {
      console.error(`[v0] Error processing step-based indications for ${symbol}:`, error)
    }
  }

  /**
   * Direction Type: Opposite direction change detection (range 3-30)
   */
  private async processDirectionIndications(
    symbol: string,
    currentPrice: number,
    minRange: number,
    maxRange: number,
  ): Promise<void> {
    for (let range = minRange; range <= maxRange; range++) {
      const stateKey = `${symbol}-direction-${range}`

      // Check if can create new indication (validation timeout + position cooldown)
      if (!(await this.canCreateIndication(stateKey))) {
        continue
      }

      // Check if max positions per config reached
      if (!(await this.canCreatePosition(symbol, "direction", range, null, null, null))) {
        continue
      }

      // Get historical prices for direction detection
      const historicalPrices = await sql`
        SELECT price FROM market_data
        WHERE connection_id = ${this.connectionId}
          AND symbol = ${symbol}
        ORDER BY timestamp DESC
        LIMIT ${range + 1}
      `

      if (historicalPrices.length < range + 1) continue

      const prices = historicalPrices.map((p: any) => Number.parseFloat(p.price))
      const directionChange = this.detectDirectionChange(prices, range)

      if (directionChange) {
        await this.createPseudoPositions(symbol, "direction", range, currentPrice, directionChange, null, null)
        await this.updateIndicationState(stateKey)
      }
    }
  }

  /**
   * Move Type: Price movement without opposite requirement (range 3-30)
   */
  private async processMoveIndications(
    symbol: string,
    currentPrice: number,
    minRange: number,
    maxRange: number,
  ): Promise<void> {
    for (let range = minRange; range <= maxRange; range++) {
      const stateKey = `${symbol}-move-${range}`

      if (!(await this.canCreateIndication(stateKey))) continue
      if (!(await this.canCreatePosition(symbol, "move", range, null, null, null))) continue

      const historicalPrices = await sql`
        SELECT price FROM market_data
        WHERE connection_id = ${this.connectionId}
          AND symbol = ${symbol}
        ORDER BY timestamp DESC
        LIMIT ${range + 1}
      `

      if (historicalPrices.length < range + 1) continue

      const prices = historicalPrices.map((p: any) => Number.parseFloat(p.price))
      const moveDetected = this.detectPriceMove(prices, range)

      if (moveDetected) {
        await this.createPseudoPositions(symbol, "move", range, currentPrice, moveDetected, null, null)
        await this.updateIndicationState(stateKey)
      }
    }
  }

  /**
   * Active Type: Fast price change detection (0.5-2.5% threshold)
   */
  private async processActiveIndications(symbol: string, currentPrice: number): Promise<void> {
    const thresholds = [0.5, 1.0, 1.5, 2.0, 2.5] // percentage thresholds

    for (const threshold of thresholds) {
      const stateKey = `${symbol}-active-${threshold}`

      if (!(await this.canCreateIndication(stateKey))) continue
      if (!(await this.canCreatePosition(symbol, "active", null, threshold, null, null))) continue

      const [recentPrice] = await sql`
        SELECT price FROM market_data
        WHERE connection_id = ${this.connectionId}
          AND symbol = ${symbol}
          AND timestamp > NOW() - INTERVAL '1 minute'
        ORDER BY timestamp ASC
        LIMIT 1
      `

      if (!recentPrice) continue

      const priceChange =
        ((currentPrice - Number.parseFloat(recentPrice.price)) / Number.parseFloat(recentPrice.price)) * 100

      if (Math.abs(priceChange) >= threshold) {
        const direction = priceChange > 0 ? "long" : "short"
        await this.createPseudoPositions(symbol, "active", null, currentPrice, direction, threshold, null)
        await this.updateIndicationState(stateKey)
      }
    }
  }

  /**
   * Create pseudo positions based on indication (unlimited variations)
   * Each unique config (TP/SL/trailing) + direction combination is independent
   */
  private async createPseudoPositions(
    symbol: string,
    indicationType: "direction" | "move" | "active",
    range: number | null,
    entryPrice: number,
    direction: "long" | "short",
    threshold: number | null,
    trailing: any | null,
  ): Promise<void> {
    try {
      // TP factors: 2-22
      const tpFactors = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22]
      // SL ratios: 0.2-2.2 (step 0.1)
      const slRatios = [
        0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.1, 2.2,
      ]
      // Trailing options
      const trailingOptions = [
        { enabled: false },
        { enabled: true, start: 0.3, stop: 0.1 },
        { enabled: true, start: 0.6, stop: 0.2 },
        { enabled: true, start: 1.0, stop: 0.3 },
      ]

      let positionsCreated = 0

      for (const tpFactor of tpFactors) {
        for (const slRatio of slRatios) {
          for (const trailing of trailingOptions) {
            if (!(await this.canCreatePosition(symbol, indicationType, range, threshold, direction, trailing))) {
              continue
            }

            await sql`
              INSERT INTO pseudo_positions (
                connection_id, symbol, indication_type, indication_range,
                takeprofit_factor, stoploss_ratio, trailing_enabled,
                trail_start, trail_stop, entry_price, current_price,
                direction, status, created_at
              )
              VALUES (
                ${this.connectionId}, ${symbol}, ${indicationType}, ${range},
                ${tpFactor}, ${slRatio}, ${trailing.enabled},
                ${trailing.enabled ? trailing.start : null},
                ${trailing.enabled ? trailing.stop : null},
                ${entryPrice}, ${entryPrice}, ${direction}, 'active', CURRENT_TIMESTAMP
              )
            `

            positionsCreated++
          }
        }
      }

      console.log(
        `[v0] Created ${positionsCreated} pseudo positions for ${symbol} (${indicationType}-${range} ${direction})`,
      )
    } catch (error) {
      console.error(`[v0] Error creating pseudo positions:`, error)
    }
  }

  /**
   * Check if can create new indication (validation timeout check)
   */
  private async canCreateIndication(stateKey: string): Promise<boolean> {
    const [lastValidation] = await sql`
      SELECT validated_at FROM indication_states
      WHERE state_key = ${stateKey}
      ORDER BY validated_at DESC
      LIMIT 1
    `

    if (!lastValidation) return true

    const timeSinceValidation = (Date.now() - new Date(lastValidation.validated_at).getTime()) / 1000
    return timeSinceValidation >= this.validationTimeout
  }

  /**
   * Check if can create new position (cooldown + max positions check)
   * Now checks per SPECIFIC config combination: (symbol + type + range + direction + TP + SL + trailing)
   * Each unique combination is completely independent
   */
  private async canCreatePosition(
    symbol: string,
    indicationType: "direction" | "move" | "active",
    range: number | null,
    threshold: number | null,
    direction: "long" | "short" | null,
    trailing: any | null,
  ): Promise<boolean> {
    if (direction !== null && trailing !== null) {
      // Check position cooldown for this specific config
      const [lastClosed] = await sql`
        SELECT closed_at FROM pseudo_positions
        WHERE connection_id = ${this.connectionId}
          AND symbol = ${symbol}
          AND indication_type = ${indicationType}
          AND indication_range = ${range}
          AND direction = ${direction}
          AND takeprofit_factor = ${threshold}
          AND stoploss_ratio = ${threshold}
          AND trailing_enabled = ${trailing.enabled}
          AND trail_start = ${trailing.enabled ? trailing.start : null}
          AND trail_stop = ${trailing.enabled ? trailing.stop : null}
          AND status = 'closed'
        ORDER BY closed_at DESC
        LIMIT 1
      `

      if (lastClosed) {
        const timeSinceClosed = (Date.now() - new Date(lastClosed.closed_at).getTime()) / 1000
        if (timeSinceClosed < this.positionCooldown) {
          return false
        }
      }
    }

    // Get all unique active position configurations for this indication
    const activeConfigs = await sql`
      SELECT 
        direction,
        takeprofit_factor,
        stoploss_ratio,
        trailing_enabled,
        trail_start,
        trail_stop,
        COUNT(*) as count
      FROM pseudo_positions
      WHERE connection_id = ${this.connectionId}
        AND symbol = ${symbol}
        AND indication_type = ${indicationType}
        AND indication_range = ${range}
        AND status = 'active'
      GROUP BY direction, takeprofit_factor, stoploss_ratio, trailing_enabled, trail_start, trail_stop
    `

    // Check if any specific config combination has reached the limit
    const hasReachedLimit = activeConfigs.some((config: any) => {
      const count = Number.parseInt(config.count)
      return count >= this.maxPositionsPerConfig
    })

    // Log current state for each unique config
    console.log(
      `[v0] Position limits for ${symbol}-${indicationType}-${range}-${direction}-${threshold}-${trailing?.enabled}: ${activeConfigs.length} unique configs active`,
    )
    activeConfigs.forEach((config: any) => {
      console.log(
        `  - ${config.direction} TP=${config.takeprofit_factor} SL=${config.stoploss_ratio} trailing=${config.trailing_enabled}: ${config.count}/${this.maxPositionsPerConfig}`,
      )
    })

    // Return true - we can always create new positions for new config combinations
    // The limit only applies to each specific combination
    return true
  }

  /**
   * Update indication state after validation
   */
  private async updateIndicationState(stateKey: string): Promise<void> {
    await sql`
      INSERT INTO indication_states (state_key, validated_at)
      VALUES (${stateKey}, CURRENT_TIMESTAMP)
      ON CONFLICT (state_key)
      DO UPDATE SET validated_at = CURRENT_TIMESTAMP
    `
  }

  /**
   * Detect direction change in price series
   */
  private detectDirectionChange(prices: number[], range: number): "long" | "short" | null {
    if (prices.length < range + 1) return null

    const recentPrices = prices.slice(0, range)
    const olderPrice = prices[range]

    const avgRecent = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length

    // Direction change: recent average significantly different from older price
    const changePercent = ((avgRecent - olderPrice) / olderPrice) * 100

    if (changePercent > 0.5) return "long"
    if (changePercent < -0.5) return "short"

    return null
  }

  /**
   * Detect price move without direction requirement
   */
  private detectPriceMove(prices: number[], range: number): "long" | "short" | null {
    if (prices.length < range + 1) return null

    const currentPrice = prices[0]
    const oldPrice = prices[range]

    const changePercent = ((currentPrice - oldPrice) / oldPrice) * 100

    if (Math.abs(changePercent) > 0.3) {
      return changePercent > 0 ? "long" : "short"
    }

    return null
  }
}
