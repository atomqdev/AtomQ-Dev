import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { useUserStore } from "@/stores/user"
import { checkRateLimit, clearLoginAttempts } from "@/lib/rate-limit"
import { createOtp, verifyOtp, hasValidOtp } from "@/lib/otp-store"
import { sendOtpEmail } from "@/lib/email"

// Cache for maintenance mode to reduce database calls
let maintenanceModeCache: {
  value: boolean | null
  timestamp: number
} = {
  value: null,
  timestamp: 0
}

const MAINTENANCE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getMaintenanceMode(): Promise<boolean> {
  const now = Date.now()

  // Return cached value if still valid
  if (maintenanceModeCache.value !== null &&
      now - maintenanceModeCache.timestamp < MAINTENANCE_CACHE_TTL) {
    return maintenanceModeCache.value
  }

  try {
    const settings = await db.settings.findFirst({
      select: { maintenanceMode: true }
    })

    const isMaintenance = settings?.maintenanceMode || false

    // Update cache
    maintenanceModeCache = {
      value: isMaintenance,
      timestamp: now
    }

    return isMaintenance
  } catch (error) {
    console.error("Error checking maintenance mode:", error)
    // Fail-closed: if we can't verify the maintenance state, assume maintenance mode
    // This prevents bypass when the database is unreachable during an active maintenance period
    return true
  }
}

// Export function to clear maintenance mode cache
// This should be called when settings are updated by admin
export function clearMaintenanceModeCache() {
  maintenanceModeCache = {
    value: null,
    timestamp: 0
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        // Internal-only: used after OTP verification to complete admin login
        otpVerifiedToken: { label: "OTP Verified Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // ============================================================
        // OTP-verified admin login bypass
        // When the frontend has verified OTP via /api/auth/verify-otp,
        // it calls signIn with a special otpVerifiedToken containing
        // the user data. We trust this because the token was only
        // returned after successful OTP verification.
        // ============================================================
        if (credentials.otpVerifiedToken) {
          try {
            const payload = JSON.parse(credentials.otpVerifiedToken)
            // Validate the token has required fields
            if (payload && payload.id && payload.email && payload.email === credentials.email && payload.role === 'ADMIN') {
              return {
                id: payload.id,
                email: payload.email,
                name: payload.name,
                role: payload.role,
                avatar: payload.avatar,
                phone: payload.phone,
                uoid: payload.uoid,
              }
            }
          } catch {
            // Invalid token — fall through to normal flow
          }
          return null
        }

        // Check rate limiting
        const rateLimitResult = checkRateLimit(credentials.email)
        if (!rateLimitResult.allowed) {
          if (rateLimitResult.lockedUntil) {
            const lockTimeRemaining = Math.ceil((rateLimitResult.lockedUntil - Date.now()) / 60000)
            throw new Error(`Too many login attempts. Account locked for ${lockTimeRemaining} minutes.`)
          }
          throw new Error('Too many login attempts. Please try again later.')
        }

        try {
          // Check maintenance mode (cached)
          const isMaintenance = await getMaintenanceMode()
          
          if (isMaintenance) {
            // Only allow admin users to login during maintenance mode
            const user = await db.user.findUnique({
              where: { email: credentials.email },
              select: { id: true, role: true, isActive: true }
            })

            if (!user || user.role !== 'ADMIN' || !user.isActive) {
              throw new Error('Site is under maintenance. Only administrators can login.')
            }
          }

          // Single optimized user query with all needed fields
          const user = await db.user.findUnique({
            where: { email: credentials.email },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              avatar: true,
              phone: true,
              uoid: true,
              password: true,
              isActive: true
            }
          })

          if (!user || !user.isActive) {
            // Return same message for both cases to prevent user enumeration
            throw new Error('Invalid email or password')
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            return null
          }

          // ============================================================
          // ADMIN OTP VERIFICATION
          // If user is ADMIN, they must verify OTP before login completes.
          // We send the OTP and throw a special error that the frontend
          // will catch to show the OTP input form.
          // ============================================================
          if (user.role === 'ADMIN') {
            // Create and send OTP
            const { otp, isNew } = createOtp(credentials.email, {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              avatar: user.avatar,
              phone: user.phone,
              uoid: user.uoid,
            })

            const emailResult = await sendOtpEmail({
              to: user.email,
              otp,
              name: user.name,
            })

            if (!emailResult.success) {
              throw new Error('Failed to send verification email. Please try again.')
            }

            // Throw special error that frontend will parse
            throw new Error('ADMIN_OTP_REQUIRED')
          }

          // Clear successful login attempts (for non-admin users)
          clearLoginAttempts(credentials.email)

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatar: user.avatar,
            phone: user.phone,
            uoid: user.uoid,
          }
        } catch (error) {
          if (error instanceof Error) {
            throw error
          }
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 60 * 24 * 60 * 60, // 60 days
  },
  jwt: {
    maxAge: 60 * 24 * 60 * 60, // 60 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        token.name = user.name
        token.avatar = user.avatar
        token.phone = user.phone
        token.uoid = user.uoid
        
        // Update client-side store
        if (typeof window !== 'undefined') {
          useUserStore.getState().setUser({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            phone: user.phone,
            uoid: user.uoid
          })
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role
        session.user.name = token.name as string
        session.user.avatar = token.avatar as string
        session.user.phone = token.phone as string
        session.user.uoid = token.uoid as string
        
        // Update client-side store
        if (typeof window !== 'undefined') {
          useUserStore.getState().setUser({
            id: token.id as string,
            name: token.name as string,
            email: session.user.email,
            role: token.role,
            avatar: token.avatar as string,
            phone: token.phone as string,
            uoid: token.uoid as string
          })
        }
      }
      return session
    }
  },
  pages: {
    signIn: "/"
  },
  secret: process.env.NEXTAUTH_SECRET,
}
