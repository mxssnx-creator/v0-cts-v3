"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Users,
  Zap,
  Database,
  type LucideIcon,
} from "lucide-react"

interface SystemOverviewProps {
  stats: {
    activeConnections: number
    totalPositions: number
    dailyPnL: number
    totalBalance: number
    indicationsActive: number
    strategiesActive: number
    systemLoad: number
    databaseSize: number
  }
}

const iconMap: Record<string, LucideIcon> = {
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Users,
  Zap,
  Database,
}

export function SystemOverview({ stats }: SystemOverviewProps) {
  const overviewCards = [
    {
      title: "Active Connections",
      value: stats.activeConnections,
      icon: "Activity",
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      title: "Total Positions",
      value: stats.totalPositions,
      icon: "BarChart3",
      color: "text-green-500",
      bgColor: "bg-green-50",
    },
    {
      title: "Daily P&L",
      value: `$${stats.dailyPnL.toFixed(2)}`,
      icon: stats.dailyPnL >= 0 ? "TrendingUp" : "TrendingDown",
      color: stats.dailyPnL >= 0 ? "text-green-500" : "text-red-500",
      bgColor: stats.dailyPnL >= 0 ? "bg-green-50" : "bg-red-50",
    },
    {
      title: "Total Balance",
      value: `$${stats.totalBalance.toFixed(2)}`,
      icon: "DollarSign",
      color: "text-purple-500",
      bgColor: "bg-purple-50",
    },
  ]

  const systemCards = [
    {
      title: "Active Indications",
      value: stats.indicationsActive,
      icon: "Zap",
      color: "text-orange-500",
      bgColor: "bg-orange-50",
    },
    {
      title: "Active Strategies",
      value: stats.strategiesActive,
      icon: "Users",
      color: "text-cyan-500",
      bgColor: "bg-cyan-50",
    },
    {
      title: "System Load",
      value: `${stats.systemLoad}%`,
      icon: "Activity",
      color: "text-yellow-500",
      bgColor: "bg-yellow-50",
    },
    {
      title: "Database Usage",
      value: `${stats.databaseSize}MB`,
      icon: "Database",
      color: "text-indigo-500",
      bgColor: "bg-indigo-50",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Trading Overview */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Trading Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewCards.map((card, index) => {
            const Icon = iconMap[card.icon]
            return (
              <Card key={index}>
                <CardContent className="py-3 px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                      <p className="text-2xl font-bold">{card.value}</p>
                    </div>
                    <div className={`p-2 rounded-full ${card.bgColor}`}>
                      <Icon className={`h-6 w-6 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* System Status */}
      <div>
        <h3 className="text-lg font-semibold mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemCards.map((card, index) => {
            const Icon = iconMap[card.icon]
            return (
              <Card key={index}>
                <CardContent className="py-3 px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                      <p className="text-2xl font-bold">{card.value}</p>
                    </div>
                    <div className={`p-2 rounded-full ${card.bgColor}`}>
                      <Icon className={`h-6 w-6 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>CPU Usage</span>
              <span>{stats.systemLoad}%</span>
            </div>
            <Progress value={stats.systemLoad} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Memory Usage</span>
              <span>65%</span>
            </div>
            <Progress value={65} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Database Load</span>
              <span>42%</span>
            </div>
            <Progress value={42} className="h-2" />
          </div>

          <div className="flex gap-2 pt-2">
            <Badge variant="outline" className="text-green-600">
              Trade Engine: Online
            </Badge>
            <Badge variant="outline" className="text-green-600">
              Web Engine: Online
            </Badge>
            <Badge variant="outline" className="text-blue-600">
              Database: Healthy
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
