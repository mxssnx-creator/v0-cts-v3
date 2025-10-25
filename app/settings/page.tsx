"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ExchangeConnectionManager from "@/components/settings/exchange-connection-manager"
import InstallManager from "@/components/settings/install-manager"
import { toast } from "sonner"
import { Save, Download, Upload, Plus, X } from "lucide-react"
import type { ExchangeConnection } from "@/lib/types"
import { PresetConnectionManager } from "@/components/settings/preset-connection-manager"
import { LogsViewer } from "@/components/settings/logs-viewer"
import { Badge } from "@/components/ui/badge"

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentTab, setCurrentTab] = useState("overall")
  const [activeTab, setActiveTab] = useState("overall") // Added state for active tab

  const [connections, setConnections] = useState<ExchangeConnection[]>([])
  const [selectedExchange, setSelectedExchange] = useState<string>("")

  const [newMainSymbol, setNewMainSymbol] = useState("")
  const [newForcedSymbol, setNewForcedSymbol] = useState("")

  const [databaseStatus, setDatabaseStatus] = useState<{
    type: string
    isConfigured: boolean
    isConnected: boolean
    url?: string
    tableCount?: number
    envVars?: Record<string, boolean>
  } | null>(null)

  // Helper to update settings and persist to backend
  const handleSettingChange = async (key: string, value: any) => {
    const previousValue = settings[key]
    setSettings((prev) => ({ ...prev, [key]: value }))

    // Debounce or throttle this for better performance if needed
    try {
      console.log(`[v0] Updating setting: ${key} = ${value}`)
      const response = await fetch("/api/settings/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to update ${key}`)
      }

      console.log(`[v0] Updated setting: ${key} = ${value}`)
      // Optionally show a success toast here if the change is critical
      // toast.success(`${key} updated successfully`);
    } catch (error) {
      console.error(`[v0] Failed to update setting ${key}:`, error)
      toast.error(error instanceof Error ? error.message : `Failed to update ${key}`)
      // Revert to previous value on error
      setSettings((prev) => ({ ...prev, [key]: previousValue }))
    }
  }

  // Simplified updateSetting for use within components that don't need immediate fetch
  const updateSetting = async (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    // The actual API call is handled by handleSettingChange, which is called by inputs/selects
    // This function is kept for potential future use cases where direct update is needed without immediate fetch
  }

  useEffect(() => {
    loadSettings()
    loadConnections()
    loadExchanges()
    loadPresets()
    loadDatabaseStatus()
    // Initialize predefined connections on mount if they don't exist
    // initializePredefinedConnections() // Consider running this less frequently or on demand
  }, [])

  const initializePredefinedConnections = async () => {
    try {
      console.log("[v0] Checking for predefined connections...")
      const response = await fetch("/api/settings/connections/init-predefined", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Predefined connections check:", data.message)
        // Reload connections if new ones were created
        if (data.connections) {
          await loadConnections()
        }
      }
    } catch (error) {
      console.error("[v0] Failed to initialize predefined connections:", error)
      // Don't show error toast - this is a background operation
    }
  }

  const loadConnections = async () => {
    try {
      const response = await fetch("/api/settings/connections")
      if (response.ok) {
        const data = await response.json()
        setConnections(data)

        // Sync with localStorage (dashboard selection)
        const dashboardSelection = localStorage.getItem("selectedExchange")
        if (dashboardSelection) {
          setSelectedExchange(dashboardSelection)
        } else if (data.length > 0) {
          setSelectedExchange(data[0].id)
        }
      }
    } catch (error) {
      console.error("[v0] Failed to load connections:", error)
    }
  }

  const handleExchangeChange = (value: string) => {
    setSelectedExchange(value)
    // Sync with localStorage for dashboard
    localStorage.setItem("selectedExchange", value)
  }

  const loadSettings = async () => {
    try {
      console.log("[v0] Loading settings...")
      const response = await fetch("/api/settings/system")

      if (!response.ok) {
        const text = await response.text()
        console.error("[v0] Failed to load settings, status:", response.status, "body:", text)
        setSettings({})
        return
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("[v0] Invalid response type:", contentType, "body:", text)
        setSettings({})
        return
      }

      const data = await response.json()
      console.log("[v0] Loaded settings:", Object.keys(data).length, "keys")
      setSettings(data)
    } catch (error) {
      console.error("[v0] Failed to load settings:", error)
      setSettings({})
    } finally {
      setLoading(false)
    }
  }

  // Placeholder functions for other settings tabs
  const loadExchanges = async () => {
    /* ... */
  }
  const loadPresets = async () => {
    /* ... */
  }

  const loadDatabaseStatus = async () => {
    try {
      const response = await fetch("/api/settings/database-status")
      if (response.ok) {
        const status = await response.json()
        setDatabaseStatus(status)
      } else {
        console.error("[v0] Failed to load database status:", response.statusText)
        setDatabaseStatus(null) // Ensure it's null if fetch fails
      }
    } catch (error) {
      console.error("[v0] Failed to load database status:", error)
      setDatabaseStatus(null)
    }
  }

  const saveAllSettings = async () => {
    setSaving(true)
    try {
      console.log("[v0] Saving all settings:", Object.keys(settings).length, "keys")

      const response = await fetch("/api/settings/system", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save")
      }

      toast.success("Settings saved successfully")
      console.log("[v0] Saved all settings")
    } catch (error) {
      console.error("[v0] Failed to save settings:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `cts-settings-${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Settings exported successfully")
  }

  const importSettings = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const imported = JSON.parse(text)
        setSettings(imported)
        toast.success("Settings imported successfully")
      } catch (error) {
        toast.error("Failed to import settings")
        console.error(error)
      }
    }
    input.click()
  }

  const addMainSymbol = () => {
    if (!newMainSymbol.trim()) return
    const currentSymbols = Array.isArray(settings.mainSymbols) ? settings.mainSymbols : []
    let symbol = newMainSymbol.trim().toUpperCase()
    // Remove common quote currencies
    symbol = symbol.replace(/(USDT|BUSD|USD|BTC|ETH|BNB)$/, "")
    if (!currentSymbols.includes(symbol) && symbol.length > 0) {
      updateSetting("mainSymbols", [...currentSymbols, symbol])
      setNewMainSymbol("")
    }
  }

  const removeMainSymbol = (symbol: string) => {
    const currentSymbols = Array.isArray(settings.mainSymbols) ? settings.mainSymbols : []
    updateSetting(
      "mainSymbols",
      currentSymbols.filter((s) => s !== symbol),
    )
  }

  const addForcedSymbol = () => {
    if (!newForcedSymbol.trim()) return
    const currentSymbols = Array.isArray(settings.forcedSymbols) ? settings.forcedSymbols : []
    let symbol = newForcedSymbol.trim().toUpperCase()
    // Remove common quote currencies
    symbol = symbol.replace(/(USDT|BUSD|USD|BTC|ETH|BNB)$/, "")
    if (!currentSymbols.includes(symbol) && symbol.length > 0) {
      updateSetting("forcedSymbols", [...currentSymbols, symbol])
      setNewForcedSymbol("")
    }
  }

  const removeForcedSymbol = (symbol: string) => {
    const currentSymbols = Array.isArray(settings.forcedSymbols) ? settings.forcedSymbols : []
    updateSetting(
      "forcedSymbols",
      currentSymbols.filter((s) => s !== symbol),
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <div className="text-lg font-medium">Loading settings...</div>
          <div className="text-sm text-muted-foreground">Please wait</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your CTS v3 trading system</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={importSettings} variant="outline" size="lg">
            <Upload className="w-4 h-4 mr-2" />
            Import Settings
          </Button>
          <Button onClick={exportSettings} variant="outline" size="lg">
            <Download className="w-4 h-4 mr-2" />
            Export Settings
          </Button>
          <Button onClick={saveAllSettings} disabled={saving} size="lg">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overall">Overall</TabsTrigger>
          <TabsTrigger value="exchange">Exchange</TabsTrigger>
          <TabsTrigger value="indication">Indication</TabsTrigger>
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        {/* Overall Tab */}
        <TabsContent value="overall" className="space-y-6">
          <Tabs defaultValue="main" className="space-y-4" onValueChange={(v) => console.log(v)}>
            <TabsList>
              <TabsTrigger value="main">Main</TabsTrigger>
              <TabsTrigger value="connection">Connection</TabsTrigger>
              <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
              <TabsTrigger value="install">Install</TabsTrigger>
            </TabsList>

            {/* Main Section */}
            <TabsContent value="main" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Trade Mode Configuration</CardTitle>
                  <CardDescription>Configure trading mode and market data parameters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Trade Mode</Label>
                    <Select
                      value={settings.tradeMode || "both"}
                      onValueChange={(value) => handleSettingChange("tradeMode", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">Main Trading Only</SelectItem>
                        <SelectItem value="preset">Preset Trading Only</SelectItem>
                        <SelectItem value="both">Both (Main + Preset)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select trading mode (default: both). Determines which trading engines are active.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Market Data Timeframe</Label>
                    <Select
                      value={String(settings.marketTimeframe || 1)}
                      onValueChange={(value) => handleSettingChange("marketTimeframe", Number.parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Second</SelectItem>
                        <SelectItem value="2">2 Seconds</SelectItem>
                        <SelectItem value="5">5 Seconds</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Market data update interval for real-time price feeds
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Days of Prehistoric Data</Label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={settings.prehistoricDataDays || 5}
                      onChange={(e) => handleSettingChange("prehistoricDataDays", Number.parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of days of historical data to load on startup (default: 5)
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Overall Configuration</CardTitle>
                  <CardDescription>General trading parameters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Position Cost (0.01-0.2)</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        min={0.01}
                        max={0.2}
                        step={0.01}
                        value={[settings.positionCost || 0.1]}
                        onValueChange={([value]) => handleSettingChange("positionCost", value)}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-16 text-right">
                        {(settings.positionCost || 0.1).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Position cost factor for calculations</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Leverage Configuration</CardTitle>
                  <CardDescription>Configure leverage settings for trading</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Use Maximal Leverage</Label>
                      <p className="text-xs text-muted-foreground mt-1">Use maximum leverage available from exchange</p>
                    </div>
                    <Switch
                      checked={settings.useMaximalLeverage !== false}
                      onCheckedChange={(checked) => handleSettingChange("useMaximalLeverage", checked)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Leverage Percentage (1-100, step 5)</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        min={1}
                        max={100}
                        step={5}
                        value={[settings.leveragePercentage || 100]}
                        onValueChange={([value]) => handleSettingChange("leveragePercentage", value)}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-16 text-right">{settings.leveragePercentage || 100}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Percentage of maximum leverage to use (rounded up to full leverage number internally)
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Replaced old Symbols configuration with new Symbol management */}
              <Card>
                <CardHeader>
                  <CardTitle>Symbols Configuration</CardTitle>
                  <CardDescription>
                    Configure trading symbols using base names only (e.g., BTC, ETH). Quote currency is automatically
                    added based on exchange API type.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Main Symbols */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Main Symbols</Label>
                    <p className="text-xs text-muted-foreground">
                      Primary trading symbols used when "Use Main Symbols" is enabled. Enter base symbol only (BTC, not
                      BTCUSDT).
                    </p>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter base symbol (e.g., BTC, ETH)"
                        value={newMainSymbol}
                        onChange={(e) => setNewMainSymbol(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addMainSymbol()
                          }
                        }}
                      />
                      <Button onClick={addMainSymbol} size="icon">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-muted/30">
                      {Array.isArray(settings.mainSymbols) && settings.mainSymbols.length > 0 ? (
                        settings.mainSymbols.map((symbol: string) => (
                          <div
                            key={symbol}
                            className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-md border border-primary/20"
                          >
                            <span className="text-sm font-medium">{symbol}</span>
                            <button
                              onClick={() => removeMainSymbol(symbol)}
                              className="ml-1 hover:text-destructive transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No main symbols added yet</span>
                      )}
                    </div>
                  </div>

                  {/* Forced Symbols */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Forced Symbols</Label>
                    <p className="text-xs text-muted-foreground">
                      Symbols that are always included regardless of other settings. Enter base symbol only.
                    </p>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter base symbol (e.g., XRP, BCH)"
                        value={newForcedSymbol}
                        onChange={(e) => setNewForcedSymbol(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addForcedSymbol()
                          }
                        }}
                      />
                      <Button onClick={addForcedSymbol} size="icon">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-muted/30">
                      {Array.isArray(settings.forcedSymbols) && settings.forcedSymbols.length > 0 ? (
                        settings.forcedSymbols.map((symbol: string) => (
                          <div
                            key={symbol}
                            className="flex items-center gap-1 px-3 py-1 bg-destructive/10 text-destructive rounded-md border border-destructive/20"
                          >
                            <span className="text-sm font-medium">{symbol}</span>
                            <button
                              onClick={() => removeForcedSymbol(symbol)}
                              className="ml-1 hover:text-destructive transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No forced symbols added yet</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Number of Symbols from Exchange</Label>
                    <Input
                      type="number"
                      min="1"
                      max="100"
                      value={settings.symbolsCount || 30}
                      onChange={(e) => handleSettingChange("symbolsCount", Number.parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Number of symbols to retrieve from exchange</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Connection Section */}
            <TabsContent value="connection" className="space-y-6">
              <ExchangeConnectionManager />
              <PresetConnectionManager />
              <Card>
                <CardHeader>
                  <CardTitle>Connection Settings</CardTitle>
                  <CardDescription>Configure connection behavior and volume factors</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Minimum Connect Interval (ms)</Label>
                    <Input
                      type="number"
                      value={settings.minimumConnectInterval || 200}
                      onChange={(e) => handleSettingChange("minimumConnectInterval", Number.parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum time between connection attempts (default: 200ms)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Symbols Per Exchange</Label>
                    <Input
                      type="number"
                      value={settings.symbolsExchangeCount || 50}
                      onChange={(e) => handleSettingChange("symbolsExchangeCount", Number.parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Number of symbols to track per exchange</p>
                  </div>

                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm font-medium mb-2">Volume Factor Configuration</p>
                    <p className="text-xs text-muted-foreground">
                      Volume factors are now configured per connection in the connection cards above. Each connection
                      can have its own volume factor setting (0.1-10.0) to control position sizing independently.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Connection Defaults</CardTitle>
                  <CardDescription>Default settings for new exchange connections</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Default Margin Type</Label>
                      <Select
                        value={settings.defaultMarginType || "cross"}
                        onValueChange={(value) => handleSettingChange("defaultMarginType", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cross">Cross Margin</SelectItem>
                          <SelectItem value="isolated">Isolated Margin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Default Position Mode</Label>
                      <Select
                        value={settings.defaultPositionMode || "hedge"}
                        onValueChange={(value) => handleSettingChange("defaultPositionMode", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hedge">Hedge Mode (Bidirectional)</SelectItem>
                          <SelectItem value="oneway">One-Way Mode</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Rate Limit Delay (ms)</Label>
                      <Input
                        type="number"
                        min="10"
                        max="500"
                        value={settings.rateLimitDelay || 50}
                        onChange={(e) => handleSettingChange("rateLimitDelay", Number.parseInt(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Delay between API requests to avoid rate limits</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Max Concurrent Connections</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={settings.maxConcurrentConnections || 3}
                        onChange={(e) =>
                          handleSettingChange("maxConcurrentConnections", Number.parseInt(e.target.value))
                        }
                      />
                      <p className="text-xs text-muted-foreground">Maximum simultaneous exchange connections</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Testnet by Default</Label>
                      <p className="text-xs text-muted-foreground mt-1">New connections will use testnet</p>
                    </div>
                    <Switch
                      checked={settings.testnetEnabled === true}
                      onCheckedChange={(checked) => handleSettingChange("testnetEnabled", checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Monitoring Section */}
            <TabsContent value="monitoring" className="space-y-6">
              {/* Application Logs */}
              <Card>
                <CardHeader>
                  <CardTitle>Application Logs</CardTitle>
                  <CardDescription>View internal application logs and events</CardDescription>
                </CardHeader>
                <CardContent>
                  <LogsViewer />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monitoring Configuration</CardTitle>
                  <CardDescription>Configure system monitoring and metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable System Monitoring</Label>
                      <p className="text-xs text-muted-foreground mt-1">Track system performance and metrics</p>
                    </div>
                    <Switch
                      checked={settings.monitoringEnabled !== false}
                      onCheckedChange={(checked) => handleSettingChange("monitoringEnabled", checked)}
                    />
                  </div>

                  {settings.monitoringEnabled !== false && (
                    <div className="space-y-2">
                      <Label>Metrics Retention (days)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="365"
                        value={settings.metricsRetention || 30}
                        onChange={(e) => handleSettingChange("metricsRetention", Number.parseInt(e.target.value))}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Install Section */}
            <TabsContent value="install" className="space-y-6">
              <InstallManager />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Exchange Tab */}
        <TabsContent value="exchange" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Exchange Connection Selection</CardTitle>
              <CardDescription>Select active exchange connection (synchronized with Dashboard)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Select value={selectedExchange} onValueChange={handleExchangeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select active exchange connection" />
                    </SelectTrigger>
                    <SelectContent>
                      {connections
                        .filter((c) => c.is_enabled)
                        .map((connection) => (
                          <SelectItem key={connection.id} value={connection.id}>
                            {connection.name} ({connection.exchange})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {connections.filter((c) => c.is_enabled).length} enabled
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Base Volume Configuration</CardTitle>
              <CardDescription>Configure base volume factor and risk parameters for exchange trading</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Volume Factor (Base Volume Factor)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      min={0.1}
                      max={10}
                      step={0.1}
                      value={[settings.baseVolumeFactor || 1.0]}
                      onValueChange={([value]) => handleSettingChange("baseVolumeFactor", value)}
                      className="flex-1"
                    />
                    <span className="text-sm font-medium w-12 text-right">{settings.baseVolumeFactor || 1.0}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Controls position volume. Higher value = higher position volume.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Range Percentage (Risk Percentage)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.riskPercentage || 20}
                    onChange={(e) => handleSettingChange("riskPercentage", Number.parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Market movement % that triggers loss</p>
                </div>

                <div className="space-y-2">
                  <Label>Target Average Positions</Label>
                  <Input
                    type="number"
                    min="10"
                    max="200"
                    value={settings.targetAveragePositions || 50}
                    onChange={(e) => handleSettingChange("targetAveragePositions", Number.parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Count for volume factor calculation</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Symbol Selection Method</CardTitle>
              <CardDescription>Choose how symbols are selected for trading with detailed preview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-base">Use Main Symbols</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Use predefined main symbols list instead of dynamic arrangement
                  </p>
                </div>
                <Switch
                  checked={settings.useMainSymbols === true}
                  onCheckedChange={(checked) => handleSettingChange("useMainSymbols", checked)}
                />
              </div>

              {settings.useMainSymbols !== true && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label>Arrangement Type (Order Method)</Label>
                    <Select
                      value={settings.arrangementType || "marketCap24h"}
                      onValueChange={(value) => handleSettingChange("arrangementType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="marketCap24h">
                          <div className="flex flex-col items-start py-1">
                            <span className="font-medium">Market Cap (24h)</span>
                            <span className="text-xs text-muted-foreground">
                              Select symbols by highest market capitalization
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="marketVolume">
                          <div className="flex flex-col items-start py-1">
                            <span className="font-medium">Market Volume</span>
                            <span className="text-xs text-muted-foreground">
                              Select symbols by highest trading volume
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="marketVolatility">
                          <div className="flex flex-col items-start py-1">
                            <span className="font-medium">Market Volatility</span>
                            <span className="text-xs text-muted-foreground">
                              Select symbols by highest price volatility
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="priceChange24h">
                          <div className="flex flex-col items-start py-1">
                            <span className="font-medium">Price Change (24h)</span>
                            <span className="text-xs text-muted-foreground">
                              Select symbols by highest price change
                            </span>
                          </div>
                        </SelectItem>
                        <SelectItem value="liquidityScore">
                          <div className="flex flex-col items-start py-1">
                            <span className="font-medium">Liquidity Score</span>
                            <span className="text-xs text-muted-foreground">
                              Select symbols by best liquidity metrics
                            </span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Method for selecting and sorting symbols dynamically from exchange
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Number of Symbols to Select</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        min={5}
                        max={100}
                        step={5}
                        value={[settings.arrangementCount || 30]}
                        onValueChange={([value]) => handleSettingChange("arrangementCount", value)}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12 text-right">{settings.arrangementCount || 30}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Number of symbols to select using the arrangement type
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base">Symbol Selection Preview</Label>
                    <div className="border rounded-lg p-4 bg-background space-y-3 max-h-[300px] overflow-y-auto">
                      <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-muted-foreground pb-2 border-b">
                        <div>Rank</div>
                        <div>Symbol</div>
                        <div>Order Value</div>
                        <div>Status</div>
                      </div>

                      {/* Mock data for preview - in production this would fetch from exchange API */}
                      {Array.from({ length: Math.min(settings.arrangementCount || 30, 10) }).map((_, i) => {
                        const mockSymbols = ["BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "MATIC", "DOT", "AVAX"]
                        const mockValues = [
                          "850.2B",
                          "420.5B",
                          "85.3B",
                          "45.2B",
                          "32.1B",
                          "28.5B",
                          "18.9B",
                          "15.2B",
                          "12.8B",
                          "10.5B",
                        ]
                        return (
                          <div key={i} className="grid grid-cols-4 gap-2 text-sm py-2 border-b last:border-0">
                            <div className="text-muted-foreground">#{i + 1}</div>
                            <div className="font-medium">{mockSymbols[i]}</div>
                            <div className="text-muted-foreground">{mockValues[i]}</div>
                            <div>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-600">
                                Active
                              </span>
                            </div>
                          </div>
                        )
                      })}

                      {(settings.arrangementCount || 30) > 10 && (
                        <div className="text-center text-xs text-muted-foreground pt-2">
                          ... and {(settings.arrangementCount || 30) - 10} more symbols
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Preview of top symbols based on selected arrangement type. Actual values fetched from exchange in
                      real-time.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Quote Asset</Label>
                <Select
                  value={settings.quoteAsset || "USDT"}
                  onValueChange={(value) => handleSettingChange("quoteAsset", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDT">USDT</SelectItem>
                    <SelectItem value="BUSD">BUSD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="BTC">BTC</SelectItem>
                    <SelectItem value="ETH">ETH</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Quote currency automatically appended to base symbols (e.g., BTC + USDT = BTCUSDT)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Minimum Profit Factor Requirements</CardTitle>
              <CardDescription>Configure profit factor thresholds for different strategy types</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Base Strategies</Label>
                  <Input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.profitFactorBase || 0.6}
                    onChange={(e) => handleSettingChange("profitFactorBase", Number.parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Main Strategies</Label>
                  <Input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.profitFactorMain || 0.6}
                    onChange={(e) => handleSettingChange("profitFactorMain", Number.parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Real Strategies</Label>
                  <Input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.profitFactorReal || 0.6}
                    onChange={(e) => handleSettingChange("profitFactorReal", Number.parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Management</CardTitle>
              <CardDescription>Configure risk management and protection parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label className="text-base">Trailing Stop Loss</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enable trailing stop loss for all positions to protect profits
                  </p>
                </div>
                <Switch
                  checked={settings.trailingStopLoss === true}
                  onCheckedChange={(checked) => handleSettingChange("trailingStopLoss", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Drawdown Time (hours)</Label>
                <Input
                  type="number"
                  min="1"
                  max="72"
                  value={settings.maxDrawdownTime || 24}
                  onChange={(e) => handleSettingChange("maxDrawdownTime", Number.parseInt(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum time a position can remain in drawdown before automatic closure. Relates to position risk
                  management and prevents prolonged losing positions.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Indication Tab */}
        <TabsContent value="indication" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Indication Configuration</CardTitle>
              <CardDescription>Configure indication calculation parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Time Interval (seconds)</Label>
                  <Input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={settings.indicationTimeInterval || 1}
                    onChange={(e) => handleSettingChange("indicationTimeInterval", Number.parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Minimum Profit Factor</Label>
                  <Input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={settings.indicationMinProfit || 0.7}
                    onChange={(e) => handleSettingChange("indicationMinProfit", Number.parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Range Minimum</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.indicationRangeMin || 3}
                    onChange={(e) => handleSettingChange("indicationRangeMin", Number.parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Range Maximum</Label>
                  <Input
                    type="number"
                    min="10"
                    max="50"
                    value={settings.indicationRangeMax || 30}
                    onChange={(e) => handleSettingChange("indicationRangeMax", Number.parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Indicator Settings</CardTitle>
              <CardDescription>Configure technical indicators for trading signals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* RSI Indicator */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">RSI (Relative Strength Index)</Label>
                  <Switch
                    checked={settings.indicatorRsiEnabled !== false}
                    onCheckedChange={(checked) => handleSettingChange("indicatorRsiEnabled", checked)}
                  />
                </div>
                {settings.indicatorRsiEnabled !== false && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Period</Label>
                      <Input
                        type="number"
                        min="5"
                        max="50"
                        value={settings.rsiPeriod || 14}
                        onChange={(e) => handleSettingChange("rsiPeriod", Number.parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Oversold Level</Label>
                      <Input
                        type="number"
                        min="10"
                        max="40"
                        value={settings.rsiOversold || 30}
                        onChange={(e) => handleSettingChange("rsiOversold", Number.parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Overbought Level</Label>
                      <Input
                        type="number"
                        min="60"
                        max="90"
                        value={settings.rsiOverbought || 70}
                        onChange={(e) => handleSettingChange("rsiOverbought", Number.parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* MACD Indicator */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">MACD (Moving Average Convergence Divergence)</Label>
                  <Switch
                    checked={settings.indicatorMacdEnabled !== false}
                    onCheckedChange={(checked) => handleSettingChange("indicatorMacdEnabled", checked)}
                  />
                </div>
                {settings.indicatorMacdEnabled !== false && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Fast Period</Label>
                      <Input
                        type="number"
                        min="5"
                        max="20"
                        value={settings.macdFastPeriod || 12}
                        onChange={(e) => handleSettingChange("macdFastPeriod", Number.parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Slow Period</Label>
                      <Input
                        type="number"
                        min="15"
                        max="40"
                        value={settings.macdSlowPeriod || 26}
                        onChange={(e) => handleSettingChange("macdSlowPeriod", Number.parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Signal Period</Label>
                      <Input
                        type="number"
                        min="5"
                        max="15"
                        value={settings.macdSignalPeriod || 9}
                        onChange={(e) => handleSettingChange("macdSignalPeriod", Number.parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Bollinger Bands */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Bollinger Bands</Label>
                  <Switch
                    checked={settings.indicatorBollingerEnabled !== false}
                    onCheckedChange={(checked) => handleSettingChange("indicatorBollingerEnabled", checked)}
                  />
                </div>
                {settings.indicatorBollingerEnabled !== false && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Period</Label>
                      <Input
                        type="number"
                        min="10"
                        max="50"
                        value={settings.bollingerPeriod || 20}
                        onChange={(e) => handleSettingChange("bollingerPeriod", Number.parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Standard Deviation</Label>
                      <Input
                        type="number"
                        min="1"
                        max="3"
                        step="0.1"
                        value={settings.bollingerStdDev || 2}
                        onChange={(e) => handleSettingChange("bollingerStdDev", Number.parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Parabolic SAR */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Parabolic SAR</Label>
                  <Switch
                    checked={settings.indicatorSarEnabled !== false}
                    onCheckedChange={(checked) => handleSettingChange("indicatorSarEnabled", checked)}
                  />
                </div>
                {settings.indicatorSarEnabled !== false && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Acceleration</Label>
                      <Input
                        type="number"
                        min="0.01"
                        max="0.1"
                        step="0.01"
                        value={settings.sarAcceleration || 0.02}
                        onChange={(e) => handleSettingChange("sarAcceleration", Number.parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Maximum</Label>
                      <Input
                        type="number"
                        min="0.1"
                        max="0.5"
                        step="0.05"
                        value={settings.sarMaximum || 0.2}
                        onChange={(e) => handleSettingChange("sarMaximum", Number.parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ADX Indicator */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">ADX (Average Directional Index)</Label>
                  <Switch
                    checked={settings.indicatorAdxEnabled !== false}
                    onCheckedChange={(checked) => handleSettingChange("indicatorAdxEnabled", checked)}
                  />
                </div>
                {settings.indicatorAdxEnabled !== false && (
                  <div className="space-y-2">
                    <Label>Period</Label>
                    <Input
                      type="number"
                      min="5"
                      max="30"
                      value={settings.adxPeriod || 14}
                      onChange={(e) => handleSettingChange("adxPeriod", Number.parseInt(e.target.value))}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Strategy Tab */}
        <TabsContent value="strategy" className="space-y-6">
          <Tabs defaultValue="main" className="space-y-4">
            <TabsList>
              <TabsTrigger value="main">Main</TabsTrigger>
              <TabsTrigger value="preset">Preset</TabsTrigger>
            </TabsList>

            {/* Main Strategy Tab */}
            <TabsContent value="main" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Indication / Strategy Step Relation</CardTitle>
                  <CardDescription>
                    Configure the relationship between indication steps and position steps. This ratio ensures position
                    steps are proportional to indication steps.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Step Ratio Range (0.1 - 3.0)</Label>
                        <div className="text-sm font-medium">
                          Min: {(settings.indicationPositionStepRatioMin || 0.2).toFixed(1)} | Max:{" "}
                          {(settings.indicationPositionStepRatioMax || 1.0).toFixed(1)}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Minimum Ratio</Label>
                          <Slider
                            min={0.1}
                            max={3.0}
                            step={0.1}
                            value={[settings.indicationPositionStepRatioMin || 0.2]}
                            onValueChange={([value]) => handleSettingChange("indicationPositionStepRatioMin", value)}
                            className="flex-1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Maximum Ratio</Label>
                          <Slider
                            min={0.1}
                            max={3.0}
                            step={0.1}
                            value={[settings.indicationPositionStepRatioMax || 1.0]}
                            onValueChange={([value]) => handleSettingChange("indicationPositionStepRatioMax", value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/30 border rounded-lg space-y-2">
                      <Label className="text-sm font-semibold">Example Calculation:</Label>
                      <div className="text-sm space-y-1">
                        <p>
                          If <span className="font-medium">indication step = 10</span>:
                        </p>
                        <p className="text-muted-foreground pl-4">
                          • Minimum position step ={" "}
                          <span className="font-medium text-foreground">
                            {Math.max(1, Math.round(10 * (settings.indicationPositionStepRatioMin || 0.2)))}
                          </span>{" "}
                          (10 × {(settings.indicationPositionStepRatioMin || 0.2).toFixed(1)})
                        </p>
                        <p className="text-muted-foreground pl-4">
                          • Maximum position step ={" "}
                          <span className="font-medium text-foreground">
                            {Math.max(1, Math.round(10 * (settings.indicationPositionStepRatioMax || 1.0)))}
                          </span>{" "}
                          (10 × {(settings.indicationPositionStepRatioMax || 1.0).toFixed(1)})
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        <strong>Note:</strong> This ratio controls how position steps scale relative to indication
                        steps. A ratio of 0.2 means the minimum position step is 20% of the indication step, while 1.0
                        means they are equal. This ensures position granularity is appropriate for the indication
                        sensitivity.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Base Strategy Configuration</CardTitle>
                  <CardDescription>Configure base pseudo positions (internal calculation only)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Value Range Min</Label>
                      <Input
                        type="number"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={settings.baseValueMin || 0.5}
                        onChange={(e) => handleSettingChange("baseValueMin", Number.parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Value Range Max</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        step="0.5"
                        value={settings.baseValueMax || 2.5}
                        onChange={(e) => handleSettingChange("baseValueMax", Number.parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Ratio Min</Label>
                      <Input
                        type="number"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={settings.baseRatioMin || 0.2}
                        onChange={(e) => handleSettingChange("baseRatioMin", Number.parseFloat(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Ratio Max</Label>
                      <Input
                        type="number"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={settings.baseRatioMax || 1}
                        onChange={(e) => handleSettingChange("baseRatioMax", Number.parseFloat(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Trailing Option</Label>
                      <p className="text-xs text-muted-foreground mt-1">Enable trailing for base strategies</p>
                    </div>
                    <Switch
                      checked={settings.baseTrailing === true}
                      onCheckedChange={(checked) => handleSettingChange("baseTrailing", checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Main Strategy Configuration</CardTitle>
                  <CardDescription>Configure main strategies (calculations related to Base)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Previous Positions Count</Label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={settings.mainPreviousCount || 5}
                        onChange={(e) => handleSettingChange("mainPreviousCount", Number.parseInt(e.target.value))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Last State Count</Label>
                      <Select
                        value={settings.mainLastStateCount || "last3"}
                        onValueChange={(value) => handleSettingChange("mainLastStateCount", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last1">Last 1</SelectItem>
                          <SelectItem value="last2">Last 2</SelectItem>
                          <SelectItem value="last3">Last 3</SelectItem>
                          <SelectItem value="last5">Last 5</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trailing Configuration</CardTitle>
                  <CardDescription>Configure trailing stop parameters for all strategies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div>
                      <Label className="text-base font-semibold">Enable Trailing Strategy</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Master toggle for trailing strategy. Affects all strategies from base away. When disabled, no
                        trailing stops are applied to any positions.
                      </p>
                    </div>
                    <Switch
                      checked={settings.trailingEnabled !== false}
                      onCheckedChange={(checked) => handleSettingChange("trailingEnabled", checked)}
                    />
                  </div>

                  {settings.trailingEnabled !== false && (
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Trailing Start Values (comma-separated)</Label>
                        <Input
                          placeholder="0.5, 1.0, 1.5"
                          value={Array.isArray(settings.starts) ? settings.starts.join(", ") : settings.starts || ""}
                          onChange={(e) => {
                            const values = e.target.value
                              .split(",")
                              .map((v) => Number.parseFloat(v.trim()))
                              .filter((v) => !isNaN(v))
                            handleSettingChange("starts", values)
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Trailing Stop Values (comma-separated)</Label>
                        <Input
                          placeholder="0.2, 0.4, 0.6"
                          value={Array.isArray(settings.stops) ? settings.stops.join(", ") : settings.stops || ""}
                          onChange={(e) => {
                            const values = e.target.value
                              .split(",")
                              .map((v) => Number.parseFloat(v.trim()))
                              .filter((v) => !isNaN(v))
                            handleSettingChange("stops", values)
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {settings.trailingEnabled === false && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        <strong>Warning:</strong> Trailing strategy is currently disabled. All positions will use fixed
                        take-profit levels without trailing adjustments.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Adjustment Strategies</CardTitle>
                  <CardDescription>Configure position adjustment strategies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Block Adjustment</Label>
                      <p className="text-xs text-muted-foreground mt-1">Enable block-based adjustments</p>
                    </div>
                    <Switch
                      checked={settings.mainBlockAdjustment === true}
                      onCheckedChange={(checked) => handleSettingChange("mainBlockAdjustment", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>DCA Adjustment</Label>
                      <p className="text-xs text-muted-foreground mt-1">Enable Dollar Cost Averaging</p>
                    </div>
                    <Switch
                      checked={settings.mainDcaAdjustment === true}
                      onCheckedChange={(checked) => handleSettingChange("mainDcaAdjustment", checked)}
                    />
                  </div>

                  {settings.mainBlockAdjustment && (
                    <>
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-base">Block Auto Disable</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              Automatically disable block adjustment for specific groups based on performance evaluation
                            </p>
                          </div>
                          <Switch
                            checked={settings.blockAutoDisable === true}
                            onCheckedChange={(checked) => handleSettingChange("blockAutoDisable", checked)}
                          />
                        </div>

                        {settings.blockAutoDisable && (
                          <div className="space-y-4 pl-4 border-l-2">
                            <div className="space-y-2">
                              <Label>Evaluation Window (positions)</Label>
                              <Input
                                type="number"
                                min="10"
                                max="100"
                                value={settings.blockEvaluationWindow || 40}
                                onChange={(e) =>
                                  handleSettingChange("blockEvaluationWindow", Number.parseInt(e.target.value))
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Number of last positions to evaluate for auto-disable decision (default: 40)
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label>Minimum Profit Factor Threshold</Label>
                              <Input
                                type="number"
                                min="0"
                                max="1"
                                step="0.1"
                                value={settings.blockDisableThreshold || 0.5}
                                onChange={(e) =>
                                  handleSettingChange("blockDisableThreshold", Number.parseFloat(e.target.value))
                                }
                              />
                              <p className="text-xs text-muted-foreground">
                                Profit factor threshold below which block adjustment is disabled for the group
                              </p>
                            </div>

                            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                <strong>Note:</strong> Block auto-disable is evaluated per symbol group, not globally.
                                Disabled groups remain inactive until their pseudo relation calculation becomes positive
                                again. This setting only affects exchange live trades, not internal calculations.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Block Adjustment Ratio</Label>
                          <Input
                            type="number"
                            min="0.1"
                            max="5"
                            step="0.1"
                            value={settings.adjustmentRatio || 1.0}
                            onChange={(e) => handleSettingChange("adjustmentRatio", Number.parseFloat(e.target.value))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Block Sizes (comma-separated)</Label>
                          <Input
                            placeholder="2, 4, 6, 8"
                            value={Array.isArray(settings.sizes) ? settings.sizes.join(", ") : settings.sizes || ""}
                            onChange={(e) => {
                              const values = e.target.value
                                .split(",")
                                .map((v) => Number.parseInt(v.trim()))
                                .filter((v) => !isNaN(v))
                              handleSettingChange("sizes", values)
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {settings.mainDcaAdjustment && (
                    <div className="space-y-2">
                      <Label>DCA Levels (comma-separated)</Label>
                      <Input
                        placeholder="3, 5"
                        value={Array.isArray(settings.levels) ? settings.levels.join(", ") : settings.levels || ""}
                        onChange={(e) => {
                          const values = e.target.value
                            .split(",")
                            .map((v) => Number.parseInt(v.trim()))
                            .filter((v) => !isNaN(v))
                          handleSettingChange("levels", values)
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Preset Strategy Tab */}
            <TabsContent value="preset" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Trade Preset Presets</CardTitle>
                  <CardDescription>Select and manage preset strategy configurations for trading</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Active Preset Strategy</Label>
                    <Select
                      value={settings.activePresetStrategy || ""}
                      onValueChange={(value) => handleSettingChange("activePresetStrategy", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a preset strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="momentum">Momentum Trading</SelectItem>
                        <SelectItem value="mean-reversion">Mean Reversion</SelectItem>
                        <SelectItem value="breakout">Breakout Strategy</SelectItem>
                        <SelectItem value="scalping">Scalping</SelectItem>
                        <SelectItem value="swing">Swing Trading</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select the preset strategy configuration to use for preset trading mode
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div>
                      <Label className="text-base">Enable Preset Trading</Label>
                      <p className="text-sm text-muted-foreground mt-1">Activate preset-based trading strategies</p>
                    </div>
                    <Switch
                      checked={settings.presetTradingEnabled === true}
                      onCheckedChange={(checked) => handleSettingChange("presetTradingEnabled", checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Preset Trade Settings</CardTitle>
                  <CardDescription>Configure preset trade engine parameters and ranges</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Batch Size</Label>
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={settings.presetBatchSize || 10}
                        onChange={(e) => handleSettingChange("presetBatchSize", Number.parseInt(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Number of presets processed per batch</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Max Concurrent Presets</Label>
                      <Input
                        type="number"
                        min="1"
                        max="20"
                        value={settings.presetMaxConcurrent || 5}
                        onChange={(e) => handleSettingChange("presetMaxConcurrent", Number.parseInt(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Maximum concurrent preset operations</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Max Preset Positions</Label>
                      <Input
                        type="number"
                        min="10"
                        max="500"
                        value={settings.presetMaxPositions || 250}
                        onChange={(e) => handleSettingChange("presetMaxPositions", Number.parseInt(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Maximum total preset positions</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Position Timeout (hours)</Label>
                      <Input
                        type="number"
                        min="1"
                        max="24"
                        value={settings.presetPositionTimeout || 2}
                        onChange={(e) => handleSettingChange("presetPositionTimeout", Number.parseInt(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">Timeout for preset positions</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <Label className="text-base font-semibold">Take Profit Range</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>TP Min</Label>
                        <Input
                          type="number"
                          min="1"
                          max="10"
                          value={settings.presetTpMin || 2}
                          onChange={(e) => handleSettingChange("presetTpMin", Number.parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>TP Max</Label>
                        <Input
                          type="number"
                          min="10"
                          max="50"
                          value={settings.presetTpMax || 30}
                          onChange={(e) => handleSettingChange("presetTpMax", Number.parseInt(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>TP Step</Label>
                        <Input
                          type="number"
                          min="1"
                          max="5"
                          value={settings.presetTpStep || 2}
                          onChange={(e) => handleSettingChange("presetTpStep", Number.parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <Label className="text-base font-semibold">Stop Loss Range</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>SL Min</Label>
                        <Input
                          type="number"
                          min="0.1"
                          max="1"
                          step="0.1"
                          value={settings.presetSlMin || 0.3}
                          onChange={(e) => handleSettingChange("presetSlMin", Number.parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SL Max</Label>
                        <Input
                          type="number"
                          min="1"
                          max="5"
                          step="0.1"
                          value={settings.presetSlMax || 3.0}
                          onChange={(e) => handleSettingChange("presetSlMax", Number.parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SL Step</Label>
                        <Input
                          type="number"
                          min="0.1"
                          max="1"
                          step="0.1"
                          value={settings.presetSlStep || 0.3}
                          onChange={(e) => handleSettingChange("presetSlStep", Number.parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Configuration</CardTitle>
              <CardDescription>Configure your PostgreSQL database connection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="database-type">Database Type</Label>
                  <select
                    id="database-type"
                    className="w-48 px-3 py-2 border rounded-md bg-background"
                    value={settings.database_type || "neon"}
                    onChange={(e) => handleSettingChange("database_type", e.target.value)}
                  >
                    <option value="neon">Neon PostgreSQL</option>
                    <option value="remote">Remote PostgreSQL</option>
                  </select>
                </div>

                {settings.database_type === "remote" && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                    <h4 className="font-medium">Remote PostgreSQL Configuration</h4>

                    <div className="flex gap-2 mb-4">
                      <Button
                        onClick={() => {
                          // Load predefined remote database settings
                          handleSettingChange("pg_host", "149.33.11.224")
                          handleSettingChange("pg_port", "5432")
                          handleSettingChange("pg_database", "ctsv3")
                          handleSettingChange("pg_user", "root")
                          handleSettingChange("pg_password", "mLM58coj7t")
                          toast.success("Predefined remote database settings loaded")
                        }}
                        variant="outline"
                        className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
                      >
                        Load Predefined Settings
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pg-host">Host</Label>
                        <Input
                          id="pg-host"
                          placeholder="localhost or IP address"
                          value={settings.pg_host || ""}
                          onChange={(e) => handleSettingChange("pg_host", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pg-port">Port</Label>
                        <Input
                          id="pg-port"
                          type="number"
                          placeholder="5432"
                          value={settings.pg_port || "5432"}
                          onChange={(e) => handleSettingChange("pg_port", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pg-database">Database Name</Label>
                        <Input
                          id="pg-database"
                          placeholder="trading_system"
                          value={settings.pg_database || ""}
                          onChange={(e) => handleSettingChange("pg_database", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pg-user">Username</Label>
                        <Input
                          id="pg-user"
                          placeholder="postgres"
                          value={settings.pg_user || ""}
                          onChange={(e) => handleSettingChange("pg_user", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="pg-password">Password</Label>
                        <Input
                          id="pg-password"
                          type="password"
                          placeholder="Enter database password"
                          value={settings.pg_password || ""}
                          onChange={(e) => handleSettingChange("pg_password", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={async () => {
                          try {
                            const response = await fetch("/api/settings/test-postgres-connection", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                host: settings.pg_host,
                                port: settings.pg_port,
                                database: settings.pg_database,
                                user: settings.pg_user,
                                password: settings.pg_password,
                              }),
                            })
                            const data = await response.json()
                            if (data.success) {
                              toast.success("Connection successful!")
                            } else {
                              toast.error(`Connection failed: ${data.error}`)
                            }
                          } catch (error) {
                            toast.error("Connection test failed")
                          }
                        }}
                        variant="outline"
                      >
                        Test Connection
                      </Button>
                      <Button
                        onClick={async () => {
                          try {
                            const connectionString = `postgresql://${settings.pg_user}:${settings.pg_password}@${settings.pg_host}:${settings.pg_port}/${settings.pg_database}`
                            await navigator.clipboard.writeText(connectionString)
                            toast.success("Connection string copied to clipboard")
                          } catch (error) {
                            toast.error("Failed to copy connection string")
                          }
                        }}
                        variant="outline"
                      >
                        Copy Connection String
                      </Button>
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        After configuring, add this to your environment variables:
                        <code className="block mt-2 p-2 bg-background rounded text-xs">
                          REMOTE_POSTGRES_URL=postgresql://{settings.pg_user || "user"}:****@
                          {settings.pg_host || "host"}:{settings.pg_port || "5432"}/{settings.pg_database || "database"}
                        </code>
                      </p>
                    </div>
                  </div>
                )}

                {databaseStatus && (
                  <div className="p-4 bg-muted rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Connection Status:</span>
                      <Badge
                        variant={databaseStatus.isConnected ? "default" : "destructive"}
                        className={databaseStatus.isConnected ? "bg-green-600" : ""}
                      >
                        {databaseStatus.isConnected ? "✓ Connected" : "✗ Not Connected"}
                      </Badge>
                    </div>

                    {databaseStatus.url && (
                      <div className="space-y-1">
                        <span className="text-sm font-medium">Database URL:</span>
                        <code className="block text-xs bg-background p-2 rounded border">{databaseStatus.url}</code>
                      </div>
                    )}

                    {databaseStatus.tableCount !== undefined && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Tables:</span>
                        <span className="font-medium">{databaseStatus.tableCount} tables</span>
                      </div>
                    )}

                    {databaseStatus.envVars && (
                      <div className="space-y-2 pt-2 border-t">
                        <span className="text-sm font-medium">Environment Variables:</span>
                        <div className="space-y-1 text-xs">
                          {Object.entries(databaseStatus.envVars).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className={value ? "text-green-600" : "text-red-600"}>
                                {value ? "✓ Set" : "✗ Missing"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {databaseStatus && !databaseStatus.isConfigured && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      DATABASE_URL environment variable is not set. Please configure your Neon database connection in
                      the Vercel project settings or add it to your .env file.
                    </p>
                  </div>
                )}

                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">About Neon Database</h4>
                  <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <p>• Serverless PostgreSQL with automatic scaling</p>
                    <p>• Instant database branching for development</p>
                    <p>• Automatic backups and point-in-time recovery</p>
                    <p>• Optimized for Vercel deployments</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trade Engine Configuration</CardTitle>
              <CardDescription>Configure trade engine timing and behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Trade Interval (seconds)</Label>
                  <Input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={settings.tradeInterval || 1}
                    onChange={(e) => handleSettingChange("tradeInterval", Number.parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Main trade execution interval</p>
                </div>

                <div className="space-y-2">
                  <Label>Real Positions Interval (seconds)</Label>
                  <Input
                    type="number"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={settings.realInterval || 0.3}
                    onChange={(e) => handleSettingChange("realInterval", Number.parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Real position check interval</p>
                </div>

                <div className="space-y-2">
                  <Label>Validation Timeout (seconds)</Label>
                  <Input
                    type="number"
                    min="5"
                    max="60"
                    value={settings.validationTimeout || 15}
                    onChange={(e) => handleSettingChange("validationTimeout", Number.parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Position validation timeout</p>
                </div>

                <div className="space-y-2">
                  <Label>Position Cooldown (seconds)</Label>
                  <Input
                    type="number"
                    min="5"
                    max="60"
                    value={settings.positionCooldown || 20}
                    onChange={(e) => handleSettingChange("positionCooldown", Number.parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Cooldown between positions</p>
                </div>

                <div className="space-y-2">
                  <Label>Max Positions Per Config</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxPositionsPerConfig || 1}
                    onChange={(e) => handleSettingChange("maxPositionsPerConfig", Number.parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Max positions per configuration</p>
                </div>

                <div className="space-y-2">
                  <Label>Max Concurrent Operations</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={settings.maxConcurrentOperations || 5}
                    onChange={(e) => handleSettingChange("maxConcurrentOperations", Number.parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">Maximum concurrent system operations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
              <CardDescription>Configure system behavior and maintenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-restart on Errors</Label>
                  <p className="text-xs text-muted-foreground mt-1">Automatically restart trade engine on failure</p>
                </div>
                <Switch
                  checked={settings.autoRestart !== false}
                  onCheckedChange={(checked) => handleSettingChange("autoRestart", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Log Level</Label>
                <Select
                  value={settings.logLevel || "info"}
                  onValueChange={(value) => handleSettingChange("logLevel", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="warn">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Database Management</CardTitle>
              <CardDescription>Configure database size and maintenance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Maximum Database Size (MB)</Label>
                  <Input
                    type="number"
                    min="1000"
                    max="50000"
                    value={settings.maxDatabaseSize || 10240}
                    onChange={(e) => handleSettingChange("maxDatabaseSize", Number.parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Database Threshold (%)</Label>
                  <Input
                    type="number"
                    min="50"
                    max="95"
                    value={settings.databaseThreshold || 80}
                    onChange={(e) => handleSettingChange("databaseThreshold", Number.parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Automatic Database Cleanup</Label>
                  <p className="text-xs text-muted-foreground mt-1">Auto-cleanup old data when threshold is reached</p>
                </div>
                <Switch
                  checked={settings.autoCleanup !== false}
                  onCheckedChange={(checked) => handleSettingChange("autoCleanup", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Automatic Database Backups</Label>
                  <p className="text-xs text-muted-foreground mt-1">Enable automatic database backups</p>
                </div>
                <Switch
                  checked={settings.autoBackup !== false}
                  onCheckedChange={(checked) => handleSettingChange("autoBackup", checked)}
                />
              </div>

              {settings.autoBackup !== false && (
                <div className="space-y-2">
                  <Label>Backup Interval</Label>
                  <Select
                    value={settings.backupInterval || "daily"}
                    onValueChange={(value) => handleSettingChange("backupInterval", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
