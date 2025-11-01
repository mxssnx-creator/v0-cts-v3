"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, CheckCircle, XCircle, Database, Star } from "lucide-react"

interface Statistics {
  total: number
  connected: number
  disconnected: number
  errors: number
  defaults: number
  connectionRate: number
}

export function StatisticsPanel() {
  const [stats, setStats] = useState<Statistics>({
    total: 0,
    connected: 0,
    disconnected: 0,
    errors: 0,
    defaults: 0,
    connectionRate: 0,
  })

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/statistics")
      const data = await response.json()
      setStats(data.statistics)
    } catch (error) {
      console.error("[v0] Failed to fetch statistics:", error)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  const statCards = [
    {
      title: "Total Connections",
      value: stats.total,
      icon: Database,
      color: "text-blue-500",
    },
    {
      title: "Connected",
      value: stats.connected,
      icon: CheckCircle,
      color: "text-green-500",
    },
    {
      title: "Errors",
      value: stats.errors,
      icon: XCircle,
      color: "text-red-500",
    },
    {
      title: "Default Connections",
      value: stats.defaults,
      icon: Star,
      color: "text-yellow-500",
    },
    {
      title: "Connection Rate",
      value: `${stats.connectionRate.toFixed(1)}%`,
      icon: Activity,
      color: "text-purple-500",
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
