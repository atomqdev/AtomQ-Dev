import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole } from "@prisma/client"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  console.log('GET /api/admin/users called') // Debug log
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const campusId = searchParams.get('campusId')
    const departmentId = searchParams.get('departmentId')
    const batchId = searchParams.get('batchId')
    const section = searchParams.get('section')
    const search = searchParams.get('search')

    // Build where clause for filtering
    const whereClause: any = {}

    // Add search functionality for name, email, or uoid
    // Note: SQLite doesn't support mode: 'insensitive' in the same way as PostgreSQL
    if (search && search.trim()) {
      whereClause.OR = [
        { name: { contains: search.trim() } },
        { email: { contains: search.trim() } },
        { uoid: { contains: search.trim() } },
      ]
    }

    if (campusId && campusId !== 'all') {
      whereClause.campusId = campusId
    }

    if (departmentId && departmentId !== 'all') {
      whereClause.departmentId = departmentId
    }

    if (batchId && batchId !== 'all') {
      whereClause.batchId = batchId
    }

    if (section && section !== 'all') {
      whereClause.section = section
    }

    const users = await db.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        uoid: true,
        role: true,
        isActive: true,
        phone: true,
        section: true,
        campus: {
          select: {
            id: true,
            name: true,
            shortName: true
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        },
        batch: {
          select: {
            id: true,
            name: true
          }
        },
        registrationCode: {
          select: {
            code: true
          }
        },
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    // Transform data to match frontend expectations
    const transformedUsers = users.map(user => ({
      ...user,
      campus: user.campus?.name || null,
      campusShortName: user.campus?.shortName || null,
      department: user.department?.name || null,
      batch: user.batch?.name || null,
      registrationCode: user.registrationCode?.code || null,
      campusId: user.campus?.id || null,
      departmentId: user.department?.id || null,
      batchId: user.batch?.id || null
    }))

    return NextResponse.json(transformedUsers)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Handle bulk update (for changing user status)
    if (body.bulkUpdate && Array.isArray(body.userIds) && typeof body.isActive === 'boolean') {
      const { userIds, isActive } = body

      // Update users in bulk
      await db.user.updateMany({
        where: {
          id: {
            in: userIds
          }
        },
        data: {
          isActive
        }
      })

      return NextResponse.json({
        message: `Successfully updated ${userIds.length} users`,
        count: userIds.length
      })
    }

    const { importData, ...userData } = body

    // Handle bulk import
    if (importData && Array.isArray(importData)) {
      const results = []
      const defaultPassword = "user@atomq"
      const hashedPassword = await bcrypt.hash(defaultPassword, 12)

      for (const item of importData) {
        try {
          // Skip if required fields are missing
          if (!item.name || !item.email || !item.uoid) {
            results.push({
              email: item.email || 'unknown',
              status: 'failed',
              message: 'Missing required fields (name, email, uoid)'
            })
            continue
          }

          // Check if user already exists by email
          const existingUser = await db.user.findUnique({
            where: { email: item.email }
          })

          if (existingUser) {
            results.push({
              email: item.email,
              status: 'failed',
              message: 'User already exists'
            })
            continue
          }

          // Check if UOID already exists
          const existingUOID = await db.user.findUnique({
            where: { uoid: item.uoid }
          })

          if (existingUOID) {
            results.push({
              uoid: item.uoid,
              status: 'failed',
              message: 'User already exists with this UOID'
            })
            continue
          }

          // Create user with default password
          const user = await db.user.create({
            data: {
              uoid: item.uoid,
              name: item.name,
              email: item.email,
              password: hashedPassword,
              phone: item.phone || null,
              campus: item.campus || null,
              role: item.role || UserRole.USER,
              isActive: item.isActive !== false, // Default to true if not specified
            },
            select: {
              id: true,
              email: true,
              name: true,
              uoid: true,
              role: true,
              isActive: true,
              phone: true,
              campus: {
                select: {
                  name: true
                }
              },
              createdAt: true,
            }
          })

          // Transform user data
          const transformedUser = {
            ...user,
            campus: user.campus?.name || null
          }

          results.push({
            email: item.email,
            status: 'success',
            user: transformedUser,
            message: 'User created successfully'
          })
        } catch (error) {
          console.error('Error importing user:', error)
          results.push({
            email: item.email || 'unknown',
            status: 'failed',
            message: 'Internal server error'
          })
        }
      }

      const successCount = results.filter(r => r.status === 'success').length
      const failureCount = results.filter(r => r.status === 'failed').length

      return NextResponse.json({
        message: `Import completed: ${successCount} users created, ${failureCount} failed`,
        results,
        successCount,
        failureCount
      })
    }

    // Handle single user creation
    const { name, email, uoid, password, phone, campus, department, batch, section, role, isActive } = userData

    // Check if user already exists by email
    const existingUser = await db.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Check if UOID already exists
    const existingUOID = await db.user.findUnique({
      where: { uoid }
    })

    if (existingUOID) {
      return NextResponse.json(
        { message: "User with this UOID already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Prepare user data
    const userDataToCreate: any = {
      uoid,
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      section: section || 'A',
      role: role || UserRole.USER,
      isActive: isActive !== false,
    }

    // Handle campus assignment
    if (campus && campus !== "general") {
      userDataToCreate.campusId = campus
    }

    // Handle department assignment
    if (department && department !== "general") {
      userDataToCreate.departmentId = department
    }

    // Handle batch assignment
    if (batch && batch !== "general") {
      userDataToCreate.batchId = batch
    }

    // Create user
    const user = await db.user.create({
      data: userDataToCreate,
      select: {
        id: true,
        email: true,
        name: true,
        uoid: true,
        role: true,
        isActive: true,
        phone: true,
        section: true,
        campus: {
          select: {
            name: true
          }
        },
        department: {
          select: {
            name: true
          }
        },
        batch: {
          select: {
            name: true
          }
        },
        createdAt: true,
      }
    })

    // Transform user data
    const transformedUser = {
      ...user,
      campus: user.campus?.name || null,
      department: user.department?.name || null,
      batch: user.batch?.name || null
    }

    return NextResponse.json(transformedUser, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}
