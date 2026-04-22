function ProgressChart({ progressRows }) {
  return (
    <div className="card">
      <h3>Subject-Wise Progress</h3>
      <div className="progress-list">
        {progressRows.map((item) => (
          <div key={item.subject} className="progress-item">
            <div className="progress-head">
              <span>{item.subject}</span>
              <strong>{item.completion}%</strong>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${item.completion}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProgressChart
