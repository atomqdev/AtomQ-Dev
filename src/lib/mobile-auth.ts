import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.NEXTAUTH_SECRET

if (!JWT_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required')
}

export interface DecodedToken {
  id: string
  email: string
  role: string
  iat: number
  exp: number
}

export function verifyToken(token: string): DecodedToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken
    return decoded
  } catch (error) {
    return null
  }
}

export function generateToken(payload: { id: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "60d" })
}
