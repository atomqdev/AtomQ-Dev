"use client"

import { Button } from "@/components/ui/button"
import { Maximize2 } from "lucide-react"

interface FullscreenModalProps {
  onEnableFullscreen: () => void
}

export function FullscreenModal({ onEnableFullscreen }: FullscreenModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Maximize2 className="h-10 w-10 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Fullscreen Required</h2>
          <p className="text-muted-foreground">
            This activity requires fullscreen mode to ensure the best experience
          </p>
        </div>

        <Button
          onClick={onEnableFullscreen}
          size="lg"
          className="min-w-[200px]"
        >
          <Maximize2 className="mr-2 h-5 w-5" />
          Enable Fullscreen
        </Button>
      </div>
    </div>
  )
}
