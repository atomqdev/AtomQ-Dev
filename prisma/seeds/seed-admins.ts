import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting admin users seeding...')

  // ---- Root Admin (bypasses OTP, hidden from user lists) ----
  const rootAdmin = {
    uoid: 'ROOT-ADMIN',
    name: 'Root Admin',
    email: 'admin@atomcode.dev',
    password: 'Mr@1811321',
  }

  const existingRoot = await prisma.user.findUnique({
    where: { email: rootAdmin.email },
  })

  if (existingRoot) {
    // Ensure an existing account is flagged as root (idempotent upgrade)
    if (!existingRoot.isRoot) {
      await prisma.user.update({
        where: { id: existingRoot.id },
        data: {
          isRoot: true,
          role: UserRole.ADMIN,
          isActive: true,
          password: await bcrypt.hash(rootAdmin.password, 10),
        },
      })
      console.log(`🔒 Upgraded existing account to root admin: ${rootAdmin.email}`)
    } else {
      console.log(`⏭️  Root admin already exists: ${rootAdmin.email}`)
    }
  } else {
    const hashedRootPassword = await bcrypt.hash(rootAdmin.password, 10)
    await prisma.user.create({
      data: {
        uoid: rootAdmin.uoid,
        name: rootAdmin.name,
        email: rootAdmin.email,
        password: hashedRootPassword,
        role: UserRole.ADMIN,
        isActive: true,
        isRoot: true,
      },
    })
    console.log(`✅ Created root admin: ${rootAdmin.name} (${rootAdmin.email})`)
  }

  // ---- Regular Admins (require OTP at sign-in) ----
  const admins = [
    {
      uoid: 'ADMIN-MOHANRAJ',
      name: 'Mohanraj M',
      email: 'mohanraj@atomcode.dev',
      password: 'Mr@1811321',
    },
    {
      uoid: 'ADMIN-GURU',
      name: 'Guru Santhosh S',
      email: 'gurusanthosh@atomcode.dev',
      password: '@(Pass5611)',
    },
  ]

  for (const adminData of admins) {
    // Check if admin already exists by email
    const existing = await prisma.user.findUnique({
      where: { email: adminData.email },
    })

    if (existing) {
      console.log(`⏭️  Admin already exists: ${adminData.email} (${adminData.name})`)
      continue
    }

    const hashedPassword = await bcrypt.hash(adminData.password, 10)

    const admin = await prisma.user.create({
      data: {
        uoid: adminData.uoid,
        name: adminData.name,
        email: adminData.email,
        password: hashedPassword,
        role: UserRole.ADMIN,
        isActive: true,
      },
    })

    console.log(`✅ Created admin: ${admin.name} (${admin.email})`)
  }

  console.log('\n🔑 Root Admin Credentials:')
  console.log('   Root Admin → admin@atomcode.dev / Mr@1811321  (no OTP, hidden from user list)')
  console.log('\n🔑 Admin Credentials (OTP required):')
  console.log('   Mohanraj M    → mohanraj@atomcode.dev / Mr@1811321')
  console.log('   Guru Santhosh S → gurusanthosh@atomcode.dev / @(Pass5611)')
  console.log('\n✅ Admin users seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding admin users:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
