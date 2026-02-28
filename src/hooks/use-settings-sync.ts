"use client"

import { useEffect } from "react"
import { useSettings } from "@/components/providers/settings-provider"
import { useUserStore } from "@/stores/user"

interface UseSettingsSyncOptions {
  enabled?: boolean
  onUpdate?: (settings: any) => void
}

/**
 * Hook to synchronize settings across the application
 * Provides real-time updates when settings change
 */
export function useSettingsSync(options: UseSettingsSyncOptions = {}) {
  const {
    settings,
    isLoading,
    error
  } = useSettings()

  const { user } = useUserStore()

  // Call onUpdate callback when settings change
  useEffect(() => {
    if (settings && options.onUpdate) {
      options.onUpdate(settings)
    }
  }, [settings, options.onUpdate])

  // Handle maintenance mode
  useEffect(() => {
    if (settings?.maintenanceMode && user?.role !== 'ADMIN') {
      // Non-admin users should be redirected or notified
      console.warn('Maintenance mode is active')
    }
  }, [settings?.maintenanceMode, user?.role])

  return {
    settings,
    isLoading,
    error,
    isMaintenanceMode: settings?.maintenanceMode || false,
  }
}
