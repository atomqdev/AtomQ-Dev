import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

const WINDOW_DAYS = 365

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.USER) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Client sends its timezone offset in minutes (Date.getTimezoneOffset(), e.g. -330 for IST)
    // so submissions are bucketed into the user's local calendar days.
    const tzParam = Number(request.nextUrl.searchParams.get("tz") ?? "0")
    const tzOffsetMinutes = Number.isFinite(tzParam) ? tzParam : 0
    const shiftToLocal = (d: Date) => new Date(d.getTime() - tzOffsetMinutes * 60_000)

    const now = new Date()
    const localNow = shiftToLocal(now)
    const todayKey = localNow.toISOString().slice(0, 10)

    // Window start: local calendar day (WINDOW_DAYS - 1) days ago, converted back to real UTC for the DB query
    const localStart = new Date(localNow)
    localStart.setUTCDate(localStart.getUTCDate() - (WINDOW_DAYS - 1))
    localStart.setUTCHours(0, 0, 0, 0)
    const windowStartUtc = new Date(localStart.getTime() + tzOffsetMinutes * 60_000)

    const [quizAttempts, assessmentAttempts] = await Promise.all([
      db.quizAttempt.findMany({
        where: {
          userId,
          status: "SUBMITTED",
          submittedAt: { gte: windowStartUtc },
        },
        select: { submittedAt: true },
      }),
      db.assessmentAttempt.findMany({
        where: {
          userId,
          status: "SUBMITTED",
          submittedAt: { gte: windowStartUtc },
        },
        select: { submittedAt: true },
      }),
    ])

    const counts = new Map<string, number>()
    const addSubmission = (d: Date | null) => {
      if (!d) return
      const key = shiftToLocal(d).toISOString().slice(0, 10)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    quizAttempts.forEach((a) => addSubmission(a.submittedAt))
    assessmentAttempts.forEach((a) => addSubmission(a.submittedAt))

    // Build a dense day list from window start to today (local calendar days)
    const days: Array<{ date: string; count: number }> = []
    const cursor = new Date(localStart)
    for (let i = 0; i < WINDOW_DAYS; i++) {
      const key = cursor.toISOString().slice(0, 10)
      if (key > todayKey) break
      days.push({ date: key, count: counts.get(key) ?? 0 })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }

    const total = days.reduce((sum, d) => sum + d.count, 0)

    return NextResponse.json({ total, days })
  } catch (error) {
    console.error("Error fetching activity calendar:", error)
    return NextResponse.json(
      { message: "Failed to fetch activity calendar" },
      { status: 500 }
    )
  }
}
