const formatTime = (seconds) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`

function LiveBoard({ rows }) {
  if (!rows.length) {
    return (
      <div className="card">
        <h3>Live Leaderboard</h3>
        <p className="muted">No leaderboard rows found for selected filters.</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h3>Live Leaderboard</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Student</th>
            <th>Subject</th>
            <th>Score</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.student}-${row.subject}`}>
              <td>{index + 1}</td>
              <td>{row.student}</td>
              <td>{row.subject}</td>
              <td>{row.score}</td>
              <td>{formatTime(row.timeTakenSec)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default LiveBoard
