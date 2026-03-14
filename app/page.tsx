"use client"

import { useState, useEffect } from "react"
import type { Connection } from "@/lib/connection-manager"
import { ConnectionCard } from "@/components/connection-card"
import { LogViewer } from "@/components/log-viewer"
import { StatisticsPanel } from "@/components/statistics-panel"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, RotateCcw, FileText, Settings, TestTube } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function ConnectionManager() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set())
  const [showLogs, setShowLogs] = useState(false)
  const { toast } = useToast()

  const fetchConnections = async () => {
    try {
      const response = await fetch("/api/connections")
      const data = await response.json()
      setConnections(data.connections || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch connections",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async (id: string) => {
    setTestingIds((prev) => new Set(prev).add(id))
    try {
      const response = await fetch(`/api/connections/${id}/test`, {
        method: "POST",
      })
      const result = await response.json()

      toast({
        title: result.success ? "Success" : "Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      })

      await fetchConnections()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test connection",
        variant: "destructive",
      })
    } finally {
      setTestingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const testAllConnections = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/connections/test-all", {
        method: "POST",
      })
      const data = await response.json()
      setConnections(data.connections || [])

      toast({
        title: "Test Complete",
        description: "All connections have been tested",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test connections",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteConnection = async (id: string) => {
    try {
      await fetch(`/api/connections/${id}`, {
        method: "DELETE",
      })

      toast({
        title: "Success",
        description: "Connection deleted",
      })

      await fetchConnections()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete connection",
        variant: "destructive",
      })
    }
  }

  const toggleDefault = async (id: string, isDefault: boolean) => {
    try {
      await fetch(`/api/connections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault }),
      })

      await fetchConnections()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update connection",
        variant: "destructive",
      })
    }
  }

  const resetToPresets = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/connections/reset", {
        method: "POST",
      })
      const data = await response.json()
      setConnections(data.connections || [])

      toast({
        title: "Reset Complete",
        description: "Connections reset to preset defaults",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset connections",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConnections()
  }, [])

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-balance">Connection Manager</h1>
              <Badge variant="secondary">Vorschau</Badge>
            </div>
            <p className="text-muted-foreground mt-2">Manage and monitor all system connections</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showLogs} onOpenChange={setShowLogs}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Logs
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>System Logs</DialogTitle>
                  <DialogDescription>Detailed logging of all connection activities</DialogDescription>
                </DialogHeader>
                <LogViewer />
              </DialogContent>
            </Dialog>
            <Button onClick={testAllConnections} disabled={loading}>
              <TestTube className="h-4 w-4 mr-2" />
              Test All
            </Button>
            <Button onClick={fetchConnections} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={resetToPresets} variant="outline" disabled={loading}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Presets
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <StatisticsPanel />

        {/* Connections Grid */}
        <div>
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Connections
          </h2>
          {loading && connections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Loading connections...</div>
          ) : connections.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No connections found. Click "Reset to Presets" to load default connections.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {connections.map((connection) => (
                <ConnectionCard
                  key={connection.id}
                  connection={connection}
                  onTest={testConnection}
                  onDelete={deleteConnection}
                  onToggleDefault={toggleDefault}
                  testing={testingIds.has(connection.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
