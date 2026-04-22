import { SUBJECTS, attemptHistory, leaderboardRows, quizQuestions, subjectProgress, weakUnits } from '../data/mockData'
import { isSupabaseConfigured, supabase } from './supabaseClient'
import { judgeCode } from './judgeApi'
import { generateQuestions as generateGroqQuestions, isGroqConfigured } from './groqApi'

const OPTION_INDEX_TO_CHAR = ['A', 'B', 'C', 'D']
const OPTION_CHAR_TO_INDEX = { A: 0, B: 1, C: 2, D: 3 }
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const toLocaleDateTime = (value) => {
  if (!value) {
    return 'N/A'
  }
  return new Date(value).toLocaleString()
}

const buildQuestionFromDb = (question, subjectName, unitTitle) => ({
  id: String(question.id),
  subject: subjectName,
  unit: unitTitle,
  questionText: question.question_text,
  options: [question.option_a, question.option_b, question.option_c, question.option_d],
  correctIndex: OPTION_CHAR_TO_INDEX[question.correct_option] ?? 0,
  difficulty: question.difficulty ?? 'medium',
})

const sortLeaderboard = (rows) =>
  [...rows].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    return a.timeTakenSec - b.timeTakenSec
  })

const fallbackCodingProblems = [
  {
    id: 'fallback-problem-1',
    subject: 'Data Structures',
    title: 'Reverse A String',
    description: 'Given a string, return it in reverse order.',
    difficulty: 'easy',
    sampleInput: 'hello',
    sampleOutput: 'olleh',
    timeLimitMs: 2000,
    testCases: [
      { input: 'hello', expectedOutput: 'olleh' },
      { input: 'world', expectedOutput: 'dlrow' },
      { input: 'a', expectedOutput: 'a' },
      { input: 'abc', expectedOutput: 'cba' },
    ],
  },
]

const fallbackCodeSubmissions = []

export const getSubjects = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return SUBJECTS
  }

  const { data, error } = await supabase.from('subjects').select('title').order('title', { ascending: true })
  if (error || !data?.length) {
    return SUBJECTS
  }

  return data.map((row) => row.title)
}

export const getSubjectCatalog = async ({ mcqOnly = false, codingOnly = false } = {}) => {
  if (!isSupabaseConfigured || !supabase) {
    return SUBJECTS.map((title, index) => ({
      id: index + 1,
      title,
      has_mcq: true,
      has_coding: title === 'DSA',
    }))
  }

  let query = supabase.from('subjects').select('id,title,has_mcq,has_coding,semester').order('title')
  if (mcqOnly) {
    query = query.eq('has_mcq', true)
  }
  if (codingOnly) {
    query = query.eq('has_coding', true)
  }
  const { data, error } = await query
  if (error || !data) {
    return []
  }
  return data
}

export const getUnitsBySubject = async (subjectId) => {
  if (!isSupabaseConfigured || !supabase || !subjectId) {
    return []
  }
  const { data, error } = await supabase
    .from('units')
    .select('id,unit_number,title')
    .eq('subject_id', subjectId)
    .order('unit_number', { ascending: true })

  if (error || !data) {
    return []
  }
  return data
}

export const getQuestionsBySubject = async (subjectName) => {
  const fallback = quizQuestions.filter((question) => question.subject === subjectName)

  if (!isSupabaseConfigured || !supabase) {
    if (fallback.length >= 15) {
      return fallback
    }
    return supplementQuestionsWithAI(fallback, subjectName)
  }

  const { data, error } = await supabase
    .from('subjects')
    .select(
      'id,title,units(id,title,mcq_questions(id,question_text,option_a,option_b,option_c,option_d,correct_option,difficulty))',
    )
    .eq('title', subjectName)
    .maybeSingle()

  if (error || !data) {
    if (fallback.length >= 15) {
      return fallback
    }
    return supplementQuestionsWithAI(fallback, subjectName)
  }

  const normalizedQuestions =
    data.units?.flatMap((unit) =>
      (unit.mcq_questions ?? []).map((question) => buildQuestionFromDb(question, data.title, unit.title)),
    ) ?? []

  if (normalizedQuestions.length) {
    if (normalizedQuestions.length >= 15) {
      return normalizedQuestions
    }
    return supplementQuestionsWithAI(normalizedQuestions, subjectName, normalizedQuestions.length)
  }

  if (fallback.length >= 15) {
    return fallback
  }
  return supplementQuestionsWithAI(fallback, subjectName)
}

