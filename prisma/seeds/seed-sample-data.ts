import { PrismaClient, UserRole, DifficultyLevel, QuizStatus, QuestionType, StudentSection } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting sample data seeding...')

  // ========================================
  // PART 1: Create/Find Campus 1 (Test Seed Organization)
  // ========================================
  console.log('\n📍 Part 1: Creating Campus 1...')
  let campus1 = await prisma.campus.findFirst({
    where: { name: 'Test Seed Organization' }
  })

  if (!campus1) {
    campus1 = await prisma.campus.create({
      data: {
        name: 'Test Seed Organization',
        shortName: 'TSO',
        location: 'Test Location',
        isActive: true,
      },
    })
    console.log('✅ Created Campus 1:', campus1.name)
  } else {
    console.log('✅ Found existing Campus 1:', campus1.name)
  }

  // ========================================
  // PART 2: Create Campus 2 with 3 Departments, 3 Batches, 4 Sections, 20 Users
  // ========================================
  console.log('\n📍 Part 2: Creating Campus 2 with 3 Departments, 3 Batches, 4 Sections, 20 Users...')
  let campus2 = await prisma.campus.findFirst({
    where: { name: 'Test Assessment Campus' }
  })

  if (!campus2) {
    campus2 = await prisma.campus.create({
      data: {
        name: 'Test Assessment Campus',
        shortName: 'TAC',
        location: 'Assessment Test Location',
        isActive: true,
      },
    })
    console.log('✅ Created Campus 2:', campus2.name)
  } else {
    console.log('✅ Found existing Campus 2:', campus2.name)
  }

  // Create 3 Departments for Campus 2
  console.log('\n📚 Creating 3 Departments for Campus 2...')
  const departments2 = ['Engineering', 'Science', 'Business']
  const createdDepartments2: any[] = []

  for (const deptName of departments2) {
    let dept = await prisma.department.findFirst({
      where: {
        name: deptName,
        campusId: campus2.id
      }
    })

    if (!dept) {
      dept = await prisma.department.create({
        data: {
          name: deptName,
          campusId: campus2.id,
        },
      })
      console.log(`✅ Created department: ${dept.name}`)
    } else {
      console.log(`✅ Found existing department: ${dept.name}`)
    }
    createdDepartments2.push(dept)
  }

  // Create 3 Batches for Campus 2
  console.log('\n📅 Creating 3 Batches for Campus 2...')
  const batches2 = ['2021-2025', '2022-2026', '2023-2027']
  const createdBatches2: any[] = []

  for (const batchName of batches2) {
    let batch = await prisma.batch.findFirst({
      where: {
        name: batchName,
        campusId: campus2.id
      }
    })

    if (!batch) {
      batch = await prisma.batch.create({
        data: {
          name: batchName,
          campusId: campus2.id,
          isActive: true,
        },
      })
      console.log(`✅ Created batch: ${batch.name}`)
    } else {
      console.log(`✅ Found existing batch: ${batch.name}`)
    }
    createdBatches2.push(batch)
  }

  // Create 20 Test Users for Campus 2 (distributed across 3 departments, 3 batches, 4 sections)
  console.log('\n👥 Creating 20 Test Users for Campus 2...')
  const users2: any[] = []

  for (let i = 1; i <= 20; i++) {
    const email = `assessmentuser${i}@test.org`
    const password = await bcrypt.hash(email, 10) // Use email as password

    // Calculate department (approx 6-7 users per department)
    const deptIndex = Math.floor((i - 1) / 7) % 3
    const departmentId = createdDepartments2[deptIndex].id

    // Calculate batch (approx 6-7 users per batch)
    const batchIndex = Math.floor((i - 1) / 7) % 3
    const batchId = createdBatches2[batchIndex].id

    // Calculate section (5 users per section, cycling through A, B, C, D)
    const sectionIndex = Math.floor((i - 1) / 5) % 4
    const sectionValues: StudentSection[] = ['A', 'B', 'C', 'D']
    const section = sectionValues[sectionIndex]

    // Generate unique UOID
    const uoid = `TAC${String(i).padStart(3, '0')}`

    let user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          uoid,
          email,
          name: `Assessment Test User ${i}`,
          password: password,
          role: UserRole.USER,
          campusId: campus2.id,
          departmentId,
          batchId,
          section,
          isActive: true,
        },
      })
      console.log(`✅ Created user: ${email}`)
      users2.push(user)
    } else {
      console.log(`✅ Found existing user: ${email}`)
      users2.push(user)
    }
  }

  console.log(`\n📊 User Distribution for Campus 2:`)
  console.log(`   Total users: ${users2.length}`)
  for (const dept of createdDepartments2) {
    const count = users2.filter(u => u.departmentId === dept.id).length
    console.log(`   ${dept.name}: ${count} users`)
  }
  for (const batch of createdBatches2) {
    const count = users2.filter(u => u.batchId === batch.id).length
    console.log(`   ${batch.name}: ${count} users`)
  }

  // ========================================
  // PART 3: Find or create admin user as creator
  // ========================================
  console.log('\n🔑 Finding/Creating admin user for assessments...')
  let creator = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN }
  })

  if (!creator) {
    creator = await prisma.user.create({
      data: {
        uoid: 'ADMIN01',
        email: 'testadmin@seed.org',
        name: 'Test Admin for Seed',
        password: await bcrypt.hash('testadmin@seed.org', 10), // Use email as password
        role: UserRole.ADMIN,
        isActive: true,
      },
    })
    console.log('✅ Created admin user for seed data')
  }

  // ========================================
  // PART 4: Create Assessment Question Group with 20 AWS Questions
  // ========================================
  console.log('\n📝 Part 4: Creating Assessment Question Group with 20 AWS Questions...')
  let assessmentQuestionGroup = await prisma.questionGroup.findFirst({
    where: {
      name: 'Assessment AWS Questions',
      creatorId: creator.id
    }
  })

  if (!assessmentQuestionGroup) {
    assessmentQuestionGroup = await prisma.questionGroup.create({
      data: {
        name: 'Assessment AWS Questions',
        description: 'Question group for assessment testing with AWS-related questions covering various services',
        isActive: true,
        creatorId: creator.id,
      },
    })
    console.log('✅ Created question group:', assessmentQuestionGroup.name)
  } else {
    console.log('✅ Found existing question group:', assessmentQuestionGroup.name)
  }

  // Create 20 AWS questions for assessment
  console.log('\n❓ Creating 20 AWS Questions for Assessment...')
  const awsAssessmentQuestions = [
    {
      title: 'Amazon EC2 Instance Types',
      content: 'Which EC2 instance type provides GPU-based acceleration for machine learning workloads?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: JSON.stringify(['P2', 'P3', 'P3dn', 'G4dn', 'G5']),
      correctAnswer: 'P3',
      explanation: 'P3 instances provide GPU-based acceleration with NVIDIA Tesla V100 GPUs for ML workloads.',
      difficulty: DifficultyLevel.MEDIUM
    },
    {
      title: 'Elastic Load Balancing Features',
      content: 'ELB supports which of the following traffic routing policies?',
      type: QuestionType.MULTI_SELECT,
      options: JSON.stringify(['Round Robin', 'Least Connections', 'IP Hash', 'Least Latency']),
      correctAnswer: '["Round Robin","Least Connections"]',
      explanation: 'ELB supports multiple traffic routing policies including Round Robin, Least Connections, IP Hash, and Least Latency routing.',
      difficulty: DifficultyLevel.HARD
    },
    {
      title: 'S3 Storage Classes',
      content: 'Which S3 storage class is designed for archiving data with rare access?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: JSON.stringify(['Standard', 'Standard-IA', 'Glacier', 'One Zone-IA']),
      correctAnswer: 'Glacier',
      explanation: 'S3 Glacier is designed for data archiving with rare access at the lowest storage cost.',
      difficulty: DifficultyLevel.EASY
    },
    {
      title: 'AWS Lambda Triggers',
      content: 'AWS Lambda can be triggered synchronously by which of the following services?',
      type: QuestionType.MULTI_SELECT,
      options: JSON.stringify(['Amazon S3', 'Amazon DynamoDB', 'Amazon Kinesis', 'Amazon SQS']),
      correctAnswer: '["Amazon S3","Amazon SQS"]',
      explanation: 'Lambda can be triggered synchronously by Amazon S3 (object events) and Amazon SQS (message events). Kinesis and DynamoDB use stream/event-based triggers.',
      difficulty: DifficultyLevel.MEDIUM
    },
    {
      title: 'RDS Read Replicas',
      content: 'True or False: Amazon RDS Read Replicas can be used to scale read operations for databases.',
      type: QuestionType.TRUE_FALSE,
      options: JSON.stringify(['True', 'False']),
      correctAnswer: 'True',
      explanation: 'RDS Read Replicas allow you to scale read operations beyond the capacity of a single DB instance.',
      difficulty: DifficultyLevel.EASY
    },
    {
      title: 'VPC Peering',
      content: 'VPC peering allows you to connect two VPCs to enable _______.',
      type: QuestionType.FILL_IN_BLANK,
      options: JSON.stringify(['private networks', 'public networks', 'different regions', 'same region']),
      correctAnswer: 'private networks',
      explanation: 'VPC peering allows you to connect two VPCs to enable private networks to communicate with each other.',
      difficulty: DifficultyLevel.MEDIUM
    },
    {
      title: 'CloudWatch Alarms',
      content: 'Which AWS CloudWatch metric type is used for monitoring CPU utilization?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: JSON.stringify(['CPUUtilization', 'NetworkIn', 'NetworkOut', 'DiskReadBytes']),
      correctAnswer: 'CPUUtilization',
      explanation: 'CPUUtilization is the standard metric for monitoring CPU usage percentage in CloudWatch.',
      difficulty: DifficultyLevel.EASY
    },
    {
      title: 'IAM Policy Elements',
      content: 'Which of the following are core elements of an IAM policy? (Select all that apply)',
      type: QuestionType.MULTI_SELECT,
      options: JSON.stringify(['Version', 'Statement', 'Effect', 'Action', 'Resource']),
      correctAnswer: '["Version","Statement","Effect","Action","Resource"]',
      explanation: 'All five elements (Version, Statement, Effect, Action, and Resource) are core components of an IAM policy.',
      difficulty: DifficultyLevel.HARD
    },
    {
      title: 'DynamoDB Read Capacity',
      content: 'True or False: DynamoDB auto scaling can increase read capacity based on traffic patterns.',
      type: QuestionType.TRUE_FALSE,
      options: JSON.stringify(['True', 'False']),
      correctAnswer: 'True',
      explanation: 'DynamoDB auto scaling automatically adjusts read capacity based on actual traffic patterns to maintain performance.',
      difficulty: DifficultyLevel.MEDIUM
    },
    {
      title: 'S3 Versioning',
      content: 'True or False: Amazon S3 versioning keeps multiple versions of an object in the same bucket.',
      type: QuestionType.TRUE_FALSE,
      options: JSON.stringify(['True', 'False']),
      correctAnswer: 'True',
      explanation: 'S3 versioning preserves, retrieves, and restores every version of every object stored in your bucket.',
      difficulty: DifficultyLevel.EASY
    },
    {
      title: 'EBS Volume Types',
      content: 'Which EBS volume type is optimized for boot volumes and provides low latency?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: JSON.stringify(['gp2', 'gp3', 'io1', 'io2', 'st1']),
      correctAnswer: 'gp2',
      explanation: 'gp2 (General Purpose SSD) is the default and is optimized for boot volumes and provides low latency.',
      difficulty: DifficultyLevel.MEDIUM
    },
    {
      title: 'Route 53 Routing Policies',
      content: 'Which Route 53 routing policy routes traffic based on the health of your resources?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: JSON.stringify(['Simple', 'Weighted', 'Latency', 'Failover', 'Geolocation']),
      correctAnswer: 'Health Check',
      explanation: 'Failover routing policy routes traffic to other resources when the primary resources are unhealthy.',
      difficulty: DifficultyLevel.HARD
    },
    {
      title: 'Direct Connect',
      content: 'AWS Direct Connect allows you to establish _______ between your VPC and your on-premises network.',
      type: QuestionType.FILL_IN_BLANK,
      options: JSON.stringify(['private connection', 'VPN connection', 'public connection', 'dedicated connection']),
      correctAnswer: 'dedicated connection',
      explanation: 'AWS Direct Connect establishes a dedicated network connection from your on-premises network to AWS VPC.',
      difficulty: DifficultyLevel.MEDIUM
    },
    {
      title: 'SNS Message Filtering',
      content: 'Which SNS feature allows subscribers to receive only messages that match a specific criteria?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: JSON.stringify(['Message Filtering', 'Topic Subscription', 'Platform Application', 'Fanout']),
      correctAnswer: 'Message Filtering',
      explanation: 'SNS message filtering allows subscribers to receive only the messages that match specific criteria they are interested in.',
      difficulty: DifficultyLevel.HARD
    },
    {
      title: 'EKS Cluster',
      content: 'True or False: Amazon EKS automatically manages the Kubernetes control plane for you.',
      type: QuestionType.TRUE_FALSE,
      options: JSON.stringify(['True', 'False']),
      correctAnswer: 'True',
      explanation: 'EKS (Elastic Kubernetes Service) automatically manages the Kubernetes control plane, including the API server and etcd.',
      difficulty: DifficultyLevel.EASY
    },
    {
      title: 'CloudTrail',
      content: 'AWS CloudTrail enables _______ of API calls made in your account.',
      type: QuestionType.FILL_IN_BLANK,
      options: JSON.stringify(['monitoring', 'auditing', 'logging', 'encryption']),
      correctAnswer: 'auditing',
      explanation: 'AWS CloudTrail provides auditing of AWS API calls by recording who made what call from which IP and when.',
      difficulty: DifficultyLevel.MEDIUM
    },
    {
      title: 'Auto Scaling Groups',
      content: 'Which of the following are valid Auto Scaling metrics for scale-out policies?',
      type: QuestionType.MULTI_SELECT,
      options: JSON.stringify(['CPUUtilization', 'NetworkIn', 'RequestCount', 'ALBRequestCountPerTarget']),
      correctAnswer: '["CPUUtilization","RequestCount"]',
      explanation: 'CPUUtilization and RequestCount are commonly used metrics for scaling out when demand increases.',
      difficulty: DifficultyLevel.HARD
    },
    {
      title: 'ACM Certificate Import',
      content: 'True or False: AWS Certificate Manager (ACM) supports importing third-party SSL certificates.',
      type: QuestionType.TRUE_FALSE,
      options: JSON.stringify(['True', 'False']),
      correctAnswer: 'True',
      explanation: 'ACM allows you to import SSL/TLS certificates from third-party certificate authorities into ACM for use with AWS services.',
      difficulty: DifficultyLevel.EASY
    },
    {
      title: 'SQS Message Retention',
      content: 'What is the maximum message retention period for Amazon SQS standard queues?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: JSON.stringify(['7 days', '14 days', '30 days', '365 days']),
      correctAnswer: '14 days',
      explanation: 'Amazon SQS standard queues retain messages for up to 14 days by default, which is the maximum retention period.',
      difficulty: DifficultyLevel.MEDIUM
    },
    {
      title: 'CloudFormation Stack',
      content: 'Which CloudFormation template section is required and defines AWS resources to create?',
      type: QuestionType.MULTIPLE_CHOICE,
      options: JSON.stringify(['Parameters', 'Resources', 'Outputs', 'Conditions']),
      correctAnswer: 'Resources',
      explanation: 'The Resources section is required in a CloudFormation template and defines the AWS resources to create and configure.',
      difficulty: DifficultyLevel.EASY
    }
  ]

  const createdAssessmentQuestions: any[] = []
  for (const q of awsAssessmentQuestions) {
    let question = await prisma.question.findFirst({
      where: {
        groupId: assessmentQuestionGroup.id,
        title: q.title
      }
    })

    if (!question) {
      question = await prisma.question.create({
        data: {
          title: q.title,
          content: q.content,
          type: q.type,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          groupId: assessmentQuestionGroup.id,
          isActive: true,
        },
      })
      console.log(`✅ Created question: ${q.title} (${q.type})`)
      createdAssessmentQuestions.push(question)
    } else {
      console.log(`✅ Found existing question: ${q.title}`)
      createdAssessmentQuestions.push(question)
    }
  }

  console.log(`\n📊 Assessment Question Formats Summary:`)
  const formatCounts: Record<string, number> = {}
  createdAssessmentQuestions.forEach(q => {
    formatCounts[q.type] = (formatCounts[q.type] || 0) + 1
  })
  Object.entries(formatCounts).forEach(([format, count]) => {
    console.log(`   ${format}: ${count} questions`)
  })

  // ========================================
  // PART 5: Create Assessment with timing and tab switches
  // ========================================
  console.log('\n📋 Part 5: Creating Assessment with timed settings and tab switches...')
  
  // Calculate start time (10 mins from now) and end time (70 mins from now)
  const now = new Date()
  const startTime = new Date(now.getTime() + 10 * 60 * 1000)
  const endtime = new Date(now.getTime() + 70 * 60 * 1000)

  console.log(`   Start Time: ${startTime.toISOString()}`)
  console.log(`   End Time: ${endtime.toISOString()}`)
  console.log(`   Time Limit: 60 minutes`)
  console.log(`   Max Tab Switches: 10 (Disable Copy/Paste)`)
  console.log(`   Auto Submit: true`)

  let assessment = await prisma.assessment.findFirst({
    where: {
      title: 'Timed Assessment Test',
      campusId: campus2.id
    }
  })

  if (!assessment) {
    // Generate a random 6-character access key
    const accessKey = Math.random().toString(36).substring(2, 8).toUpperCase()

    assessment = await prisma.assessment.create({
      data: {
        title: 'Timed Assessment Test',
        description: 'A timed assessment for testing tab switch monitoring and timed quiz functionality',
        timeLimit: 60, // 60 minutes
        difficulty: DifficultyLevel.MEDIUM,
        status: QuizStatus.ACTIVE,
        negativeMarking: false,
        negativePoints: 0,
        randomOrder: false,
        tabswitches: 10,
        disableCopyPaste: true,
        autosubmit: true,
        accessKey: accessKey,
        startTime: startTime,
        endtime: endtime,
        creatorId: creator.id,
        campusId: campus2.id,
      },
    })
    console.log(`✅ Created assessment: ${assessment.title}`)
    console.log(`   Access Key: ${accessKey}`)
  } else {
    console.log('✅ Found existing assessment:', assessment.title)
  }

  // Enroll all 20 users in the assessment
  console.log('\n📋 Enrolling all 20 users in assessment...')
  for (const user of users2) {
    const existingAssessmentUser = await prisma.assessmentUser.findUnique({
      where: {
        assessmentId_userId: {
          assessmentId: assessment.id,
          userId: user.id
        }
      }
    })

    if (!existingAssessmentUser) {
      await prisma.assessmentUser.create({
        data: {
          assessmentId: assessment.id,
          userId: user.id,
        },
      })
    }
  }
  console.log(`✅ Enrolled ${users2.length} users in assessment`)

  // Add questions to assessment
  console.log('\n➕ Adding assessment questions to assessment...')
  for (let i = 0; i < createdAssessmentQuestions.length; i++) {
    const question = createdAssessmentQuestions[i]
    
    const existingAssessmentQuestion = await prisma.assessmentQuestion.findUnique({
      where: {
        assessmentId_questionId: {
          assessmentId: assessment.id,
          questionId: question.id
        }
      }
    })

    if (!existingAssessmentQuestion) {
      await prisma.assessmentQuestion.create({
        data: {
          assessmentId: assessment.id,
          questionId: question.id,
          order: i + 1,
          points: 1.0,
        },
      })
    }
  }
  console.log(`✅ Added ${createdAssessmentQuestions.length} questions to assessment`)

  // ========================================
  // PART 6: Create Test Quiz with date range
  // ========================================
  console.log('\n🎯 Part 6: Creating Test Quiz with date range...')

  // Calculate quiz start date (current date) and end date (1 month from now)
  const quizStartDate = new Date()
  const quizEndDate = new Date()
  quizEndDate.setMonth(quizEndDate.getMonth() + 1) // 1 month from now

  console.log(`   Quiz Start Date: ${quizStartDate.toISOString()}`)
  console.log(`   Quiz End Date: ${quizEndDate.toISOString()}`)

  let quiz = await prisma.quiz.findFirst({
    where: {
      title: 'Monthly Test Quiz',
      campusId: campus2.id
    }
  })

  if (!quiz) {
    quiz = await prisma.quiz.create({
      data: {
        title: 'Monthly Test Quiz',
        description: 'A test quiz with date range spanning 1 month from seed time',
        timeLimit: null, // No time limit
        difficulty: DifficultyLevel.MEDIUM,
        status: QuizStatus.ACTIVE,
        negativeMarking: false,
        negativePoints: 0,
        randomOrder: false,
        maxAttempts: null, // Unlimited
        showAnswers: false,
        startDate: quizStartDate,
        endDate: quizEndDate,
        creatorId: creator.id,
        campusId: campus2.id,
        checkAnswerEnabled: false,
      },
    })
    console.log('✅ Created quiz:', quiz.title)
  } else {
    console.log('✅ Found existing quiz:', quiz.title)
  }

  // Enroll all 20 users in the quiz
  console.log('\n📋 Enrolling all 20 users in quiz...')
  for (const user of users2) {
    const existingQuizUser = await prisma.quizUser.findUnique({
      where: {
        quizId_userId: {
          quizId: quiz.id,
          userId: user.id
        }
      }
    })

    if (!existingQuizUser) {
      await prisma.quizUser.create({
        data: {
          quizId: quiz.id,
          userId: user.id,
        },
      })
    }
  }
  console.log(`✅ Enrolled ${users2.length} users in quiz`)

  // Add questions to quiz
  console.log('\n➕ Adding quiz questions to quiz...')
  for (let i = 0; i < createdAssessmentQuestions.length; i++) {
    const question = createdAssessmentQuestions[i]
    
    const existingQuizQuestion = await prisma.quizQuestion.findUnique({
      where: {
        quizId_questionId: {
          quizId: quiz.id,
          questionId: question.id
        }
      }
    })

    if (!existingQuizQuestion) {
      await prisma.quizQuestion.create({
        data: {
          quizId: quiz.id,
          questionId: question.id,
          order: i + 1,
          points: 1.0,
        },
      })
    }
  }
  console.log(`✅ Added ${createdAssessmentQuestions.length} questions to quiz`)

  // ========================================
  // PART 7: Summary
  // ========================================
  console.log('\n' + '='.repeat(60))
  console.log('✅ Sample data seeded successfully!')
  console.log('='.repeat(60))
  
  console.log('\n📊 Summary:')
  console.log('\n📍 Campus 1 - Test Seed Organization:')
  console.log(`   Name: ${campus1.name}`)
  console.log(`   Short Name: ${campus1.shortName}`)
  
  console.log('\n📍 Campus 2 - Test Assessment Campus:')
  console.log(`   Name: ${campus2.name}`)
  console.log(`   Short Name: ${campus2.shortName}`)
  console.log(`   Departments: ${departments2.join(', ')}`)
  console.log(`   Batches: ${batches2.join(', ')}`)
  console.log(`   Sections: A, B, C, D`)
  console.log(`   Users: ${users2.length} (assessmentuser1-20)`)
  
  console.log('\n📋 Assessment: Timed Assessment Test')
  console.log(`   Start Time: ${startTime.toISOString()}`)
  console.log(`   End Time: ${endtime.toISOString()}`)
  console.log(`   Time Limit: 60 minutes`)
  console.log(`   Max Tab Switches: 10`)
  console.log(`   Disable Copy/Paste: Yes`)
  console.log(`   Auto Submit: true`)
  console.log(`   Access Key: ${assessment.accessKey || 'N/A'}`)
  console.log(`   Questions: ${createdAssessmentQuestions.length}`)
  console.log(`   Enrolled Users: ${users2.length}`)
  
  console.log('\n🎯 Quiz: Monthly Test Quiz')
  console.log(`   Start Date: ${quizStartDate.toISOString()}`)
  console.log(`   End Date: ${quizEndDate.toISOString()}`)
  console.log(`   Time Limit: None (Date-based availability)`)
  console.log(`   Questions: ${createdAssessmentQuestions.length}`)
  console.log(`   Enrolled Users: ${users2.length}`)
  
  console.log('\n📝 Question Group: Assessment AWS Questions')
  console.log(`   Total Questions: ${createdAssessmentQuestions.length}`)
  
  console.log('\n🔑 User Credentials:')
  console.log('   Assessment Admin (Creator):')
  console.log('   Email: testadmin@seed.org')
  console.log('   Password: testadmin@seed.org')
  console.log('\n   Assessment Users:')
  console.log('   Email: assessmentuser{1-20}@test.org')
  console.log('   Password: [use the same email as password]')
  console.log('\n   Assessment Access Key:')
  console.log(`   Timed Assessment Test: ${assessment.accessKey || 'N/A'}`)
  console.log('\n' + '='.repeat(60))
}

main()
  .catch((e) => {
  console.error('❌ Error seeding sample data:', e)
  process.exit(1)
  })
  .finally(async () => {
  await prisma.$disconnect()
  })
