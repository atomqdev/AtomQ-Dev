
import { PrismaClient, UserRole, DifficultyLevel, QuizStatus, QuestionType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Clean existing data in proper order to avoid constraint issues
  await prisma.quizAnswer.deleteMany()
  await prisma.quizAttempt.deleteMany()
  await prisma.quizUser.deleteMany()
  await prisma.quizQuestion.deleteMany()
  await prisma.quiz.deleteMany()
  await prisma.quizGroup.deleteMany()
  await prisma.assessmentAnswer.deleteMany()
  await prisma.assessmentTabSwitch.deleteMany()
  await prisma.assessmentAttempt.deleteMany()
  await prisma.assessmentUser.deleteMany()
  await prisma.assessmentQuestion.deleteMany()
  await prisma.assessment.deleteMany()
  await prisma.assessmentGroup.deleteMany()
  await prisma.question.deleteMany()
  await prisma.questionGroup.deleteMany()
  await prisma.reportedQuestion.deleteMany()
  await prisma.registrationCode.deleteMany()
  await prisma.user.deleteMany()
  await prisma.department.deleteMany()
  await prisma.batch.deleteMany()
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

  // ========================================
  // Create Question Group with sample questions
  // ========================================
  const questionGroup = await prisma.questionGroup.create({
    data: {
      name: 'General Knowledge',
      isActive: true,
      creatorId: admin.id,
    },
  })

  const sampleQuestions = await Promise.all([
    prisma.question.create({
      data: {
        reference: 'Capital of France',
        title: 'What is the capital city of France?',
        type: QuestionType.MULTIPLE_CHOICE,
        options: JSON.stringify(['Berlin', 'Paris', 'Madrid', 'Rome']),
        correctAnswer: 'Paris',
        explanation: 'Paris is the capital and most populous city of France.',
        difficulty: DifficultyLevel.EASY,
        groupId: questionGroup.id,
      },
    }),
    prisma.question.create({
      data: {
        reference: 'Primary Colors',
        title: 'Which of the following are primary colors?',
        type: QuestionType.MULTI_SELECT,
        options: JSON.stringify(['Red', 'Green', 'Blue', 'Yellow']),
        correctAnswer: '["Red","Blue","Yellow"]',
        explanation: 'The traditional primary colors are Red, Blue, and Yellow.',
        difficulty: DifficultyLevel.MEDIUM,
        groupId: questionGroup.id,
      },
    }),
  ])

  console.log('Created question group:', questionGroup.name, 'with', sampleQuestions.length, 'questions')

  // ========================================
  // Create Quiz Groups with a sample quiz
  // ========================================
  const quizGroup1 = await prisma.quizGroup.create({
    data: {
      name: 'Programming Quizzes',
      isActive: true,
      creatorId: admin.id,
    },
  })

  const quizGroup2 = await prisma.quizGroup.create({
    data: {
      name: 'Aptitude Quizzes',
      isActive: true,
      creatorId: admin.id,
    },
  })

  const sampleQuiz = await prisma.quiz.create({
    data: {
      title: 'General Knowledge Quiz',
      description: 'A short demo quiz covering general knowledge',
      timeLimit: 10,
      difficulty: DifficultyLevel.EASY,
      status: QuizStatus.ACTIVE,
      creatorId: admin.id,
      campusId: campus1.id,
      groupId: quizGroup1.id,
      quizQuestions: {
        create: sampleQuestions.map((q, i) => ({
          questionId: q.id,
          order: i + 1,
          points: 1.0,
        })),
      },
    },
  })

  console.log('Created quiz groups:', quizGroup1.name, '+', quizGroup2.name, '(sample quiz in', quizGroup1.name + ')')

  // ========================================
  // Create Assessment Groups with a sample assessment
  // ========================================
  const assessmentGroup1 = await prisma.assessmentGroup.create({
    data: {
      name: 'Technical Assessments',
      isActive: true,
      creatorId: admin.id,
    },
  })

  const assessmentGroup2 = await prisma.assessmentGroup.create({
    data: {
      name: 'Soft Skills Assessments',
      isActive: true,
      creatorId: admin.id,
    },
  })

  const sampleAssessment = await prisma.assessment.create({
    data: {
      title: 'General Knowledge Assessment',
      description: 'A short demo assessment covering general knowledge',
      timeLimit: 15,
      difficulty: DifficultyLevel.MEDIUM,
      status: QuizStatus.ACTIVE,
      creatorId: admin.id,
      campusId: campus1.id,
      groupId: assessmentGroup1.id,
      assessmentQuestions: {
        create: sampleQuestions.map((q, i) => ({
          questionId: q.id,
          order: i + 1,
          points: 1.0,
        })),
      },
    },
  })

  console.log('Created assessment groups:', assessmentGroup1.name, '+', assessmentGroup2.name, '(sample assessment in', assessmentGroup1.name + ')')

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
  console.log('📝 Question Group: General Knowledge (' + sampleQuestions.length + ' questions)')
  console.log('🎯 Quiz Groups: Programming Quizzes (with sample quiz), Aptitude Quizzes')
  console.log('📋 Assessment Groups: Technical Assessments (with sample assessment), Soft Skills Assessments')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })