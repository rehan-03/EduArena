import { useEffect, useMemo, useRef, useState } from 'react'
import * as monaco from 'monaco-editor'
import {
  getCodingProblems,
  getRecentCodeSubmissions,
  getSubjectCatalog,
  submitCodeSolution,
  runCode,
} from '../lib/supabaseApi'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuthStore } from '../store/authStore'

/* ─── starter code templates ─── */
const STARTERS = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Write your solution here
    
    return 0;
}
`,
  java: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        Scanner sc = new Scanner(System.in);
        // Write your solution here
    }
}
`,
  python: `import sys
input = sys.stdin.readline

def main():
    # Write your solution here
    pass

main()
`,
}

const LANG_LABELS = { cpp: 'C++', java: 'Java', python: 'Python' }

const VERDICT_META = {
  accepted:          { label: 'Accepted',           color: '#22c55e', icon: '✓' },
  wrong_answer:      { label: 'Wrong Answer',        color: '#ef4444', icon: '✗' },
  compilation_error: { label: 'Compilation Error',   color: '#f97316', icon: '⚠' },
  runtime_error:     { label: 'Runtime Error',       color: '#f97316', icon: '💥' },
  time_limit_exceeded:{ label: 'Time Limit Exceeded', color: '#eab308', icon: '⏱' },
  pending:           { label: 'Pending',             color: '#6b7280', icon: '…' },
  error:             { label: 'Error',               color: '#ef4444', icon: '!' },
}

function verdictMeta(v) {
  return VERDICT_META[String(v).toLowerCase()] ?? { label: v ?? 'Unknown', color: '#6b7280', icon: '?' }
}

/* ─── Monaco Editor component ─── */
function MonacoEditor({ code, language, onChange }) {
  const containerRef = useRef(null)
  const editorRef = useRef(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  useEffect(() => {
    if (!containerRef.current || editorRef.current) return
    const ed = monaco.editor.create(containerRef.current, {
      value: code,
      language: language === 'cpp' ? 'cpp' : language,
      theme: 'vs-dark',
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      padding: { top: 12 },
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    })
    ed.onDidChangeModelContent(() => {
      onChangeRef.current?.(ed.getValue())
    })
    editorRef.current = ed
    return () => { ed.dispose(); editorRef.current = null }
  }, []) // eslint-disable-line

  useEffect(() => {
    const ed = editorRef.current
    if (!ed) return
    const model = ed.getModel()
    if (model) monaco.editor.setModelLanguage(model, language === 'cpp' ? 'cpp' : language)
  }, [language])

  useEffect(() => {
    const ed = editorRef.current
    if (ed && ed.getValue() !== code) ed.setValue(code)
  }, [code])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '400px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #334155' }}
    />
  )
}

