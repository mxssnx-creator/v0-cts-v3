"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save } from "lucide-react"
import { toast } from "sonner"

interface ConnectionSettings {
  baseVolumeFactorLive: number
  baseVolumeFactorPreset: number
  liveTradeProfitFactorMinBase: number
  liveTradeProfitFactorMinMain: number
  liveTradeProfitFactorMinReal: number
  liveTradeDrawdownTimeHours: number
  presetTradeProfitFactorMinBase: number
  presetTradeProfitFactorMinMain: number
  presetTradeProfitFactorMinReal: number
  presetTradeDrawdownTimeHours: number
  presetTradeBlockEnabled: boolean
  presetTradeDcaEnabled: boolean
  trailingWithTrailing: boolean
  trailingOnly: boolean
  blockEnabled: boolean
  blockOnly: boolean
  dcaEnabled: boolean
  dcaOnly: boolean
  useMainSymbols: boolean
  arrangementType: string
  arrangementCount: number
}

interface ExchangeConnectionSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connectionId: string
  connectionName: string
}

export function ExchangeConnectionSettingsDialog({
  open,
  onOpenChange,
  connectionId,
  connectionName,
}: ExchangeConnectionSettingsDialogProps) {
  const [settings, setSettings] = useState<ConnectionSettings>({
    baseVolumeFactorLive: 1.0,
    baseVolumeFactorPreset: 1.0,
    liveTradeProfitFactorMinBase: 0.6,
    liveTradeProfitFactorMinMain: 0.6,
    liveTradeProfitFactorMinReal: 0.6,
    liveTradeDrawdownTimeHours: 12,
    presetTradeProfitFactorMinBase: 0.6,
    presetTradeProfitFactorMinMain: 0.6,
    presetTradeProfitFactorMinReal: 0.6,
    presetTradeDrawdownTimeHours: 12,
    presetTradeBlockEnabled: true,
    presetTradeDcaEnabled: false,
    trailingWithTrailing: true,
    trailingOnly: false,
    blockEnabled: true,
    blockOnly: false,
    dcaEnabled: false,
    dcaOnly: false,
    useMainSymbols: false,
    arrangementType: "market_cap_24h",
    arrangementCount: 10,
  })

  useEffect(() => {
    if (open && connectionId) {
      loadSettings()
    }
  }, [open, connectionId])

  const loadSettings = async () => {
    try {
      const response = await fetch(`/api/settings/connections/${connectionId}/settings`)
      if (response.ok) {
        const loadedSettings = await response.json()
        setSettings(loadedSettings)
      }
    } catch (error) {
      console.error("[v0] Failed to load connection settings:", error)
    }
  }

  const updateSetting = (key: keyof ConnectionSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    try {
      console.log("[v0] Saving connection settings for:", connectionId, settings)

      const response = await fetch(`/api/settings/connections/${connectionId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save settings")
      }

      toast.success("Connection settings saved successfully")
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Failed to save connection settings:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save connection settings")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connection Settings: {connectionName}</DialogTitle>
          <DialogDescription>Configure trading parameters for this exchange connection</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="volume" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="volume">Volume</TabsTrigger>
            <TabsTrigger value="symbols">Symbols</TabsTrigger>
            <TabsTrigger value="limits">Limits</TabsTrigger>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
            <TabsTrigger value="preset">Preset Trade</TabsTrigger>
          </TabsList>

          <TabsContent value="volume" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-md border">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> Symbols use base names only (BTC, ETH). The system automatically appends the
                  quote currency based on your exchange API type configuration.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="volume-live">Base Volume Factor (Live Trade)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    id="volume-live"
                    min={1}
                    max={10}
                    step={0.5}
                    value={[settings.baseVolumeFactorLive]}
                    onValueChange={([value]) => updateSetting("baseVolumeFactorLive", value)}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-12 text-right">
                    {settings.baseVolumeFactorLive.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Volume factor for live trading (1 = lowest, 10 = highest)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="volume-preset">Base Volume Factor (Preset Trade)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    id="volume-preset"
                    min={1}
                    max={10}
                    step={0.5}
                    value={[settings.baseVolumeFactorPreset]}
                    onValueChange={([value]) => updateSetting("baseVolumeFactorPreset", value)}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-12 text-right">
                    {settings.baseVolumeFactorPreset.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Volume factor for preset-based trading</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="symbols" className="space-y-6 mt-4">
            <div className="space-y-6">
              <div className="p-3 bg-muted/50 rounded-md border">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> Symbols use base names only (BTC, ETH). The system automatically appends the
                  quote currency based on your exchange API type configuration.
                </p>
              </div>

              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold text-base">Symbol Selection</h4>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="use-main-symbols">Use Main Symbols</Label>
                    <p className="text-sm text-muted-foreground">Use symbols defined in Settings → Overall → Main</p>
                  </div>
                  <Switch
                    id="use-main-symbols"
                    checked={settings.useMainSymbols}
                    onCheckedChange={(checked) => updateSetting("useMainSymbols", checked)}
                  />
                </div>

                {!settings.useMainSymbols && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="arrangement-type">Arrangement Type</Label>
                      <Select
                        value={settings.arrangementType}
                        onValueChange={(value) => updateSetting("arrangementType", value)}
                      >
                        <SelectTrigger id="arrangement-type">
                          <SelectValue placeholder="Select arrangement type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="market_cap_24h">Market Cap (24h)</SelectItem>
                          <SelectItem value="market_volume">Market Volume</SelectItem>
                          <SelectItem value="market_volatility">Market Volatility</SelectItem>
                          <SelectItem value="price_change_24h">Price Change (24h)</SelectItem>
                          <SelectItem value="liquidity_score">Liquidity Score</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Automatically select symbols based on market metrics
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="arrangement-count">Number of Symbols</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          id="arrangement-count"
                          min={5}
                          max={50}
                          step={5}
                          value={[settings.arrangementCount]}
                          onValueChange={([value]) => updateSetting("arrangementCount", value)}
                          className="flex-1"
                        />
                        <span className="text-sm font-medium w-12 text-right">{settings.arrangementCount}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Number of top symbols to trade based on selected arrangement
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="limits" className="space-y-6 mt-4">
            <div className="space-y-6">
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold text-base">Live Trade Limits</h4>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="live-profit-base">Profit Factor Min (Base)</Label>
                    <Input
                      id="live-profit-base"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="2.0"
                      value={settings.liveTradeProfitFactorMinBase}
                      onChange={(e) => updateSetting("liveTradeProfitFactorMinBase", Number.parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="live-profit-main">Profit Factor Min (Main)</Label>
                    <Input
                      id="live-profit-main"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="2.0"
                      value={settings.liveTradeProfitFactorMinMain}
                      onChange={(e) => updateSetting("liveTradeProfitFactorMinMain", Number.parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="live-profit-real">Profit Factor Min (Real)</Label>
                    <Input
                      id="live-profit-real"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="2.0"
                      value={settings.liveTradeProfitFactorMinReal}
                      onChange={(e) => updateSetting("liveTradeProfitFactorMinReal", Number.parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="live-drawdown">Maximum Drawdown Time (hours)</Label>
                  <Input
                    id="live-drawdown"
                    type="number"
                    step="1"
                    min="1"
                    max="72"
                    value={settings.liveTradeDrawdownTimeHours}
                    onChange={(e) => updateSetting("liveTradeDrawdownTimeHours", Number.parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum allowed drawdown duration for live trading strategies
                  </p>
                </div>
              </div>

              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold text-base">Preset Trade Limits</h4>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preset-profit-base">Profit Factor Min (Base)</Label>
                    <Input
                      id="preset-profit-base"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="2.0"
                      value={settings.presetTradeProfitFactorMinBase}
                      onChange={(e) =>
                        updateSetting("presetTradeProfitFactorMinBase", Number.parseFloat(e.target.value))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preset-profit-main">Profit Factor Min (Main)</Label>
                    <Input
                      id="preset-profit-main"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="2.0"
                      value={settings.presetTradeProfitFactorMinMain}
                      onChange={(e) =>
                        updateSetting("presetTradeProfitFactorMinMain", Number.parseFloat(e.target.value))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preset-profit-real">Profit Factor Min (Real)</Label>
                    <Input
                      id="preset-profit-real"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="2.0"
                      value={settings.presetTradeProfitFactorMinReal}
                      onChange={(e) =>
                        updateSetting("presetTradeProfitFactorMinReal", Number.parseFloat(e.target.value))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preset-drawdown">Maximum Drawdown Time (hours)</Label>
                  <Input
                    id="preset-drawdown"
                    type="number"
                    step="1"
                    min="1"
                    max="72"
                    value={settings.presetTradeDrawdownTimeHours}
                    onChange={(e) => updateSetting("presetTradeDrawdownTimeHours", Number.parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum allowed drawdown duration for preset trading strategies
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="strategies" className="space-y-6 mt-4">
            <div className="space-y-6">
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold text-base">Trailing Configuration</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="trailing-with">With Trailing</Label>
                    <p className="text-sm text-muted-foreground">Enable trailing stop loss</p>
                  </div>
                  <Switch
                    id="trailing-with"
                    checked={settings.trailingWithTrailing}
                    onCheckedChange={(checked) => updateSetting("trailingWithTrailing", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="trailing-only">Trailing Only</Label>
                    <p className="text-sm text-muted-foreground">Use only trailing (no fixed TP/SL)</p>
                  </div>
                  <Switch
                    id="trailing-only"
                    checked={settings.trailingOnly}
                    onCheckedChange={(checked) => updateSetting("trailingOnly", checked)}
                    disabled={!settings.trailingWithTrailing}
                  />
                </div>
              </div>

              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold text-base">Adjust Type: Block</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="block-enabled">Block Adjustment</Label>
                    <p className="text-sm text-muted-foreground">Enable block-based position sizing</p>
                  </div>
                  <Switch
                    id="block-enabled"
                    checked={settings.blockEnabled}
                    onCheckedChange={(checked) => updateSetting("blockEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="block-only">Block Only</Label>
                    <p className="text-sm text-muted-foreground">Use only block adjustment for this strategy</p>
                  </div>
                  <Switch
                    id="block-only"
                    checked={settings.blockOnly}
                    onCheckedChange={(checked) => updateSetting("blockOnly", checked)}
                    disabled={!settings.blockEnabled}
                  />
                </div>
              </div>

              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold text-base">Adjust Type: DCA</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="dca-enabled">DCA Adjustment</Label>
                    <p className="text-sm text-muted-foreground">Enable Dollar Cost Averaging</p>
                  </div>
                  <Switch
                    id="dca-enabled"
                    checked={settings.dcaEnabled}
                    onCheckedChange={(checked) => updateSetting("dcaEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="dca-only">DCA Only</Label>
                    <p className="text-sm text-muted-foreground">Use only DCA adjustment for this strategy</p>
                  </div>
                  <Switch
                    id="dca-only"
                    checked={settings.dcaOnly}
                    onCheckedChange={(checked) => updateSetting("dcaOnly", checked)}
                    disabled={!settings.dcaEnabled}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preset" className="space-y-6 mt-4">
            <div className="space-y-6">
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-semibold text-base">Preset Trade Strategy Support</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Configure which adjustment strategies are supported for preset trading
                </p>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="preset-block">Block Adjustment Support</Label>
                    <p className="text-sm text-muted-foreground">Enable block adjustment for preset trades</p>
                  </div>
                  <Switch
                    id="preset-block"
                    checked={settings.presetTradeBlockEnabled}
                    onCheckedChange={(checked) => updateSetting("presetTradeBlockEnabled", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="preset-dca">DCA Adjustment Support</Label>
                    <p className="text-sm text-muted-foreground">Enable DCA adjustment for preset trades</p>
                  </div>
                  <Switch
                    id="preset-dca"
                    checked={settings.presetTradeDcaEnabled}
                    onCheckedChange={(checked) => updateSetting("presetTradeDcaEnabled", checked)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
