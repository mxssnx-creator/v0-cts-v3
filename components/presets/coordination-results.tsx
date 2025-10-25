"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, TrendingUp, TrendingDown, BarChart3 } from "lucide-react"
import type { PresetCoordinationResult, PresetType, PresetConfigurationSet } from "@/lib/types-preset-coordination"

interface CoordinationResultsProps {
  results: PresetCoordinationResult[]
  presetTypes: PresetType[]
  configSets: PresetConfigurationSet[]
  onRefresh: () => void
}

export function CoordinationResults({ results, presetTypes, configSets, onRefresh }: CoordinationResultsProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<string | null>(null)

  const filteredResults = results.filter((result) => {
    if (selectedSymbol && result.symbol !== selectedSymbol) return false
    if (selectedType && result.preset_type_id !== selectedType) return false
    return true
  })

  const symbols = Array.from(new Set(results.map((r) => r.symbol)))

  const getPresetTypeName = (id: string) => {
    const type = presetTypes.find((t) => t.id === id)
    return type?.name || "Unknown"
  }

  const getConfigSetName = (id: string) => {
    const set = configSets.find((s) => s.id === id)
    return set?.name || "Unknown"
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Coordination Results</h2>
          <p className="text-sm text-muted-foreground">
            View backtest and evaluation results for preset configurations
          </p>
        </div>
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={selectedType === null ? "default" : "outline"} size="sm" onClick={() => setSelectedType(null)}>
          All Types
        </Button>
        {presetTypes.map((type) => (
          <Button
            key={type.id}
            variant={selectedType === type.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType(type.id)}
          >
            {type.name}
          </Button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedSymbol === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedSymbol(null)}
        >
          All Symbols
        </Button>
        {symbols.slice(0, 10).map((symbol) => (
          <Button
            key={symbol}
            variant={selectedSymbol === symbol ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSymbol(symbol)}
          >
            {symbol}
          </Button>
        ))}
      </div>

      {filteredResults.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No results yet</h3>
            <p className="text-muted-foreground mb-4">Run backtests or evaluations to see coordination results here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredResults.map((result) => (
            <Card key={result.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {result.symbol}
                      {result.is_valid ? (
                        <Badge variant="default">Valid</Badge>
                      ) : (
                        <Badge variant="destructive">Invalid</Badge>
                      )}
                      <Badge variant="outline">{result.indication_type}</Badge>
                    </CardTitle>
                    <CardDescription>
                      {getPresetTypeName(result.preset_type_id)} • {getConfigSetName(result.configuration_set_id)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.profit_factor >= 1 ? (
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    )}
                    <span className="text-lg font-bold">{result.profit_factor.toFixed(2)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Win Rate</div>
                    <div className="font-medium">{(result.win_rate * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Trades</div>
                    <div className="font-medium">{result.total_trades}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">TP Factor</div>
                    <div className="font-medium">{result.takeprofit_factor}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">SL Ratio</div>
                    <div className="font-medium">{result.stoploss_ratio}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Drawdown</div>
                    <div className="font-medium">{result.drawdown_time_hours.toFixed(1)}h</div>
                  </div>
                </div>
                {result.validation_reason && (
                  <div className="mt-4 p-2 bg-muted rounded text-sm">
                    <span className="text-muted-foreground">Reason: </span>
                    {result.validation_reason}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
