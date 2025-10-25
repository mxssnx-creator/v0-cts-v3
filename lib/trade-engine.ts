import { type ExchangeConfig, createExchangeAPI } from "./exchanges"
import type { StrategyResult } from "./strategies"
import type { IndicationResult } from "./indications"
import { SystemLogger } from "./system-logger"

export interface TradeEngine {
  start(): Promise<void>
  stop(): Promise<void>
  isRunning(): boolean
  getStatus(): EngineStatus
  addConnection(config: ExchangeConfig): Promise<void>
  removeConnection(connectionId: string): Promise<void>
  getConnectionStatus(connectionId: string): ConnectionStatus | null
}

export interface EngineStatus {
  running: boolean
  connectedExchanges: number
  activePositions: number
  totalProfit: number
  uptime: number
  lastUpdate: Date
  connections: Map<string, ConnectionStatus>
}

export interface ConnectionStatus {
  id: string
  name: string
  status: "connected" | "disconnected" | "error"
  activePositions: number
  profit: number
  lastUpdate: Date
}

export class ContinuousTradeEngine implements TradeEngine {
  private running = false
  private exchanges: Map<string, any> = new Map()
  private connectionConfigs: Map<string, ExchangeConfig> = new Map()
  private strategies: StrategyResult[] = []
  private indications: IndicationResult[] = []
  private positions: Map<string, any[]> = new Map() // Per-connection positions
  private startTime?: Date
  private monitoringInterval?: NodeJS.Timeout
  private statsCache: { data: any; timestamp: number } | null = null
  private readonly STATS_CACHE_TTL = 2000 // 2 seconds cache

  constructor(strategies: StrategyResult[], indications: IndicationResult[]) {
    this.strategies = strategies
    this.indications = indications
  }

  async addConnection(config: ExchangeConfig): Promise<void> {
    await SystemLogger.logConnection(`Adding connection: ${config.name}`, config.id, "info", {
      exchangeType: config.exchange,
    })

    this.connectionConfigs.set(config.id, config)

    if (this.running && config.status === "connected") {
      try {
        const api = createExchangeAPI(config)
        await api.connect()
        this.exchanges.set(config.id, api)
        this.positions.set(config.id, [])

        await SystemLogger.logConnection(`Successfully connected to ${config.name}`, config.id, "info")
      } catch (error) {
        await SystemLogger.logError(error, "trade-engine", `Failed to connect to ${config.name}`, {
          connectionId: config.id,
        })
        throw error
      }
    }
  }

  async removeConnection(connectionId: string): Promise<void> {
    await SystemLogger.logConnection(`Removing connection`, connectionId, "info")

    const api = this.exchanges.get(connectionId)
    if (api) {
      try {
        await api.disconnect()
        await SystemLogger.logConnection(`Disconnected successfully`, connectionId, "info")
      } catch (error) {
        await SystemLogger.logError(error, "trade-engine", `Error disconnecting`, { connectionId })
      }
    }

    this.exchanges.delete(connectionId)
    this.connectionConfigs.delete(connectionId)
    this.positions.delete(connectionId)

    this.statsCache = null
  }

  getConnectionStatus(connectionId: string): ConnectionStatus | null {
    const config = this.connectionConfigs.get(connectionId)
    const api = this.exchanges.get(connectionId)
    const positions = this.positions.get(connectionId) || []

    if (!config) return null

    const profit = positions.reduce((sum, pos) => sum + (pos.unrealizedPnl || 0), 0)

    return {
      id: config.id,
      name: config.name,
      status: api ? "connected" : "disconnected",
      activePositions: positions.length,
      profit,
      lastUpdate: new Date(),
    }
  }

