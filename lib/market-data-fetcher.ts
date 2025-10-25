// Market data fetcher for real-time price updates
import { query } from "./db"

export interface MarketDataPoint {
  trading_pair_id: number
  symbol: string
  timestamp: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export class MarketDataFetcher {
  private isRunning = false
  private fetchInterval?: NodeJS.Timeout
  private updateInterval: number

  constructor(updateInterval = 60000) {
    // Default 1 minute
    this.updateInterval = updateInterval
  }

  async start() {
    if (this.isRunning) return

    console.log("[v0] Starting market data fetcher...")
    this.isRunning = true

    // Fetch immediately
    await this.fetchMarketData()

    // Then fetch at intervals
    this.fetchInterval = setInterval(() => {
      this.fetchMarketData()
    }, this.updateInterval)
  }

  stop() {
    if (this.fetchInterval) {
      clearInterval(this.fetchInterval)
      this.fetchInterval = undefined
    }
    this.isRunning = false
    console.log("[v0] Market data fetcher stopped")
  }

  private async fetchMarketData() {
    try {
      // Get all active trading pairs
      const tradingPairs = await query("SELECT id, symbol FROM trading_pairs WHERE is_active = $1", [true])

      for (const pair of tradingPairs) {
        // Simulate fetching market data (in production, call exchange API)
        const marketData = this.generateMarketData(pair.id, pair.symbol)

        // Store in database
        await this.storeMarketData(marketData)
      }

      console.log(`[v0] Fetched market data for ${tradingPairs.length} trading pairs`)
    } catch (error) {
      console.error("[v0] Error fetching market data:", error)
    }
  }

  private generateMarketData(tradingPairId: number, symbol: string): MarketDataPoint {
    const basePrice = 50000
    const volatility = 1000

    const open = basePrice + (Math.random() - 0.5) * volatility
    const close = open + (Math.random() - 0.5) * volatility * 0.5
    const high = Math.max(open, close) + Math.random() * volatility * 0.2
    const low = Math.min(open, close) - Math.random() * volatility * 0.2
    const volume = 1000000 + Math.random() * 500000

    return {
      trading_pair_id: tradingPairId,
      symbol,
      timestamp: new Date(),
      open,
      high,
      low,
      close,
      volume,
    }
  }

  private async storeMarketData(data: MarketDataPoint) {
    try {
      await query(
        `INSERT INTO market_data 
         (trading_pair_id, timestamp, open, high, low, close, volume, interval)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (trading_pair_id, timestamp, interval) DO UPDATE
         SET open = $3, high = $4, low = $5, close = $6, volume = $7`,
        [data.trading_pair_id, data.timestamp, data.open, data.high, data.low, data.close, data.volume, "1m"],
      )
    } catch (error) {
      console.error("[v0] Error storing market data:", error)
    }
  }
}

// Global market data fetcher instance
let marketDataFetcher: MarketDataFetcher | null = null

export function getMarketDataFetcher(): MarketDataFetcher {
  if (!marketDataFetcher) {
    marketDataFetcher = new MarketDataFetcher()
  }
  return marketDataFetcher
}

export function startMarketDataFetcher(interval?: number) {
  const fetcher = getMarketDataFetcher()
  fetcher.start()
  return fetcher
}