const supplementQuestionsWithAI = async (existingQuestions, subjectName, currentCount = 0) => {
  const targetCount = 20
  const needed = targetCount - currentCount

  if (needed <= 0) {
    return existingQuestions
  }

  if (!isGroqConfigured()) {
    return existingQuestions
  }

  const unitTopicMap = {
    DSA: ['Arrays', 'Stacks', 'Queues', 'Linked Lists', 'Trees', 'Graphs', 'Sorting', 'Searching'],
    OS: ['Introduction', 'Process Management', 'Memory Management', 'Scheduling', 'Deadlocks', 'File Systems'],
    CN: ['OSI Model', 'TCP/IP', 'IP Addressing', 'Routing', 'Transport Layer', 'Network Security'],
    DBMS: ['Introduction', 'ER Model', 'Normalization', 'Transactions', 'SQL', 'Keys'],
  }

  const units = unitTopicMap[subjectName] || ['General']
  const targetUnit = units[currentCount % units.length]

  try {
    const { questions: aiQuestions, error } = await generateGroqQuestions({
      subject: subjectName,
      unit: targetUnit,
      count: needed,
      difficulty: 'medium',
    })

    if (error || !aiQuestions?.length) {
      return existingQuestions
    }

    return [...existingQuestions, ...aiQuestions]
  } catch (e) {
    console.warn('Failed to generate questions from AI:', e.message)
    return existingQuestions
  }
}

const resolveSubjectId = async (subjectName) => {
  if (!supabase) {
    return null
  }
  const { data, error } = await supabase.from('subjects').select('id').eq('title', subjectName).maybeSingle()
  if (error || !data) {
    return null
  }
  return data.id
}

export const createQuizSession = async ({
  studentId,
  subjectName,
  score,
  timeTakenSec,
  startedAtMs,
  totalQuestions = 10,
  durationSec = 600,
}) => {
  if (!isSupabaseConfigured || !supabase || !studentId) {
    return { sessionId: null, error: null }
  }

  const subjectId = await resolveSubjectId(subjectName)
  if (!subjectId) {
    return { sessionId: null, error: `Subject '${subjectName}' is missing in database.` }
  }

  const startedAtIso = startedAtMs ? new Date(startedAtMs).toISOString() : new Date().toISOString()

  const { data, error } = await supabase
    .from('quiz_sessions')
    .insert({
      student_id: studentId,
      subject_id: subjectId,
      total_questions: totalQuestions,
      duration_sec: durationSec,
      started_at: startedAtIso,
      submitted_at: new Date().toISOString(),
      score,
      max_score: totalQuestions,
      time_taken_sec: timeTakenSec,
      status: 'submitted',
    })
    .select('id')
    .single()

  if (error) {
    return { sessionId: null, error: error.message }
  }

  return { sessionId: data.id, error: null }
}

export const createMcqAttempts = async ({ sessionId, answersById, questionsById }) => {
  if (!isSupabaseConfigured || !supabase || !sessionId) {
    return { error: null }
  }

  const attemptRows = Object.entries(answersById)
    .filter(([questionId]) => UUID_REGEX.test(questionId))
    .map(([questionId, selectedIndex]) => {
      const correctIndex = questionsById[questionId]?.correctIndex
      return {
        session_id: sessionId,
        question_id: questionId,
        selected_option: OPTION_INDEX_TO_CHAR[selectedIndex] ?? null,
        is_correct: correctIndex === selectedIndex,
        answered_at: new Date().toISOString(),
      }
    })

  if (!attemptRows.length) {
    return { error: null }
  }

  const { error } = await supabase.from('mcq_attempts').insert(attemptRows)
  return { error: error?.message ?? null }
}

