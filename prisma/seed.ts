
import { PrismaClient, UserRole, DifficultyLevel, QuizStatus, QuestionType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Clean existing data in proper order to avoid constraint issues
  await prisma.quizAnswer.deleteMany()
  await prisma.quizAttempt.deleteMany()
  await prisma.quizUser.deleteMany()
  await prisma.quizQuestion.deleteMany()
  await prisma.question.deleteMany()
  await prisma.questionGroup.deleteMany()
  await prisma.quiz.deleteMany()
  await prisma.assessmentAnswer.deleteMany()
  await prisma.assessmentTabSwitch.deleteMany()
  await prisma.assessmentAttempt.deleteMany()
  await prisma.assessmentUser.deleteMany()
  await prisma.assessmentQuestion.deleteMany()
  await prisma.assessment.deleteMany()
  await prisma.reportedQuestion.deleteMany()
  await prisma.user.deleteMany()
  await prisma.department.deleteMany()
  await prisma.batch.deleteMany()
  await prisma.registrationCode.deleteMany()
  await prisma.campus.deleteMany()
  await prisma.registrationSettings.deleteMany()
  await prisma.settings.deleteMany()

  console.log('Cleaned existing data...')

  // Create sample campuses
  const campus1 = await prisma.campus.create({
    data: {
      name: 'Massachusetts Institute of Technology',
      shortName: 'MIT',
      location: 'Cambridge, Massachusetts, USA',
      departments: {
        create: [
          { name: 'Computer Science' },
          { name: 'Electrical Engineering' },
          { name: 'Mathematics' },
          { name: 'Physics' }
        ]
      }
    }
  })

  const campus2 = await prisma.campus.create({
    data: {
      name: 'Stanford University',
      shortName: 'Stanford',
      location: 'Stanford, California, USA',
      departments: {
        create: [
          { name: 'Computer Science' },
          { name: 'Business' },
          { name: 'Medicine' },
          { name: 'Law' }
        ]
      }
    }
  })

  const campus3 = await prisma.campus.create({
    data: {
      name: 'Harvard University',
      shortName: 'Harvard',
      location: 'Cambridge, Massachusetts, USA',
      departments: {
        create: [
          { name: 'Computer Science' },
          { name: 'Business School' },
          { name: 'Medical School' },
          { name: 'Law School' }
        ]
      }
    }
  })

  console.log('Created sample campuses:', campus1.name, campus2.name, campus3.name)

  // Create admin user
  const adminPassword = await bcrypt.hash('admin@atomcode.dev', 10)
  const admin = await prisma.user.create({
    data: {
      uoid: 'ADMIN001',
      email: 'admin@atomcode.dev',
      name: 'Atom Admin',
      password: adminPassword,
      role: UserRole.ADMIN,
      campusId: campus1.id,
    },
  })

  console.log('Created admin user:', admin.email)

  // Create sample users
  const userPassword = await bcrypt.hash('user123', 10)
  const users = await Promise.all([
    prisma.user.create({
      data: {
        uoid: 'MIT001',
        email: 'student@mit.edu',
        name: 'MIT Student',
        password: userPassword,
        role: UserRole.USER,
        campusId: campus1.id,
      },
    }),
    prisma.user.create({
      data: {
        uoid: 'STF001',
        email: 'student@stanford.edu',
        name: 'Stanford Student',
        password: userPassword,
        role: UserRole.USER,
        campusId: campus2.id,
      },
    }),
    prisma.user.create({
      data: {
        uoid: 'HRV001',
        email: 'student@harvard.edu',
        name: 'Harvard Student',
        password: userPassword,
        role: UserRole.USER,
        campusId: campus3.id,
      },
    }),
  ])

  console.log('Created sample users:', users.length, 'students')

  // Create default settings
  const settings = await prisma.settings.create({
    data: {
      maintenanceMode: false,
    },
  })

  // Create registration settings
  const regSettings = await prisma.registrationSettings.create({
    data: {
      allowRegistration: true,
    },
  })

  console.log('Created default settings: Atom Q')

  console.log('✅ Demo data seeded successfully!')
  console.log('🔑 Admin: admin@atomcode.dev / admin@atomcode.dev')
  console.log('👥 Sample Users: student@mit.edu, student@stanford.edu, student@harvard.edu / user123')
  console.log('🏫 Campuses: MIT, Stanford, Harvard')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })