"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Database,
  Download,
  Server,
  CheckCircle2,
  XCircle,
  Loader2,
  Terminal,
  Package,
  FileText,
  Archive,
} from "lucide-react"
import { toast } from "sonner"

interface InstallLog {
  timestamp: string
  level: "info" | "success" | "error" | "warning"
  message: string
}

interface Backup {
  id: string
  name: string
  size: string
  created_at: string
  type: "manual" | "automatic"
}

export default function InstallManager() {
  const [installing, setInstalling] = useState(false)
  const [installLogs, setInstallLogs] = useState<InstallLog[]>([])
  const [backups, setBackups] = useState<Backup[]>([])
  const [loadingBackups, setLoadingBackups] = useState(false)
  const [backupName, setBackupName] = useState("")
  const [remoteConfig, setRemoteConfig] = useState({
    host: "",
    port: "22",
    username: "",
    password: "",
    projectName: "cts-v3",
    installPath: "/opt/trading",
  })

  const addLog = (level: InstallLog["level"], message: string) => {
    setInstallLogs((prev) => [
      ...prev,
      {
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
      },
    ])
  }

  const initializeDatabase = async () => {
    setInstalling(true)
    setInstallLogs([])
    addLog("info", "Starting database initialization...")

    try {
      const response = await fetch("/api/install/database/init", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Database initialization failed")

      const data = await response.json()
      addLog("success", `Database initialized successfully`)
      addLog("info", `Created ${data.tables_created} tables`)
      addLog("info", `Executed ${data.critical_scripts_executed || 0} critical scripts`)
      addLog("info", `Applied ${data.indexes_created || 0} performance indexes`)
      addLog("info", `Set ${data.pragmas_set || 0} database optimizations`)
      toast.success("Database initialized successfully")
    } catch (error) {
      addLog("error", `Failed to initialize database: ${error}`)
      toast.error("Database initialization failed")
    } finally {
      setInstalling(false)
    }
  }

  const runMigrations = async () => {
    setInstalling(true)
    setInstallLogs([])
    addLog("info", "Running database migrations...")

    try {
      const response = await fetch("/api/install/database/migrate", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Migration failed")

      const data = await response.json()
      addLog("success", `Migrations completed successfully`)
      addLog("info", `Applied ${data.migrations_applied} migrations`)
      addLog("info", `Applied ${data.indexes_created || 0} performance indexes`)
      toast.success("Migrations completed successfully")
    } catch (error) {
      addLog("error", `Failed to run migrations: ${error}`)
      toast.error("Migration failed")
    } finally {
      setInstalling(false)
    }
  }

  const resetDatabase = async () => {
    if (!confirm("Are you sure you want to reset the database? This will delete all data!")) return

    setInstalling(true)
    setInstallLogs([])
    addLog("warning", "Resetting database - all data will be lost!")

    try {
      const response = await fetch("/api/install/database/reset", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Database reset failed")

      addLog("success", "Database reset successfully")
      addLog("info", "All tables dropped and recreated")
      toast.success("Database reset successfully")
    } catch (error) {
      addLog("error", `Failed to reset database: ${error}`)
      toast.error("Database reset failed")
    } finally {
      setInstalling(false)
    }
  }

  const runDiagnostics = async () => {
    setInstalling(true)
    setInstallLogs([])
    addLog("info", "Running system diagnostics...")

    try {
      const response = await fetch("/api/install/diagnostics", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Diagnostics failed")

      const data = await response.json()
      addLog("info", `System: ${data.system.platform} ${data.system.version}`)
      addLog("info", `Node: ${data.node.version}`)
      addLog("info", `Database: ${data.database.status}`)
      addLog("info", `Connections: ${data.connections.count} configured`)
      addLog("success", "Diagnostics completed successfully")
      toast.success("Diagnostics completed")
    } catch (error) {
      addLog("error", `Diagnostics failed: ${error}`)
      toast.error("Diagnostics failed")
    } finally {
      setInstalling(false)
    }
  }

  const checkDependencies = async () => {
    setInstalling(true)
    setInstallLogs([])
    addLog("info", "Checking dependencies...")

    try {
      const response = await fetch("/api/install/dependencies", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Dependency check failed")

      const data = await response.json()
      data.dependencies.forEach((dep: any) => {
        if (dep.installed) {
          addLog("success", `✓ ${dep.name} ${dep.version}`)
        } else {
          addLog("error", `✗ ${dep.name} - NOT INSTALLED`)
        }
      })
      addLog("info", `${data.installed_count}/${data.total_count} dependencies installed`)
      toast.success("Dependency check completed")
    } catch (error) {
      addLog("error", `Dependency check failed: ${error}`)
      toast.error("Dependency check failed")
    } finally {
      setInstalling(false)
    }
  }

  const viewSystemInfo = async () => {
    setInstalling(true)
    setInstallLogs([])
    addLog("info", "Retrieving system information...")

    try {
      const response = await fetch("/api/install/system-info", {
        method: "GET",
      })

      if (!response.ok) throw new Error("Failed to retrieve system info")

      const data = await response.json()
      addLog("info", `=== System Information ===`)
      addLog("info", `Platform: ${data.platform}`)
      addLog("info", `Architecture: ${data.arch}`)
      addLog("info", `Node Version: ${data.node_version}`)
      addLog("info", `Total Memory: ${data.total_memory} GB`)
      addLog("info", `Free Memory: ${data.free_memory} GB`)
      addLog("info", `CPU Cores: ${data.cpu_cores}`)
      addLog("info", `Uptime: ${data.uptime} hours`)
      addLog("success", "System information retrieved")
    } catch (error) {
      addLog("error", `Failed to retrieve system info: ${error}`)
      toast.error("Failed to retrieve system info")
    } finally {
      setInstalling(false)
    }
  }

  const exportConfiguration = async () => {
    setInstalling(true)
    addLog("info", "Exporting configuration...")

    try {
      const response = await fetch("/api/install/export", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `cts-v3-config-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      addLog("success", "Configuration exported successfully")
      toast.success("Configuration exported")
    } catch (error) {
      addLog("error", `Export failed: ${error}`)
      toast.error("Export failed")
    } finally {
      setInstalling(false)
    }
  }

  const importConfiguration = async (file: File) => {
    setInstalling(true)
    setInstallLogs([])
    addLog("info", `Importing configuration from ${file.name}...`)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/install/import", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Import failed")

      const data = await response.json()
      addLog("success", "Configuration imported successfully")
      addLog("info", `Imported ${data.settings_count} settings`)
      addLog("info", `Imported ${data.connections_count} connections`)
      toast.success("Configuration imported")
    } catch (error) {
      addLog("error", `Import failed: ${error}`)
      toast.error("Import failed")
    } finally {
      setInstalling(false)
    }
  }

  const downloadDeployment = async () => {
    setInstalling(true)
    addLog("info", "Preparing deployment package...")

    try {
      const response = await fetch("/api/install/download-deployment", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Download failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `cts-v3-deployment-${new Date().toISOString().split("T")[0]}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      addLog("success", "Deployment package downloaded successfully")
      toast.success("Deployment downloaded")
    } catch (error) {
      addLog("error", `Download failed: ${error}`)
      toast.error("Download failed")
    } finally {
      setInstalling(false)
    }
  }

  const remoteInstall = async () => {
    if (!remoteConfig.host || !remoteConfig.username || !remoteConfig.password) {
      toast.error("Please fill in all remote connection details")
      return
    }

    setInstalling(true)
    setInstallLogs([])
    addLog("info", `Connecting to ${remoteConfig.host}:${remoteConfig.port}...`)

    try {
      const response = await fetch("/api/install/remote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(remoteConfig),
      })

      if (!response.ok) throw new Error("Remote installation failed")

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let iterationCount = 0
        const MAX_ITERATIONS = 10000 // Safety limit

        while (iterationCount < MAX_ITERATIONS) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n").filter((line) => line.trim())

          lines.forEach((line) => {
            try {
              const log = JSON.parse(line)
              addLog(log.level, log.message)
            } catch {
              addLog("info", line)
            }
          })

          iterationCount++
        }

        if (iterationCount >= MAX_ITERATIONS) {
          addLog("warning", "Stream reading limit reached - connection may still be active")
        }
      }

      addLog("success", "Remote installation completed successfully")
      toast.success("Remote installation completed")
    } catch (error) {
      addLog("error", `Remote installation failed: ${error}`)
      toast.error("Remote installation failed")
    } finally {
      setInstalling(false)
    }
  }

  const loadBackups = async () => {
    setLoadingBackups(true)
    try {
      const response = await fetch("/api/install/backup/list")
      if (!response.ok) throw new Error("Failed to load backups")

      const data = await response.json()
      setBackups(data.backups || [])
    } catch (error) {
      toast.error("Failed to load backups")
      console.error(error)
    } finally {
      setLoadingBackups(false)
    }
  }

  const createBackup = async () => {
    if (!backupName.trim()) {
      toast.error("Please enter a backup name")
      return
    }

    setInstalling(true)
    setInstallLogs([])
    addLog("info", `Creating backup: ${backupName}...`)

    try {
      const response = await fetch("/api/install/backup/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: backupName }),
      })

      if (!response.ok) throw new Error("Backup creation failed")

      const data = await response.json()
      addLog("success", `Backup created successfully: ${data.backup_name}`)
      addLog("info", `Backup size: ${data.size}`)
      addLog("info", `Backup location: ${data.path}`)
      toast.success("Backup created successfully")
      setBackupName("")
      loadBackups()
    } catch (error) {
      addLog("error", `Failed to create backup: ${error}`)
      toast.error("Backup creation failed")
    } finally {
      setInstalling(false)
    }
  }

  const restoreBackup = async (backupId: string) => {
    if (!confirm("Are you sure you want to restore this backup? Current data will be replaced!")) return

    setInstalling(true)
    setInstallLogs([])
    addLog("warning", `Restoring backup: ${backupId}...`)

    try {
      const response = await fetch("/api/install/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup_id: backupId }),
      })

      if (!response.ok) throw new Error("Backup restoration failed")

      const data = await response.json()
      addLog("success", "Backup restored successfully")
      addLog("info", `Restored ${data.tables_restored} tables`)
      addLog("info", `Restored ${data.records_restored} records`)
      toast.success("Backup restored successfully")
    } catch (error) {
      addLog("error", `Failed to restore backup: ${error}`)
      toast.error("Backup restoration failed")
    } finally {
      setInstalling(false)
    }
  }

  const downloadBackup = async (backupId: string, backupName: string) => {
    setInstalling(true)
    addLog("info", `Downloading backup: ${backupName}...`)

    try {
      const response = await fetch(`/api/install/backup/download?backup_id=${backupId}`)
      if (!response.ok) throw new Error("Download failed")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${backupName}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      addLog("success", "Backup downloaded successfully")
      toast.success("Backup downloaded")
    } catch (error) {
      addLog("error", `Download failed: ${error}`)
      toast.error("Download failed")
    } finally {
      setInstalling(false)
    }
  }

  const deleteBackup = async (backupId: string) => {
    if (!confirm("Are you sure you want to delete this backup?")) return

    setInstalling(true)
    setInstallLogs([])
    addLog("info", `Deleting backup: ${backupId}...`)

    try {
      const response = await fetch("/api/install/backup/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup_id: backupId }),
      })

      if (!response.ok) throw new Error("Backup deletion failed")

      addLog("success", "Backup deleted successfully")
      toast.success("Backup deleted")
      loadBackups()
    } catch (error) {
      addLog("error", `Failed to delete backup: ${error}`)
      toast.error("Backup deletion failed")
    } finally {
      setInstalling(false)
    }
  }

  const getLogIcon = (level: InstallLog["level"]) => {
    switch (level) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <Terminal className="h-4 w-4 text-yellow-500" />
      default:
        return <Terminal className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="local" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="local">Local Install</TabsTrigger>
          <TabsTrigger value="remote">Remote Install</TabsTrigger>
          <TabsTrigger value="deployment">Deployment</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="local" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Database Status
              </CardTitle>
              <CardDescription>Current database connection and configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Database Type:</span>
                  <Badge variant="default" className="bg-green-600">
                    {process.env.DATABASE_URL ? "PostgreSQL" : "SQLite"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Connection:</span>
                  <Badge variant={process.env.DATABASE_URL ? "default" : "secondary"}>
                    {process.env.DATABASE_URL ? "Remote Connected" : "Local SQLite"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Auto-Initialize:</span>
                  <Badge variant="default">Enabled on Deployment</Badge>
                </div>
                {!process.env.DATABASE_URL && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Using SQLite for local development. To use PostgreSQL, add DATABASE_URL to environment variables.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Setup
              </CardTitle>
              <CardDescription>Initialize or manage database tables (runs automatically on deployment)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button onClick={initializeDatabase} disabled={installing}>
                  {installing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Initialize Database
                </Button>
                <Button onClick={runMigrations} disabled={installing} variant="outline">
                  Run Migrations
                </Button>
                <Button onClick={resetDatabase} disabled={installing} variant="destructive">
                  Reset Database
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Note: Database initialization runs automatically on every Vercel deployment. Manual initialization is
                only needed for troubleshooting.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                System Diagnostics
              </CardTitle>
              <CardDescription>Check system health and configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button onClick={runDiagnostics} disabled={installing} variant="outline">
                  Run Diagnostics
                </Button>
                <Button onClick={checkDependencies} disabled={installing} variant="outline">
                  Check Dependencies
                </Button>
                <Button onClick={viewSystemInfo} disabled={installing} variant="outline">
                  View System Info
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>Import/export system data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button onClick={exportConfiguration} disabled={installing} variant="outline">
                  Export Configuration
                </Button>
                <Button
                  onClick={() => {
                    const input = document.createElement("input")
                    input.type = "file"
                    input.accept = ".json"
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) importConfiguration(file)
                    }
                    input.click()
                  }}
                  disabled={installing}
                  variant="outline"
                >
                  Import Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="remote" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Remote Installation
              </CardTitle>
              <CardDescription>Install CTS v3 on a remote server via SSH</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="remote-host">Server Host/IP</Label>
                  <Input
                    id="remote-host"
                    placeholder="192.168.1.100"
                    value={remoteConfig.host}
                    onChange={(e) => setRemoteConfig({ ...remoteConfig, host: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remote-port">SSH Port</Label>
                  <Input
                    id="remote-port"
                    type="number"
                    placeholder="22"
                    value={remoteConfig.port}
                    onChange={(e) => setRemoteConfig({ ...remoteConfig, port: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remote-username">SSH Username</Label>
                  <Input
                    id="remote-username"
                    placeholder="root"
                    value={remoteConfig.username}
                    onChange={(e) => setRemoteConfig({ ...remoteConfig, username: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remote-password">SSH Password</Label>
                  <Input
                    id="remote-password"
                    type="password"
                    placeholder="Enter password"
                    value={remoteConfig.password}
                    onChange={(e) => setRemoteConfig({ ...remoteConfig, password: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remote-project-name">Project Name</Label>
                  <Input
                    id="remote-project-name"
                    placeholder="cts-v3"
                    value={remoteConfig.projectName}
                    onChange={(e) => setRemoteConfig({ ...remoteConfig, projectName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remote-install-path">Installation Path</Label>
                  <Input
                    id="remote-install-path"
                    placeholder="/opt/trading"
                    value={remoteConfig.installPath}
                    onChange={(e) => setRemoteConfig({ ...remoteConfig, installPath: e.target.value })}
                  />
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Remote Installation Process</h4>
                <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                  <p>1. Connect to remote server via SSH</p>
                  <p>2. Install system dependencies (Node.js, PostgreSQL, etc.)</p>
                  <p>3. Clone and setup CTS v3 project</p>
                  <p>4. Configure environment variables</p>
                  <p>5. Initialize database and run migrations</p>
                  <p>6. Start the trading system</p>
                </div>
              </div>

              <Button onClick={remoteInstall} disabled={installing} className="w-full">
                {installing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Server className="h-4 w-4 mr-2" />}
                Start Remote Installation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Deployment Package
              </CardTitle>
              <CardDescription>Download active running project as deployment package</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Download the complete CTS v3 system including all configurations, database schema, and dependencies as a
                ready-to-deploy package.
              </p>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Package Contents</h4>
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <p>• Complete source code and dependencies</p>
                  <p>• Database schema and migration scripts</p>
                  <p>• System configuration files</p>
                  <p>• Exchange connection settings (encrypted)</p>
                  <p>• Installation and setup scripts</p>
                  <p>• Documentation and README</p>
                </div>
              </div>

              <Button onClick={downloadDeployment} disabled={installing} className="w-full">
                {installing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Download Deployment Package
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Archive className="h-5 w-5" />
                    Available Backups
                  </CardTitle>
                  <CardDescription>Manage and restore your system backups</CardDescription>
                </div>
                <Button onClick={loadBackups} disabled={loadingBackups} variant="outline" size="sm">
                  {loadingBackups ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {backups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Archive className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No backups available</p>
                  <p className="text-sm">Create your first backup to get started</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] w-full">
                  <div className="space-y-3">
                    {backups.map((backup) => (
                      <div
                        key={backup.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{backup.name}</h4>
                            <Badge variant={backup.type === "automatic" ? "secondary" : "default"}>{backup.type}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-0.5">
                            <p>Size: {backup.size}</p>
                            <p>Created: {new Date(backup.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => restoreBackup(backup.id)}
                            disabled={installing}
                            variant="outline"
                            size="sm"
                          >
                            Restore
                          </Button>
                          <Button
                            onClick={() => downloadBackup(backup.id, backup.name)}
                            disabled={installing}
                            variant="outline"
                            size="sm"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => deleteBackup(backup.id)}
                            disabled={installing}
                            variant="destructive"
                            size="sm"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Backup Best Practices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Regular Backups</p>
                    <p className="text-muted-foreground">
                      Create backups before major updates or configuration changes
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Off-site Storage</p>
                    <p className="text-muted-foreground">Download and store backups in a secure off-site location</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Test Restores</p>
                    <p className="text-muted-foreground">
                      Periodically test backup restoration to ensure data integrity
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Retention Policy</p>
                    <p className="text-muted-foreground">
                      Keep multiple backup versions and delete old backups regularly
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {installLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Installation Logs
              <Badge variant="secondary">{installLogs.length} entries</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <div className="space-y-2 font-mono text-sm">
                {installLogs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2">
                    {getLogIcon(log.level)}
                    <span className="text-sm font-medium">[{log.timestamp}]</span>
                    <span className={log.level === "error" ? "text-red-500" : ""}>{log.message}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
