
"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

interface AccentColorContextType {
  accentColor: string
  setAccentColor: (color: string) => void
}

const AccentColorContext = createContext<AccentColorContextType>({
  accentColor: "primary",
  setAccentColor: () => {}
})

export const useAccentColor = () => useContext(AccentColorContext)

const primaryColor = "oklch(0.7 0.2 45)"

export function AccentColorProvider({ children }: { children: React.ReactNode }) {
  const [accentColor, setAccentColor] = useState("primary")

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty("--primary", primaryColor)
    root.style.setProperty("--primary-foreground", "oklch(0.985 0 0)")
  }, [])

  return (
    <AccentColorContext.Provider value={{ accentColor, setAccentColor }}>
      {children}
    </AccentColorContext.Provider>
  )
}
