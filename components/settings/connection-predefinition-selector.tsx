"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"
import { CONNECTION_PREDEFINITIONS, type ConnectionPredefinition } from "@/lib/connection-predefinitions"

interface ConnectionPredefinitionSelectorProps {
  onSelect: (predefinition: ConnectionPredefinition) => void
}

export function ConnectionPredefinitionSelector({ onSelect }: ConnectionPredefinitionSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {CONNECTION_PREDEFINITIONS.map((predefinition) => (
        <Card key={predefinition.id} className="hover:border-primary transition-colors cursor-pointer">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{predefinition.displayName}</CardTitle>
                <CardDescription>{predefinition.description}</CardDescription>
              </div>
              <Badge variant="secondary">{predefinition.maxLeverage}x</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground">Contract Type</p>
                <p className="font-medium">{predefinition.contractType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Position Mode</p>
                <p className="font-medium capitalize">{predefinition.positionMode}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Margin Type</p>
                <p className="font-medium capitalize">{predefinition.marginType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Method</p>
                <p className="font-medium uppercase">{predefinition.connectionMethod}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <a
                href={predefinition.documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                Documentation
                <ExternalLink className="h-3 w-3" />
              </a>
              <Button size="sm" onClick={() => onSelect(predefinition)}>
                Use Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
