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
    // Root admin is always hidden from the user list
    const whereClause: any = { isRoot: { not: true } }

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
      const defaultHashedPassword = await bcrypt.hash(defaultPassword, 12)

      for (const item of importData) {
        try {
          // Skip if required fields are missing
          if (!item.email) {
            results.push({
              email: item.email || 'unknown',
              status: 'failed',
              message: 'Missing required field: email'
            })
            continue
          }

          if (!item.uoid) {
            results.push({
              email: item.email,
              status: 'failed',
              message: 'Missing required field: uoid'
            })
            continue
          }

          // Check if user already exists by email
          const existingByEmail = await db.user.findUnique({
            where: { email: item.email }
          })

          // Check if user already exists by UOID (only if different from email match)
          let existingByUOID = null
          if (!existingByEmail || existingByEmail.uoid !== item.uoid) {
            existingByUOID = await db.user.findUnique({
              where: { uoid: item.uoid }
            })
          }

          // Determine password: use provided hash, or keep existing, or default
          let passwordToUse: string
          if (item.password) {
            // If import data includes a password hash (from our export), use it directly
            // This preserves login credentials on re-import
            passwordToUse = item.password
          } else if (existingByEmail) {
            // Keep existing password if no hash provided
            passwordToUse = existingByEmail.password
          } else {
            // New user with no password provided - use default
            passwordToUse = defaultHashedPassword
          }

          // Resolve campusId: prefer direct ID, then look up by name
          let campusId: string | null = null
          if (item.campusId) {
            campusId = item.campusId
          } else if (item.campusName) {
            const campus = await db.campus.findFirst({
              where: { name: item.campusName }
            })
            campusId = campus?.id || null
          } else if (item.campusShortName) {
            const campus = await db.campus.findFirst({
              where: { shortName: item.campusShortName }
            })
            campusId = campus?.id || null
          }

          // Resolve departmentId: prefer direct ID, then look up by name
          let departmentId: string | null = null
          if (item.departmentId) {
            departmentId = item.departmentId
          } else if (item.departmentName || item.department) {
            const deptName = item.departmentName || item.department
            const dept = await db.department.findFirst({
              where: { name: deptName }
            })
            departmentId = dept?.id || null
          }

          // Resolve batchId: prefer direct ID, then look up by name
          let batchId: string | null = null
          if (item.batchId) {
            batchId = item.batchId
          } else if (item.batchName || item.batch) {
            const batchName = item.batchName || item.batch
            const batch = await db.batch.findFirst({
              where: { name: batchName }
            })
            batchId = batch?.id || null
          }

          // Resolve registrationCodeId: prefer direct ID, then look up by code
          let registrationCodeId: string | null = null
          if (item.registrationCodeId) {
            registrationCodeId = item.registrationCodeId
          } else if (item.registrationCode) {
            const regCode = await db.registrationCode.findFirst({
              where: { code: item.registrationCode }
            })
            registrationCodeId = regCode?.id || null
          }

          // Prepare user data (common for both create and update)
          const userPayload: any = {
            uoid: item.uoid,
            name: item.name || null,
            email: item.email,
            password: passwordToUse,
            phone: item.phone || null,
            section: item.section || 'A',
            role: item.role || UserRole.USER,
            isActive: item.isActive !== false,
            avatar: item.avatar || null,
            campusId: campusId,
            departmentId: departmentId,
            batchId: batchId,
            registrationCodeId: registrationCodeId,
          }

          // UPSERT: Update existing user or create new one
          if (existingByEmail) {
            // UOID conflict with a DIFFERENT user
            if (existingByUOID && existingByUOID.id !== existingByEmail.id) {
              results.push({
                email: item.email,
                status: 'failed',
                message: `UOID "${item.uoid}" is already used by another user (${existingByUOID.email})`
              })
              continue
            }

            // Update existing user - preserve password if not explicitly provided in import
            const updatePayload = { ...userPayload }
            if (!item.password) {
              // Don't overwrite existing password if no hash was provided in import
              delete updatePayload.password
            }

            const updatedUser = await db.user.update({
              where: { id: existingByEmail.id },
              data: updatePayload,
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

            results.push({
              email: item.email,
              status: 'updated',
              user: {
                ...updatedUser,
                campus: updatedUser.campus?.name || null,
                department: updatedUser.department?.name || null,
                batch: updatedUser.batch?.name || null,
              },
              message: 'User updated successfully'
            })
          } else if (existingByUOID) {
            // UOID exists but email doesn't - this is a conflict
            results.push({
              email: item.email,
              status: 'failed',
              message: `UOID "${item.uoid}" is already used by another user (${existingByUOID.email})`
            })
            continue
          } else {
            // Create new user
            const newUser = await db.user.create({
              data: userPayload,
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

            results.push({
              email: item.email,
              status: 'created',
              user: {
                ...newUser,
                campus: newUser.campus?.name || null,
                department: newUser.department?.name || null,
                batch: newUser.batch?.name || null,
              },
              message: 'User created successfully'
            })
          }
        } catch (error) {
          console.error('Error importing user:', error)
          results.push({
            email: item.email || 'unknown',
            status: 'failed',
            message: 'Internal server error'
          })
        }
      }

      const createdCount = results.filter(r => r.status === 'created').length
      const updatedCount = results.filter(r => r.status === 'updated').length
      const failureCount = results.filter(r => r.status === 'failed').length

      return NextResponse.json({
        message: `Import completed: ${createdCount} created, ${updatedCount} updated, ${failureCount} failed`,
        results,
        createdCount,
        updatedCount,
        successCount: createdCount + updatedCount,
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
