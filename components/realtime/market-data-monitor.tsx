"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, TrendingUp, TrendingDown } from "lucide-react"

interface MarketData {
  symbol: string
  price: number
  change24h: number
  volume: number
  lastUpdate: Date
}

export default function MarketDataMonitor({ connectionId }: { connectionId: string }) {
  const [marketData, setMarketData] = useState<MarketData[]>([])
  const [status, setStatus] = useState<"connected" | "disconnected" | "connecting">("disconnected")

  useEffect(() => {
    // TODO: Implement WebSocket connection for real-time updates
    // For now, simulate with polling
    const interval = setInterval(() => {
      // Simulate market data updates
      const symbols = ["BTC", "ETH", "BNB", "XRP", "ADA"]
      const updates = symbols.map((symbol) => ({
        symbol,
        price: 50000 + Math.random() * 10000,
        change24h: (Math.random() - 0.5) * 10,
        volume: Math.random() * 1000000,
        lastUpdate: new Date(),
      }))
      setMarketData(updates)
      setStatus("connected")
    }, 1000)

    return () => clearInterval(interval)
  }, [connectionId])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Real-time Market Data
            </CardTitle>
            <CardDescription>Live price updates from exchange</CardDescription>
          </div>
          <Badge variant={status === "connected" ? "default" : "secondary"}>
            {status === "connected" && <span className="mr-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {marketData.map((data) => (
            <div key={data.symbol} className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="font-semibold">{data.symbol}</div>
                <div className="text-lg font-bold">${data.price.toFixed(2)}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1 ${data.change24h >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {data.change24h >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span className="font-semibold">{Math.abs(data.change24h).toFixed(2)}%</span>
                </div>
                <div className="text-xs text-muted-foreground">Vol: {(data.volume / 1000).toFixed(0)}K</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
