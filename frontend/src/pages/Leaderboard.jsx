import { useEffect, useState } from 'react'
import FilterBar from '../components/Leaderboard/FilterBar'
import LiveBoard from '../components/Leaderboard/LiveBoard'
import { getLeaderboardRows, getSubjects, subscribeToLeaderboard } from '../lib/supabaseApi'

function Leaderboard() {
  const [subject, setSubject] = useState('All')
  const [batchYear, setBatchYear] = useState('All')
  const [subjects, setSubjects] = useState(['DSA', 'OS', 'CN', 'DBMS'])
  const [rows, setRows] = useState([])
  const [loadedOnce, setLoadedOnce] = useState(false)

  useEffect(() => {
    let mounted = true
    getSubjects().then((data) => {
      if (!mounted || !data.length) {
        return
      }
      setSubjects(data)
    })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    getLeaderboardRows({ subject, batchYear }).then((data) => {
      if (!mounted) {
        return
      }
      setRows(data)
      setLoadedOnce(true)
    })

    const unsubscribe = subscribeToLeaderboard({
      subject,
      batchYear,
      onChange: (nextRows) => {
        if (mounted) {
          setRows(nextRows)
        }
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [subject, batchYear])

  return (
    <section className="page">
      <h1>Real-Time Leaderboard</h1>
      <p className="lead">Ranking rule: higher total score first. Filter by subject and semester.</p>
      <FilterBar
        subject={subject}
        onSubjectChange={setSubject}
        batchYear={batchYear}
        onBatchYearChange={setBatchYear}
        subjects={subjects}
      />
      {!loadedOnce ? <p className="muted">Loading leaderboard...</p> : <LiveBoard rows={rows} />}
    </section>
  )
}

export default Leaderboard
