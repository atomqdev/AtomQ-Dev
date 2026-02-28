"use client"

import { Toaster } from "sonner"
import { SessionProviderWrapper } from "@/components/providers/session-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { AccentColorProvider } from "@/components/providers/accent-color-provider"
import { SettingsProvider } from "@/components/providers/settings-provider"
import { RegistrationSettingsProvider } from "@/components/providers/registration-settings-provider"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <SessionProviderWrapper>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        enableColorScheme
      >
        <AccentColorProvider>
          <SettingsProvider>
            <RegistrationSettingsProvider>
              <AnimatePresence>
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
              <Toaster richColors position="bottom-right" />
            </RegistrationSettingsProvider>
          </SettingsProvider>
        </AccentColorProvider>
      </ThemeProvider>
    </SessionProviderWrapper>
  )
}