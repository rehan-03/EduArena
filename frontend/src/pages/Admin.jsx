import { useEffect, useState } from 'react'
import QuestionUpload, { AIGeneratedQuestionsModal } from '../components/Admin/QuestionUpload'
import UndoPanel from '../components/Admin/UndoPanel'
import {
  checkQuestionDuplicate,
  createMcqQuestion,
  deleteMcqQuestion,
  getAdminSubjectAnalytics,
  getQuestionById,
  getRecentAdminQuestions,
  getSubjectCatalog,
  getUnitsBySubject,
  restoreMcqQuestion,
} from '../lib/supabaseApi'
import { generateQuestions, isGroqConfigured } from '../lib/groqApi'

function Admin() {
  const [analytics, setAnalytics] = useState([])
  const [recentQuestions, setRecentQuestions] = useState([])
  const [subjects, setSubjects] = useState([])
  const [units, setUnits] = useState([])
  const [busy, setBusy] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')
  const [undoMessage, setUndoMessage] = useState('')
  const [deletedStack, setDeletedStack] = useState([])
  const [form, setForm] = useState({
    subjectId: '',
    unitId: '',
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    difficulty: 'medium',
    explanation: '',
  })
  const [aiQuestions, setAiQuestions] = useState([])
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  const refreshAdminData = async () => {
    const [analyticsRows, recentRows] = await Promise.all([
      getAdminSubjectAnalytics(),
      getRecentAdminQuestions({ limit: 20 }),
    ])
    setAnalytics(analyticsRows)
    setRecentQuestions(recentRows)
  }

  useEffect(() => {
    let mounted = true
    Promise.all([getAdminSubjectAnalytics(), getRecentAdminQuestions({ limit: 20 }), getSubjectCatalog({ mcqOnly: true })]).then(
      ([analyticsRows, recentRows, subjectRows]) => {
        if (!mounted) {
          return
        }
        setAnalytics(analyticsRows)
        setRecentQuestions(recentRows)
        setSubjects(subjectRows)
      },
    )
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    if (!form.subjectId) return () => { mounted = false }

    getUnitsBySubject(Number(form.subjectId)).then((rows) => {
      if (mounted) {
        setUnits(rows)
        setForm((state) => ({
          ...state,
          unitId: rows.some((item) => String(item.id) === state.unitId) ? state.unitId : '',
        }))
      }
    })

    return () => {
      mounted = false
    }
  }, [form.subjectId])

  const updateForm = (field, value) => {
    if (field === 'subjectId') {
      setUnits([])
      setForm((state) => ({ ...state, subjectId: value, unitId: '' }))
      return
    }
    setForm((state) => ({ ...state, [field]: value }))
  }

  const validateForm = () => {
    if (!form.subjectId || !form.unitId) {
      return 'Subject and unit are required.'
    }
    if (!form.questionText.trim()) {
      return 'Question text is required.'
    }
    const options = [form.optionA, form.optionB, form.optionC, form.optionD]
    if (options.some((option) => !option.trim())) {
      return 'All 4 options are required.'
    }
    return null
  }

  const handleCheckDuplicate = async () => {
    const validationError = validateForm()
    if (validationError) {
      setInfoMessage(validationError)
      return
    }
    setBusy(true)
    const { isDuplicate, error } = await checkQuestionDuplicate({
      unitId: Number(form.unitId),
      questionText: form.questionText,
    })
    if (error) {
      setInfoMessage(error)
    } else {
      setInfoMessage(isDuplicate ? 'Duplicate found for this unit.' : 'No duplicate found.')
    }
    setBusy(false)
  }

  const handleCreateQuestion = async () => {
    const validationError = validateForm()
    if (validationError) {
      setInfoMessage(validationError)
      return
    }

    setBusy(true)
    const { questionId, error } = await createMcqQuestion({
      unitId: Number(form.unitId),
      questionText: form.questionText.trim(),
      optionA: form.optionA.trim(),
      optionB: form.optionB.trim(),
      optionC: form.optionC.trim(),
      optionD: form.optionD.trim(),
      correctOption: form.correctOption,
      difficulty: form.difficulty,
      explanation: form.explanation.trim(),
    })
    if (error) {
      setInfoMessage(error)
      setBusy(false)
      return
    }

    setInfoMessage(`Question created successfully (${questionId}).`)
    setForm((state) => ({
      ...state,
      questionText: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      explanation: '',
    }))
    await refreshAdminData()
    setBusy(false)
  }

  const handleDeleteQuestion = async (questionId) => {
    setBusy(true)
    const { data, error: readError } = await getQuestionById(questionId)
    if (readError || !data) {
      setInfoMessage(readError || 'Failed to read question before delete.')
      setBusy(false)
      return
    }

    const { error } = await deleteMcqQuestion(questionId)
    if (error) {
      setInfoMessage(error)
      setBusy(false)
      return
    }

    setDeletedStack((prev) => [data, ...prev].slice(0, 10))
    setInfoMessage('Question deleted. You can undo it.')
    await refreshAdminData()
    setBusy(false)
  }

  const handleUndoDelete = async () => {
    if (!deletedStack.length) {
      return
    }

    setBusy(true)
    const [lastDeleted, ...rest] = deletedStack
    const { error } = await restoreMcqQuestion(lastDeleted)
    if (error) {
      setUndoMessage(error)
      setBusy(false)
      return
    }

    setDeletedStack(rest)
    setUndoMessage('Last deleted question restored.')
    await refreshAdminData()
    setBusy(false)
  }

  const handleGenerateAI = async () => {
    if (!isGroqConfigured()) {
      setInfoMessage('Groq API is not configured. Add VITE_GROQ_API_KEY to .env')
      return
    }

    const selectedSubject = subjects.find(s => String(s.id) === String(form.subjectId))
    const selectedUnit = units.find(u => String(u.id) === String(form.unitId))

    if (!selectedSubject || !selectedUnit) {
      setInfoMessage('Please select both subject and unit')
      return
    }

    setIsGeneratingAI(true)
    setInfoMessage('')

    const { questions, error } = await generateQuestions({
      subject: selectedSubject.title,
      unit: selectedUnit.title,
      count: 5,
      difficulty: form.difficulty,
    })

    setIsGeneratingAI(false)

    if (error) {
      setInfoMessage(`AI Generation failed: ${error}`)
      return
    }

    if (questions.length === 0) {
      setInfoMessage('No questions generated. Try a different topic.')
      return
    }

    setAiQuestions(questions)
  }

  const handleSaveAIQuestions = async (selectedQuestions) => {
    if (!form.unitId) {
      setInfoMessage('Please select a unit first')
      return
    }

    setBusy(true)
    let savedCount = 0

    for (const q of selectedQuestions) {
      const { questionId, error } = await createMcqQuestion({
        unitId: Number(form.unitId),
        questionText: q.questionText,
        optionA: q.options[0],
        optionB: q.options[1],
        optionC: q.options[2],
        optionD: q.options[3],
        correctOption: ['A', 'B', 'C', 'D'][q.correctIndex],
        difficulty: q.difficulty,
        explanation: q.explanation,
      })

      if (!error && questionId) {
        savedCount++
      }
    }

    setAiQuestions([])
    setInfoMessage(`Successfully saved ${savedCount} AI-generated questions!`)
    await refreshAdminData()
    setBusy(false)
  }

  return (
    <section className="page">
      <h1>Admin Panel</h1>
      <p className="lead">Question upload workflows and delete recovery stack.</p>
      <div className="grid two">
        <QuestionUpload
          subjects={subjects}
          units={units}
          form={form}
          onFormChange={updateForm}
          onCheckDuplicate={handleCheckDuplicate}
          onCreateQuestion={handleCreateQuestion}
          onGenerateAI={handleGenerateAI}
          busy={busy}
          infoMessage={infoMessage}
          isGeneratingAI={isGeneratingAI}
        />
        <UndoPanel
          deletedCount={deletedStack.length}
          onUndo={handleUndoDelete}
          busy={busy}
          infoMessage={undoMessage}
        />
      </div>
      <div className="card">
        <h3>Per-Subject Attempt Analytics</h3>
        {!analytics.length ? (
          <p className="muted">No backend analytics yet. Connect Supabase data and submit quizzes.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Attempts</th>
                <th>Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {analytics.map((item) => (
                <tr key={item.subject}>
                  <td>{item.subject}</td>
                  <td>{item.attempts}</td>
                  <td>{item.averageScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="card">
        <h3>Recent MCQ Questions</h3>
        {!recentQuestions.length ? (
          <p className="muted">No questions found.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Unit</th>
                <th>Difficulty</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentQuestions.map((row) => (
                <tr key={row.id}>
                  <td>{row.subjectTitle}</td>
                  <td>{row.unitTitle}</td>
                  <td>{row.difficulty}</td>
                  <td>{row.createdAt}</td>
                  <td>
                    <button type="button" className="danger" onClick={() => handleDeleteQuestion(row.id)} disabled={busy}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <AIGeneratedQuestionsModal
        questions={aiQuestions}
        onSelect={handleSaveAIQuestions}
        onClose={() => setAiQuestions([])}
      />
    </section>
  )
}

export default Admin
