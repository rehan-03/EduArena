import { useMemo } from 'react'

const formatTime = (totalSec) => {
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function Timer({ timeLeftSec }) {
  const toneClass = useMemo(() => {
    if (timeLeftSec <= 30) return 'danger'
    if (timeLeftSec <= 90) return 'warn'
    return 'safe'
  }, [timeLeftSec])

  return (
    <div className={`timer-chip ${toneClass}`}>
      <span>Quiz Timer</span>
      <strong>{formatTime(timeLeftSec)}</strong>
    </div>
  )
}

export default Timer
