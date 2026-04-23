function QuizCard({ question, selectedIndex, questionNumber, totalQuestions, onSelect }) {
  if (!question) {
    return <div className="card">No active question.</div>
  }

  return (
    <article className="card">
      <p className="muted">
        {question.subject} / {question.unit} / {question.difficulty}
        <span className="question-progress">
          Question {questionNumber} of {totalQuestions}
        </span>
      </p>
      <h3>{question.questionText}</h3>
      <div className="option-list">
        {question.options.map((option, index) => (
          <button
            key={option}
            type="button"
            className={selectedIndex === index ? 'option selected' : 'option'}
            onClick={() => onSelect(index)}
          >
            <span>{String.fromCharCode(65 + index)}.</span> {option}
          </button>
        ))}
      </div>
    </article>
  )
}

export default QuizCard
