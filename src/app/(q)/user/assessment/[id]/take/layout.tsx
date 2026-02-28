"use client"

export default function AssessmentTakeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}
