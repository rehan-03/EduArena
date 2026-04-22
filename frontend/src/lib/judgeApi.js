const JUDGE_SERVER_URL = import.meta.env.VITE_JUDGE_SERVER_URL || 'http://localhost:3001'

export const judgeCode = async ({ code, language, testCases = [] }) => {
  try {
    const response = await fetch(`${JUDGE_SERVER_URL}/api/judge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

export const isJudgeServerConfigured = () => {
  return Boolean(import.meta.env.VITE_JUDGE_SERVER_URL)
}