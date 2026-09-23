import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    // Student engagement window: last 14 days (including today)
    const since = new Date()
    since.setHours(0, 0, 0, 0)
    since.setDate(since.getDate() - 13)

    const [totalUsers, totalQuizzes, totalQuestions, totalCampuses, recentQuizzes, recentAssessments, campuses, completedAttempts, startedAttemptsCount] = await Promise.all([
      db.user.count({
        where: { role: UserRole.USER }
      }),
      db.quiz.count(),
      db.question.count(),
      db.campus.count(),
      db.quiz.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          createdAt: true,
          difficulty: true,
          status: true,
          creator: {
            select: { name: true, email: true }
          },
          campus: {
            select: { shortName: true, name: true }
          },
          _count: {
            select: { quizQuestions: true }
          }
        }
      }),
      db.assessment.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          createdAt: true,
          difficulty: true,
          status: true,
          creator: {
            select: { name: true, email: true }
          },
          campus: {
            select: { shortName: true, name: true }
          },
          _count: {
            select: { assessmentQuestions: true }
          }
        }
      }),
      db.campus.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { users: { where: { role: UserRole.USER } } }
          },
          departments: {
            orderBy: { name: "asc" },
            include: {
              _count: {
                select: { users: { where: { role: UserRole.USER } } }
              }
            }
          },
          batches: {
            orderBy: { createdAt: "asc" },
            include: {
              _count: {
                select: { users: { where: { role: UserRole.USER } } }
              }
            }
          }
        }
      }),
      db.quizAttempt.findMany({
        where: {
          status: "SUBMITTED",
          submittedAt: { gte: since },
          user: { role: UserRole.USER }
        },
        select: {
          userId: true,
          submittedAt: true,
          score: true,
          totalPoints: true,
          user: {
            select: {
              name: true,
              email: true,
              campus: { select: { shortName: true } }
            }
          }
        },
        orderBy: { submittedAt: "desc" }
      }),
      db.quizAttempt.count({
        where: {
          startedAt: { gte: since },
          user: { role: UserRole.USER }
        }
      })
    ])

    // Bucket completed attempts per day and per student
    const dayKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

    const buckets = new Map<
      string,
      { date: string; label: string; completions: number; activeStudents: Set<string> }
    >()
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      buckets.set(dayKey(d), {
        date: dayKey(d),
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        completions: 0,
        activeStudents: new Set<string>(),
      })
    }

    const perStudent = new Map<
      string,
      {
        userId: string
        name: string
        email: string
        campusShortName: string | null
        completed: number
        scorePercents: number[]
      }
    >()

    for (const attempt of completedAttempts) {
      if (!attempt.submittedAt) continue
      const bucket = buckets.get(dayKey(new Date(attempt.submittedAt)))
      if (bucket) {
        bucket.completions += 1
        bucket.activeStudents.add(attempt.userId)
      }

      const student = perStudent.get(attempt.userId) ?? {
        userId: attempt.userId,
        name: attempt.user?.name || attempt.user?.email || "Unknown",
        email: attempt.user?.email ?? "",
        campusShortName: attempt.user?.campus?.shortName ?? null,
        completed: 0,
        scorePercents: [] as number[],
      }
      student.completed += 1
      if (attempt.score !== null && attempt.totalPoints !== null && attempt.totalPoints > 0) {
        student.scorePercents.push((attempt.score / attempt.totalPoints) * 100)
      }
      perStudent.set(attempt.userId, student)
    }

    const students = Array.from(perStudent.values())
    const studentAvg = (s: { scorePercents: number[] }) =>
      s.scorePercents.length
        ? s.scorePercents.reduce((a, b) => a + b, 0) / s.scorePercents.length
        : Number.NEGATIVE_INFINITY

    const topStudents = students
      .sort((a, b) => b.completed - a.completed || studentAvg(b) - studentAvg(a))
      .slice(0, 5)
      .map((s) => ({
        userId: s.userId,
        name: s.name,
        email: s.email,
        campusShortName: s.campusShortName,
        completed: s.completed,
        avgScore: s.scorePercents.length
          ? Math.round(s.scorePercents.reduce((a, b) => a + b, 0) / s.scorePercents.length)
          : null,
      }))

    const allScorePercents = students.flatMap((s) => s.scorePercents)

    const engagement = {
      days: Array.from(buckets.values()).map(({ date, label, completions, activeStudents }) => ({
        date,
        label,
        completions,
        activeStudents: activeStudents.size,
      })),
      totalCompletions: completedAttempts.length,
      activeStudents: students.length,
      startedAttempts: startedAttemptsCount,
      completionRate:
        startedAttemptsCount > 0
          ? Math.round((completedAttempts.length / startedAttemptsCount) * 100)
          : null,
      avgScore: allScorePercents.length
        ? Math.round(allScorePercents.reduce((a, b) => a + b, 0) / allScorePercents.length)
        : null,
      topStudents,
    }

    return NextResponse.json({
      totalUsers,
      totalQuizzes,
      totalQuestions,
      totalCampuses,
      recentQuizzes,
      recentAssessments,
      campuses: campuses.map((campus) => ({
        id: campus.id,
        name: campus.name,
        shortName: campus.shortName,
        logo: campus.logo,
        location: campus.location,
        isActive: campus.isActive,
        totalStudents: campus._count.users,
        departments: campus.departments.map((department) => ({
          id: department.id,
          name: department.name,
          studentCount: department._count.users,
        })),
        batches: campus.batches.map((batch) => ({
          id: batch.id,
          name: batch.name,
          studentCount: batch._count.users,
        })),
      })),
      engagement
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
