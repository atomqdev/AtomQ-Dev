/**
 * Vercel deployment migration script
 * This script runs Prisma migrations during Vercel deployment
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Running Prisma migrations...')
  try {
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')

    // Migrations will be handled by prisma migrate deploy in vercel-build script
    console.log('✅ Migrations will be deployed via vercel-build script')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
