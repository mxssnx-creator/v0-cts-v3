"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, Target, TrendingUp, Loader2, AlertCircle, BarChart3, Settings2 } from "lucide-react"
import { PresetTypeManager } from "@/components/presets/preset-type-manager"
import { ConfigurationSetManager } from "@/components/presets/configuration-set-manager"
import { CoordinationResults } from "@/components/presets/coordination-results"
import type { PresetType, PresetConfigurationSet, PresetCoordinationResult } from "@/lib/types-preset-coordination"

export default function PresetsPage() {
  const [activeTab, setActiveTab] = useState("preset-types")
  const [presetTypes, setPresetTypes] = useState<PresetType[]>([])
  const [configSets, setConfigSets] = useState<PresetConfigurationSet[]>([])
  const [results, setResults] = useState<PresetCoordinationResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      await Promise.all([loadPresetTypes(), loadConfigSets(), loadResults()])
    } catch (error) {
      console.error("[v0] Failed to load preset data:", error)
      setError(error instanceof Error ? error.message : "Failed to load data")
    } finally {
      setIsLoading(false)
    }
  }

  const loadPresetTypes = async () => {
    try {
      const response = await fetch("/api/preset-types")
      if (!response.ok) throw new Error("Failed to load preset types")
      const data = await response.json()
      setPresetTypes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("[v0] Failed to load preset types:", error)
      setPresetTypes([])
    }
  }

  const loadConfigSets = async () => {
    try {
      const response = await fetch("/api/preset-config-sets")
      if (!response.ok) throw new Error("Failed to load configuration sets")
      const data = await response.json()
      setConfigSets(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("[v0] Failed to load configuration sets:", error)
      setConfigSets([])
    }
  }

  const loadResults = async () => {
    try {
      const response = await fetch("/api/preset-coordination-results")
      if (!response.ok) throw new Error("Failed to load coordination results")
      const data = await response.json()
      setResults(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("[v0] Failed to load coordination results:", error)
      setResults([])
    }
  }

  const stats = {
    totalTypes: presetTypes.length,
    activeTypes: presetTypes.filter((p) => p.is_active).length,
    autoEvaluating: presetTypes.filter((p) => p.auto_evaluate).length,
    totalSets: configSets.length,
    activeSets: configSets.filter((s) => s.is_active).length,
    validResults: results.filter((r) => r.is_valid).length,
    avgProfitFactor: results.length > 0 ? results.reduce((sum, r) => sum + r.profit_factor, 0) / results.length : 0,
  }

  if (error && !isLoading) {
    return (
      <div className="container mx-auto py-2 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Preset Coordination System</CardTitle>
            <CardDescription>Error loading preset data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-center text-muted-foreground">{error}</p>
              <Button onClick={loadData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-2 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Preset Coordination System</CardTitle>
            <CardDescription>Loading preset data...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-2 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Preset Coordination System</h1>
          <p className="text-muted-foreground">
            Manage preset types, configuration sets, and automated trading coordination
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalTypes}</div>
                <div className="text-sm text-muted-foreground">Preset Types</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{stats.totalSets}</div>
                <div className="text-sm text-muted-foreground">Config Sets</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.validResults}</div>
                <div className="text-sm text-muted-foreground">Valid Results</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{stats.avgProfitFactor.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Avg Profit Factor</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preset-types">Preset Types</TabsTrigger>
          <TabsTrigger value="config-sets">Configuration Sets</TabsTrigger>
          <TabsTrigger value="results">Coordination Results</TabsTrigger>
        </TabsList>

        <TabsContent value="preset-types" className="space-y-4">
          <PresetTypeManager presetTypes={presetTypes} onRefresh={loadPresetTypes} />
        </TabsContent>

        <TabsContent value="config-sets" className="space-y-4">
          <ConfigurationSetManager configSets={configSets} presetTypes={presetTypes} onRefresh={loadConfigSets} />
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <CoordinationResults
            results={results}
            presetTypes={presetTypes}
            configSets={configSets}
            onRefresh={loadResults}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
