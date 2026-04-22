function QuestionUpload({
  subjects = [],
  units = [],
  form,
  onFormChange,
  onCheckDuplicate,
  onCreateQuestion,
  onGenerateAI,
  busy,
  infoMessage,
  isGeneratingAI,
}) {
  const handleField = (field) => (event) => {
    onFormChange(field, event.target.value)
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Add MCQ (Manual)</h3>
        <button
          type="button"
          className="secondary small"
          onClick={onGenerateAI}
          disabled={!form.subjectId || !form.unitId || isGeneratingAI}
          title={!form.subjectId || !form.unitId ? 'Select subject and unit first' : 'Generate questions with AI'}
        >
          {isGeneratingAI ? 'Generating...' : '🤖 Generate with AI'}
        </button>
      </div>
      <div className="grid two">
        <label>
          Subject
          <select value={form.subjectId} onChange={handleField('subjectId')}>
            <option value="">Select subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Unit
          <select value={form.unitId} onChange={handleField('unitId')}>
            <option value="">Select unit</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                U{unit.unit_number}: {unit.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Question
        <textarea className="code-editor" rows={4} value={form.questionText} onChange={handleField('questionText')} />
      </label>

      <div className="grid two">
        <label>
          Option A
          <input type="text" value={form.optionA} onChange={handleField('optionA')} />
        </label>
        <label>
          Option B
          <input type="text" value={form.optionB} onChange={handleField('optionB')} />
        </label>
        <label>
          Option C
          <input type="text" value={form.optionC} onChange={handleField('optionC')} />
        </label>
        <label>
          Option D
          <input type="text" value={form.optionD} onChange={handleField('optionD')} />
        </label>
      </div>

      <div className="grid two">
        <label>
          Correct Option
          <select value={form.correctOption} onChange={handleField('correctOption')}>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </label>
        <label>
          Difficulty
          <select value={form.difficulty} onChange={handleField('difficulty')}>
            <option value="easy">easy</option>
            <option value="medium">medium</option>
            <option value="hard">hard</option>
          </select>
        </label>
      </div>

      <label>
        Explanation
        <textarea className="code-editor" rows={3} value={form.explanation} onChange={handleField('explanation')} />
      </label>

      <div className="actions-row">
        <button type="button" className="ghost" onClick={onCheckDuplicate} disabled={busy}>
          Check Duplicate
        </button>
        <button type="button" className="primary" onClick={onCreateQuestion} disabled={busy}>
          {busy ? 'Saving...' : 'Create Question'}
        </button>
      </div>
      {infoMessage ? <p className="muted">{infoMessage}</p> : null}
    </div>
  )
}

export default QuestionUpload

const OPTION_CHARS = ['A', 'B', 'C', 'D']

export function AIGeneratedQuestionsModal({ questions, onSelect, onClose }) {
  if (!questions.length) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>AI Generated Questions</h3>
          <button type="button" className="close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p className="muted">Select questions to add to the question bank:</p>
          <div className="ai-questions-list">
            {questions.map((q, idx) => (
              <div key={q.id || idx} className="ai-question-card">
                <label className="ai-question-select">
                  <input
                    type="checkbox"
                    defaultChecked
                    onChange={(e) => {
                      const checkboxes = document.querySelectorAll('.ai-question-select input')
                      checkboxes[idx].checked = e.target.checked
                    }}
                  />
                  <span className="question-number">Q{idx + 1}</span>
                </label>
                <div className="question-content">
                  <p className="question-text"><strong>{q.questionText}</strong></p>
                  <div className="options-list">
                    {q.options.map((opt, optIdx) => (
                      <p key={optIdx} className={optIdx === q.correctIndex ? 'correct' : ''}>
                        {OPTION_CHARS[optIdx]}. {opt}
                      </p>
                    ))}
                  </div>
                  <p className="explanation muted">Explanation: {q.explanation}</p>
                  <span className={`difficulty-badge ${q.difficulty}`}>{q.difficulty}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="primary"
            onClick={() => {
              const selected = []
              const checkboxes = document.querySelectorAll('.ai-question-select input')
              questions.forEach((q, idx) => {
                if (checkboxes[idx]?.checked) {
                  selected.push(q)
                }
              })
              onSelect(selected)
            }}
          >
            Add Selected ({questions.length})
          </button>
        </div>
      </div>
    </div>
  )
}