export const getLeaderboardRows = async ({ subject = 'All', batchYear = 'All' } = {}) => {
  if (!isSupabaseConfigured || !supabase) {
    return sortLeaderboard(leaderboardRows)
  }

  let query = supabase
    .from('leaderboard')
    .select('id,total_score,last_updated,subjects(title),users(name,email,semester)')
    .order('total_score', { ascending: false })
    .limit(150)

  if (subject !== 'All') {
    query = query.eq('subjects.title', subject)
  }

  const { data, error } = await query
  if (error || !data) {
    return sortLeaderboard(leaderboardRows)
  }

  const normalizedRows = data
    .map((row) => {
      const student = row.users?.name || row.users?.email || 'Unknown Student'
      const rowBatch = row.users?.semester ? String(row.users.semester) : null
      return {
        student,
        subject: row.subjects?.title ?? 'Unknown',
        score: Number(row.total_score ?? 0),
        timeTakenSec: 0,
        batchYear: rowBatch ? Number(rowBatch) : null,
      }
    })
    .filter((row) => (batchYear === 'All' ? true : String(row.batchYear) === batchYear))

  return normalizedRows.length ? sortLeaderboard(normalizedRows) : sortLeaderboard(leaderboardRows)
}

export const subscribeToLeaderboard = ({ subject, batchYear, onChange }) => {
  if (!isSupabaseConfigured || !supabase) {
    return () => {}
  }

  const channel = supabase
    .channel(`leaderboard:${subject}:${batchYear}:${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, async () => {
      const rows = await getLeaderboardRows({ subject, batchYear })
      onChange(rows)
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export const getDashboardData = async ({ studentId }) => {
  if (!studentId || !isSupabaseConfigured || !supabase) {
    return { attempts: attemptHistory, progressRows: subjectProgress, weakUnitRows: weakUnits }
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from('quiz_sessions')
    .select('id,score,max_score,submitted_at,subjects(title)')
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false })
    .limit(30)

  if (sessionsError || !sessions) {
    return { attempts: attemptHistory, progressRows: subjectProgress, weakUnitRows: weakUnits }
  }

  const attempts = sessions.map((session) => ({
    id: session.id,
    subject: session.subjects?.title ?? 'Unknown',
    score: Number(session.score ?? 0),
    total: Number(session.max_score ?? 10),
    submittedAt: toLocaleDateTime(session.submitted_at),
  }))

  const groupedBySubject = attempts.reduce((acc, item) => {
    if (!acc[item.subject]) {
      acc[item.subject] = []
    }
    acc[item.subject].push(item.score)
    return acc
  }, {})

  const progressRows = Object.entries(groupedBySubject).map(([subject, scores]) => {
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const totalRows = attempts.filter((item) => item.subject === subject)
    const averageTotal =
      totalRows.reduce((sum, row) => sum + Number(row.total || 0), 0) / Math.max(1, totalRows.length)
    return {
      subject,
      completion: Math.max(0, Math.min(100, Math.round((averageScore / Math.max(1, averageTotal)) * 100))),
    }
  })

  const { data: unitAttempts } = await supabase
    .from('mcq_attempts')
    .select('is_correct,mcq_questions(units(title,subjects(title))),quiz_sessions!inner(student_id)')
    .eq('quiz_sessions.student_id', studentId)
    .limit(300)

  const weakUnitRows = (() => {
    if (!unitAttempts?.length) {
      return weakUnits
    }

    const unitMap = unitAttempts.reduce((acc, row) => {
      const subject = row.mcq_questions?.units?.subjects?.title
      const unit = row.mcq_questions?.units?.title
      if (!subject || !unit) {
        return acc
      }
      const key = `${subject}::${unit}`
      if (!acc[key]) {
        acc[key] = { subject, unit, total: 0, correct: 0 }
      }
      acc[key].total += 1
      if (row.is_correct) {
        acc[key].correct += 1
      }
      return acc
    }, {})

    return Object.values(unitMap)
      .map((item) => ({
        subject: item.subject,
        unit: item.unit,
        average: Math.round((item.correct / item.total) * 100),
      }))
      .sort((a, b) => a.average - b.average)
      .slice(0, 5)
  })()

  return {
    attempts: attempts.length ? attempts : attemptHistory,
    progressRows: progressRows.length ? progressRows : subjectProgress,
    weakUnitRows,
  }
}

export const getAdminSubjectAnalytics = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('score,subjects(title)')
    .order('submitted_at', { ascending: false })
    .limit(300)

  if (error || !data) {
    return []
  }

  const grouped = data.reduce((acc, row) => {
    const subject = row.subjects?.title ?? 'Unknown'
    if (!acc[subject]) {
      acc[subject] = { subject, attempts: 0, scoreSum: 0 }
    }
    acc[subject].attempts += 1
    acc[subject].scoreSum += Number(row.score ?? 0)
    return acc
  }, {})

  return Object.values(grouped).map((item) => ({
    subject: item.subject,
    attempts: item.attempts,
    averageScore: Number((item.scoreSum / item.attempts).toFixed(2)),
  }))
}

export const getCodingProblems = async ({ subjectId = 'All', difficulty = 'All' } = {}) => {
  if (!isSupabaseConfigured || !supabase) {
    return fallbackCodingProblems
  }

  let query = supabase
    .from('coding_problems')
    .select('id,title,description,difficulty,sample_input,sample_output,time_limit_ms,subjects(title)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (subjectId !== 'All') {
    query = query.eq('subject_id', subjectId)
  }
  if (difficulty !== 'All') {
    query = query.eq('difficulty', difficulty)
  }

  const { data, error } = await query
  if (error || !data) {
    return fallbackCodingProblems
  }

  return data.map((row) => ({
    id: row.id,
    subject: row.subjects?.title ?? 'Unknown',
    title: row.title,
    description: row.description,
    difficulty: row.difficulty,
    sampleInput: row.sample_input,
    sampleOutput: row.sample_output,
    timeLimitMs: row.time_limit_ms,
  }))
}

export const submitCodeSolution = async ({ studentId, problemId, language, code, testCases = [] }) => {
  const mockFallback = () => {
    const verdict = code.trim().length > 20 ? 'accepted' : 'wrong_answer'
    const submission = {
      id: `mock-${Date.now()}`,
      studentId: studentId ?? 'guest-local',
      problemId,
      language,
      verdict,
      submittedAt: new Date().toISOString(),
      problemTitle: fallbackCodingProblems.find((item) => item.id === problemId)?.title ?? 'Coding Problem',
    }
    fallbackCodeSubmissions.unshift(submission)
    fallbackCodeSubmissions.splice(20)
    return {
      submissionId: submission.id,
      verdict: submission.verdict,
      submittedAt: submission.submittedAt,
      error: null,
    }
  }

  if (!isSupabaseConfigured || !supabase) {
    return mockFallback()
  }

  if (!studentId) {
    return { submissionId: null, error: 'Sign in to submit code.' }
  }

  let judgeResult = null
  const useJudgeServer = testCases.length > 0

  if (useJudgeServer) {
    try {
      judgeResult = await judgeCode({ code, language, testCases })
    } catch {
      console.warn('Judge server unavailable, using mock verdict')
    }
  }

  const verdict = (useJudgeServer && judgeResult?.verdict) ? judgeResult.verdict : 'pending'

  const { data, error } = await supabase
    .from('code_submissions')
    .insert({
      student_id: studentId,
      problem_id: problemId,
      language,
      code,
      verdict,
    })
    .select('id,verdict,submitted_at')
    .single()

  if (error) {
    return { submissionId: null, error: error.message }
  }

  return {
    submissionId: data.id,
    verdict: data.verdict,
    submittedAt: data.submitted_at,
    error: null,
  }
}

export const getRecentCodeSubmissions = async ({ studentId, limit = 10 }) => {
  if (!isSupabaseConfigured || !supabase) {
    const history = fallbackCodeSubmissions
      .filter((row) => row.studentId === (studentId ?? 'guest-local'))
      .slice(0, limit)
      .map((row) => ({
        id: row.id,
        verdict: row.verdict,
        language: row.language,
        submittedAt: toLocaleDateTime(row.submittedAt),
        problemTitle: row.problemTitle,
      }))
    return history
  }

  if (!studentId) {
    return []
  }

  const { data, error } = await supabase
    .from('code_submissions')
    .select('id,verdict,language,submitted_at,coding_problems(title)')
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  return data.map((row) => ({
    id: row.id,
    verdict: row.verdict,
    language: row.language,
    submittedAt: toLocaleDateTime(row.submitted_at),
    problemTitle: row.coding_problems?.title ?? 'Unknown Problem',
  }))
}

export const getRecentAdminQuestions = async ({ limit = 20 } = {}) => {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('mcq_questions')
    .select('id,question_text,difficulty,created_at,units(id,title,subjects(id,title))')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  return data.map((row) => ({
    id: row.id,
    questionText: row.question_text,
    difficulty: row.difficulty,
    unitId: row.units?.id ?? null,
    unitTitle: row.units?.title ?? 'Unknown Unit',
    subjectId: row.units?.subjects?.id ?? null,
    subjectTitle: row.units?.subjects?.title ?? 'Unknown Subject',
    createdAt: toLocaleDateTime(row.created_at),
  }))
}

export const checkQuestionDuplicate = async ({ unitId, questionText }) => {
  if (!isSupabaseConfigured || !supabase) {
    return { isDuplicate: false, error: null }
  }

  const { data, error } = await supabase.rpc('check_question_duplicate', {
    p_unit_id: unitId,
    p_question_text: questionText,
  })

  if (error) {
    return { isDuplicate: false, error: error.message }
  }
  return { isDuplicate: Boolean(data), error: null }
}

export const createMcqQuestion = async ({
  unitId,
  questionText,
  optionA,
  optionB,
  optionC,
  optionD,
  correctOption,
  difficulty,
  explanation,
}) => {
  if (!isSupabaseConfigured || !supabase) {
    return { questionId: null, error: 'Supabase is not configured.' }
  }

  const { data, error } = await supabase.rpc('create_mcq_question', {
    p_unit_id: unitId,
    p_question_text: questionText,
    p_option_a: optionA,
    p_option_b: optionB,
    p_option_c: optionC,
    p_option_d: optionD,
    p_correct_option: correctOption,
    p_difficulty: difficulty,
    p_explanation: explanation || null,
  })

  if (error) {
    return { questionId: null, error: error.message }
  }

  return { questionId: data, error: null }
}

export const deleteMcqQuestion = async (questionId) => {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase is not configured.' }
  }

  const { error } = await supabase.from('mcq_questions').delete().eq('id', questionId)
  return { error: error?.message ?? null }
}

export const restoreMcqQuestion = async (questionRow) => {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'Supabase is not configured.' }
  }

  const payload = {
    id: questionRow.id,
    unit_id: questionRow.unitId,
    question_text: questionRow.questionText,
    option_a: questionRow.optionA,
    option_b: questionRow.optionB,
    option_c: questionRow.optionC,
    option_d: questionRow.optionD,
    correct_option: questionRow.correctOption,
    difficulty: questionRow.difficulty,
    explanation: questionRow.explanation,
    uploaded_by: questionRow.uploadedBy ?? null,
  }

  const { error } = await supabase.from('mcq_questions').insert(payload)
  return { error: error?.message ?? null }
}

export const getQuestionById = async (questionId) => {
  if (!isSupabaseConfigured || !supabase) {
    return { data: null, error: 'Supabase is not configured.' }
  }

  const { data, error } = await supabase
    .from('mcq_questions')
    .select('id,unit_id,question_text,option_a,option_b,option_c,option_d,correct_option,difficulty,explanation,uploaded_by')
    .eq('id', questionId)
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return {
    data: {
      id: data.id,
      unitId: data.unit_id,
      questionText: data.question_text,
      optionA: data.option_a,
      optionB: data.option_b,
      optionC: data.option_c,
      optionD: data.option_d,
      correctOption: data.correct_option,
      difficulty: data.difficulty,
      explanation: data.explanation,
      uploadedBy: data.uploaded_by,
    },
    error: null,
  }
}
