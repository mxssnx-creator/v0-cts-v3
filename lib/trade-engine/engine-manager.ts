/**
 * Trade Engine Manager
 * Manages asynchronous processing for symbols, indications, pseudo positions, and strategies
 */

import { sql } from "@/lib/db"
import { DataSyncManager } from "@/lib/data-sync-manager"
import { IndicationProcessor } from "./indication-processor"
import { StrategyProcessor } from "./strategy-processor"
import { PseudoPositionManager } from "./pseudo-position-manager"
import { RealtimeProcessor } from "./realtime-processor"

export interface EngineConfig {
  connectionId: string
  indicationInterval: number // seconds
  strategyInterval: number // seconds
  realtimeInterval: number // seconds
}

export class TradeEngineManager {
  private connectionId: string
  private isRunning = false
  private indicationTimer?: NodeJS.Timeout
  private strategyTimer?: NodeJS.Timeout
  private realtimeTimer?: NodeJS.Timeout

  private indicationProcessor: IndicationProcessor
  private strategyProcessor: StrategyProcessor
  private pseudoPositionManager: PseudoPositionManager
  private realtimeProcessor: RealtimeProcessor

  constructor(config: EngineConfig) {
    this.connectionId = config.connectionId
    this.indicationProcessor = new IndicationProcessor(config.connectionId)
    this.strategyProcessor = new StrategyProcessor(config.connectionId)
    this.pseudoPositionManager = new PseudoPositionManager(config.connectionId)
    this.realtimeProcessor = new RealtimeProcessor(config.connectionId)
  }

  /**
   * Start the trade engine
   */
  async start(config: EngineConfig): Promise<void> {
    if (this.isRunning) {
      console.log("[v0] Trade engine already running for connection:", this.connectionId)
      return
    }

    console.log("[v0] Starting trade engine for connection:", this.connectionId)

    try {
      // Update engine state
      await this.updateEngineState("running")

      // Load prehistoric data first
      await this.loadPrehistoricData()

      // Start async processors
      this.startIndicationProcessor(config.indicationInterval)
      this.startStrategyProcessor(config.strategyInterval)
      this.startRealtimeProcessor(config.realtimeInterval)

      this.isRunning = true
      console.log("[v0] Trade engine started successfully")
    } catch (error) {
      console.error("[v0] Failed to start trade engine:", error)
      await this.updateEngineState("error", error instanceof Error ? error.message : "Unknown error")
      throw error
    }
  }

