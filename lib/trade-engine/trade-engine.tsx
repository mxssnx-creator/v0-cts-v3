/**
 * Trade Engine - Dual-Mode Parallel System
 * Service Name: project_name-trade
 * Runs BOTH Preset Trade and Main System Trade simultaneously
 * Each mode has its own independent interval progression
 *
 * Preset Trade: Common indicators (RSI, MACD, Bollinger, SAR, ADX) - wider TP/SL for short-term
 * Main System Trade: Step-based indications (Direction, Move, Active) - standard ranges
 */

import { sql } from "@/lib/db"
import { db } from "@/lib/db"
import { IndicationProcessor } from "./indication-processor"
import { StrategyProcessor } from "./strategy-processor"
import { PseudoPositionManager } from "./pseudo-position-manager"
import { RealtimeProcessor } from "./realtime-processor"
import { IndicationStateManager } from "@/lib/indication-state-manager"

export const TRADE_SERVICE_NAME = "project_name-trade"

export interface TradeEngineConfig {
  connectionId: string
  tradeInterval: number // seconds - for indications, strategies, pseudo positions, logging
  realInterval: number // seconds - for exchange real positions handling
  maxConcurrency?: number // max parallel symbol processing (default: 10)
}

interface SettingsCache {
  indication: any
  strategy: any
  symbols: string[]
  lastUpdate: number
}

export class TradeEngine {
  private connectionId: string
  private isRunning = false
  private presetTradeLoopPromise?: Promise<void>
  private mainTradeLoopPromise?: Promise<void>
  private realLoopPromise?: Promise<void>

  private indicationProcessor: IndicationProcessor
  private strategyProcessor: StrategyProcessor
  private pseudoPositionManager: PseudoPositionManager
  private realtimeProcessor: RealtimeProcessor
  private indicationStateManager: IndicationStateManager

  private settingsCache: SettingsCache | null = null
  private maxConcurrency: number
  private presetProcessingQueue: Set<string> = new Set()
  private mainProcessingQueue: Set<string> = new Set()

  private tradeInterval = 1.0
  private realInterval = 0.3

  constructor(config: TradeEngineConfig) {
    this.connectionId = config.connectionId
    this.maxConcurrency = config.maxConcurrency || 10
    this.tradeInterval = config.tradeInterval
    this.realInterval = config.realInterval

    console.log(`[v0] Initializing ${TRADE_SERVICE_NAME} for connection:`, this.connectionId)

    this.indicationProcessor = new IndicationProcessor(config.connectionId)
    this.strategyProcessor = new StrategyProcessor(config.connectionId)
    this.pseudoPositionManager = new PseudoPositionManager(config.connectionId)
    this.realtimeProcessor = new RealtimeProcessor(config.connectionId)
    this.indicationStateManager = new IndicationStateManager(config.connectionId)
  }

  async start(config: TradeEngineConfig): Promise<void> {
    if (this.isRunning) {
      console.log(`[v0] ${TRADE_SERVICE_NAME} already running for connection:`, this.connectionId)
      return
    }

    console.log(
      `[v0] Starting ${TRADE_SERVICE_NAME} in DUAL-MODE (Preset + Main System) for connection:`,
      this.connectionId,
    )

    try {
      await this.updateEngineState("starting")

      const [connectionSettings] = await sql`
        SELECT connection_settings FROM exchange_connections
        WHERE id = ${this.connectionId}
      `

      const settings = connectionSettings?.connection_settings ? JSON.parse(connectionSettings.connection_settings) : {}

      console.log("[v0] Loaded connection-specific settings:", settings)

      await this.loadPrehistoricData()

      const symbols = await this.getSymbols()
      await this.realtimeProcessor.initializeStream("wss://stream.bybit.com/v5/public/linear", symbols)

      this.isRunning = true

      this.presetTradeLoopPromise = this.runPresetTradeLoop()
      this.mainTradeLoopPromise = this.runMainTradeLoop()
      this.realLoopPromise = this.runRealPositionsLoop()

      await this.updateEngineState("running")
      console.log(
        `[v0] ${TRADE_SERVICE_NAME} started successfully in DUAL-MODE with both Preset and Main System running`,
      )
    } catch (error) {
      console.error(`[v0] Failed to start ${TRADE_SERVICE_NAME}:`, error)
      await this.updateEngineState("error", error instanceof Error ? error.message : "Unknown error")
      await this.cleanup()
      throw error
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log(`[v0] ${TRADE_SERVICE_NAME} not running`)
      return
    }

    console.log(`[v0] Stopping ${TRADE_SERVICE_NAME} for connection:`, this.connectionId)

    this.isRunning = false

    await Promise.all([this.presetTradeLoopPromise, this.mainTradeLoopPromise, this.realLoopPromise].filter(Boolean))

    await this.cleanup()
    await this.updateEngineState("stopped")

    console.log(`[v0] ${TRADE_SERVICE_NAME} stopped`)
  }

