"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Settings, Info, CheckCircle, AlertCircle } from "lucide-react"
import { useSettings } from "@/components/providers/settings-provider"

interface SettingsMenuProps {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  showLabel?: boolean
}

export function SettingsMenu({ 
  variant = "ghost", 
  size = "sm", 
  showLabel = false 
}: SettingsMenuProps) {
  const { settings } = useSettings()

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return "Never"
    
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    
    return date.toLocaleDateString()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <Settings className="h-4 w-4" />
          {showLabel && <span className="ml-2">Settings</span>}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground border-b">
          Site Settings
        </div>

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-500" />
            <span>System: Active</span>
          </div>
          <div className="mt-1">
            Last updated: {settings?.updatedAt ? formatLastUpdated(new Date(settings.updatedAt)) : "Never"}
          </div>
        </div>

        {settings?.maintenanceMode && (
          <div className="px-2 py-1.5">
            <div className="flex items-center gap-2 text-xs text-yellow-600 bg-yellow-50 rounded p-1">
              <AlertCircle className="h-3 w-3" />
              <span>Maintenance Mode</span>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}