  async start(): Promise<void> {
    if (this.running) {
      await SystemLogger.logTradeEngine("Trade Engine already running", "warn")
      return
    }

    await SystemLogger.logTradeEngine("Starting CTS v3 Trade Engine", "info")
    this.running = true
    this.startTime = new Date()

    const connectionPromises = Array.from(this.connectionConfigs.values())
      .filter((config) => config.status === "connected")
      .map(async (config) => {
        try {
          const api = createExchangeAPI(config)
          await api.connect()
          this.exchanges.set(config.id, api)
          this.positions.set(config.id, [])

          await SystemLogger.logConnection(`Connected successfully`, config.id, "info", { exchangeName: config.name })
          return { success: true, id: config.id }
        } catch (error) {
          await SystemLogger.logError(error, "trade-engine", `Failed to connect`, {
            connectionId: config.id,
            exchangeName: config.name,
          })
          return { success: false, id: config.id, error }
        }
      })

    const results = await Promise.allSettled(connectionPromises)
    const successCount = results.filter((r) => r.status === "fulfilled" && r.value.success).length

    await SystemLogger.logTradeEngine(`Connected to ${successCount}/${connectionPromises.length} exchanges`, "info")

    // Start continuous monitoring
    this.startContinuousMonitoring()
    await SystemLogger.logTradeEngine("Trade Engine started successfully", "info")
  }