  private async cleanup(): Promise<void> {
    try {
      this.realtimeProcessor.stopStream()
      this.presetProcessingQueue.clear()
      this.mainProcessingQueue.clear()
    } catch (error) {
      console.error("[v0] Error during cleanup:", error)
    }
  }

  private async runPresetTradeLoop(): Promise<void> {
    console.log(`[v0] Starting PRESET Trade Loop (interval: ${this.tradeInterval}s)`)
    console.log("[v0] Preset Mode: Common Indicators → Strategies → Pseudo Positions → Logging")
    console.log("[v0] Using non-overlapping progression: waits for completion before next interval")

    while (this.isRunning) {
      const startTime = Date.now()

      try {
        const symbols = await this.getSymbolsCached()

        await this.processSymbolsPresetMode(symbols)

        const duration = Date.now() - startTime
        await sql`
          UPDATE trade_engine_state
          SET 
            last_preset_run = CURRENT_TIMESTAMP,
            preset_cycle_duration_ms = ${duration},
            preset_symbols_processed = ${symbols.length}
          WHERE connection_id = ${this.connectionId}
        `

        console.log(`[v0] Preset trade cycle completed in ${duration}ms for ${symbols.length} symbols`)
      } catch (error) {
        console.error("[v0] Preset Trade Loop error:", error)
      }

      if (this.isRunning) {
        await this.sleep(this.tradeInterval * 1000)
      }
    }

    console.log("[v0] Preset Trade Loop stopped")
  }

  private async runMainTradeLoop(): Promise<void> {
    console.log(`[v0] Starting MAIN SYSTEM Trade Loop (interval: ${this.tradeInterval}s)`)
    console.log("[v0] Main Mode: Step-based Indications → Strategies → Pseudo Positions → Logging")
    console.log("[v0] Using non-overlapping progression: waits for completion before next interval")

    while (this.isRunning) {
      const startTime = Date.now()

      try {
        const symbols = await this.getSymbolsCached()

        await this.processSymbolsMainMode(symbols)

        const duration = Date.now() - startTime
        await sql`
          UPDATE trade_engine_state
          SET 
            last_main_run = CURRENT_TIMESTAMP,
            main_cycle_duration_ms = ${duration},
            main_symbols_processed = ${symbols.length}
          WHERE connection_id = ${this.connectionId}
        `

        console.log(`[v0] Main system trade cycle completed in ${duration}ms for ${symbols.length} symbols`)
      } catch (error) {
        console.error("[v0] Main System Trade Loop error:", error)
      }

      if (this.isRunning) {
        await this.sleep(this.tradeInterval * 1000)
      }
    }

    console.log("[v0] Main System Trade Loop stopped")
  }

