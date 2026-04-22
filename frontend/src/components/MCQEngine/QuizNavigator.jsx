function QuizNavigator({ canGoBack, onBack, onNext, onSubmit }) {
  return (
    <div className="actions-row">
      <button type="button" className="ghost" onClick={onBack} disabled={!canGoBack}>
        Back (Stack)
      </button>
      <button type="button" className="primary" onClick={onNext}>
        Next (Queue)
      </button>
      <button type="button" className="danger" onClick={onSubmit}>
        Submit Quiz
      </button>
    </div>
  )
}

export default QuizNavigator
