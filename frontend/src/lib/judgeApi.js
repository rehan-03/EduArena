const JUDGE_SERVER_URL = import.meta.env.VITE_JUDGE_SERVER_URL || 'http://localhost:3001'
const PISTON_API_URL = 'https://emkc.org/api/v2/piston'

const PISTON_LANGUAGE_MAP = {
  cpp: { language: 'c++', version: '10.2.0' },
  python: { language: 'python', version: '3.10.0' },
  java: { language: 'java', version: '15.0.2' },
}

/**
 * Run code against a single input using Piston API (free, sandboxed).
 */
const runWithPiston = async (code, language, input = '') => {
  const pistonLang = PISTON_LANGUAGE_MAP[language]
  if (!pistonLang) {
    return { success: false, output: '', error: `Unsupported language: ${language}` }
  }

  const ext = language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : 'py'
  const fileName = language === 'java' ? 'Main.java' : `solution.${ext}`

  const body = {
    language: pistonLang.language,
    version: pistonLang.version,
    files: [{ name: fileName, content: code }],
    stdin: input,
    compile_timeout: 10000,
    run_timeout: 5000,
  }

  const response = await fetch(`${PISTON_API_URL}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Piston API error: ${response.status}`)
  }

  const data = await response.json()

  if (data.compile && data.compile.code !== 0) {
    return {
      success: false,
      output: '',
      error: data.compile.stderr || data.compile.output || 'Compilation error',
      isCompileError: true,
    }
  }

  const run = data.run || {}
  const stdout = (run.stdout || '').trim()
  const stderr = run.stderr || ''
  const exitCode = run.code ?? 0

  if (exitCode !== 0 && !stdout) {
    return { success: false, output: stdout, error: stderr || 'Runtime error' }
  }

  return { success: true, output: stdout, error: stderr || null }
}

/**
 * Judge code against all test cases using Piston API first,
 * falling back to the local judge server if Piston fails.
 */
export const judgeCode = async ({ code, language, testCases = [] }) => {
  // Try Piston first (always available, no setup required)
  try {
    if (!testCases.length) {
      const result = await runWithPiston(code, language, '')
      if (result.isCompileError) {
        return { verdict: 'compilation_error', output: '', error: result.error }
      }
      return { verdict: 'accepted', output: result.output, error: result.error }
    }

    for (const tc of testCases) {
      const input = tc.input || ''
      const expected = (tc.expectedOutput || tc.expected || '').trim()
      const result = await runWithPiston(code, language, input)

      if (result.isCompileError) {
        return { verdict: 'compilation_error', output: '', error: result.error, input }
      }

      if (!result.success) {
        return { verdict: 'runtime_error', output: result.output, error: result.error, input }
      }

      const actual = result.output.trim()
      if (actual !== expected) {
        return {
          verdict: 'wrong_answer',
          output: actual,
          expectedOutput: expected,
          input,
          error: `Expected: "${expected}" but got: "${actual}"`,
        }
      }
    }

    return { verdict: 'accepted', output: '', error: null }
  } catch (pistonErr) {
    console.warn('Piston API failed, trying local judge server:', pistonErr.message)
  }

  // Fallback: local judge server
  try {
    const response = await fetch(`${JUDGE_SERVER_URL}/api/judge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language, testCases }),
    })

    if (!response.ok) {
      const error = await response.text()
      return { verdict: 'error', error: `Server error: ${error}` }
    }

    return await response.json()
  } catch (err) {
    return { verdict: 'error', error: `Connection failed: ${err.message}` }
  }
}

/**
 * Run code without test cases and return raw output (for "Run" feature).
 */
export const runCode = async ({ code, language, input = '' }) => {
  try {
    const result = await runWithPiston(code, language, input)
    if (result.isCompileError) {
      return { success: false, output: '', error: result.error, isCompileError: true }
    }
    return { success: result.success, output: result.output, error: result.error }
  } catch (err) {
    return { success: false, output: '', error: `Execution failed: ${err.message}` }
  }
}

export const isJudgeServerConfigured = () => {
  return Boolean(import.meta.env.VITE_JUDGE_SERVER_URL)
}