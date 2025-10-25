"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Filter, RotateCcw } from "lucide-react"

interface StrategyFiltersProps {
  filters: {
    mainStrategyType: string[]
    adjustmentType: string[]
    validationState: string[]
    profitFactorMin: number
    volumeFactorMin: number
    volumeFactorMax: number
    trailingOnly: boolean
    activeOnly: boolean
    minTradesPerDay: number
  }
  onFiltersChange: (filters: any) => void
}

export function StrategyFilters({ filters, onFiltersChange }: StrategyFiltersProps) {
  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const resetFilters = () => {
    onFiltersChange({
      mainStrategyType: [],
      adjustmentType: [],
      validationState: [],
      profitFactorMin: 0.4,
      volumeFactorMin: 1,
      volumeFactorMax: 5,
      trailingOnly: false,
      activeOnly: false,
      minTradesPerDay: 0,
    })
  }

  const mainStrategyTypes = ["Base", "Partial", "Count"]
  const adjustmentTypes = ["Block", "DCA"]
  const validationStates = ["valid", "invalid", "pending"]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Strategy Filters
          </CardTitle>
          <Button variant="outline" size="sm" onClick={resetFilters}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Main Strategy Types</Label>
          <div className="flex flex-wrap gap-2">
            {mainStrategyTypes.map((type) => (
              <Badge
                key={type}
                variant={filters.mainStrategyType.includes(type) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  const newTypes = filters.mainStrategyType.includes(type)
                    ? filters.mainStrategyType.filter((t) => t !== type)
                    : [...filters.mainStrategyType, type]
                  updateFilter("mainStrategyType", newTypes)
                }}
              >
                {type}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Adjustments (Optional)</Label>
          <div className="flex flex-wrap gap-2">
            {adjustmentTypes.map((type) => (
              <Badge
                key={type}
                variant={filters.adjustmentType.includes(type) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  const newTypes = filters.adjustmentType.includes(type)
                    ? filters.adjustmentType.filter((t) => t !== type)
                    : [...filters.adjustmentType, type]
                  updateFilter("adjustmentType", newTypes)
                }}
              >
                {type}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Filter by adjustment extensions applied to main strategies</p>
        </div>

        {/* Validation State Filter */}
        <div className="space-y-2">
          <Label>Validation State</Label>
          <div className="flex gap-2">
            {validationStates.map((state) => (
              <Badge
                key={state}
                variant={filters.validationState.includes(state) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  const newStates = filters.validationState.includes(state)
                    ? filters.validationState.filter((s) => s !== state)
                    : [...filters.validationState, state]
                  updateFilter("validationState", newStates)
                }}
              >
                {state.charAt(0).toUpperCase() + state.slice(1)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Profit Factor Filter */}
        <div className="space-y-3">
          <Label>Minimum Profit Factor: {filters.profitFactorMin}</Label>
          <div className="px-2">
            <Slider
              value={[filters.profitFactorMin]}
              onValueChange={([value]) => updateFilter("profitFactorMin", value)}
              min={0.1}
              max={2.0}
              step={0.1}
              className="w-full"
            />
          </div>
        </div>

        {/* Volume Factor Range */}
        <div className="space-y-3">
          <Label>
            Volume Factor: {filters.volumeFactorMin} - {filters.volumeFactorMax}
          </Label>
          <div className="px-2">
            <Slider
              value={[filters.volumeFactorMin, filters.volumeFactorMax]}
              onValueChange={([min, max]) => {
                updateFilter("volumeFactorMin", min)
                updateFilter("volumeFactorMax", max)
              }}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        {/* Minimum Trades Per Day */}
        <div className="space-y-2">
          <Label htmlFor="min-trades">Min Trades Per 5 Days</Label>
          <Input
            id="min-trades"
            type="number"
            min="0"
            value={filters.minTradesPerDay}
            onChange={(e) => updateFilter("minTradesPerDay", Number.parseInt(e.target.value) || 0)}
          />
        </div>

        {/* Toggle Filters */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Trailing Only</Label>
            <Switch
              checked={filters.trailingOnly}
              onCheckedChange={(checked) => updateFilter("trailingOnly", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Active Only</Label>
            <Switch checked={filters.activeOnly} onCheckedChange={(checked) => updateFilter("activeOnly", checked)} />
          </div>
        </div>

        {/* Quick Filters */}
        <div className="space-y-2">
          <Label>Quick Filters</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateFilter("validationState", ["valid"])
                updateFilter("profitFactorMin", 0.8)
              }}
            >
              High Performance
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateFilter("mainStrategyType", ["Base", "Partial"])
                updateFilter("validationState", ["valid"])
              }}
            >
              Core Strategies
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                updateFilter("adjustmentType", ["Block"])
                updateFilter("validationState", ["valid"])
              }}
            >
              With Block Adjust
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
