"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PositionCard } from "@/components/live-trading/position-card"
import { TradingOverview } from "@/components/live-trading/trading-overview"
import { TradingEngine } from "@/lib/trading"
import type { TradingPosition, TradingStats, TimeRangeStats } from "@/lib/trading"
import { Activity, RefreshCw, BarChart3, History } from "lucide-react"
import { toast } from "@/lib/simple-toast"

export default function LiveTradingPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedConnection, setSelectedConnection] = useState("bybit-x03")
  const [tradingEngine] = useState(() => new TradingEngine())
  const [openPositions, setOpenPositions] = useState<TradingPosition[]>([])
  const [closedPositions, setClosedPositions] = useState<TradingPosition[]>([])
  const [tradingStats, setTradingStats] = useState<TradingStats>({
    total_positions: 0,
    open_positions: 0,
    closed_positions: 0,
    total_volume: 0,
    total_pnl: 0,
    win_rate: 0,
    avg_hold_time: 0,
    largest_win: 0,
    largest_loss: 0,
    balance: 10000,
    equity: 10000,
    margin: 0,
    free_margin: 10000,
  })
  const [timeRangeStats, setTimeRangeStats] = useState<{
    "4h": TimeRangeStats
    "12h": TimeRangeStats
    "24h": TimeRangeStats
    "48h": TimeRangeStats
  }>({
    "4h": { positions_count: 0, total_pnl: 0, win_rate: 0, avg_profit: 0, balance_change: 0 },
    "12h": { positions_count: 0, total_pnl: 0, win_rate: 0, avg_profit: 0, balance_change: 0 },
    "24h": { positions_count: 0, total_pnl: 0, win_rate: 0, avg_profit: 0, balance_change: 0 },
    "48h": { positions_count: 0, total_pnl: 0, win_rate: 0, avg_profit: 0, balance_change: 0 },
  })

  // State to track if real connections exist
  const [hasRealConnections, setHasRealConnections] = useState(false)
  const [connections, setConnections] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    const loadConnections = async () => {
      try {
        const response = await fetch("/api/settings/connections")
        if (!response.ok) throw new Error("Failed to load connections")

        const data = await response.json()
        const enabledConnections = data.filter((c: any) => c.is_enabled)

        if (enabledConnections.length > 0) {
          setHasRealConnections(true)
          setConnections(
            enabledConnections.map((c: any) => ({
              id: c.id,
              name: `${c.name} (${c.exchange})`,
            })),
          )
          return
        }
      } catch (error) {
        console.error("[v0] Failed to load connections:", error)
      }

      setHasRealConnections(false)
      setConnections([
        { id: "bybit-x03", name: "Bybit X03" },
        { id: "bingx-x01", name: "BingX X01" },
        { id: "pionex-x01", name: "Pionex X01" },
        { id: "orangex-x01", name: "OrangeX X01" },
      ])
    }

    loadConnections()
  }, [])

  useEffect(() => {
    if (!hasRealConnections) {
      tradingEngine.generateMockPositions(selectedConnection, 25)
      refreshData()

      // Simulate real-time price updates
      const interval = setInterval(() => {
        const positions = tradingEngine.getOpenPositions(selectedConnection)
        positions.forEach((position) => {
          const priceChange = (Math.random() - 0.5) * 100
          const newPrice = position.current_price + priceChange
          tradingEngine.updatePositionPrice(position.id, Math.max(newPrice, 100))
        })
        refreshData()
      }, 3000)

      return () => clearInterval(interval)
    } else {
      refreshData()
    }
  }, [selectedConnection, hasRealConnections])

  const refreshData = () => {
    if (!hasRealConnections) {
      const openPos = tradingEngine.getOpenPositions(selectedConnection)
      const closedPos = tradingEngine.getClosedPositions(selectedConnection)
      const stats = tradingEngine.getTradingStats(selectedConnection)

      setOpenPositions(openPos)
      setClosedPositions(closedPos)
      setTradingStats(stats)

      setTimeRangeStats({
        "4h": tradingEngine.getTimeRangeStats(4, selectedConnection),
        "12h": tradingEngine.getTimeRangeStats(12, selectedConnection),
        "24h": tradingEngine.getTimeRangeStats(24, selectedConnection),
        "48h": tradingEngine.getTimeRangeStats(48, selectedConnection),
      })
    } else {
      console.log("[v0] Loading real trading data from API")
      // Fetch from /api/positions, /api/stats, etc.
    }
  }

  const handleClosePosition = async (positionId: string) => {
    const closed = await tradingEngine.closePosition(positionId)
    if (closed) {
      toast.success(`Position ${closed.symbol} closed with P&L: $${closed.profit_loss.toFixed(2)}`)
      refreshData()
    }
  }

  const handleCloseProfitablePositions = async () => {
    const closed = await tradingEngine.closeProfitablePositions(selectedConnection)
    toast.success(`Closed ${closed.length} profitable positions`)
    refreshData()
  }

  const handleCloseAllPositions = async () => {
    const closed = await tradingEngine.closeAllPositions(selectedConnection)
    toast.success(`Closed ${closed.length} positions`)
    refreshData()
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {!hasRealConnections && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-yellow-500" />
            <div>
              <div className="font-semibold text-yellow-900 dark:text-yellow-100">Using Mock Data</div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                No active exchange connections found. Enable a connection in Settings to see real trading data.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Live Trading</h1>
          <p className="text-muted-foreground">Monitor active positions and trading activity</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedConnection} onValueChange={setSelectedConnection}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {connections.map((conn) => (
                <SelectItem key={conn.id} value={conn.id}>
                  {conn.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="positions" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Open Positions ({openPositions.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Position History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <TradingOverview
            stats={tradingStats}
            timeRangeStats={timeRangeStats}
            onCloseProfitablePositions={handleCloseProfitablePositions}
            onCloseAllPositions={handleCloseAllPositions}
          />
        </TabsContent>

        <TabsContent value="positions" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Open Positions ({openPositions.length})</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCloseProfitablePositions}>
                Close Profitable
              </Button>
              <Button variant="destructive" onClick={handleCloseAllPositions}>
                Close All
              </Button>
            </div>
          </div>

          {openPositions.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Open Positions</h3>
              <p className="text-muted-foreground">All positions are currently closed or no trading activity.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {openPositions.map((position) => (
                <PositionCard
                  key={position.id}
                  position={position}
                  onClose={handleClosePosition}
                  showCloseButton={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Position History ({closedPositions.length})</h2>
            <p className="text-sm text-muted-foreground">Last 50 closed positions</p>
          </div>

          {closedPositions.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Trading History</h3>
              <p className="text-muted-foreground">No closed positions found for this connection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {closedPositions.map((position) => (
                <PositionCard key={position.id} position={position} showCloseButton={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