/* ─── Test Case Panel ─── */
function TestResultsPanel({ testCases, results, isRunning }) {
  const [open, setOpen] = useState(null)

  if (!testCases?.length) return null

  return (
    <div className="test-results-panel">
      <h4 className="panel-title">Test Cases ({testCases.length})</h4>
      <div className="tc-list">
        {testCases.map((tc, i) => {
          const res = results?.[i]
          const passed = res?.passed
          const hasTried = results && results.length > i
          return (
            <div
              key={i}
              className={`tc-item ${hasTried ? (passed ? 'tc-pass' : 'tc-fail') : ''}`}
            >
              <button className="tc-header" onClick={() => setOpen(open === i ? null : i)}>
                <span>Test {i + 1}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isRunning && !hasTried && <span className="tc-spinner" />}
                  {hasTried && (
                    <span style={{ color: passed ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                      {passed ? '✓ Passed' : '✗ Failed'}
                    </span>
                  )}
                  <span style={{ color: '#64748b', fontSize: 12 }}>{open === i ? '▼' : '▶'}</span>
                </span>
              </button>
              {open === i && (
                <div className="tc-body">
                  <div className="tc-row"><span className="tc-label">Input:</span><pre className="tc-pre">{tc.input || '(empty)'}</pre></div>
                  <div className="tc-row"><span className="tc-label">Expected:</span><pre className="tc-pre">{tc.expectedOutput}</pre></div>
                  {hasTried && res.actualOutput !== undefined && (
                    <div className="tc-row">
                      <span className="tc-label" style={{ color: passed ? '#22c55e' : '#ef4444' }}>Got:</span>
                      <pre className="tc-pre">{res.actualOutput ?? '(no output)'}</pre>
                    </div>
                  )}
                  {hasTried && res.error && (
                    <div className="tc-row"><span className="tc-label" style={{ color: '#f97316' }}>Error:</span><pre className="tc-pre tc-error">{res.error}</pre></div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Difficulty badge ─── */
const DIFF_COLORS = { easy: '#22c55e', medium: '#f59e0b', hard: '#ef4444' }
function DiffBadge({ d }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11,
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
      background: DIFF_COLORS[d] + '22', color: DIFF_COLORS[d], border: `1px solid ${DIFF_COLORS[d]}44`,
    }}>{d}</span>
  )
}

/* ─── Main Page ─── */
export default function CodingChallenge() {
  const user = useAuthStore((s) => s.user)
  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState('All')
  const [difficulty, setDifficulty] = useState('All')
  const [problems, setProblems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [language, setLanguage] = useState('cpp')
  const [codeMap, setCodeMap] = useState({ ...STARTERS })
  const [loadingProblems, setLoadingProblems] = useState(true)

  // Judge state
  const [runOutput, setRunOutput] = useState(null)   // { output, error } for "Run" button
  const [customInput, setCustomInput] = useState('')
  const [tcResults, setTcResults] = useState([])     // per-test results for "Submit"
  const [judging, setJudging] = useState(false)
  const [running, setRunning] = useState(false)
  const [submitResult, setSubmitResult] = useState(null) // { verdict, message }
  const [history, setHistory] = useState([])
  const [activeTab, setActiveTab] = useState('problem') // 'problem' | 'testcases'

  /* load subjects */
  useEffect(() => {
    getSubjectCatalog().then(setSubjects)
  }, [])

  /* load problems */
  useEffect(() => {
    let alive = true
    setLoadingProblems(true)
    getCodingProblems({ subjectId, difficulty }).then((rows) => {
      if (!alive) return
      setProblems(rows)
      setSelectedId((cur) => (cur && rows.some((r) => r.id === cur) ? cur : rows[0]?.id ?? null))
      setLoadingProblems(false)
    })
    return () => { alive = false }
  }, [subjectId, difficulty])

  /* load submission history */
  useEffect(() => {
    if (isSupabaseConfigured && !user?.id) return
    getRecentCodeSubmissions({ studentId: user?.id ?? 'guest-local', limit: 10 }).then(setHistory)
  }, [user?.id])

  const problem = useMemo(() => problems.find((p) => p.id === selectedId) ?? null, [problems, selectedId])

  /* reset output when problem/language changes */
  useEffect(() => {
    setRunOutput(null)
    setTcResults([])
    setSubmitResult(null)
  }, [selectedId, language])

  const code = codeMap[language] ?? ''
  const setCode = (val) => setCodeMap((m) => ({ ...m, [language]: val }))

  /* RUN: execute code against custom input (no test case checking) */
  const handleRun = async () => {
    if (!code.trim()) return
    setRunning(true)
    setRunOutput(null)
    try {
      const res = await runCode({ code, language, input: customInput })
      setRunOutput(res)
    } catch (e) {
      setRunOutput({ success: false, output: '', error: e.message })
    }
    setRunning(false)
    setActiveTab('testcases')
  }

  /* SUBMIT: run against all test cases */
  const handleSubmit = async () => {
    if (!problem) { setSubmitResult({ verdict: 'error', message: 'Select a problem first.' }); return }
    // guests are allowed — submissions fall back to in-memory storage
    if (!code.trim()) { setSubmitResult({ verdict: 'error', message: 'Code cannot be empty.' }); return }

    setJudging(true)
    setTcResults([])
    setRunOutput(null)
    setSubmitResult(null)
    setActiveTab('testcases')

    const testCases = problem.testCases || []

    const res = await submitCodeSolution({
      studentId: user?.id ?? 'guest-local',
      problemId: problem.id,
      language,
      code,
      testCases,
    })

    // Build per-tc results from judgeResult
    const jr = res.judgeResult
    if (jr && testCases.length) {
      // Reconstruct which tests passed
      const tcRes = testCases.map((tc, i) => {
        if (jr.verdict === 'accepted') return { passed: true, actualOutput: tc.expectedOutput }
        // The judge stops at first failure
        const failIdx = testCases.findIndex((t, j) => j === i)
        if (i < testCases.indexOf(tc)) return { passed: true, actualOutput: tc.expectedOutput }
        return {
          passed: jr.verdict === 'accepted',
          actualOutput: jr.output ?? '',
          error: i === 0 ? jr.error : undefined,
        }
      })
      // Simpler: mark all passed if accepted, else mark first failure
      const builtResults = testCases.map((tc, i) => {
        if (jr.verdict === 'accepted') return { passed: true, actualOutput: tc.expectedOutput }
        // Only first failing tc gets details
        const failingIdx = testCases.findIndex(() => true) // first test
        if (i === 0 && jr.verdict !== 'accepted') {
          return { passed: false, actualOutput: jr.output ?? '', error: jr.error }
        }
        return { passed: jr.verdict === 'accepted' }
      })
      setTcResults(builtResults)
    }

    const meta = verdictMeta(res.verdict)
    setSubmitResult({
      verdict: res.verdict,
      message: res.error ? `Error: ${res.error}` : `${meta.icon} ${meta.label}`,
      color: meta.color,
      judgeResult: jr,
    })
    setJudging(false)

    // refresh history
    getRecentCodeSubmissions({ studentId: user?.id ?? 'guest-local', limit: 10 }).then(setHistory)
  }

  return (
    <section className="page coding-page">
      <div className="coding-header">
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Coding Arena
          </h1>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            SY-2023 Syllabus · Powered by Piston sandbox · C++ / Java / Python
          </p>
        </div>
        <div className="coding-filters">
          <label className="filter-label">
            Subject
            <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setLoadingProblems(true) }}>
              <option value="All">All</option>
              {subjects.map((s) => <option key={s.id ?? s} value={s.title ?? s}>{s.title ?? s}</option>)}
            </select>
          </label>

          <label className="filter-label">
            Difficulty
            <select value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setLoadingProblems(true) }}>
              <option value="All">All</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>
      </div>

      {loadingProblems ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading problems…</p>
        </div>
      ) : (
        <div className="coding-workspace">
          {/* ── Problem List ── */}
          <aside className="problem-sidebar">
            <h3 className="sidebar-title">Problems <span className="count-badge">{problems.length}</span></h3>
            {!problems.length
              ? <p className="muted">No problems match the selected filters.</p>
              : problems.map((p) => (
                <button
                  key={p.id}
                  className={`problem-btn ${selectedId === p.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(p.id)}
                >
                  <span className="problem-btn-title">{p.title}</span>
                  <DiffBadge d={p.difficulty} />
                </button>
              ))
            }
          </aside>

          {/* ── Center: Problem + Editor ── */}
          <div className="editor-main">
            {/* Tabs */}
            <div className="tab-bar">
              {['problem', 'testcases'].map((t) => (
                <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                  {t === 'problem' ? '📋 Problem' : '🧪 Test Cases'}
                </button>
              ))}
            </div>

            {activeTab === 'problem' && problem && (
              <div className="problem-description card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{problem.title}</h2>
                  <DiffBadge d={problem.difficulty} />
                  {problem.subject && <span className="subject-chip">{problem.subject}</span>}
                </div>
                <div className="problem-body">{problem.description?.split('\n').map((l, i) => <p key={i} style={{ margin: '4px 0' }}>{l}</p>)}</div>
                {problem.sampleInput && (
                  <div style={{ marginTop: 16 }}>
                    <strong style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase' }}>Sample Input</strong>
                    <pre className="sample-block">{problem.sampleInput}</pre>
                  </div>
                )}
                {problem.sampleOutput && (
                  <div style={{ marginTop: 12 }}>
                    <strong style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase' }}>Sample Output</strong>
                    <pre className="sample-block">{problem.sampleOutput}</pre>
                  </div>
                )}
                {problem.timeLimitMs && (
                  <p style={{ marginTop: 12, color: '#64748b', fontSize: 12 }}>⏱ Time Limit: {problem.timeLimitMs}ms</p>
                )}
              </div>
            )}
            {activeTab === 'problem' && !problem && (
              <div className="card"><p className="muted">Select a problem from the sidebar.</p></div>
            )}

            {activeTab === 'testcases' && (
              <div className="card">
                {/* Custom input run */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 6, textTransform: 'uppercase', fontWeight: 700 }}>
                    Custom Input (for Run)
                  </label>
                  <textarea
                    className="custom-input"
                    rows={3}
                    placeholder="Enter custom stdin here…"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                  />
                </div>
                {/* Run output */}
                {runOutput && (
                  <div style={{ marginBottom: 16 }}>
                    <strong style={{ color: '#94a3b8', fontSize: 12, textTransform: 'uppercase' }}>Output</strong>
                    <pre className={`sample-block ${runOutput.success ? '' : 'error-block'}`}>
                      {runOutput.output || runOutput.error || '(no output)'}
                    </pre>
                  </div>
                )}
                {/* Test case results */}
                {problem?.testCases?.length > 0 && (
                  <TestResultsPanel
                    testCases={problem.testCases}
                    results={tcResults}
                    isRunning={judging}
                  />
                )}
              </div>
            )}

            {/* ── Code Editor ── */}
            <div className="editor-card card">
              <div className="editor-toolbar">
                <div style={{ display: 'flex', gap: 8 }}>
                  {Object.entries(LANG_LABELS).map(([k, v]) => (
                    <button
                      key={k}
                      className={`lang-btn ${language === k ? 'active' : ''}`}
                      onClick={() => setLanguage(k)}
                    >{v}</button>
                  ))}
                </div>
                <button className="ghost reset-btn" onClick={() => setCode(STARTERS[language])}>
                  ↺ Reset
                </button>
              </div>

              <MonacoEditor
                code={code}
                language={language}
                onChange={setCode}
              />

              <div className="editor-actions">
                <button
                  className="run-btn"
                  onClick={handleRun}
                  disabled={running || judging}
                >
                  {running ? '⏳ Running…' : '▶ Run'}
                </button>
                <button
                  className="primary submit-btn"
                  onClick={handleSubmit}
                  disabled={judging || running}
                >
                  {judging ? '⏳ Judging…' : '🚀 Submit'}
                </button>
                {submitResult && (
                  <div
                    className="verdict-pill"
                    style={{ background: submitResult.color + '22', color: submitResult.color, borderColor: submitResult.color + '55' }}
                  >
                    {submitResult.message}
                    {submitResult.judgeResult?.error && submitResult.verdict !== 'accepted' && (
                      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 4 }}>
                        {String(submitResult.judgeResult.error).slice(0, 120)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Recent Submissions ── */}
      <div className="card submissions-card">
        <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>📜 Recent Submissions</h3>
        {!history.length
          ? <p className="muted">No submissions yet. Submit your first solution!</p>
          : (
            <div className="submissions-list">
              {history.map((row) => {
                const m = verdictMeta(row.verdict)
                return (
                  <div key={row.id} className="submission-row">
                    <span className="sub-title">{row.problemTitle}</span>
                    <span className="sub-lang">{row.language?.toUpperCase()}</span>
                    <span className="sub-verdict" style={{ color: m.color, background: m.color + '18', border: `1px solid ${m.color}44` }}>
                      {m.icon} {m.label}
                    </span>
                    <span className="sub-time">{row.submittedAt}</span>
                  </div>
                )
              })}
            </div>
          )
        }
      </div>
    </section>
  )
}
