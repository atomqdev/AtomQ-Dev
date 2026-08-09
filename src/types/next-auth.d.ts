import { UserRole } from "@prisma/client"
import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: UserRole
      avatar?: string | null
      phone?: string | null
      uoid?: string
      isRoot?: boolean
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    role: UserRole
    avatar?: string | null
    phone?: string | null
    uoid?: string
    isRoot?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole
    id: string
    name?: string | null
    avatar?: string | null
    phone?: string | null
    uoid?: string
    isRoot?: boolean
  }
}