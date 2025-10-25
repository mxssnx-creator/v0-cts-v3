"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"

export function RealTimeTicker() {
  const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"]

  // Mock price data for now
  const mockPrices = new Map([
    ["BTCUSDT", { price: 43250.5, change_24h: 2.45 }],
    ["ETHUSDT", { price: 2280.75, change_24h: -1.23 }],
    ["BNBUSDT", { price: 315.2, change_24h: 0.85 }],
    ["SOLUSDT", { price: 98.45, change_24h: 3.12 }],
  ])

  return (
    <Card>
      <CardContent className="py-2 px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Live Market Prices</h3>
          <Badge variant="default" className="text-xs">
            Live
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {symbols.map((symbol) => {
            const priceData = mockPrices.get(symbol)
            if (!priceData) {
              return (
                <div key={symbol} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{symbol}</p>
                  <p className="text-sm font-mono">Loading...</p>
                </div>
              )
            }

            const isPositive = priceData.change_24h >= 0

            return (
              <div key={symbol} className="space-y-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">{symbol}</p>
                <p className="text-lg font-mono font-semibold truncate">${priceData.price.toFixed(2)}</p>
                <div className="flex items-center gap-1">
                  {isPositive ? (
                    <span className="text-green-600 shrink-0">
                      <TrendingUp className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="text-red-600 shrink-0">
                      <TrendingDown className="h-3 w-3" />
                    </span>
                  )}
                  <span className={`text-xs font-medium ${isPositive ? "text-green-600" : "text-red-600"} truncate`}>
                    {isPositive ? "+" : ""}
                    {priceData.change_24h.toFixed(2)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
