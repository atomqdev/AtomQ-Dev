"use client"

import React, { useEffect, createContext, useContext, useCallback } from "react"
import { useRegistrationSettingsStore, RegistrationSettings } from "@/stores/settings"
import { toasts } from "@/lib/toasts"
import { useSession } from "next-auth/react"

interface RegistrationSettingsContextType {
  registrationSettings: RegistrationSettings
  isLoading: boolean
  error: string | null
  updateRegistrationSettings: (updates: Partial<RegistrationSettings>) => Promise<void>
  fetchRegistrationSettings: () => Promise<void>
}

const RegistrationSettingsContext = createContext<RegistrationSettingsContextType>({
  registrationSettings: {
    allowRegistration: true,
  },
  isLoading: false,
  error: null,
  updateRegistrationSettings: async () => {},
  fetchRegistrationSettings: async () => {},
})

export const useRegistrationSettings = () => useContext(RegistrationSettingsContext)

interface RegistrationSettingsProviderProps {
  children: React.ReactNode
}

export function RegistrationSettingsProvider({ children }: RegistrationSettingsProviderProps) {
  const {
    registrationSettings,
    isLoading,
    error,
    setRegistrationSettings,
    updateRegistrationSettings: updateStoreSettings,
    setLoading,
    setError,
    fetchRegistrationSettings: fetchStoreSettings
  } = useRegistrationSettingsStore()

  const { status: sessionStatus } = useSession()

  // Fetch registration settings on mount - only after session is authenticated
  useEffect(() => {
    // Only fetch when session is authenticated (not loading and not unauthenticated)
    if (sessionStatus === 'authenticated') {
      fetchStoreSettings()
    }
  }, [sessionStatus, fetchStoreSettings])

  const updateRegistrationSettings = useCallback(async (updates: Partial<RegistrationSettings>) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/public/registration-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const updatedSettings = await response.json()
        setRegistrationSettings(updatedSettings)
        toasts.settingsUpdated()

        // Show specific toasts for registration changes
        if ('allowRegistration' in updates && updates.allowRegistration !== registrationSettings.allowRegistration) {
          if (updates.allowRegistration) {
            toasts.actionSuccess('Registration enabled')
          } else {
            toasts.actionSuccess('Registration disabled')
          }
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update registration settings')
        toasts.actionFailed('Registration settings update')
      }
    } catch (error) {
      setError('Network error while updating registration settings')
      toasts.actionFailed('Registration settings update')
    } finally {
      setLoading(false)
    }
  }, [registrationSettings.allowRegistration, setRegistrationSettings, setLoading, setError])

  const fetchRegistrationSettings = useCallback(async () => {
    await fetchStoreSettings()
  }, [fetchStoreSettings])

  const value: RegistrationSettingsContextType = {
    registrationSettings,
    isLoading,
    error,
    updateRegistrationSettings,
    fetchRegistrationSettings,
  }

  return (
    <RegistrationSettingsContext.Provider value={value}>
      {children}
    </RegistrationSettingsContext.Provider>
  )
}
