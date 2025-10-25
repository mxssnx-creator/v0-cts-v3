import MarketDataMonitor from "@/components/realtime/market-data-monitor"
import PositionMonitor from "@/components/realtime/position-monitor"

export default function RealtimePage() {
  // TODO: Get connection ID from user session or context
  const connectionId = "default-connection"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Real-time Monitoring</h1>
        <p className="text-muted-foreground">Live market data and position tracking</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <MarketDataMonitor connectionId={connectionId} />
        <PositionMonitor connectionId={connectionId} />
      </div>
    </div>
  )
}
