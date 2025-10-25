/**
 * Preset Configuration Tester
 * Tests configurations against historical data asynchronously
 */

import { sql } from "@/lib/db"
import { TechnicalIndicators } from "./indicators"
import type { PresetConfiguration } from "./preset-config-generator"

export interface TestResult {
  configId: string
  profitFactor: number
  winRate: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  avgProfit: number
  avgLoss: number
  maxDrawdown: number
  drawdownHours: number
  sharpeRatio: number
}

export class PresetTester {
  private connectionId: string
  private testResults: Map<string, TestResult> = new Map()
  private progressCallback?: (progress: number, total: number) => void

  constructor(connectionId: string) {
    this.connectionId = connectionId
  }

  /**
   * Set progress callback
   */
  setProgressCallback(callback: (progress: number, total: number) => void) {
    this.progressCallback = callback
  }

  /**
   * Test all configurations asynchronously
   */
  async testConfigurations(
    configurations: PresetConfiguration[],
    testPeriodHours = 12,
  ): Promise<Map<string, TestResult>> {
    console.log(`[v0] Testing ${configurations.length} configurations...`)

    // Group by symbol for efficient data fetching
    const configsBySymbol = new Map<string, PresetConfiguration[]>()
    for (const config of configurations) {
      if (!configsBySymbol.has(config.symbol)) {
        configsBySymbol.set(config.symbol, [])
      }
      configsBySymbol.get(config.symbol)!.push(config)
    }

    let tested = 0
    const total = configurations.length

    // Test each symbol's configurations in parallel
    const promises: Promise<void>[] = []

    for (const [symbol, configs] of configsBySymbol.entries()) {
      const promise = this.testSymbolConfigurations(symbol, configs, testPeriodHours).then(() => {
        tested += configs.length
        if (this.progressCallback) {
          this.progressCallback(tested, total)
        }
      })
      promises.push(promise)
    }

    await Promise.all(promises)

    console.log(`[v0] Completed testing ${tested} configurations`)
    return this.testResults
  }

  /**
   * Test configurations for a specific symbol
   */
  private async testSymbolConfigurations(
    symbol: string,
    configurations: PresetConfiguration[],
    testPeriodHours: number,
  ): Promise<void> {
    try {
      // Fetch historical market data
      const marketData = await this.fetchMarketData(symbol, testPeriodHours)

      if (marketData.length < 10) {
        console.log(`[v0] Insufficient data for ${symbol}, skipping...`)
        return
      }

      // Test each configuration
      for (const config of configurations) {
        const result = await this.testConfiguration(config, marketData)
        this.testResults.set(config.id, result)
      }
    } catch (error) {
      console.error(`[v0] Failed to test configurations for ${symbol}:`, error)
    }
  }

  /**
   * Fetch historical market data
   */
  private async fetchMarketData(symbol: string, hours: number): Promise<any[]> {
    try {
      const data = await sql`
        SELECT 
          timestamp, open, high, low, close, volume
        FROM market_data
        WHERE symbol = ${symbol}
          AND timestamp >= NOW() - INTERVAL '${hours} hours'
        ORDER BY timestamp ASC
      `

      return data
    } catch (error) {
      console.error(`[v0] Failed to fetch market data for ${symbol}:`, error)
      return []
    }
  }