  /**
   * Stop the trade engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log("[v0] Trade engine not running")
      return
    }

    console.log("[v0] Stopping trade engine for connection:", this.connectionId)

    // Clear all timers
    if (this.indicationTimer) clearInterval(this.indicationTimer)
    if (this.strategyTimer) clearInterval(this.strategyTimer)
    if (this.realtimeTimer) clearInterval(this.realtimeTimer)

    this.isRunning = false

    // Update engine state
    await this.updateEngineState("stopped")

    console.log("[v0] Trade engine stopped")
  }

  /**
   * Load prehistoric data (historical data before real-time processing)
   */
  private async loadPrehistoricData(): Promise<void> {
    console.log("[v0] Loading prehistoric data...")

    try {
      // Check if prehistoric data already loaded
      const [engineState] = await sql`
        SELECT prehistoric_data_loaded, prehistoric_data_end
        FROM trade_engine_state
        WHERE connection_id = ${this.connectionId}
      `

      if (engineState?.prehistoric_data_loaded) {
        console.log("[v0] Prehistoric data already loaded, skipping...")
        return
      }

      // Get symbols for this connection
      const symbols = await this.getSymbols()

      // Define prehistoric data range (e.g., last 30 days)
      const prehistoricEnd = new Date()
      const prehistoricStart = new Date(prehistoricEnd.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Process each symbol
      for (const symbol of symbols) {
        // Check what data already exists
        const syncStatus = await DataSyncManager.checkSyncStatus(
          this.connectionId,
          symbol,
          "market_data",
          prehistoricStart,
          prehistoricEnd,
        )

        if (syncStatus.needsSync) {
          // Load missing data ranges
          for (const range of syncStatus.missingRanges) {
            await this.loadMarketDataRange(symbol, range.start, range.end)
          }
        }

        // Calculate indications for prehistoric data
        await this.indicationProcessor.processHistoricalIndications(symbol, prehistoricStart, prehistoricEnd)

        // Calculate strategies for prehistoric data
        await this.strategyProcessor.processHistoricalStrategies(symbol, prehistoricStart, prehistoricEnd)
      }

      // Mark prehistoric data as loaded
      await sql`
        UPDATE trade_engine_state
        SET 
          prehistoric_data_loaded = true,
          prehistoric_data_start = ${prehistoricStart.toISOString()},
          prehistoric_data_end = ${prehistoricEnd.toISOString()}
        WHERE connection_id = ${this.connectionId}
      `

      console.log("[v0] Prehistoric data loaded successfully")
    } catch (error) {
      console.error("[v0] Failed to load prehistoric data:", error)
      throw error
    }
  }

  /**
   * Load market data for a specific range
   */
  private async loadMarketDataRange(symbol: string, start: Date, end: Date): Promise<void> {
    try {
      console.log(`[v0] Loading market data for ${symbol} from ${start.toISOString()} to ${end.toISOString()}`)

      // TODO: Implement actual exchange API call based on connection method
      // For now, simulate data loading
      const recordsLoaded = 100

      // Log the sync
      await DataSyncManager.logSync(this.connectionId, symbol, "market_data", start, end, recordsLoaded, "success")
    } catch (error) {
      console.error(`[v0] Failed to load market data for ${symbol}:`, error)
      await DataSyncManager.logSync(
        this.connectionId,
        symbol,
        "market_data",
        start,
        end,
        0,
        "failed",
        error instanceof Error ? error.message : "Unknown error",
      )
    }
  }

  /**
   * Start indication processor (async)
   */
  private startIndicationProcessor(intervalSeconds: number): void {
    console.log(`[v0] Starting indication processor (interval: ${intervalSeconds}s)`)

    this.indicationTimer = setInterval(async () => {
      try {
        const symbols = await this.getSymbols()

        // Process indications for all symbols asynchronously
        await Promise.all(symbols.map((symbol) => this.indicationProcessor.processIndication(symbol)))

        // Update last run time
        await sql`
          UPDATE trade_engine_state
          SET last_indication_run = CURRENT_TIMESTAMP
          WHERE connection_id = ${this.connectionId}
        `
      } catch (error) {
        console.error("[v0] Indication processor error:", error)
      }
    }, intervalSeconds * 1000)
  }

  /**
   * Start strategy processor (async)
   */
  private startStrategyProcessor(intervalSeconds: number): void {
    console.log(`[v0] Starting strategy processor (interval: ${intervalSeconds}s)`)

    this.strategyTimer = setInterval(async () => {
      try {
        const symbols = await this.getSymbols()

        // Process strategies for all symbols asynchronously
        await Promise.all(symbols.map((symbol) => this.strategyProcessor.processStrategy(symbol)))

        // Update last run time
        await sql`
          UPDATE trade_engine_state
          SET last_strategy_run = CURRENT_TIMESTAMP
          WHERE connection_id = ${this.connectionId}
        `
      } catch (error) {
        console.error("[v0] Strategy processor error:", error)
      }
    }, intervalSeconds * 1000)
  }

  /**
   * Start realtime processor (async)
   */
  private startRealtimeProcessor(intervalSeconds: number): void {
    console.log(`[v0] Starting realtime processor (interval: ${intervalSeconds}s)`)

    this.realtimeTimer = setInterval(async () => {
      try {
        // Process realtime updates for active positions
        await this.realtimeProcessor.processRealtimeUpdates()

        // Update last run time
        await sql`
          UPDATE trade_engine_state
          SET last_realtime_run = CURRENT_TIMESTAMP
          WHERE connection_id = ${this.connectionId}
        `
      } catch (error) {
        console.error("[v0] Realtime processor error:", error)
      }
    }, intervalSeconds * 1000)
  }

  /**
   * Get symbols for this connection
   */
  private async getSymbols(): Promise<string[]> {
    try {
      // Get system settings
      const [settings] = await sql`
        SELECT value FROM system_settings WHERE key = 'useMainSymbols'
      `

      const useMainSymbols = settings?.value === "true"

      if (useMainSymbols) {
        // Get main symbols from settings
        const [mainSymbolsSetting] = await sql`
          SELECT value FROM system_settings WHERE key = 'mainSymbols'
        `
        return JSON.parse(mainSymbolsSetting.value)
      } else {
        // Get symbols from exchange
        const [symbolCountSetting] = await sql`
          SELECT value FROM system_settings WHERE key = 'symbolsCount'
        `
        const symbolCount = Number.parseInt(symbolCountSetting?.value || "30")

        // TODO: Implement actual exchange API call to get symbols
        // For now, return default symbols
        return ["BTC", "ETH", "BNB", "XRP", "ADA"]
      }
    } catch (error) {
      console.error("[v0] Failed to get symbols:", error)
      return []
    }
  }

  /**
   * Update engine state
   */
  private async updateEngineState(status: string, errorMessage?: string): Promise<void> {
    try {
      await sql`
        UPDATE trade_engine_state
        SET 
          status = ${status},
          error_message = ${errorMessage || null},
          updated_at = CURRENT_TIMESTAMP
        WHERE connection_id = ${this.connectionId}
      `
    } catch (error) {
      console.error("[v0] Failed to update engine state:", error)
    }
  }

  /**
   * Get engine status
   */
  async getStatus() {
    try {
      const [state] = await sql`
        SELECT * FROM trade_engine_state
        WHERE connection_id = ${this.connectionId}
      `
      return state
    } catch (error) {
      console.error("[v0] Failed to get engine status:", error)
      return null
    }
  }
}
