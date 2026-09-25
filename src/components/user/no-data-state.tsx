import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"

interface NoDataStateProps {
  title: string
  description: string
}

/**
 * Shared empty-state for user panel list pages
 * (no quizzes / no assessments assigned).
 */
export function NoDataState({ title, description }: NoDataStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-10">
        <Image
          src="/nodata.svg"
          alt="No data illustration"
          width={240}
          height={234}
          className="mb-4"
          priority
          unoptimized
        />
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-center max-w-md">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}
