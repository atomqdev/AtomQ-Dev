
'use server'

import { signIn } from 'next-auth/react'
import { hash, compare } from 'bcryptjs'
import { db } from '@/lib/db'
import { loginSchema, registerSchema, changePasswordSchema } from '@/schema/auth'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
  const rawData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const validatedFields = loginSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid fields',
    }
  }

  try {
    const result = await signIn('credentials', {
      email: validatedFields.data.email,
      password: validatedFields.data.password,
      redirect: false,
    })

    if (result?.error) {
      return {
        message: 'Invalid credentials',
      }
    }

    revalidatePath('/')
    redirect('/')
  } catch (error) {
    return {
      message: 'Something went wrong',
    }
  }
}

export async function registerAction(formData: FormData) {
  const rawData = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
    phone: formData.get('phone') as string,
    registrationCode: formData.get('registrationCode') as string,
    departmentId: formData.get('departmentId') as string,
    batchId: formData.get('batchId') as string,
    section: formData.get('section') as string,
  }

  const validatedFields = registerSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid fields',
    }
  }

  try {
    // Check if registration is allowed
    const registrationSettings = await db.registrationSettings.findFirst()
    if (registrationSettings && !registrationSettings.allowRegistration) {
      return {
        message: 'Registration is currently disabled',
      }
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
        return {
          message: 'Invalid registration code',
        }
      }

      if (!validRegistrationCode.isActive) {
        return {
          message: 'Registration code is disabled',
        }
      }

      if (new Date(validRegistrationCode.expiry) < new Date()) {
        return {
          message: 'Registration code has expired',
        }
      }
    }

    const existingUser = await db.user.findUnique({
      where: { email: validatedFields.data.email }
    })

    if (existingUser) {
      return {
        message: 'User already exists with this email',
      }
    }

    const hashedPassword = await hash(validatedFields.data.password, 12)

    // Prepare user data
    const userData: any = {
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
    return {
      success: true,
      message: 'User created successfully',
    }
  } catch (error) {
    console.error('Registration error:', error)
    return {
      message: 'Failed to create user. Please try again.',
    }
  }
}

export async function changePasswordAction(userId: string, formData: FormData) {
  const rawData = {
    currentPassword: formData.get('currentPassword') as string,
    newPassword: formData.get('newPassword') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  }

  const validatedFields = changePasswordSchema.safeParse(rawData)

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid fields',
    }
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return {
        message: 'User not found',
      }
    }

    const isValidPassword = await compare(validatedFields.data.currentPassword, user.password)

    if (!isValidPassword) {
      return {
        message: 'Current password is incorrect',
      }
    }

    const hashedNewPassword = await hash(validatedFields.data.newPassword, 12)

    await db.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    })

    revalidatePath('/user/settings')
    return {
      success: true,
      message: 'Password changed successfully',
    }
  } catch (error) {
    return {
      message: 'Failed to change password',
    }
  }
}
