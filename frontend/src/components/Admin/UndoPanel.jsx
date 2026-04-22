function UndoPanel({ deletedCount = 0, onUndo, busy, infoMessage }) {
  return (
    <div className="card">
      <h3>Undo Delete (Stack)</h3>
      <p className="muted">Last delete buffer: {deletedCount}/10</p>
      <button type="button" className="danger" onClick={onUndo} disabled={busy || deletedCount === 0}>
        Undo Last Delete
      </button>
      {infoMessage ? <p className="muted">{infoMessage}</p> : null}
    </div>
  )
}

export default UndoPanel
