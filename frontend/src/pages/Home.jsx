function Home() {
  return (
    <section className="page">
      <h1>EduArena</h1>
      <p className="lead">
        Syllabus-aligned competitive practice for K.K. Wagh students with MCQ quizzes, coding rounds,
        and real-time leaderboards.
      </p>
      <div className="grid two">
        <article className="card">
          <h3>Student Flow</h3>
          <p>Attempt timed quizzes by subject and track weak units over time.</p>
        </article>
        <article className="card">
          <h3>Faculty Flow</h3>
          <p>Manage question bank by subject/unit and monitor attempt analytics.</p>
        </article>
      </div>
    </section>
  )
}

export default Home
