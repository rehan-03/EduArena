function FilterBar({ subject, onSubjectChange, batchYear, onBatchYearChange, subjects = [] }) {
  return (
    <div className="toolbar">
      <label>
        Subject
        <select value={subject} onChange={(event) => onSubjectChange(event.target.value)}>
          <option value="All">All</option>
          {subjects.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label>
        Semester
        <select value={batchYear} onChange={(event) => onBatchYearChange(event.target.value)}>
          <option value="All">All</option>
          <option value="4">4</option>
        </select>
      </label>
    </div>
  )
}

export default FilterBar
