"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Loader2, Code, FileArchive, Shield, Lock } from "lucide-react"

export default function DownloadSourcePage() {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadComplete, setDownloadComplete] = useState(false)
  const [error, setError] = useState("")

  const handleDownload = async () => {
    setIsDownloading(true)
    setDownloadComplete(false)
    setError("")

    try {
      const response = await fetch("/api/download-source", {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || "Failed to download source code")
        setIsDownloading(false)
        return
      }

      // Get the blob from the response
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      // Create a temporary link and click it
      const link = document.createElement("a")
      link.href = url
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      link.download = `atom-q-source-${timestamp}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up
      window.URL.revokeObjectURL(url)
      setDownloadComplete(true)
    } catch (err) {
      console.error("Error downloading source code:", err)
      setError("Failed to download source code. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-2">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Code className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Download Source Code</CardTitle>
            <CardDescription>
              Download the complete Atom-Q application source code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <FileArchive className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Complete Source Code</h3>
                  <p className="text-sm text-muted-foreground">
                    All source files, configurations, and assets in a single ZIP file
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Admin Access Required</h3>
                  <p className="text-sm text-muted-foreground">
                    You need admin credentials to download the source code
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
                <Lock className="w-5 h-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Secure Access</h3>
                  <p className="text-sm text-muted-foreground">
                    Hidden page - only accessible via direct URL
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full"
              size="lg"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing Download...
                </>
              ) : downloadComplete ? (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Again
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download Source Code
                </>
              )}
            </Button>

            {error && (
              <p className="text-center text-sm text-red-600 font-medium">
                {error}
              </p>
            )}

            {downloadComplete && !error && (
              <p className="text-center text-sm text-green-600 font-medium">
                ✓ Download started successfully
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
