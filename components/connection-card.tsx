"use client"

import type { Connection } from "@/lib/connection-manager"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Database, Wifi, WifiOff, Loader2, AlertCircle, Trash2, Star, StarOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConnectionCardProps {
  connection: Connection
  onTest: (id: string) => void
  onDelete: (id: string) => void
  onToggleDefault: (id: string, isDefault: boolean) => void
  testing?: boolean
}

export function ConnectionCard({
  connection,
  onTest,
  onDelete,
  onToggleDefault,
  testing = false,
}: ConnectionCardProps) {
  const getStatusColor = (status: Connection["status"]) => {
    switch (status) {
      case "connected":
        return "bg-green-500"
      case "disconnected":
        return "bg-gray-400"
      case "testing":
        return "bg-blue-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-400"
    }
  }

  const getStatusIcon = (status: Connection["status"]) => {
    switch (status) {
      case "connected":
        return <Wifi className="h-4 w-4" />
      case "disconnected":
        return <WifiOff className="h-4 w-4" />
      case "testing":
        return <Loader2 className="h-4 w-4 animate-spin" />
      case "error":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <WifiOff className="h-4 w-4" />
    }
  }

  return (
    <Card className={cn("transition-all hover:shadow-md", connection.status === "error" && "border-destructive")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">{connection.name}</CardTitle>
              <CardDescription className="text-xs mt-1">{connection.type.toUpperCase()}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleDefault(connection.id, !connection.isDefault)}
              className="h-8 w-8"
            >
              {connection.isDefault ? (
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ) : (
                <StarOff className="h-4 w-4" />
              )}
            </Button>
            <Badge variant="outline" className={cn("gap-1", getStatusColor(connection.status), "text-white border-0")}>
              {getStatusIcon(connection.status)}
              {connection.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          <p className="text-muted-foreground text-xs mb-1">URL</p>
          <code className="text-xs bg-muted px-2 py-1 rounded break-all">{connection.url}</code>
        </div>

        {connection.lastTested && (
          <div className="text-xs text-muted-foreground">
            Last tested: {new Date(connection.lastTested).toLocaleString()}
          </div>
        )}

        {connection.error && (
          <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">{connection.error}</div>
        )}

        {connection.metadata && Object.keys(connection.metadata).length > 0 && (
          <div className="text-xs">
            <p className="text-muted-foreground mb-1">Metadata</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(connection.metadata).map(([key, value]) => (
                <Badge key={key} variant="secondary" className="text-xs">
                  {key}: {String(value)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={() => onTest(connection.id)} disabled={testing} size="sm" className="flex-1">
            {testing ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>
          <Button onClick={() => onDelete(connection.id)} disabled={testing} size="sm" variant="destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
