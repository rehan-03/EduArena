const apiKey = import.meta.env.VITE_GROQ_API_KEY

let groq = null
if (apiKey && typeof apiKey === 'string' && apiKey.startsWith('gsk_')) {
  try {
    const { default: Groq } = await import('groq')
    groq = new Groq({ apiKey })
  } catch (e) {
    console.warn('Groq SDK failed to load:', e)
  }
}

const SYSTEM_PROMPT = `You are an expert question generator for computer science education. Generate multiple-choice questions (MCQs) for university-level students.

Generate questions in the following EXACT JSON format (no extra text, no markdown):

{
  "questions": [
    {
      "questionText": "Question stem here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "difficulty": "easy|medium|hard",
      "explanation": "Brief explanation of why the answer is correct."
    }
  ]
}

Rules:
- questionText should be clear and unambiguous
- options should be plausible (no "none of the above" or "all of the above")
- correctIndex must be 0-3 (corresponding to options array order)
- difficulty: easy (basic recall), medium (application), hard (analysis/synthesis)
- explanation: 1-2 sentences explaining the correct answer
- Output ONLY valid JSON, no additional text or markdown`

export const generateQuestions = async ({
  subject,
  unit,
  count = 5,
  difficulty = 'medium',
}) => {
  if (!groq) {
    return { questions: [], error: 'Groq is not configured or failed to load' }
  }

  const prompt = `Generate ${count} MCQ questions for:
- Subject: ${subject}
- Topic/Unit: ${unit}
- Difficulty: ${difficulty}

Make sure questions are relevant to the specific topic "${unit}" in ${subject}.`

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      response_format: { type: 'json_object' },
    })

    const responseText = chatCompletion.choices[0]?.message?.content
    if (!responseText) {
      return { questions: [], error: 'No response from AI' }
    }

    const parsed = JSON.parse(responseText)
    
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return { questions: [], error: 'Invalid response format' }
    }

    const questions = parsed.questions.map((q, index) => ({
      id: `ai-gen-${Date.now()}-${index}`,
      questionText: q.questionText || '',
      options: q.options || [],
      correctIndex: q.correctIndex ?? 0,
      difficulty: q.difficulty || 'medium',
      explanation: q.explanation || '',
      isAIGenerated: true,
    })).filter(q => q.questionText && q.options.length === 4)

    return { questions, error: null }
  } catch (err) {
    console.error('Groq API error:', err)
    return { 
      questions: [], 
      error: err.message || 'Failed to generate questions' 
    }
  }
}

export const isGroqConfigured = () => {
  const key = import.meta.env.VITE_GROQ_API_KEY
  return Boolean(key && typeof key === 'string' && key.startsWith('gsk_'))
}