  /**
   * Test a single configuration
   */
  private async testConfiguration(config: PresetConfiguration, marketData: any[]): Promise<TestResult> {
    const trades: any[] = []
    let balance = 10000
    let equity = balance
    let maxEquity = balance
    let maxDrawdown = 0
    let drawdownStart: Date | null = null
    let totalDrawdownHours = 0

    const prices = marketData.map((d) => Number.parseFloat(d.close))

    // Generate signals using indicator
    for (let i = 20; i < marketData.length; i++) {
      const historicalPrices = prices.slice(0, i + 1)
      const signal = TechnicalIndicators.generateSignal(config.indicator, historicalPrices)

      // Only trade on strong signals
      if (signal.strength < 0.5) continue

      const entryPrice = prices[i]
      const entryTime = new Date(marketData[i].timestamp)

      // Calculate TP and SL
      const tpPrice =
        signal.direction === "long"
          ? entryPrice * (1 + (config.takeprofit_factor * config.position_cost) / 100)
          : entryPrice * (1 - (config.takeprofit_factor * config.position_cost) / 100)

      const slPrice =
        signal.direction === "long"
          ? entryPrice * (1 - (config.stoploss_ratio * config.takeprofit_factor * config.position_cost) / 100)
          : entryPrice * (1 + (config.stoploss_ratio * config.takeprofit_factor * config.position_cost) / 100)

      // Simulate trade execution
      let exitPrice = entryPrice
      let exitTime = entryTime
      let exitReason = "timeout"

      for (let j = i + 1; j < Math.min(i + 50, marketData.length); j++) {
        const currentPrice = prices[j]
        const currentTime = new Date(marketData[j].timestamp)

        // Check TP/SL
        if (signal.direction === "long") {
          if (currentPrice >= tpPrice) {
            exitPrice = tpPrice
            exitTime = currentTime
            exitReason = "takeprofit"
            break
          } else if (currentPrice <= slPrice) {
            exitPrice = slPrice
            exitTime = currentTime
            exitReason = "stoploss"
            break
          }
        } else {
          if (currentPrice <= tpPrice) {
            exitPrice = tpPrice
            exitTime = currentTime
            exitReason = "takeprofit"
            break
          } else if (currentPrice >= slPrice) {
            exitPrice = slPrice
            exitTime = currentTime
            exitReason = "stoploss"
            break
          }
        }
      }

      // Calculate P&L
      const pnl =
        signal.direction === "long"
          ? ((exitPrice - entryPrice) / entryPrice) * balance * 0.1
          : ((entryPrice - exitPrice) / entryPrice) * balance * 0.1

      balance += pnl
      equity = balance

      trades.push({
        entryPrice,
        exitPrice,
        entryTime,
        exitTime,
        direction: signal.direction,
        pnl,
        exitReason,
      })

      // Track drawdown
      if (equity > maxEquity) {
        maxEquity = equity
        if (drawdownStart) {
          const hours = (new Date().getTime() - drawdownStart.getTime()) / (1000 * 60 * 60)
          totalDrawdownHours += hours
          drawdownStart = null
        }
      } else {
        const currentDrawdown = ((maxEquity - equity) / maxEquity) * 100
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown)
        if (!drawdownStart) {
          drawdownStart = new Date()
        }
      }
    }

    // Calculate metrics
    const winningTrades = trades.filter((t) => t.pnl > 0)
    const losingTrades = trades.filter((t) => t.pnl < 0)

    const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0)
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0))

    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 2 : 0
    const winRate = trades.length > 0 ? winningTrades.length / trades.length : 0

    const avgProfit = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0
    const avgLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0

    // Calculate Sharpe ratio
    const returns = trades.map((t) => t.pnl / 10000)
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    const sharpeRatio = variance > 0 ? avgReturn / Math.sqrt(variance) : 0

    return {
      configId: config.id,
      profitFactor,
      winRate,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      avgProfit,
      avgLoss,
      maxDrawdown,
      drawdownHours: totalDrawdownHours,
      sharpeRatio,
    }
  }

  /**
   * Get test results
   */
  getResults(): Map<string, TestResult> {
    return this.testResults
  }

  /**
   * Save results to database
   */
  async saveResults(presetId: string): Promise<void> {
    try {
      for (const [configId, result] of this.testResults.entries()) {
        await sql`
          INSERT INTO preset_test_results (
            preset_id, config_id, profit_factor, win_rate,
            total_trades, winning_trades, losing_trades,
            avg_profit, avg_loss, max_drawdown, drawdown_hours,
            sharpe_ratio, tested_at
          )
          VALUES (
            ${presetId}, ${configId}, ${result.profitFactor}, ${result.winRate},
            ${result.totalTrades}, ${result.winningTrades}, ${result.losingTrades},
            ${result.avgProfit}, ${result.avgLoss}, ${result.maxDrawdown}, ${result.drawdownHours},
            ${result.sharpeRatio}, CURRENT_TIMESTAMP
          )
          ON CONFLICT (preset_id, config_id) 
          DO UPDATE SET
            profit_factor = EXCLUDED.profit_factor,
            win_rate = EXCLUDED.win_rate,
            total_trades = EXCLUDED.total_trades,
            tested_at = CURRENT_TIMESTAMP
        `
      }

      console.log(`[v0] Saved ${this.testResults.size} test results to database`)
    } catch (error) {
      console.error("[v0] Failed to save test results:", error)
    }
  }
}
