import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { db } from "@/lib/db"
import { registerSchema } from "@/schema/auth"
import { revalidatePath } from "next/cache"

export async function POST(request: NextRequest) {
  try {
    // Check maintenance mode first
    const settings = await db.settings.findFirst({
      select: { maintenanceMode: true }
    })

    if (settings?.maintenanceMode) {
      return NextResponse.json(
        { message: 'Site is under maintenance. Registration is temporarily disabled.' },
        { status: 503 }
      )
    }

    const rawData = await request.json()

    const validatedFields = registerSchema.safeParse(rawData)

    if (!validatedFields.success) {
      return NextResponse.json(
        {
          errors: validatedFields.error.flatten().fieldErrors,
          message: 'Invalid fields',
        },
        { status: 400 }
      )
    }

    // Check if registration is allowed
    const registrationSettings = await db.registrationSettings.findFirst()
    if (registrationSettings && !registrationSettings.allowRegistration) {
      return NextResponse.json(
        { message: 'Registration is currently disabled' },
        { status: 400 }
      )
    }

    // If no registration settings exist, create default settings and allow registration
    if (!registrationSettings) {
      await db.registrationSettings.create({
        data: {
          allowRegistration: true,
        },
      })
    }

    // Validate registration code if provided
    let validRegistrationCode = null
    if (validatedFields.data.registrationCode) {
      validRegistrationCode = await db.registrationCode.findUnique({
        where: { code: validatedFields.data.registrationCode }
      })

      if (!validRegistrationCode) {
        return NextResponse.json(
          { message: 'Invalid registration code' },
          { status: 400 }
        )
      }

      if (!validRegistrationCode.isActive) {
        return NextResponse.json(
          { message: 'Registration code is disabled' },
          { status: 400 }
        )
      }

      if (new Date(validRegistrationCode.expiry) < new Date()) {
        return NextResponse.json(
          { message: 'Registration code has expired' },
          { status: 400 }
        )
      }
    }

    const existingUser = await db.user.findUnique({
      where: { email: validatedFields.data.email }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'User already exists with this email' },
        { status: 400 }
      )
    }

    // Check if UOID already exists
    const existingUOID = await db.user.findUnique({
      where: { uoid: validatedFields.data.uoid }
    })

    if (existingUOID) {
      return NextResponse.json(
        { message: 'User already exists with this UOID' },
        { status: 400 }
      )
    }

    const hashedPassword = await hash(validatedFields.data.password, 12)

    // Prepare user data
    const userData: any = {
      uoid: validatedFields.data.uoid,
      name: validatedFields.data.name,
      email: validatedFields.data.email,
      password: hashedPassword,
      phone: validatedFields.data.phone || null,
      role: 'USER',
      isActive: true,
      section: validatedFields.data.section || 'A',
    }

    // If registration code is provided, set the registrationCodeId and related fields
    if (validRegistrationCode) {
      userData.registrationCodeId = validRegistrationCode.id
      userData.campusId = validRegistrationCode.campusId
    }

    // Override with form values if provided
    if (validatedFields.data.departmentId) {
      userData.departmentId = validatedFields.data.departmentId
    }
    if (validatedFields.data.batchId) {
      userData.batchId = validatedFields.data.batchId
    }

    await db.user.create({
      data: userData
    })

    revalidatePath('/register')

    return NextResponse.json(
      {
        success: true,
        message: 'User created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { message: 'Failed to create user. Please try again.' },
      { status: 500 }
    )
  }
}
