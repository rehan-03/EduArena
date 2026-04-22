import { useEffect, useMemo, useState } from 'react'
import {
  getCodingProblems,
  getRecentCodeSubmissions,
  getSubjectCatalog,
  submitCodeSolution,
} from '../lib/supabaseApi'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'

const starterCodeByLanguage = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
  // Write your solution here
  return 0;
}
`,
  java: `import java.util.*;

public class Main {
  public static void main(String[] args) {
    // Write your solution here
  }
}
`,
  python: `def solve():
    # Write your solution here
    pass

if __name__ == "__main__":
    solve()
`,
}

const getVerdictClass = (verdict) => {
  const value = String(verdict ?? '').toLowerCase()
  if (value === 'accepted') return 'accepted'
  if (value === 'pending') return 'pending'
  return 'wrong'
}

function CodingChallenge() {
  const user = useAuthStore((state) => state.user)
  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState('All')
  const [difficulty, setDifficulty] = useState('All')
  const [problems, setProblems] = useState([])
  const [selectedProblemId, setSelectedProblemId] = useState(null)
  const [language, setLanguage] = useState('cpp')
  const [codeByLanguage, setCodeByLanguage] = useState(starterCodeByLanguage)
  const [loadingProblems, setLoadingProblems] = useState(true)
  const [submitState, setSubmitState] = useState({ saving: false, message: '' })
  const [submissionHistory, setSubmissionHistory] = useState([])

  useEffect(() => {
    let mounted = true
    getSubjectCatalog({ codingOnly: true }).then((rows) => {
      if (!mounted) {
        return
      }
      setSubjects(rows)
    })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    getCodingProblems({ subjectId, difficulty }).then((rows) => {
      if (!mounted) {
        return
      }
      setProblems(rows)
      setSelectedProblemId((current) => {
        if (current && rows.some((item) => item.id === current)) {
          return current
        }
        return rows[0]?.id ?? null
      })
      setLoadingProblems(false)
    })
    return () => {
      mounted = false
    }
  }, [subjectId, difficulty])

  useEffect(() => {
    if (isSupabaseConfigured && !user?.id) {
      return
    }
    let mounted = true
    getRecentCodeSubmissions({ studentId: user?.id ?? 'guest-local', limit: 8 }).then((rows) => {
      if (mounted) {
        setSubmissionHistory(rows)
      }
    })
    return () => {
      mounted = false
    }
  }, [user?.id])

  const selectedProblem = useMemo(
    () => problems.find((item) => item.id === selectedProblemId) ?? null,
    [problems, selectedProblemId],
  )

  const handleLanguageChange = (nextLanguage) => {
    setLanguage(nextLanguage)
  }

  const handleSubjectChange = (value) => {
    setLoadingProblems(true)
    setSubjectId(value)
  }

  const handleDifficultyChange = (value) => {
    setLoadingProblems(true)
    setDifficulty(value)
  }

  const handleSubmit = async () => {
    if (!selectedProblem) {
      setSubmitState({ saving: false, message: 'Select a problem first.' })
      return
    }
    if (isSupabaseConfigured && !user?.id) {
      setSubmitState({ saving: false, message: 'Sign in first to submit code.' })
      return
    }
    const code = codeByLanguage[language] ?? ''
    if (!code.trim()) {
      setSubmitState({ saving: false, message: 'Code cannot be empty.' })
      return
    }

    setSubmitState({ saving: true, message: '' })
    const result = await submitCodeSolution({
      studentId: user?.id ?? 'guest-local',
      problemId: selectedProblem.id,
      language,
      code,
      testCases: selectedProblem.testCases || [],
    })
    if (result.error) {
      setSubmitState({ saving: false, message: result.error })
      return
    }
    setSubmitState({
      saving: false,
      message: `Submitted successfully. Current verdict: ${result.verdict}.`,
    })

    const rows = await getRecentCodeSubmissions({ studentId: user?.id ?? 'guest-local', limit: 8 })
    setSubmissionHistory(rows)
  }

  const resetEditorWithStarter = () => {
    setCodeByLanguage((current) => ({
      ...current,
      [language]: starterCodeByLanguage[language],
    }))
  }

  return (
    <section className="page coding-page">
      <h1>Coding Challenge Module</h1>
      <p className="lead">Problem browser + code submission flow wired to `coding_problems` and `code_submissions`.</p>

      <div className="toolbar">
        <label>
          Subject
          <select value={subjectId} onChange={(event) => handleSubjectChange(event.target.value)}>
            <option value="All">All</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Difficulty
          <select value={difficulty} onChange={(event) => handleDifficultyChange(event.target.value)}>
            <option value="All">All</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>
      </div>

      {loadingProblems ? (
        <p className="muted">Loading problems...</p>
      ) : (
        <div className="coding-workspace">
          <div className="card problem-pane">
            <h3>Problems</h3>
            {!problems.length ? (
              <p className="muted">No problems found for selected filters.</p>
            ) : (
              <ul className="history-list">
                {problems.map((problem) => (
                  <li key={problem.id}>
                    <button
                      type="button"
                      className={selectedProblemId === problem.id ? 'primary' : 'ghost'}
                      onClick={() => setSelectedProblemId(problem.id)}
                    >
                      {problem.title} <span className={`difficulty-tag ${problem.difficulty}`}>{problem.difficulty}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="problem-description">
              <h3>{selectedProblem?.title ?? 'Select A Problem'}</h3>
              <p className="muted">{selectedProblem?.subject ?? 'No subject'}</p>
              <p>{selectedProblem?.description ?? 'Choose a problem from the list.'}</p>
              {selectedProblem && (
                <>
                  <p className="muted">Sample Input: {selectedProblem.sampleInput || 'N/A'}</p>
                  <p className="muted">Sample Output: {selectedProblem.sampleOutput || 'N/A'}</p>
                  <p className="muted">Time Limit: {selectedProblem.timeLimitMs || 2000} ms</p>
                </>
              )}
            </div>
          </div>

          <div className="card editor-pane">
            <h3>Code Editor</h3>
            <div className="toolbar">
              <label>
                Language
                <select value={language} onChange={(event) => handleLanguageChange(event.target.value)}>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                  <option value="python">Python</option>
                </select>
              </label>
            </div>
            <textarea
              className="code-editor"
              value={codeByLanguage[language] ?? ''}
              onChange={(event) =>
                setCodeByLanguage((current) => ({
                  ...current,
                  [language]: event.target.value,
                }))
              }
              rows={18}
            />
            <div className="actions-row">
              <button type="button" className="ghost" onClick={resetEditorWithStarter}>
                Reset Starter
              </button>
              <button type="button" className="primary" onClick={handleSubmit} disabled={submitState.saving}>
                {submitState.saving ? 'Submitting...' : 'Submit Solution'}
              </button>
              {submitState.message ? (
                <span className={`status-pill ${submitState.message.includes('successfully') ? 'ok' : 'warn'}`}>
                  {submitState.message}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Recent Submissions</h3>
        {!submissionHistory.length ? (
          <p className="muted">No submissions yet.</p>
        ) : (
          <ul className="history-list">
            {submissionHistory.map((row) => (
              <li key={row.id} className="submission-item">
                <span>
                  {row.problemTitle} ({row.language})
                </span>
                <span className="submission-meta">
                  <span className={`verdict-badge ${getVerdictClass(row.verdict)}`}>{row.verdict}</span>
                  <strong>{row.submittedAt}</strong>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default CodingChallenge
