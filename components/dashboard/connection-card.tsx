"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExchangeConnectionSettingsDialog } from "@/components/settings/exchange-connection-settings-dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import type { ExchangeConnection } from "@/lib/types"
import { Activity, AlertCircle, CheckCircle, Trash2, Settings, BarChart3, Info } from "lucide-react"

interface ConnectionCardProps {
  connection: ExchangeConnection
  onToggleEnable: (id: string, enabled: boolean) => void
  onToggleLiveTrade: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
  balance?: number
  status: "connected" | "connecting" | "error" | "disabled"
  progress?: number
}

interface PresetType {
  id: string
  name: string
  description?: string
  is_active: boolean
  preset_trade_type: string
}

export function ConnectionCard({
  connection,
  onToggleEnable,
  onToggleLiveTrade,
  onDelete,
  balance = 0,
  status,
  progress = 0,
}: ConnectionCardProps) {
  const [showLogs, setShowLogs] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showPresetConfig, setShowPresetConfig] = useState(false)
  const [showPresetDialog, setShowPresetDialog] = useState(false)
  const [presetConfig, setPresetConfig] = useState({
    volumeFactor: 1.0,
    profitFactorMin: 0.6,
    maxDrawdownTime: 12,
    trailingEnabled: true,
    blockEnabled: true,
    dcaEnabled: true,
  })
  const [connectionInfo, setConnectionInfo] = useState({
    marginMode: "cross",
    positionType: "single",
    baseVolumeFactor: 1.0,
    liveTradeVolumeFactor: 1.0,
    presetTradeVolumeFactor: 1.0,
    profitFactorBase: 0.6,
    profitFactorMain: 0.6,
    profitFactorReal: 0.6,
    maxDrawdownTime: 12,
    presetType: "momentum",
    strategyStates: {
      trailing: true,
      block: true,
      dca: true,
    },
  })
  const [presetTradeEnabled, setPresetTradeEnabled] = useState(false)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [selectedPresetType, setSelectedPresetType] = useState<string>(connection.preset_type_id || "")
  const [availablePresetTypes, setAvailablePresetTypes] = useState<PresetType[]>([])
  const [engineStatus, setEngineStatus] = useState<any>(null)
  const [testingProgress, setTestingProgress] = useState(0)
  const [volumeFactor, setVolumeFactor] = useState(connection.volume_factor || 1.0)

  useEffect(() => {
    const loadPresetTypes = async () => {
      try {
        const response = await fetch("/api/preset-types")
        if (response.ok) {
          const data = await response.json()
          setAvailablePresetTypes(data.filter((p: PresetType) => p.is_active))
        }
      } catch (error) {
        console.error("[v0] Failed to load preset types:", error)
      }
    }

    loadPresetTypes()
  }, [])

  useEffect(() => {
    if (connection.preset_type_id) {
      setSelectedPresetType(connection.preset_type_id)
    }
  }, [connection.preset_type_id])

  useEffect(() => {
    const loadConnectionInfo = async () => {
      try {
        const response = await fetch("/api/settings")
        if (response.ok) {
          const data = await response.json()
          setConnectionInfo({
            marginMode: data.marginMode || "cross",
            positionType: data.hedgingMode || "single",
            baseVolumeFactor: 1.0,
            liveTradeVolumeFactor: data.liveTradeVolumeFactor || 1.0,
            presetTradeVolumeFactor: data.presetTradeVolumeFactor || 1.0,
            profitFactorBase: data.profitFactorBase || 0.6,
            profitFactorMain: data.profitFactorMain || 0.6,
            profitFactorReal: data.profitFactorReal || 0.6,
            maxDrawdownTime: data.maxDrawdownTime || 12,
            presetType: data.presetType || "momentum",
            strategyStates: {
              trailing: data.strategyTrailingEnabled !== "false",
              block: data.strategyBlockEnabled !== "false",
              dca: data.strategyDcaEnabled !== "false",
            },
          })
        }
      } catch (error) {
        console.error("[v0] Failed to load connection info:", error)
      }
    }

    if (showInfo) {
      loadConnectionInfo()
    }
  }, [showInfo])

  useEffect(() => {
    const loadPresetConfig = async () => {
      if (!selectedPresetType) return

      try {
        const response = await fetch(`/api/preset-types/${selectedPresetType}/config`)
        if (response.ok) {
          const data = await response.json()
          setPresetConfig({
            volumeFactor: data.volume_factor || 1.0,
            profitFactorMin: data.profit_factor_min || 0.6,
            maxDrawdownTime: data.max_drawdown_time || 12,
            trailingEnabled: data.trailing_enabled !== false,
            blockEnabled: data.block_enabled !== false,
            dcaEnabled: data.dca_enabled !== false,
          })
        }
      } catch (error) {
        console.error("[v0] Failed to load preset config:", error)
      }
    }

    if (showPresetConfig) {
      loadPresetConfig()
    }
  }, [showPresetConfig, selectedPresetType])

  const getStatusIcon = () => {
    switch (status) {
      case "connected":
        return (
          <span className="text-green-500">
            <CheckCircle />
          </span>
        )
      case "connecting":
        return (
          <span className="text-yellow-500">
            <Activity />
          </span>
        )
      case "error":
        return (
          <span className="text-red-500">
            <AlertCircle />
          </span>
        )
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case "connected":
        return "bg-green-500"
      case "connecting":
        return "bg-yellow-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-300"
    }
  }

  const getConnectionStatus = (connection: ExchangeConnection) => {
    if (!connection.is_enabled) return "disabled"
    if (connection.is_enabled && !connection.is_live_trade) return "connecting"
    return "connected"
  }

  const handlePresetTypeChange = async (presetTypeId: string) => {
    try {
      const response = await fetch(`/api/settings/connections/${connection.id}/preset-type`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset_type_id: presetTypeId }),
      })

      if (!response.ok) throw new Error("Failed to assign preset type")

      setSelectedPresetType(presetTypeId)
      toast.success("Preset type assigned successfully")
    } catch (error) {
      console.error("[v0] Failed to assign preset type:", error)
      toast.error("Failed to assign preset type")
    }
  }

  const handleMainEnableToggle = async (enabled: boolean) => {
    if (!enabled) {
      setShowDisableConfirm(true)
    } else {
      await onToggleEnable(connection.id, true)
    }
  }

  const confirmDisable = async () => {
    try {
      if (presetTradeEnabled && selectedPresetType) {
        await fetch(`/api/preset-coordination-engine/${connection.id}/${selectedPresetType}/stop`, {
          method: "POST",
        })
        setPresetTradeEnabled(false)
        stopStatusPolling()
      }

      await onToggleEnable(connection.id, false)

      setShowDisableConfirm(false)
      toast.success("Connection disabled - all trading stopped")
    } catch (error) {
      console.error("[v0] Failed to disable connection:", error)
      toast.error("Failed to disable connection")
    }
  }

  const handleLiveTradeToggle = async (enabled: boolean) => {
    if (!connection.is_enabled) {
      toast.error("Please enable the connection first")
      return
    }
    await onToggleLiveTrade(connection.id, enabled)
  }

  const handlePresetTradeToggle = async (enabled: boolean) => {
    if (!connection.is_enabled) {
      toast.error("Please enable the connection first")
      return
    }

    if (enabled && !selectedPresetType) {
      setShowPresetDialog(true)
      return
    }

    setPresetTradeEnabled(enabled)

    if (enabled && selectedPresetType) {
      try {
        const response = await fetch(`/api/preset-coordination-engine/${connection.id}/${selectedPresetType}/start`, {
          method: "POST",
        })

        if (response.ok) {
          console.log("[v0] Preset coordination engine started")
          startStatusPolling()
          toast.success("Preset trade engine started")
        } else {
          console.error("[v0] Failed to start preset coordination engine")
          setPresetTradeEnabled(false)
          toast.error("Failed to start preset trade engine")
        }
      } catch (error) {
        console.error("[v0] Error starting preset coordination engine:", error)
        setPresetTradeEnabled(false)
        toast.error("Failed to start preset trade engine")
      }
    } else if (!enabled && selectedPresetType) {
      try {
        const response = await fetch(`/api/preset-coordination-engine/${connection.id}/${selectedPresetType}/stop`, {
          method: "POST",
        })

        if (response.ok) {
          console.log("[v0] Preset coordination engine stopped")
          stopStatusPolling()
          toast.success("Preset trade engine stopped")
        }
      } catch (error) {
        console.error("[v0] Error stopping preset coordination engine:", error)
        toast.error("Failed to stop preset trade engine")
      }
    }
  }

  const startStatusPolling = () => {
    const interval = setInterval(async () => {
      if (!selectedPresetType) return

      try {
        const response = await fetch(`/api/preset-coordination-engine/${connection.id}/${selectedPresetType}/status`)

        if (response.ok) {
          const status = await response.json()
          setEngineStatus(status)
          setTestingProgress(status.testing_progress || 0)
        }
      } catch (error) {
        console.error("[v0] Error fetching engine status:", error)
      }
    }, 2000)
    ;(window as any).presetEngineStatusInterval = interval
  }

  const stopStatusPolling = () => {
    if ((window as any).presetEngineStatusInterval) {
      clearInterval((window as any).presetEngineStatusInterval)
      ;(window as any).presetEngineStatusInterval = null
    }
    setTestingProgress(0)
    setEngineStatus(null)
  }

  const updateVolumeFactor = async (value: number) => {
    try {
      const response = await fetch(`/api/settings/connections/${connection.id}/volume`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volume_factor: value }),
      })

      if (!response.ok) throw new Error("Failed to update volume factor")

      setVolumeFactor(value)
      toast.success("Volume factor updated")
    } catch (error) {
      console.error("[v0] Failed to update volume factor:", error)
      toast.error("Failed to update volume factor")
    }
  }

  const savePresetConfig = async () => {
    if (!selectedPresetType) return

    try {
      const response = await fetch(`/api/preset-types/${selectedPresetType}/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(presetConfig),
      })

      if (!response.ok) throw new Error("Failed to save preset config")

      toast.success("Preset configuration saved")
      setShowPresetConfig(false)
    } catch (error) {
      console.error("[v0] Failed to save preset config:", error)
      toast.error("Failed to save preset configuration")
    }
  }

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <CardTitle className="text-base font-semibold truncate">
              {connection.name} ({connection.exchange})
            </CardTitle>
            <div className="h-4 w-4 shrink-0">{getStatusIcon()}</div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {connection.api_type}
            </Badge>
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {connection.connection_method}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-2">
        {getConnectionStatus(connection) === "connecting" && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="truncate">Loading historical data...</span>
              <span className="shrink-0 ml-2">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full progress-bar transition-all duration-300`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium whitespace-nowrap">Enable</span>
              <Switch checked={connection.is_enabled} onCheckedChange={handleMainEnableToggle} />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium whitespace-nowrap">Live Trade</span>
              <Switch
                checked={connection.is_live_trade}
                onCheckedChange={handleLiveTradeToggle}
                disabled={!connection.is_enabled}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium whitespace-nowrap">Preset Trade</span>
              <Switch
                checked={presetTradeEnabled}
                onCheckedChange={handlePresetTradeToggle}
                disabled={!connection.is_enabled}
              />
            </div>
          </div>

          <div className="text-center shrink-0">
            <div className="text-xs text-muted-foreground">Balance</div>
            <div className="text-sm font-bold">${balance.toFixed(2)}</div>
          </div>

          <div className="flex gap-1 shrink-0">
            <Dialog open={showLogs} onOpenChange={setShowLogs}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent">
                  <BarChart3 className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-base">Connection Logs - {connection.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 font-mono text-xs">
                  <div className="p-2 bg-muted rounded">
                    <div className="text-green-600">[INFO] Connection established</div>
                    <div className="text-blue-600">[INFO] Loading symbols...</div>
                    <div className="text-blue-600">[INFO] Historical data sync: {progress}%</div>
                    {getConnectionStatus(connection) === "connected" && (
                      <div className="text-green-600">[INFO] Live data stream active</div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showInfo} onOpenChange={setShowInfo}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent">
                  <Info className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base">Connection Information - {connection.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-muted-foreground">Margin Mode</div>
                      <div className="text-sm font-semibold capitalize">{connectionInfo.marginMode}</div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-muted-foreground">Trading Type</div>
                      <div className="text-sm font-semibold capitalize">
                        {connectionInfo.positionType === "single" ? "Single" : "Hedge"}
                      </div>
                    </div>
                  </div>

                  {presetTradeEnabled && (
                    <div className="space-y-0.5">
                      <div className="text-xs font-medium text-muted-foreground">Preset Type</div>
                      <div className="text-sm font-semibold capitalize">{connectionInfo.presetType}</div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-muted-foreground">Volume Factors</div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between p-1.5 bg-muted rounded">
                        <span className="text-xs">Live Trade</span>
                        <span className="text-xs font-semibold">{connectionInfo.liveTradeVolumeFactor.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 bg-muted rounded">
                        <span className="text-xs">Preset Trade</span>
                        <span className="text-xs font-semibold">
                          {connectionInfo.presetTradeVolumeFactor.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-muted-foreground">Profit Factor Minimums</div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between p-1.5 bg-muted rounded">
                        <span className="text-xs">Base</span>
                        <span className="text-xs font-semibold">{connectionInfo.profitFactorBase.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 bg-muted rounded">
                        <span className="text-xs">Main</span>
                        <span className="text-xs font-semibold">{connectionInfo.profitFactorMain.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between p-1.5 bg-muted rounded">
                        <span className="text-xs">Real</span>
                        <span className="text-xs font-semibold">{connectionInfo.profitFactorReal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-muted-foreground">Max Drawdown Time</div>
                    <div className="text-sm font-semibold">{connectionInfo.maxDrawdownTime} hours</div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-muted-foreground">Strategy States</div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between p-1.5 bg-muted rounded">
                        <span className="text-xs">Trailing</span>
                        <Badge
                          variant={connectionInfo.strategyStates.trailing ? "default" : "secondary"}
                          className="text-xs px-1.5 py-0"
                        >
                          {connectionInfo.strategyStates.trailing ? "On" : "Off"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-1.5 bg-muted rounded">
                        <span className="text-xs">Block</span>
                        <Badge
                          variant={connectionInfo.strategyStates.block ? "default" : "secondary"}
                          className="text-xs px-1.5 py-0"
                        >
                          {connectionInfo.strategyStates.block ? "On" : "Off"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-1.5 bg-muted rounded">
                        <span className="text-xs">DCA</span>
                        <Badge
                          variant={connectionInfo.strategyStates.dca ? "default" : "secondary"}
                          className="text-xs px-1.5 py-0"
                        >
                          {connectionInfo.strategyStates.dca ? "On" : "Off"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {presetTradeEnabled && selectedPresetType && (
              <Dialog open={showPresetConfig} onOpenChange={setShowPresetConfig}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0 bg-transparent">
                    <Settings className="h-3.5 w-3.5 text-blue-600" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-base">Preset Configuration</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Volume Factor</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="10"
                        value={presetConfig.volumeFactor}
                        onChange={(e) =>
                          setPresetConfig({ ...presetConfig, volumeFactor: Number.parseFloat(e.target.value) })
                        }
                        className="h-9"
                      />
                      <p className="text-xs text-muted-foreground">Multiplier for trade volume (0.1 - 10.0)</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Profit Factor Minimum</label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="5"
                        value={presetConfig.profitFactorMin}
                        onChange={(e) =>
                          setPresetConfig({ ...presetConfig, profitFactorMin: Number.parseFloat(e.target.value) })
                        }
                        className="h-9"
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum profit factor required for trades (0.1 - 5.0)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Max Drawdown Time (hours)</label>
                      <Input
                        type="number"
                        step="1"
                        min="1"
                        max="168"
                        value={presetConfig.maxDrawdownTime}
                        onChange={(e) =>
                          setPresetConfig({ ...presetConfig, maxDrawdownTime: Number.parseInt(e.target.value) })
                        }
                        className="h-9"
                      />
                      <p className="text-xs text-muted-foreground">Maximum time allowed in drawdown (1 - 168 hours)</p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">Strategy Toggles</label>

                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">Trailing Stop</span>
                        <Switch
                          checked={presetConfig.trailingEnabled}
                          onCheckedChange={(checked) => setPresetConfig({ ...presetConfig, trailingEnabled: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">Block Trading</span>
                        <Switch
                          checked={presetConfig.blockEnabled}
                          onCheckedChange={(checked) => setPresetConfig({ ...presetConfig, blockEnabled: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">DCA (Dollar Cost Averaging)</span>
                        <Switch
                          checked={presetConfig.dcaEnabled}
                          onCheckedChange={(checked) => setPresetConfig({ ...presetConfig, dcaEnabled: checked })}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1 bg-transparent"
                        onClick={() => setShowPresetConfig(false)}
                      >
                        Cancel
                      </Button>
                      <Button className="flex-1" onClick={savePresetConfig}>
                        Save Configuration
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 bg-transparent"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(connection.id)}
              className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {presetTradeEnabled && (
          <div className="pt-2 border-t">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Assigned Preset Type</span>
                {selectedPresetType && (
                  <Badge variant="default" className="text-xs">
                    Active
                  </Badge>
                )}
              </div>
              <Select value={selectedPresetType} onValueChange={handlePresetTypeChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select a preset type" />
                </SelectTrigger>
                <SelectContent>
                  {availablePresetTypes.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground text-center">
                      No active preset types available
                    </div>
                  ) : (
                    availablePresetTypes.map((presetType) => (
                      <SelectItem key={presetType.id} value={presetType.id}>
                        {presetType.name}
                        {presetType.description && (
                          <span className="text-xs text-muted-foreground ml-2">- {presetType.description}</span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedPresetType && (
                <p className="text-xs text-muted-foreground">
                  Trades will use configuration sets from the selected preset type
                </p>
              )}
            </div>
          </div>
        )}

        {presetTradeEnabled && testingProgress > 0 && testingProgress < 100 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="truncate">{engineStatus?.testing_message || "Testing configurations..."}</span>
              <span className="shrink-0 ml-2">{testingProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${testingProgress}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>

      <ExchangeConnectionSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        connectionId={connection.id}
        connectionName={connection.name}
      />

      <Dialog open={showPresetDialog} onOpenChange={setShowPresetDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Select Preset Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please select a preset type before enabling Preset Trade mode. The preset type contains multiple
              configuration sets that will be evaluated and executed.
            </p>
            <Select value={selectedPresetType} onValueChange={setSelectedPresetType}>
              <SelectTrigger>
                <SelectValue placeholder="Select a preset type" />
              </SelectTrigger>
              <SelectContent>
                {availablePresetTypes.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground text-center">No active preset types available</div>
                ) : (
                  availablePresetTypes.map((presetType) => (
                    <SelectItem key={presetType.id} value={presetType.id}>
                      <div>
                        <div className="font-medium">{presetType.name}</div>
                        {presetType.description && (
                          <div className="text-xs text-muted-foreground">{presetType.description}</div>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              onClick={() => {
                setShowPresetDialog(false)
                if (selectedPresetType) {
                  handlePresetTypeChange(selectedPresetType)
                  handlePresetTradeToggle(true)
                }
              }}
              disabled={!selectedPresetType}
            >
              Confirm Selection
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Disable Connection?</DialogTitle>
            <DialogDescription>
              This will stop all trading activity on this connection including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Live Trade Engine</li>
                <li>Preset Trade Engine</li>
                <li>All active positions monitoring</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDisableConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDisable}>
              Disable All Trading
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className={`absolute bottom-0 left-0 right-0 h-1 ${getStatusColor()}`} />
    </Card>
  )
}
