/**
 * Production-Ready Preset Trade Engine
 * Uses COMMON INDICATORS (RSI, MACD, Bollinger, SAR, ADX, etc.)
 * Wider TP/SL ranges for short-term trading (starting from factor 2)
 * Optimized for performance, rate limits, and production trading
 */

import { db } from "@/lib/db"
import { TechnicalIndicators, calculateIndicators, type IndicatorConfig, type IndicatorSignal } from "./indicators"
import { IndicationEngine } from "./indications"

export interface PresetTradeEngineConfig {
  connectionId: string
  presetId: string
  symbols: string[]
  mode: "automatic" | "configured"
  minProfitFactor: number
  maxDrawdownHours: number
  useTopSymbols: boolean
  topSymbolsCount: number
}

export class PresetTradeEngine {
  private connectionId: string
  private presetId: string
  private isRunning = false
  private tradeInterval?: NodeJS.Timeout
  private realInterval?: NodeJS.Timeout
  private indicationEngine: IndicationEngine
  private activeIndications: Map<string, any> = new Map()
  private lastIntervalComplete = true
  private lastRealIntervalComplete = true

  private readonly BATCH_SIZE = 10
  private readonly MAX_CONCURRENT = 5
  private readonly RATE_LIMIT_DELAY = 100 // ms between API calls

  constructor(connectionId: string, presetId: string) {
    this.connectionId = connectionId
    this.presetId = presetId
    this.indicationEngine = new IndicationEngine()
  }

  /**
   * Start the preset trade engine with non-overlapping intervals
   */
  async start(config: PresetTradeEngineConfig): Promise<void> {
    if (this.isRunning) {
      console.log("[v0] Preset trade engine already running")
      return
    }

    console.log("[v0] Starting production-ready preset trade engine")

    try {
      // Initialize engine state
      await this.initializeEngineState(config)

      // Load historical data for all symbols (parallel with concurrency limit)
      await this.loadHistoricalData(config.symbols)

      // Start trade interval loop (1.0s) - NON-OVERLAPPING
      await this.startTradeIntervalLoop(config)

      // Start real positions interval loop (0.3s) - NON-OVERLAPPING
      await this.startRealIntervalLoop()

      this.isRunning = true
      console.log("[v0] Preset trade engine started successfully")
    } catch (error) {
      console.error("[v0] Failed to start preset trade engine:", error)
      throw error
    }
  }

  /**
   * Stop the preset trade engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return

    console.log("[v0] Stopping preset trade engine")

    if (this.tradeInterval) clearInterval(this.tradeInterval)
    if (this.realInterval) clearInterval(this.realInterval)

    this.isRunning = false

    db.prepare(
      `
      UPDATE preset_trade_engine_state
      SET status = 'stopped', stopped_at = CURRENT_TIMESTAMP
      WHERE connection_id = ? AND preset_id = ?
    `,
    ).run(this.connectionId, this.presetId)

    console.log("[v0] Preset trade engine stopped")
  }

  /**
   * Initialize engine state
   */
  private async initializeEngineState(config: PresetTradeEngineConfig): Promise<void> {
    db.prepare(
      `
      INSERT INTO preset_trade_engine_state (
        connection_id, preset_id, mode, status, config, started_at
      ) VALUES (
        ?, ?, ?, 'running',
        ?, CURRENT_TIMESTAMP
      )
      ON CONFLICT (connection_id, preset_id) 
      DO UPDATE SET
        status = 'running',
        mode = ?,
        config = ?,
        started_at = CURRENT_TIMESTAMP,
        stopped_at = NULL
    `,
    ).run(this.connectionId, this.presetId, config.mode, JSON.stringify(config), config.mode, JSON.stringify(config))
  }

