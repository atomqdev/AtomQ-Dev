"use client"

import React, { useEffect, createContext, useContext, useCallback } from "react"
import { useSettingsStore, Settings } from "@/stores/settings"
import { toasts } from "@/lib/toasts"
import { signOut, useSession } from "next-auth/react"
import { useUserStore } from "@/stores/user"

interface SettingsContextType {
  settings: Settings
  isLoading: boolean
  error: string | null
  updateSettings: (updates: Partial<Settings>) => Promise<void>
  fetchSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType>({
  settings: {
    maintenanceMode: false,
  },
  isLoading: false,
  error: null,
  updateSettings: async () => {},
  fetchSettings: async () => {},
})

export const useSettings = () => useContext(SettingsContext)

interface SettingsProviderProps {
  children: React.ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const {
    settings,
    isLoading,
    error,
    setSettings,
    updateSettings: updateStoreSettings,
    setLoading,
    setError,
    fetchSettings: fetchStoreSettings
  } = useSettingsStore()

  const { data: session, status: sessionStatus } = useSession()
  const { user } = useUserStore()

  // Fetch settings on mount - only after session is authenticated
  useEffect(() => {
    // Only fetch when session is authenticated (not loading and not unauthenticated)
    if (sessionStatus === 'authenticated') {
      fetchStoreSettings()
    }
  }, [sessionStatus, fetchStoreSettings])

  // Logout non-admin users when maintenance mode is enabled
  // Use session for more reliable role check to avoid race conditions
  useEffect(() => {
    if (settings?.maintenanceMode && session?.user) {
      const userRole = session.user.role || user?.role

      // Only logout if user is NOT an admin
      if (userRole !== 'ADMIN') {
        // Show toast notification
        toasts.error('Site is under maintenance. You have been logged out.')

        // Sign out the user
        signOut({ callbackUrl: '/' })
      }
    }
  }, [settings?.maintenanceMode, session?.user, session?.user?.role, user?.role])

  const updateSettings = useCallback(async (updates: Partial<Settings>) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const updatedSettings = await response.json()
        setSettings(updatedSettings)
        toasts.settingsUpdated()

        // Show specific toasts for maintenance mode changes
        if ('maintenanceMode' in updates && updates.maintenanceMode !== settings.maintenanceMode) {
          if (updates.maintenanceMode) {
            toasts.maintenanceModeEnabled()
          } else {
            toasts.maintenanceModeDisabled()
          }
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update settings')
        toasts.actionFailed('Settings update')
      }
    } catch (error) {
      setError('Network error while updating settings')
      toasts.actionFailed('Settings update')
    } finally {
      setLoading(false)
    }
  }, [settings.maintenanceMode, setSettings, setLoading, setError])

  const fetchSettings = useCallback(async () => {
    await fetchStoreSettings()
  }, [fetchStoreSettings])

  const value: SettingsContextType = {
    settings,
    isLoading,
    error,
    updateSettings,
    fetchSettings,
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}