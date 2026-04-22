function AttemptHistory({ attempts }) {
  return (
    <div className="card">
      <h3>Attempt History</h3>
      <ul className="history-list">
        {attempts.map((attempt) => (
          <li key={attempt.id}>
            <span>{attempt.submittedAt}</span>
            <strong>
              {attempt.subject}: {attempt.score}/{attempt.total}
            </strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default AttemptHistory