  /**
   * Load historical data for prehistoric calculations (5 days)
   * Optimized with parallel processing and concurrency limits
   */
  private async loadHistoricalData(symbols: string[]): Promise<void> {
    console.log(`[v0] Loading historical data for ${symbols.length} symbols...`)

    const settings = await this.getSettings()
    const timeRangeDays = Number.parseInt(settings.timeRangeHistoryDays || "5")
    const timeframeSeconds = Number.parseFloat(settings.marketDataTimeframe || "1.0")

    const batches = this.createBatches(symbols, this.MAX_CONCURRENT)

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (symbol) => {
          try {
            // Fetch historical OHLCV data
            const historicalData = await this.fetchHistoricalOHLCV(symbol, timeRangeDays, timeframeSeconds)

            // Store in database for prehistoric calculations
            await this.storeHistoricalData(symbol, historicalData)

            console.log(`[v0] Loaded ${historicalData.length} candles for ${symbol}`)
          } catch (error) {
            console.error(`[v0] Failed to load historical data for ${symbol}:`, error)
          }
        }),
      )

      await this.delay(this.RATE_LIMIT_DELAY)
    }

    console.log("[v0] Historical data loading complete")
  }

  /**
   * Trade Interval Loop (1.0s) - NON-OVERLAPPING
   * Processes: Indications → Strategies → Pseudo Positions → Logging
   */
  private async startTradeIntervalLoop(config: PresetTradeEngineConfig): Promise<void> {
    const settings = await this.getSettings()
    const intervalMs = Number.parseFloat(settings.tradeEngineInterval || "1.0") * 1000

    this.tradeInterval = setInterval(async () => {
      if (!this.lastIntervalComplete) {
        console.log("[v0] Previous trade interval still running, skipping...")
        return
      }

      this.lastIntervalComplete = false

      try {
        await this.processTradeInterval(config)
      } catch (error) {
        console.error("[v0] Trade interval error:", error)
      } finally {
        this.lastIntervalComplete = true
      }
    }, intervalMs)
  }

  /**
   * Process complete trade interval
   */
  private async processTradeInterval(config: PresetTradeEngineConfig): Promise<void> {
    const startTime = Date.now()

    // Get symbols (top 25 by market cap or configured)
    const symbols = config.useTopSymbols
      ? await this.getTopSymbolsByMarketCap(config.topSymbolsCount || 25)
      : config.symbols

    await this.processIndicationsCommonIndicators(symbols, config)

    // Stage 2: Strategy Processing (Validate and create Main pseudo positions)
    await this.processStrategies(symbols, config)

    // Stage 3: Pseudo Position Management (Update and validate)
    await this.managePseudoPositions(config)

    // Stage 4: Logging & Metrics
    await this.logMetrics(symbols.length, Date.now() - startTime)
  }

  /**
   * Process indications using COMMON INDICATORS (RSI, MACD, Bollinger, SAR, ADX, etc.)
   * This is the correct approach for Preset Trade mode
   */
  private async processIndicationsCommonIndicators(symbols: string[], config: PresetTradeEngineConfig): Promise<void> {
    const settings = await this.getSettings()

    // Get configured common indicators from settings
    const commonIndicators = await this.getCommonIndicators()

    const batches = this.createBatches(symbols, this.BATCH_SIZE)

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (symbol) => {
          try {
            // Get recent price data (enough for all indicators)
            const prices = await this.getRecentPrices(symbol, 200)

            if (prices.length < 50) {
              console.log(`[v0] Insufficient price data for ${symbol}`)
              return
            }

            // Calculate all common indicators
            const signals = calculateIndicators(prices, commonIndicators)

            // Combine signals to determine entry
            const combinedSignal = TechnicalIndicators.combineSignals(signals)

            if (combinedSignal.direction !== "neutral" && combinedSignal.strength > 0.5) {
              // Generate pseudo positions with wider TP/SL ranges
              await this.processIndicationResult(
                {
                  symbol,
                  entry_price: prices[prices.length - 1],
                  direction: combinedSignal.direction,
                  strength: combinedSignal.strength,
                  indicators: signals,
                },
                config,
              )
            }
          } catch (error) {
            console.error(`[v0] Error processing indications for ${symbol}:`, error)
          }
        }),
      )
    }
  }

  /**
   * Process indication result and generate pseudo positions
   * Wider TP/SL ranges for short-term trading (starting from factor 2)
   */
  private async processIndicationResult(indication: any, config: PresetTradeEngineConfig): Promise<void> {
    // Check validation cooldown (15 seconds)
    const lastValidation = this.activeIndications.get(`${indication.symbol}-${indication.direction}`)
    if (lastValidation && Date.now() - lastValidation < 15000) {
      return // Skip if within cooldown period
    }

    const pseudoPositions = await this.generateShortTermPseudoPositions(
      indication.symbol,
      indication.entry_price,
      indication.direction,
      indication.strength,
      indication.indicators,
    )

    // Store pseudo positions (batch insert for performance)
    await this.batchInsertPseudoPositions(pseudoPositions)

    // Update validation timestamp
    this.activeIndications.set(`${indication.symbol}-${indication.direction}`, Date.now())

    console.log(
      `[v0] Generated ${pseudoPositions.length} pseudo positions for ${indication.symbol} (${indication.direction})`,
    )
  }

  /**
   * Generate pseudo positions optimized for short-term trading
   * Uses configurable ranges from Settings / Main / Preset Trade
   */
  private async generateShortTermPseudoPositions(
    symbol: string,
    entryPrice: number,
    direction: "long" | "short",
    strength: number,
    indicators: IndicatorSignal[],
  ): Promise<any[]> {
    const positions: any[] = []
    const positionCost = 0.001 // 0.1%

    const settings = await this.getSettings()
    const tpMin = Number.parseFloat(settings.presetTpMin || "2")
    const tpMax = Number.parseFloat(settings.presetTpMax || "30")
    const tpStep = Number.parseFloat(settings.presetTpStep || "2")
    const slMin = Number.parseFloat(settings.presetSlMin || "0.3")
    const slMax = Number.parseFloat(settings.presetSlMax || "3.0")
    const slStep = Number.parseFloat(settings.presetSlStep || "0.3")
    const trailStarts = JSON.parse(settings.presetTrailStarts || "[0.5, 1.0, 1.5]")
    const trailStops = JSON.parse(settings.presetTrailStops || "[0.2, 0.4, 0.6]")

    // Generate positions with configurable ranges
    for (let tpFactor = tpMin; tpFactor <= tpMax; tpFactor += tpStep) {
      for (let slRatio = slMin; slRatio <= slMax; slRatio += slStep) {
        // Without trailing
        positions.push({
          id: this.generateId(),
          connection_id: this.connectionId,
          preset_id: this.presetId,
          symbol,
          type: "base",
          direction,
          strength,
          indicators: JSON.stringify(indicators.map((i) => ({ type: i.type, value: i.value }))),
          takeprofit_factor: tpFactor,
          stoploss_ratio: slRatio,
          trailing_enabled: false,
          entry_price: entryPrice,
          current_price: entryPrice,
          profit_factor: 0,
          position_cost: positionCost,
          status: "active",
          created_at: new Date().toISOString(),
        })

        // With trailing (using configured values)
        trailStarts.forEach((trailStart: number) => {
          trailStops.forEach((trailStop: number) => {
            positions.push({
              id: this.generateId(),
              connection_id: this.connectionId,
              preset_id: this.presetId,
              symbol,
              type: "base",
              direction,
              strength,
              indicators: JSON.stringify(indicators.map((i) => ({ type: i.type, value: i.value }))),
              takeprofit_factor: tpFactor,
              stoploss_ratio: slRatio,
              trailing_enabled: true,
              trail_start: trailStart,
              trail_stop: trailStop,
              entry_price: entryPrice,
              current_price: entryPrice,
              profit_factor: 0,
              position_cost: positionCost,
              status: "active",
              created_at: new Date().toISOString(),
            })
          })
        })
      }
    }

    // Limit to 250 positions per indication
    return positions.slice(0, 250)
  }

  /**
   * Get configured common indicators from settings
   */
  private async getCommonIndicators(): Promise<IndicatorConfig[]> {
    const settings = db
      .prepare(`
      SELECT value FROM system_settings WHERE key = 'commonIndicators'
    `)
      .all() as any[]

    if (settings.length > 0 && settings[0].value) {
      return JSON.parse(settings[0].value)
    }

    // Default common indicators
    return [
      { type: "rsi", params: { period: 14, oversold: 30, overbought: 70 } },
      { type: "macd", params: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 } },
      { type: "bollinger", params: { period: 20, stdDev: 2 } },
      { type: "sar", params: { acceleration: 0.02, maximum: 0.2 } },
      { type: "adx", params: { period: 14 } },
    ]
  }

  /**
   * Process strategies and create Main pseudo positions
   */
  private async processStrategies(symbols: string[], config: PresetTradeEngineConfig): Promise<void> {
    const basePositions = db
      .prepare(
        `
      SELECT * FROM preset_pseudo_positions
      WHERE connection_id = ?
        AND preset_id = ?
        AND type = 'base'
        AND status = 'active'
      ORDER BY symbol, created_at DESC
    `,
      )
      .all(this.connectionId, this.presetId) as any[]

    // Group by symbol
    const positionsBySymbol = this.groupBy(basePositions, "symbol")

    // Process each symbol
    for (const [symbol, positions] of Object.entries(positionsBySymbol)) {
      try {
        // Validate and create Main positions
        const validatedPositions = positions.filter((p: any) => p.profit_factor >= config.minProfitFactor)

        // Check position cooldown (20 seconds)
        const lastPosition = await this.getLastClosedPosition(symbol)
        if (lastPosition && Date.now() - new Date(lastPosition.closed_at).getTime() < 20000) {
          continue // Skip if within cooldown period
        }

        // Check max active per config (1 position per configuration set)
        const activeCount = await this.getActivePositionCount(symbol)
        if (activeCount >= 1) {
          continue // Skip if already have active position for this symbol
        }

        // Create Main pseudo positions from validated Base positions
        for (const basePosition of validatedPositions.slice(0, 10)) {
          db.prepare(
            `
            INSERT INTO preset_pseudo_positions (
              id, connection_id, preset_id, symbol, type,
              indication_type, indication_range,
              takeprofit_factor, stoploss_ratio,
              trailing_enabled, trail_start, trail_stop,
              entry_price, current_price, profit_factor,
              position_cost, base_position_id, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT DO NOTHING
          `,
          ).run(
            this.generateId(),
            this.connectionId,
            this.presetId,
            basePosition.symbol,
            "main",
            basePosition.indication_type,
            basePosition.indication_range,
            basePosition.takeprofit_factor,
            basePosition.stoploss_ratio,
            basePosition.trailing_enabled,
            basePosition.trail_start,
            basePosition.trail_stop,
            basePosition.entry_price,
            basePosition.current_price,
            basePosition.profit_factor,
            basePosition.position_cost,
            basePosition.id,
            "active",
            new Date().toISOString(),
          )
        }
      } catch (error) {
        console.error(`[v0] Error processing strategies for ${symbol}:`, error)
      }
    }
  }

  /**
   * Manage pseudo positions (update, validate, close)
   */
  private async managePseudoPositions(config: PresetTradeEngineConfig): Promise<void> {
    const activePositions = db
      .prepare(
        `
      SELECT * FROM preset_pseudo_positions
      WHERE connection_id = ?
        AND preset_id = ?
        AND status = 'active'
    `,
      )
      .all(this.connectionId, this.presetId) as any[]

    // Update with current prices (batch)
    const symbols = [...new Set(activePositions.map((p: any) => p.symbol))]
    const currentPrices = await this.getCurrentPrices(symbols)

    // Process positions in batches
    const batches = this.createBatches(activePositions, this.BATCH_SIZE)

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (position: any) => {
          try {
            const currentPrice = currentPrices.get(position.symbol)
            if (!currentPrice) return

            // Update profit factor
            const priceDiff = currentPrice - position.entry_price
            const profitFactor = priceDiff / (position.entry_price * position.position_cost)

            // Check exit conditions
            const shouldClose = this.checkExitConditions(position, currentPrice, profitFactor)

            if (shouldClose) {
              await this.closePosition(position, currentPrice, profitFactor)
            } else {
              db.prepare(
                `
                UPDATE preset_pseudo_positions
                SET current_price = ?, profit_factor = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `,
              ).run(currentPrice, profitFactor, position.id)
            }

            // Validate Main positions for Real trading
            if (position.type === "main" && profitFactor >= config.minProfitFactor) {
              await this.validateForRealTrading(position, config)
            }
          } catch (error) {
            console.error(`[v0] Error managing position ${position.id}:`, error)
          }
        }),
      )
    }
  }

  /**
   * Real Positions Interval Loop (0.3s) - NON-OVERLAPPING
   * Handles exchange real position updates
   */
  private async startRealIntervalLoop(): Promise<void> {
    const settings = await this.getSettings()
    const intervalMs = Number.parseFloat(settings.realPositionsInterval || "0.3") * 1000

    this.realInterval = setInterval(async () => {
      if (!this.lastRealIntervalComplete) {
        console.log("[v0] Previous real interval still running, skipping...")
        return
      }

      this.lastRealIntervalComplete = false

      try {
        await this.processRealInterval()
      } catch (error) {
        console.error("[v0] Real interval error:", error)
      } finally {
        this.lastRealIntervalComplete = true
      }
    }, intervalMs)
  }

  /**
   * Process real positions interval
   * Batched API calls for rate limit compliance
   */
  private async processRealInterval(): Promise<void> {
    const realPositions = db
      .prepare(
        `
      SELECT * FROM preset_pseudo_positions
      WHERE connection_id = ?
        AND preset_id = ?
        AND type = 'real'
        AND status = 'active'
      LIMIT 50
    `,
      )
      .all(this.connectionId, this.presetId) as any[]

    if (realPositions.length === 0) return

    const exchangePositions = await this.fetchExchangePositions()

    // Match and update
    const updates: any[] = []

    for (const realPos of realPositions) {
      const exchangePos = exchangePositions.find((ep: any) => ep.symbol === realPos.symbol)

      if (exchangePos) {
        updates.push({
          id: realPos.id,
          currentPrice: exchangePos.markPrice,
          profitLoss: exchangePos.unrealizedProfit,
        })
      }
    }

    if (updates.length > 0) {
      await this.batchUpdateRealPositions(updates)
    }
  }

  // ============ HELPER METHODS ============

  private async getSettings(): Promise<Record<string, string>> {
    const result = db.prepare(`SELECT key, value FROM system_settings`).all() as any[]
    return Object.fromEntries(result.map((r: any) => [r.key, r.value]))
  }

  private async getTopSymbolsByMarketCap(count: number): Promise<string[]> {
    const result = db
      .prepare(
        `
      SELECT symbol FROM market_data
      WHERE timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY symbol
      ORDER BY SUM(volume * price) DESC
      LIMIT ?
    `,
      )
      .all(count) as any[]
    return result.map((r: any) => r.symbol)
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  private groupBy<T>(array: T[], key: string): Record<string, T[]> {
    return array.reduce((result: any, item: any) => {
      const groupKey = item[key]
      if (!result[groupKey]) result[groupKey] = []
      result[groupKey].push(item)
      return result
    }, {})
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private async fetchHistoricalOHLCV(symbol: string, days: number, timeframe: number): Promise<any[]> {
    // Implement exchange API call to fetch historical data
    // This is a placeholder - actual implementation depends on exchange
    return []
  }

  private async storeHistoricalData(symbol: string, data: any[]): Promise<void> {
    // Batch insert historical data
    if (data.length === 0) return

    const stmt = db.prepare(`
      INSERT INTO market_data (connection_id, symbol, price, timestamp)
      VALUES (?, ?, ?, ?)
      ON CONFLICT DO NOTHING
    `)

    for (const d of data) {
      stmt.run(this.connectionId, symbol, d.close, d.timestamp)
    }
  }

  private async getRecentPrices(symbol: string, count: number): Promise<number[]> {
    const result = db
      .prepare(
        `
      SELECT price FROM market_data
      WHERE connection_id = ? AND symbol = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `,
      )
      .all(this.connectionId, symbol, count) as any[]
    return result.map((r: any) => r.price).reverse()
  }

  private async getCurrentPrices(symbols: string[]): Promise<Map<string, number>> {
    const result = db
      .prepare(
        `
      SELECT DISTINCT ON (symbol) symbol, price
      FROM market_data
      WHERE connection_id = ? AND symbol = ANY(?)
      ORDER BY symbol, timestamp DESC
    `,
      )
      .all(this.connectionId, symbols) as any[]
    return new Map(result.map((r: any) => [r.symbol, r.price]))
  }

  private async batchInsertPseudoPositions(positions: any[]): Promise<void> {
    if (positions.length === 0) return

    const stmt = db.prepare(`
      INSERT INTO preset_pseudo_positions (
        id, connection_id, preset_id, symbol, type,
        direction, strength, indicators, takeprofit_factor, stoploss_ratio,
        trailing_enabled, trail_start, trail_stop,
        entry_price, current_price, profit_factor, position_cost,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
    `)

    const batches = this.createBatches(positions, 50)

    for (const batch of batches) {
      for (const p of batch) {
        stmt.run(
          p.id,
          p.connection_id,
          p.preset_id,
          p.symbol,
          p.type,
          p.direction,
          p.strength,
          p.indicators,
          p.takeprofit_factor,
          p.stoploss_ratio,
          p.trailing_enabled,
          p.trail_start,
          p.trail_stop,
          p.entry_price,
          p.current_price,
          p.profit_factor,
          p.position_cost,
          p.status,
          p.created_at,
        )
      }
    }
  }

  private checkExitConditions(position: any, currentPrice: number, profitFactor: number): boolean {
    // Check TP/SL
    const tpPrice = position.entry_price * (1 + position.takeprofit_factor * position.position_cost)
    const slPrice =
      position.entry_price * (1 - position.stoploss_ratio * position.takeprofit_factor * position.position_cost)

    if (currentPrice >= tpPrice || currentPrice <= slPrice) {
      return true
    }

    // Check timeout (2 hours for short-term trading)
    const openedAt = new Date(position.created_at)
    const hoursOpen = (Date.now() - openedAt.getTime()) / (1000 * 60 * 60)

    if (hoursOpen >= 2) {
      return true
    }

    return false
  }

  private async closePosition(position: any, currentPrice: number, profitFactor: number): Promise<void> {
    db.prepare(
      `
      UPDATE preset_pseudo_positions
      SET status = 'closed',
          current_price = ?,
          profit_factor = ?,
          closed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(currentPrice, profitFactor, position.id)
  }

  private async getLastClosedPosition(symbol: string): Promise<any> {
    const result = db
      .prepare(
        `
      SELECT * FROM preset_pseudo_positions
      WHERE connection_id = ? AND preset_id = ? AND symbol = ? AND status = 'closed'
      ORDER BY closed_at DESC
      LIMIT 1
    `,
      )
      .all(this.connectionId, this.presetId, symbol) as any[]
    return result[0]
  }

  private async getActivePositionCount(symbol: string): Promise<number> {
    const result = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM preset_pseudo_positions
      WHERE connection_id = ? AND preset_id = ? AND symbol = ? AND type = 'main' AND status = 'active'
    `,
      )
      .all(this.connectionId, this.presetId, symbol) as any[]
    return result[0]?.count || 0
  }

  private async validateForRealTrading(position: any, config: PresetTradeEngineConfig): Promise<void> {
    db.prepare(
      `
      INSERT INTO preset_pseudo_positions (
        id, connection_id, preset_id, symbol, type,
        indication_type, indication_range,
        takeprofit_factor, stoploss_ratio,
        trailing_enabled, trail_start, trail_stop,
        entry_price, current_price, profit_factor,
        position_cost, main_position_id, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO NOTHING
    `,
    ).run(
      this.generateId(),
      this.connectionId,
      this.presetId,
      position.symbol,
      "real",
      position.indication_type,
      position.indication_range,
      position.takeprofit_factor,
      position.stoploss_ratio,
      position.trailing_enabled,
      position.trail_start,
      position.trail_stop,
      position.entry_price,
      position.current_price,
      position.profit_factor,
      position.position_cost,
      position.id,
      "active",
      new Date().toISOString(),
    )
  }

  private async fetchExchangePositions(): Promise<any[]> {
    // Implement exchange API call to fetch all positions
    // This is a placeholder - actual implementation depends on exchange
    return []
  }

  private async batchUpdateRealPositions(updates: any[]): Promise<void> {
    const stmt = db.prepare(`
      UPDATE preset_pseudo_positions
      SET current_price = ?, profit_loss = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)

    for (const update of updates) {
      stmt.run(update.currentPrice, update.profitLoss, update.id)
    }
  }

  private async logMetrics(symbolCount: number, duration: number): Promise<void> {
    db.prepare(
      `
      INSERT INTO preset_engine_metrics (
        connection_id, preset_id, symbol_count, duration_ms, timestamp
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    ).run(this.connectionId, this.presetId, symbolCount, duration)
  }
}
