import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Starting sample data removal...')
  
  // ========================================
  // Part 1: Remove Test Seed Organization (Campus 1)
  // ========================================
  console.log('\n📍 Part 1: Removing Test Seed Organization...')
  const campus1 = await prisma.campus.findFirst({
    where: { name: 'Test Seed Organization' }
  })

  if (!campus1) {
    console.log('ℹ️  No Campus 1 (Test Seed Organization) found. Nothing to remove.')
  } else {
    console.log(`✅ Found Campus 1: ${campus1.name}`)
    console.log(`   Campus ID: ${campus1.id}`)
    
    // Get all users in this campus
    const users1 = await prisma.user.findMany({
      where: { campusId: campus1.id }
    })
    console.log(`\n👥 Found ${users1.length} users to remove`)
    
    // Get all quiz attempts for these users
    const userIds1 = users1.map(u => u.id)
    const quizAttempts1 = await prisma.quizAttempt.findMany({
      where: { userId: { in: userIds1 } }
    })
    console.log(`📝 Found ${quizAttempts1.length} quiz attempts to remove`)
    
    // Get all assessment attempts for these users
    const assessmentAttempts1 = await prisma.assessmentAttempt.findMany({
      where: { userId: { in: userIds1 } }
    })
    console.log(`📊 Found ${assessmentAttempts1.length} assessment attempts to remove`)
    
    // Delete quiz answers
    const quizAttemptIds1 = quizAttempts1.map(qa => qa.id)
    if (quizAttemptIds1.length > 0) {
      await prisma.quizAnswer.deleteMany({
        where: { attemptId: { in: quizAttemptIds1 } }
      })
      console.log('✅ Deleted quiz answers')
    }
    
    // Delete quiz attempts
    await prisma.quizAttempt.deleteMany({
      where: { userId: { in: userIds1 } }
    })
    console.log('✅ Deleted quiz attempts')
    
    // Delete assessment answers
    const assessmentAttemptIds1 = assessmentAttempts1.map(aa => aa.id)
    if (assessmentAttemptIds1.length > 0) {
      await prisma.assessmentAnswer.deleteMany({
        where: { attemptId: { in: assessmentAttemptIds1 } }
      })
      console.log('✅ Deleted assessment answers')
    }
    
    // Delete assessment attempts
    await prisma.assessmentAttempt.deleteMany({
      where: { userId: { in: userIds1 } }
    })
    console.log('✅ Deleted assessment attempts')
    
    // Delete quiz users
    await prisma.quizUser.deleteMany({
      where: { userId: { in: userIds1 } }
    })
    console.log('✅ Deleted quiz user enrollments')
    
    // Delete assessment users
    await prisma.assessmentUser.deleteMany({
      where: { userId: { in: userIds1 } }
    })
    console.log('✅ Deleted assessment user enrollments')
    
    // Get all quizzes in this campus
    const quizzes1 = await prisma.quiz.findMany({
      where: { campusId: campus1.id }
    })
    console.log(`🎯 Found ${quizzes1.length} quizzes to remove`)
    
    // Delete quiz questions for each quiz
    for (const quiz of quizzes1) {
      await prisma.quizQuestion.deleteMany({
        where: { quizId: quiz.id }
      })
    }
    console.log('✅ Deleted quiz questions')
    
    // Delete quiz users
    await prisma.quizUser.deleteMany({
      where: { quizId: { in: quizzes1.map(q => q.id) } }
    })
    
  
    
    // Delete quizzes
    await prisma.quiz.deleteMany({
      where: { id: { in: quizzes1.map(q => q.id) } }
    })
    console.log('✅ Deleted quizzes')
    
    // Get all assessments in this campus
    const assessments1 = await prisma.assessment.findMany({
      where: { campusId: campus1.id }
    })
    console.log(`📊 Found ${assessments1.length} assessments to remove`)
    
    // Delete assessment questions
    for (const assessment of assessments1) {
      await prisma.assessmentQuestion.deleteMany({
        where: { assessmentId: assessment.id }
      })
      await prisma.assessmentTabSwitch.deleteMany({
        where: { assessmentId: assessment.id }
      })
    }
    console.log('✅ Deleted assessment questions and tab switches')
    
    // Delete assessment users
    await prisma.assessmentUser.deleteMany({
      where: { assessmentId: { in: assessments1.map(a => a.id) } }
    })
    console.log('✅ Deleted assessment user enrollments')
    
    // Delete assessments
    await prisma.assessment.deleteMany({
      where: { id: { in: assessments1.map(a => a.id) } }
    })
    console.log('✅ Deleted assessments')
    
    // Delete users
    await prisma.user.deleteMany({
      where: { 
        email: { contains: 'seedtestuser' },
        campusId: campus1.id 
      }
    })
    console.log(`✅ Deleted ${users1.length} users`)
    
    // Delete batches
    const batches1 = await prisma.batch.findMany({
      where: { campusId: campus1.id }
    })
    const batchNames1 = batches1.map(b => b.name)
    await prisma.batch.deleteMany({
      where: { 
        campusId: campus1.id,
        name: { in: ['2014-2018', '2022-2026'] }
      }
    })
    console.log(`✅ Deleted batches: ${batchNames1.join(', ') || 'none'}`)
    
    // Delete departments
    const departments1 = await prisma.department.findMany({
      where: { campusId: campus1.id }
    })
    const deptNames1 = departments1.map(d => d.name)
    await prisma.department.deleteMany({
      where: { 
        campusId: campus1.id,
        name: { in: ['CSE', 'IT', 'AIDS', 'AIML'] }
      }
    })
    console.log(`✅ Deleted departments: ${deptNames1.join(', ') || 'none'}`)
    
    // Delete campus
    await prisma.campus.delete({
      where: { id: campus1.id }
    })
    console.log('✅ Deleted Campus 1\n')
  }

  // ========================================
  // Part 2: Remove Test Assessment Campus (Campus 2)
  // ========================================
  console.log('\n📍 Part 2: Removing Test Assessment Campus...')
  const campus2 = await prisma.campus.findFirst({
    where: { name: 'Test Assessment Campus' }
  })

  if (!campus2) {
    console.log('ℹ️  No Campus 2 (Test Assessment Campus) found. Nothing to remove.')
  } else {
    console.log(`✅ Found Campus 2: ${campus2.name}`)
    console.log(`   Campus ID: ${campus2.id}`)
    
    // Get all users in this campus
    const users2 = await prisma.user.findMany({
      where: { campusId: campus2.id }
    })
    console.log(`\n👥 Found ${users2.length} users to remove`)
    
    // Get all quiz attempts for these users
    const userIds2 = users2.map(u => u.id)
    const quizAttempts2 = await prisma.quizAttempt.findMany({
      where: { userId: { in: userIds2 } }
    })
    console.log(`📝 Found ${quizAttempts2.length} quiz attempts to remove`)
    
    // Get all assessment attempts for these users
    const assessmentAttempts2 = await prisma.assessmentAttempt.findMany({
      where: { userId: { in: userIds2 } }
    })
    console.log(`📊 Found ${assessmentAttempts2.length} assessment attempts to remove`)
    
    // Delete quiz answers
    const quizAttemptIds2 = quizAttempts2.map(qa => qa.id)
    if (quizAttemptIds2.length > 0) {
      await prisma.quizAnswer.deleteMany({
        where: { attemptId: { in: quizAttemptIds2 } }
      })
      console.log('✅ Deleted quiz answers')
    }
    
    // Delete quiz attempts
    await prisma.quizAttempt.deleteMany({
      where: { userId: { in: userIds2 } }
    })
    console.log('✅ Deleted quiz attempts')
    
    // Delete assessment answers
    const assessmentAttemptIds2 = assessmentAttempts2.map(aa => aa.id)
    if (assessmentAttemptIds2.length > 0) {
      await prisma.assessmentAnswer.deleteMany({
        where: { attemptId: { in: assessmentAttemptIds2 } }
      })
      console.log('✅ Deleted assessment answers')
    }
    
    // Delete assessment attempts
    await prisma.assessmentAttempt.deleteMany({
      where: { userId: { in: userIds2 } }
    })
    console.log('✅ Deleted assessment attempts')
    
    // Delete quiz users
    await prisma.quizUser.deleteMany({
      where: { userId: { in: userIds2 } }
    })
    console.log('✅ Deleted quiz user enrollments')
    
    // Delete assessment users
    await prisma.assessmentUser.deleteMany({
      where: { userId: { in: userIds2 } }
    })
    console.log('✅ Deleted assessment user enrollments')
    
    // Get all quizzes in this campus
    const quizzes2 = await prisma.quiz.findMany({
      where: { campusId: campus2.id }
    })
    console.log(`🎯 Found ${quizzes2.length} quizzes to remove`)
    
    // Delete quiz questions for each quiz
    for (const quiz of quizzes2) {
      await prisma.quizQuestion.deleteMany({
        where: { quizId: quiz.id }
      })
    }
    console.log('✅ Deleted quiz questions')
    
    // Delete quiz users
    await prisma.quizUser.deleteMany({
      where: { quizId: { in: quizzes2.map(q => q.id) } }
    })
    

    
    // Delete quizzes
    await prisma.quiz.deleteMany({
      where: { id: { in: quizzes2.map(q => q.id) } }
    })
    console.log('✅ Deleted quizzes')
    
    // Get all assessments in this campus
    const assessments2 = await prisma.assessment.findMany({
      where: { campusId: campus2.id }
    })
    console.log(`📊 Found ${assessments2.length} assessments to remove`)
    
    // Delete assessment questions
    for (const assessment of assessments2) {
      await prisma.assessmentQuestion.deleteMany({
        where: { assessmentId: assessment.id }
      })
      await prisma.assessmentTabSwitch.deleteMany({
        where: { assessmentId: assessment.id }
      })
    }
    console.log('✅ Deleted assessment questions and tab switches')
    
    // Delete assessment users
    await prisma.assessmentUser.deleteMany({
      where: { assessmentId: { in: assessments2.map(a => a.id) } }
    })
    console.log('✅ Deleted assessment user enrollments')
    
    // Delete assessments
    await prisma.assessment.deleteMany({
      where: { id: { in: assessments2.map(a => a.id) } }
    })
    console.log('✅ Deleted assessments')
    
    // Delete users
    await prisma.user.deleteMany({
      where: { 
        email: { contains: 'assessmentuser' },
        campusId: campus2.id 
      }
    })
    console.log(`✅ Deleted ${users2.length} users`)
    
    // Delete batches
    const batches2 = await prisma.batch.findMany({
      where: { campusId: campus2.id }
    })
    const batchNames2 = batches2.map(b => b.name)
    await prisma.batch.deleteMany({
      where: { 
        campusId: campus2.id,
        name: { in: ['2021-2025', '2022-2026', '2023-2027'] }
      }
    })
    console.log(`✅ Deleted batches: ${batchNames2.join(', ') || 'none'}`)
    
    // Delete departments
    const departments2 = await prisma.department.findMany({
      where: { campusId: campus2.id }
    })
    const deptNames2 = departments2.map(d => d.name)
    await prisma.department.deleteMany({
      where: { 
        campusId: campus2.id,
        name: { in: ['Engineering', 'Science', 'Business'] }
      }
    })
    console.log(`✅ Deleted departments: ${deptNames2.join(', ') || 'none'}`)
    
    // Delete campus
    await prisma.campus.delete({
      where: { id: campus2.id }
    })
    console.log('✅ Deleted Campus 2\n')
  }

  // ========================================
  // Part 3: Remove Assessment AWS Questions Question Group
  // ========================================
  console.log('\n📝 Part 3: Removing Assessment AWS Questions Question Group...')
  const assessmentQuestionGroup = await prisma.questionGroup.findFirst({
    where: { name: 'Assessment AWS Questions' }
  })

  if (!assessmentQuestionGroup) {
    console.log('ℹ️  No Assessment AWS Questions question group found.')
  } else {
    console.log(`✅ Found question group: ${assessmentQuestionGroup.name}`)
    
    // Delete questions in this group
    await prisma.question.deleteMany({
      where: { groupId: assessmentQuestionGroup.id }
    })
    console.log('✅ Deleted questions in group')
    
    // Delete the question group
    await prisma.questionGroup.delete({
      where: { id: assessmentQuestionGroup.id }
    })
    console.log('✅ Deleted question group\n')
  }

  // ========================================
  // Part 4: Remove Monthly Test Quiz
  // ========================================
  console.log('\n🎯 Part 4: Removing Monthly Test Quiz...')
  const monthlyQuiz = await prisma.quiz.findFirst({
    where: { title: 'Monthly Test Quiz' }
  })

  if (!monthlyQuiz) {
    console.log('ℹ️  No Monthly Test Quiz found.')
  } else {
    console.log(`✅ Found quiz: ${monthlyQuiz.title}`)
    
    // Delete quiz questions
    await prisma.quizQuestion.deleteMany({
      where: { quizId: monthlyQuiz.id }
    })
    console.log('✅ Deleted quiz questions')
    
    // Delete quiz users
    await prisma.quizUser.deleteMany({
      where: { quizId: monthlyQuiz.id }
    })
    console.log('✅ Deleted quiz user enrollments')
    
    // Delete quiz
    await prisma.quiz.delete({
      where: { id: monthlyQuiz.id }
    })
    console.log('✅ Deleted quiz\n')
  }

  // Remove Sample Quiz Group (created alongside the quiz)
  const sampleQuizGroup = await prisma.quizGroup.findFirst({
    where: { name: 'Sample Quiz Group' }
  })
  if (sampleQuizGroup) {
    await prisma.quizGroup.delete({ where: { id: sampleQuizGroup.id } })
    console.log('✅ Deleted quiz group: Sample Quiz Group\n')
  } else {
    console.log('ℹ️  No Sample Quiz Group found.')
  }

  // ========================================
  // Part 5: Remove Timed Assessment Test
  // ========================================
  console.log('\n📋 Part 5: Removing Timed Assessment Test...')
  const timedAssessment = await prisma.assessment.findFirst({
    where: { title: 'Timed Assessment Test' }
  })

  if (!timedAssessment) {
    console.log('ℹ️  No Timed Assessment Test found.')
  } else {
    console.log(`✅ Found assessment: ${timedAssessment.title}`)
    
    // Delete assessment questions
    await prisma.assessmentQuestion.deleteMany({
      where: { assessmentId: timedAssessment.id }
    })
    console.log('✅ Deleted assessment questions')
    
    // Delete assessment tab switches
    await prisma.assessmentTabSwitch.deleteMany({
      where: { assessmentId: timedAssessment.id }
    })
    console.log('✅ Deleted assessment tab switches')
    
    // Delete assessment users
    await prisma.assessmentUser.deleteMany({
      where: { assessmentId: timedAssessment.id }
    })
    console.log('✅ Deleted assessment user enrollments')
    
    // Delete assessment
    await prisma.assessment.delete({
      where: { id: timedAssessment.id }
    })
    console.log('✅ Deleted assessment\n')
  }

  // Remove Sample Assessment Group (created alongside the assessment)
  const sampleAssessmentGroup = await prisma.assessmentGroup.findFirst({
    where: { name: 'Sample Assessment Group' }
  })
  if (sampleAssessmentGroup) {
    await prisma.assessmentGroup.delete({ where: { id: sampleAssessmentGroup.id } })
    console.log('✅ Deleted assessment group: Sample Assessment Group\n')
  } else {
    console.log('ℹ️  No Sample Assessment Group found.')
  }

  // ========================================
  // Part 6: Clean up test admin user if created
  // ========================================
  console.log('\n🔑 Part 6: Cleaning up test admin user...')
  const testAdmin = await prisma.user.findUnique({
    where: { email: 'testadmin@seed.org' }
  })

  if (!testAdmin) {
    console.log('ℹ️  No test admin user found.')
  } else {
    // Delete question groups created by this admin
    const adminQuestionGroups = await prisma.questionGroup.findMany({
      where: { creatorId: testAdmin.id }
    })
    
    if (adminQuestionGroups.length > 0) {
      // Delete questions in these groups
      const groupIds = adminQuestionGroups.map(g => g.id)
      await prisma.question.deleteMany({
        where: { groupId: { in: groupIds } }
      })
      console.log(`✅ Deleted ${adminQuestionGroups.length} question group(s) created by test admin`)
      
      // Delete the question groups
      await prisma.questionGroup.deleteMany({
        where: { id: { in: groupIds } }
      })
      console.log('✅ Deleted question groups created by test admin')
    }
    
    // Delete the test admin user
    await prisma.user.delete({
      where: { id: testAdmin.id }
    })
    console.log('✅ Deleted test admin user\n')
  }

  // ========================================
  // Part 7: Clean up any remaining reported questions
  // ========================================
  console.log('\n🔍 Part 7: Cleaning up reported questions...')
  const reportedQuestions = await prisma.reportedQuestion.findMany({})
  console.log(`✅ Found ${reportedQuestions.length} reported questions`)
  
  if (reportedQuestions.length > 0) {
    await prisma.reportedQuestion.deleteMany({})
    console.log('✅ Deleted all reported questions')
  }

  // ========================================
  // Summary
  // ========================================
  console.log('\n' + '='.repeat(60))
  console.log('✅ Sample data removed successfully!')
  console.log('='.repeat(60))
  
  console.log('\n📊 Removed:')
  console.log('   🏫 Campus 1: Test Seed Organization')
  console.log('   🏫 Campus 2: Test Assessment Campus')
  console.log('   📝 Question Group: Assessment AWS Questions')
  console.log('   🎯 Quiz: Monthly Test Quiz')
  console.log('   📋 Assessment: Timed Assessment Test')
  console.log('   🔑 Admin: testadmin@seed.org (if existed)')
  console.log('   🔍 Reported Questions: All cleaned up')
  console.log('\n' + '='.repeat(60))
}

main()
  .catch((e) => {
  console.error('❌ Error removing sample data:', e)
  process.exit(1)
})
  .finally(async () => {
  await prisma.$disconnect()
})
