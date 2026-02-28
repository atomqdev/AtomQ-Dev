import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-lg font-medium">Loading...</p>
        <p className="text-sm text-muted-foreground">Please wait while we prepare your content.</p>
      </div>
    </div>
  )
}