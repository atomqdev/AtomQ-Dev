import "../globals.css"
import { SessionProviderWrapper } from "@/components/providers/session-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"

export default function ActivityPrepareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProviderWrapper>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        enableColorScheme
      >
        {children}
      </ThemeProvider>
    </SessionProviderWrapper>
  )
}
