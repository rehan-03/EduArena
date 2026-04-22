import { useEffect, useState } from 'react'
import AttemptHistory from '../components/Dashboard/AttemptHistory'
import ProgressChart from '../components/Dashboard/ProgressChart'
import { getDashboardData } from '../lib/supabaseApi'
import { useAuthStore } from '../store/authStore'

function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const [data, setData] = useState({
    attempts: [],
    progressRows: [],
    weakUnitRows: [],
  })
  const [loadedOnce, setLoadedOnce] = useState(false)

  useEffect(() => {
    let mounted = true
    getDashboardData({ studentId: user?.id }).then((nextData) => {
      if (!mounted) {
        return
      }
      setData(nextData)
      setLoadedOnce(true)
    })
    return () => {
      mounted = false
    }
  }, [user?.id])

  return (
    <section className="page">
      <h1>Student Dashboard</h1>
      <p className="lead">Progress tracking, attempt history, and weak-unit insights.</p>
      {!loadedOnce && <p className="muted">Loading dashboard...</p>}
      <div className="grid two">
        <ProgressChart progressRows={data.progressRows} />
        <div className="card">
          <h3>Weak Unit Detection</h3>
          <ul className="history-list">
            {data.weakUnitRows.map((unit) => (
              <li key={`${unit.subject}-${unit.unit}`}>
                <span>
                  {unit.subject}: {unit.unit}
                </span>
                <strong>{unit.average}% avg</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <AttemptHistory attempts={data.attempts} />
    </section>
  )
}

export default Dashboard