  async stop(): Promise<void> {
    if (!this.running) {
      await SystemLogger.logTradeEngine("Trade Engine not running", "warn")
      return
    }

    await SystemLogger.logTradeEngine("Stopping Trade Engine", "info")
    this.running = false

    // Clear monitoring interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }

    const disconnectPromises = Array.from(this.exchanges.entries()).map(async ([exchangeId, api]) => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Disconnect timeout")), 5000),
        )
        await Promise.race([api.disconnect(), timeoutPromise])
        await SystemLogger.logConnection(`Disconnected`, exchangeId, "info")
      } catch (error) {
        await SystemLogger.logError(error, "trade-engine", `Error disconnecting`, { connectionId: exchangeId })
      }
    })

    await Promise.allSettled(disconnectPromises)

    this.exchanges.clear()
    this.statsCache = null
    await SystemLogger.logTradeEngine("Trade Engine stopped", "info")
  }

  isRunning(): boolean {
    return this.running
  }

  getStatus(): EngineStatus {
    const now = Date.now()
    if (this.statsCache && now - this.statsCache.timestamp < this.STATS_CACHE_TTL) {
      return this.statsCache.data
    }

    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0

    let totalProfit = 0
    let totalPositions = 0

    for (const positions of this.positions.values()) {
      totalProfit += positions.reduce((sum, pos) => sum + (pos.unrealizedPnl || 0), 0)
      totalPositions += positions.length
    }

    const connections = new Map<string, ConnectionStatus>()
    for (const connectionId of this.connectionConfigs.keys()) {
      const status = this.getConnectionStatus(connectionId)
      if (status) {
        connections.set(connectionId, status)
      }
    }

    const status = {
      running: this.running,
      connectedExchanges: this.exchanges.size,
      activePositions: totalPositions,
      totalProfit,
      uptime,
      lastUpdate: new Date(),
      connections,
    }

    this.statsCache = { data: status, timestamp: now }

    return status
  }

  private startContinuousMonitoring(): void {
    let isProcessing = false

    this.monitoringInterval = setInterval(async () => {
      if (!this.running) return

      if (isProcessing) {
        await SystemLogger.logTradeEngine("Previous monitoring cycle still running, skipping", "warn")
        return
      }

      isProcessing = true
      const startTime = Date.now()

      try {
        await Promise.allSettled([
          this.processIndications(),
          this.executeStrategies(),
          this.managePositions(),
          this.updateStatistics(),
        ])

        const duration = Date.now() - startTime
        await SystemLogger.logTradeEngine(`Monitoring cycle completed in ${duration}ms`, "debug")
      } catch (error) {
        await SystemLogger.logError(error, "trade-engine", "Monitoring error")
      } finally {
        isProcessing = false
      }
    }, 5000)
  }

  private async processIndications(): Promise<void> {
    const indicationPromises = this.indications.map(async (indication) => {
      try {
        const pseudoPositions = await this.generatePseudoPositions(indication)
        ;(indication as any).positions = pseudoPositions
        ;(indication as any).profitFactor = this.calculateProfitFactor(pseudoPositions)
      } catch (error) {
        console.error(`[v0] Error processing indication ${indication.id}:`, error)
      }
    })

    await Promise.allSettled(indicationPromises)
  }

  private async executeStrategies(): Promise<void> {
    const activeConnections = Array.from(this.exchanges.keys())

    const strategyPromises = this.strategies.flatMap((strategy) =>
      activeConnections.map(async (connectionId) => {
        try {
          const shouldExecute = await this.evaluateStrategy(strategy, connectionId)
          if (shouldExecute) {
            await this.executeStrategy(strategy, connectionId)
          }
        } catch (error) {
          console.error(`[v0] Error executing strategy ${strategy.id} on ${connectionId}:`, error)
        }
      }),
    )

    await Promise.allSettled(strategyPromises)
  }

  private async managePositions(): Promise<void> {
    const connectionPromises = Array.from(this.positions.entries()).map(async ([connectionId, positions]) => {
      if (positions.length === 0) return

      const positionPromises = positions.map(async (position) => {
        try {
          await Promise.all([
            this.checkPositionConditions(position, connectionId),
            this.updatePositionData(position, connectionId),
          ])
        } catch (error) {
          console.error(`[v0] Error managing position ${position.id}:`, error)
        }
      })

      await Promise.allSettled(positionPromises)

      const profitableCount = positions.filter((p) => p.unrealizedPnl > 0).length
      const profitPercentage = (profitableCount / positions.length) * 100

      if (profitPercentage >= 20) {
        await this.rearrangePositions(connectionId)
      }
    })

    await Promise.allSettled(connectionPromises)
  }

  private async updateStatistics(): Promise<void> {
    const stats = {
      timestamp: new Date(),
      connections: Array.from(this.positions.entries()).map(([connectionId, positions]) => {
        const profitableCount = positions.filter((p) => p.unrealizedPnl > 0).length
        const totalProfit = positions.reduce((sum, p) => sum + (p.unrealizedPnl || 0), 0)

        return {
          connectionId,
          totalPositions: positions.length,
          profitablePositions: profitableCount,
          totalProfit,
        }
      }),
      connectedExchanges: this.exchanges.size,
    }

    this.statsCache = null
  }

  private async generatePseudoPositions(indication: IndicationResult): Promise<any[]> {
    const positions = []
    const indicationAny = indication as any
    const maxPositions = Math.min(indicationAny.maxPositions || 50, 250)

    for (let i = 0; i < maxPositions; i++) {
      positions.push({
        id: `pseudo-${indication.id}-${i}`,
        symbol: indication.symbol || "BTC/USDT",
        side: indication.type === "direction" ? indicationAny.direction || "long" : "long",
        size: indicationAny.positionSize || 100,
        entryPrice: 50000 + (Math.random() - 0.5) * 1000,
        unrealizedPnl: (Math.random() - 0.5) * 200,
        timestamp: new Date(),
      })
    }

    return positions
  }

  private calculateProfitFactor(positions: any[]): number {
    if (positions.length === 0) return 0

    const { totalProfit, totalLoss } = positions.reduce(
      (acc, p) => {
        if (p.unrealizedPnl > 0) {
          acc.totalProfit += p.unrealizedPnl
        } else {
          acc.totalLoss += Math.abs(p.unrealizedPnl)
        }
        return acc
      },
      { totalProfit: 0, totalLoss: 0 },
    )

    return totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0
  }

  private async evaluateStrategy(strategy: StrategyResult, connectionId: string): Promise<boolean> {
    // This is a placeholder - implement actual strategy evaluation logic
    return Math.random() > 0.8
  }

  private async executeStrategy(strategy: StrategyResult, connectionId: string): Promise<void> {
    console.log(`[v0] Executing strategy: ${strategy.name} on connection: ${connectionId}`)
  }

  private async checkPositionConditions(position: any, connectionId: string): Promise<void> {
    // Implement actual position condition checking logic
  }

  private async updatePositionData(position: any, connectionId: string): Promise<void> {
    position.unrealizedPnl = (Math.random() - 0.5) * 200
  }

  private async rearrangePositions(connectionId: string): Promise<void> {
    console.log(`[v0] Rearranging positions for connection ${connectionId} due to 20% profit threshold`)
  }
}

let globalTradeEngine: ContinuousTradeEngine | null = null

export function getTradeEngine(): ContinuousTradeEngine | null {
  return globalTradeEngine
}

export function initializeTradeEngine(
  strategies: StrategyResult[],
  indications: IndicationResult[],
): ContinuousTradeEngine {
  if (!globalTradeEngine) {
    globalTradeEngine = new ContinuousTradeEngine(strategies, indications)
  }
  return globalTradeEngine
}