  private async processSymbolsPresetMode(symbols: string[]): Promise<void> {
    const chunks = []
    for (let i = 0; i < symbols.length; i += this.maxConcurrency) {
      chunks.push(symbols.slice(i, i + this.maxConcurrency))
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map((symbol) => this.processSymbolPreset(symbol)))
    }
  }

  private async processSymbolsMainMode(symbols: string[]): Promise<void> {
    const chunks = []
    for (let i = 0; i < symbols.length; i += this.maxConcurrency) {
      chunks.push(symbols.slice(i, i + this.maxConcurrency))
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map((symbol) => this.processSymbolMain(symbol)))
    }
  }

  private async processSymbolPreset(symbol: string): Promise<void> {
    if (this.presetProcessingQueue.has(symbol)) {
      return
    }

    this.presetProcessingQueue.add(symbol)

    try {
      await this.indicationProcessor.processIndication(symbol)
      await this.strategyProcessor.processStrategy(symbol)
      await this.managePseudoPositionsWithValidation(symbol, "preset")
      await this.logTradeActivities(symbol, "preset")
    } catch (error) {
      console.error(`[v0] Error processing symbol ${symbol} in Preset mode:`, error)
    } finally {
      this.presetProcessingQueue.delete(symbol)
    }
  }

  private async processSymbolMain(symbol: string): Promise<void> {
    if (this.mainProcessingQueue.has(symbol)) {
      return
    }

    this.mainProcessingQueue.add(symbol)

    try {
      await this.indicationStateManager.processStepBasedIndications(symbol)
      await this.managePseudoPositionsWithValidation(symbol, "main")
      await this.logTradeActivities(symbol, "main")
    } catch (error) {
      console.error(`[v0] Error processing symbol ${symbol} in Main mode:`, error)
    } finally {
      this.mainProcessingQueue.delete(symbol)
    }
  }

  private async managePseudoPositionsWithValidation(symbol: string, mode: "preset" | "main"): Promise<void> {
    try {
      const baseIndications = await sql`
        SELECT * FROM indications
        WHERE connection_id = ${this.connectionId}
          AND symbol = ${symbol}
          AND mode = ${mode}
          AND calculated_at > NOW() - INTERVAL '5 minutes'
          AND profit_factor >= 0.7
        ORDER BY calculated_at DESC
        LIMIT 5
      `

      if (baseIndications.length === 0) return

      const mainSignals = await sql`
        SELECT * FROM pseudo_positions
        WHERE connection_id = ${this.connectionId}
          AND symbol = ${symbol}
          AND mode = ${mode}
          AND status = 'active'
          AND profit_factor >= 0.6
          AND created_at > NOW() - INTERVAL '1 hour'
      `

      for (const signal of mainSignals) {
        if (await this.isValidatedForReal(signal)) {
          await this.createRealPseudoPosition(symbol, signal, mode)
        }
      }
    } catch (error) {
      console.error(`[v0] Error managing pseudo positions for ${symbol} in ${mode} mode:`, error)
    }
  }

  private async isValidatedForReal(mainPosition: any): Promise<boolean> {
    try {
      const profitFactor = Number.parseFloat(mainPosition.profit_factor)
      const createdAt = new Date(mainPosition.created_at)
      const now = new Date()
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

      const meetsMinProfitFactor = profitFactor >= 0.6
      const withinDrawdownTime = hoursSinceCreation <= 12

      const [existing] = await sql`
        SELECT id FROM real_pseudo_positions
        WHERE main_position_id = ${mainPosition.id}
      `

      return meetsMinProfitFactor && withinDrawdownTime && !existing
    } catch (error) {
      console.error("[v0] Error validating for real:", error)
      return false
    }
  }

  private async createRealPseudoPosition(symbol: string, mainPosition: any, mode: "preset" | "main"): Promise<void> {
    try {
      await sql`
        INSERT INTO real_pseudo_positions (
          connection_id, main_position_id, symbol, side, mode,
          entry_price, quantity, status, validated_at
        )
        VALUES (
          ${this.connectionId}, ${mainPosition.id}, ${symbol}, ${mainPosition.side}, ${mode},
          ${mainPosition.entry_price}, ${mainPosition.quantity}, 'validated', CURRENT_TIMESTAMP
        )
      `

      console.log(`[v0] Created real pseudo position for ${symbol} in ${mode} mode`)
    } catch (error) {
      console.error(`[v0] Error creating real pseudo position for ${symbol}:`, error)
    }
  }

  private async runRealPositionsLoop(): Promise<void> {
    console.log(`[v0] Starting Real Positions Loop (interval: ${this.realInterval}s)`)
    console.log("[v0] Real Positions Loop handles: Retrieve all → Update all → Send changes (batched)")
    console.log("[v0] Processes positions from BOTH Preset and Main System modes")
    console.log("[v0] Using non-overlapping progression: waits for completion before next interval")

    while (this.isRunning) {
      const startTime = Date.now()

      try {
        await this.realtimeProcessor.processRealtimeUpdates()

        const duration = Date.now() - startTime
        const positionCount = await this.pseudoPositionManager.getPositionCount()

        await sql`
          UPDATE trade_engine_state
          SET 
            last_real_run = CURRENT_TIMESTAMP,
            real_cycle_duration_ms = ${duration},
            active_real_positions_count = ${positionCount}
          WHERE connection_id = ${this.connectionId}
        `

        console.log(`[v0] Real positions cycle completed in ${duration}ms, ${positionCount} positions`)
      } catch (error) {
        console.error("[v0] Real Positions Loop error:", error)
      }

      if (this.isRunning) {
        await this.sleep(this.realInterval * 1000)
      }
    }

    console.log("[v0] Real Positions Loop stopped")
  }

  private async loadPrehistoricData(): Promise<void> {
    try {
      console.log("[v0] Loading prehistoric data...")

      const [settingsRow] = await sql`
        SELECT value FROM system_settings
        WHERE key = 'timeRangeHistoryDays'
      `
      const historyDays = settingsRow ? Number.parseInt(settingsRow.value) : 5 // Default 5 days

      const symbols = await this.getSymbols()
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - historyDays * 24 * 60 * 60 * 1000)

      console.log(
        `[v0] Loading ${historyDays} days of historical data from ${startDate.toISOString()} to ${endDate.toISOString()}`,
      )

      for (const symbol of symbols) {
        await this.indicationProcessor.processHistoricalIndications(symbol, startDate, endDate)
        await this.strategyProcessor.processHistoricalStrategies(symbol, startDate, endDate)
      }

      console.log("[v0] Prehistoric data loaded successfully")
    } catch (error) {
      console.error("[v0] Failed to load prehistoric data:", error)
      throw error
    }
  }

  private async logTradeActivities(symbol: string, mode: "preset" | "main"): Promise<void> {
    try {
      const [stats] = await sql`
        SELECT 
          COUNT(DISTINCT i.id) as indication_count,
          COUNT(DISTINCT p.id) as position_count,
          AVG(p.profit_factor) as avg_profit_factor
        FROM indications i
        LEFT JOIN pseudo_positions p ON p.symbol = i.symbol AND p.mode = i.mode
        WHERE i.connection_id = ${this.connectionId}
          AND i.symbol = ${symbol}
          AND i.mode = ${mode}
          AND i.calculated_at > NOW() - INTERVAL '1 minute'
      `

      await sql`
        INSERT INTO trade_logs (
          connection_id, symbol, mode, log_type, log_data, created_at
        )
        VALUES (
          ${this.connectionId}, ${symbol}, ${mode}, 'trade_cycle',
          ${JSON.stringify(stats)},
          CURRENT_TIMESTAMP
        )
      `
    } catch (error) {
      console.error(`[v0] Failed to log trade activities for ${symbol} in ${mode} mode:`, error)
    }
  }

  private async getSymbolsCached(): Promise<string[]> {
    const now = Date.now()

    if (this.settingsCache && now - this.settingsCache.lastUpdate < 60000) {
      return this.settingsCache.symbols
    }

    const symbols = await this.getSymbols()

    this.settingsCache = {
      ...this.settingsCache,
      symbols,
      lastUpdate: now,
    } as SettingsCache

    return symbols
  }

  private async getSymbols(): Promise<string[]> {
    try {
      const settings = await sql`
        SELECT key, value FROM system_settings
        WHERE key IN ('useMainSymbols', 'mainSymbols', 'forcedSymbols', 'arrangementType', 'arrangementCount', 'quoteAsset')
      `

      const settingsMap = new Map(settings.map((s: any) => [s.key, s.value]))

      const useMainSymbols = settingsMap.get("useMainSymbols") === "true"
      const forcedSymbols = JSON.parse(String(settingsMap.get("forcedSymbols") || "[]"))
      const quoteAsset = settingsMap.get("quoteAsset") || "USDT"

      let baseSymbols: string[] = []

      if (useMainSymbols) {
        const mainSymbols = JSON.parse(String(settingsMap.get("mainSymbols") || "[]"))
        baseSymbols = mainSymbols
      } else {
        const arrangementType = String(settingsMap.get("arrangementType") || "marketCap24h")
        const arrangementCount = Number.parseInt(String(settingsMap.get("arrangementCount") || "30"))
        baseSymbols = await this.getSymbolsByArrangement(arrangementType, arrangementCount)
      }

      const allBaseSymbols = [...new Set([...forcedSymbols, ...baseSymbols])]

      const fullSymbols = allBaseSymbols.map((base) => `${base}${quoteAsset}`)

      console.log(`[v0] Selected ${fullSymbols.length} symbols:`, fullSymbols.slice(0, 10), "...")

      return fullSymbols
    } catch (error) {
      console.error("[v0] Failed to get symbols:", error)
      return ["BTCUSDT", "ETHUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT"]
    }
  }

  private async getSymbolsByArrangement(arrangementType: string, count: number): Promise<string[]> {
    try {
      let orderBy = "volume_24h DESC" // default

      switch (arrangementType) {
        case "marketCap24h":
          orderBy = "market_cap DESC"
          break
        case "marketVolume":
          orderBy = "volume_24h DESC"
          break
        case "marketVolatility":
          orderBy = "price_change_24h_abs DESC"
          break
        case "priceChange24h":
          orderBy = "price_change_24h DESC"
          break
        case "liquidityScore":
          orderBy = "liquidity_score DESC"
          break
      }

      const symbols = db
        .prepare(`
        SELECT REPLACE(symbol, 'USDT', '') as base_symbol 
        FROM trading_pairs
        WHERE is_active = true 
          AND symbol LIKE '%USDT'
        ORDER BY ${orderBy}
        LIMIT ?
      `)
        .all(count) as any[]

      return symbols.map((s: any) => s.base_symbol)
    } catch (error) {
      console.error(`[v0] Failed to get symbols by arrangement ${arrangementType}:`, error)
      // Fallback to default symbols
      return ["BTC", "ETH", "BNB", "XRP", "ADA", "SOL", "DOT", "MATIC", "AVAX", "LINK"]
    }
  }

  async getStatus() {
    try {
      const [state] = await sql`
        SELECT * FROM trade_engine_state
        WHERE connection_id = ${this.connectionId}
      `
      return {
        ...state,
        streamStatus: this.realtimeProcessor.getStreamStatus(),
        presetProcessingQueueSize: this.presetProcessingQueue.size,
        mainProcessingQueueSize: this.mainProcessingQueue.size,
      }
    } catch (error) {
      return null
    }
  }

  private async updateEngineState(state: string, errorMessage?: string): Promise<void> {
    try {
      await sql`
        INSERT INTO trade_engine_state (
          connection_id, state, error_message, updated_at
        )
        VALUES (
          ${this.connectionId}, ${state}, ${errorMessage || null}, CURRENT_TIMESTAMP
        )
        ON CONFLICT (connection_id)
        DO UPDATE SET
          state = ${state},
          error_message = ${errorMessage || null},
          updated_at = CURRENT_TIMESTAMP
      `
    } catch (error) {
      console.error("[v0] Failed to update engine state:", error)
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
