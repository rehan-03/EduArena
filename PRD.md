# Product Requirements Document
## EduArena — Syllabus-Aligned Competitive Practice Platform
**Version:** 1.0  
**College:** K.K. Wagh Institute of Engineering Education and Research, Nashik  
**Team:** Beyond Just Programming  
**Date:** April 2026

---

## 1. Problem Statement

Engineering students at Tier-2 colleges lack a platform that aligns competitive coding and MCQ practice directly with their university syllabus. Existing platforms (LeetCode, HackerRank) are generic and disconnected from semester subjects. Faculty have no streamlined way to push practice content to students. EduArena solves this by providing a college-specific, syllabus-mapped, timed practice platform with real-time leaderboards.

---

## 2. Goals & Objectives

- Allow students to attempt MCQ quizzes mapped to specific subjects and syllabus units
- Allow students to solve timed coding problems in C++ (and other languages)
- Show a real-time leaderboard ranked by score and time taken
- Allow faculty (admin) to manage the question bank by subject, unit, and difficulty
- Track individual student progress over time across subjects
- Restrict access to verified college students only (domain-based auth)

---

## 3. Target Users

| User Type | Description |
|-----------|-------------|
| Student | CSE / IT / ENTC branch students of K.K. Wagh, any semester |
| Faculty / Admin | Professors who upload and manage questions per subject |
| Super Admin | Platform owner — manages faculty accounts and global settings |

---

## 4. Core Features

### 4.1 Authentication
- Google OAuth restricted to `@kkwagh.edu.in` email domain
- Supabase Auth handles session management
- Role-based access: student / faculty / super-admin

### 4.2 MCQ Quiz Engine
- Questions organised by: Branch → Semester → Subject → Unit
- Each quiz has a configurable timer (per quiz, not per question)
- Questions served from a queue — shuffled per session
- Back navigation using a visited-question stack
- No repeat questions within the same session (hash set of attempted IDs)
- Auto-submit on timer expiry

### 4.3 Coding Challenge Module
- Problems tagged by subject (DSA, OS, CN, DBMS etc.)
- Students write and submit C++ (or Python / Java) solutions
- Submissions enter an execution queue processed by the C++ Judge Engine
- Verdict: Accepted / Wrong Answer / Time Limit Exceeded / Compilation Error
- Test cases stored as input-output string pairs

### 4.4 Real-Time Leaderboard
- Ranked by: total score (descending) → time taken (ascending) as tiebreaker
- Updates live using Supabase Realtime subscriptions
- Filterable by subject, batch year, and time window (today / this week / all time)
- Leaderboard internally maintained as a sorted structure by the C++ scoring engine

### 4.5 Admin Panel
- Upload MCQs via CSV or manual form
- Duplicate question detection on upload (hashing by question text)
- Undo last delete (stack-based recovery, last 10 deletions)
- View per-subject attempt analytics

### 4.6 Student Dashboard
- Subject-wise progress tracker
- Attempt history as a chronological list
- Weak unit detection based on past scores

---

## 5. Tech Stack

### 5.1 Frontend
| Tool | Purpose |
|------|---------|
| React 18 | UI framework |
| Tailwind CSS | Styling |
| Zustand | Client-side state (quiz session, timer) |
| Supabase JS Client | DB queries, auth, realtime |
| Monaco Editor | In-browser code editor for coding challenges |

### 5.2 Backend & Infrastructure
| Tool | Purpose |
|------|---------|
| Supabase (PostgreSQL) | Primary database |
| Supabase Auth | Google OAuth + role management |
| Supabase Realtime | Live leaderboard updates |
| Supabase Edge Functions | Score calculation, email domain validation on signup |
| Supabase Storage | Profile pictures, CSV question uploads |

### 5.3 C++ Judge Engine *(core DS usage lives here)*
| Tool | Purpose |
|------|---------|
| C++ (g++) | Custom judge executable |
| Piston API | Sandboxed remote code execution (fallback) |
| Node.js wrapper | Bridge between Supabase Edge Function and C++ binary |

### 5.4 Hosting
| Layer | Platform |
|-------|---------|
| Frontend | Vercel (free tier) |
| Backend / DB | Supabase (free tier) |
| C++ Judge | Railway or Render (containerised) |

---

## 6. Where C++ and Data Structures Are Used

This is the **C++ Judge & Logic Engine** — a standalone C++ service that handles all performance-critical and logic-heavy operations. It is not part of the web frontend; it runs as a backend service called via REST from Supabase Edge Functions.

### 6.1 Hashing — `unordered_map`, `unordered_set`
- `unordered_map<string, Question>` — question bank lookup by ID in O(1)
- `unordered_set<string>` — track attempted question IDs per session, prevent repeats
- `unordered_map<string, int>` — student ID → current score mapping during live contest
- Duplicate MCQ detection on admin upload (hash question text, flag collision)

```cpp
unordered_map<string, Question> questionBank;
unordered_set<string> attemptedInSession;

bool isDuplicate(const string& questionText) {
    size_t h = hash<string>{}(questionText);
    return seenHashes.count(h) > 0;
}
```

### 6.2 Queue — `std::queue`
- MCQ serving queue — questions dequeued one by one during a quiz session
- Coding submission queue — concurrent submissions processed FIFO by the judge
- Notification dispatch queue — result-ready alerts sent in order

```cpp
queue<Question> quizQueue;         // MCQ delivery
queue<Submission> submissionQueue; // Judge execution queue

void enqueueSubmission(Submission s) {
    submissionQueue.push(s);
}
Submission nextToJudge() {
    Submission s = submissionQueue.front();
    submissionQueue.pop();
    return s;
}
```

### 6.3 Stack — `std::stack`
- Quiz back-navigation — visited question indices pushed on stack, pop to go back
- Admin undo — last 10 deleted questions stored on a deletion stack
- Code bracket validator — pre-validate `{}`, `[]`, `()` balance before sending to judge

```cpp
stack<int> visitedQuestions;  // for back navigation

stack<Question> deletionUndo; // admin undo (capped at 10)
void deleteQuestion(Question q) {
    if (deletionUndo.size() == 10) deletionUndo.pop(); // cap
    deletionUndo.push(q);
    // proceed with deletion
}
```

### 6.4 Linked List
- Leaderboard as a sorted singly linked list — new scores inserted at correct position by traversal
- Student attempt history stored as a linked list — O(1) append, full chronological traversal
- Subject unit chain — each subject's units linked in syllabus order, new units appended by faculty

```cpp
struct LeaderboardNode {
    string studentId;
    int score;
    double timeTaken;
    LeaderboardNode* next;
};

void insertIntoLeaderboard(LeaderboardNode*& head, LeaderboardNode* newNode) {
    // insert sorted by score desc, timeTaken asc
}
```

### 6.5 Arrays
- MCQ options stored as `string options[4]`
- Test cases for coding problems as array of `{input, expectedOutput}` pairs
- Timer state per session stored as array of checkpoints

### 6.6 Strings
- Output comparison in judge: `trim()` + exact string match of expected vs actual output
- Keyword tagging on questions for subject-wise search and filtering
- Code tokeniser: scan submitted C++ code for banned keywords (`system()`, `fork()` etc.)

```cpp
bool judgeOutput(string expected, string actual) {
    // trim whitespace from both ends
    // return expected == actual
}
```

---

## 7. Database Schema (Supabase / PostgreSQL)

```sql
users           (id, email, name, role, branch, semester, created_at)
subjects        (id, name, branch, semester)
units           (id, subject_id, unit_number, title)
mcq_questions   (id, unit_id, question_text, options jsonb, correct_index, difficulty)
coding_problems (id, subject_id, title, description, test_cases jsonb, difficulty)
quiz_sessions   (id, student_id, subject_id, started_at, submitted_at, score, time_taken)
mcq_attempts    (id, session_id, question_id, selected_index, is_correct)
code_submissions(id, student_id, problem_id, code, language, verdict, submitted_at)
leaderboard     (id, student_id, subject_id, total_score, last_updated)
```

---

## 8. Folder Structure

```
edularena/
│
├── frontend/                          # React + Tailwind
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MCQEngine/
│   │   │   │   ├── QuizCard.jsx       # Single MCQ question UI
│   │   │   │   ├── Timer.jsx          # Countdown timer component
│   │   │   │   └── QuizNavigator.jsx  # Back/forward using stack state
│   │   │   ├── CodingArena/
│   │   │   │   ├── CodeEditor.jsx     # Monaco editor wrapper
│   │   │   │   ├── TestCasePanel.jsx  # Show test case results
│   │   │   │   └── SubmitButton.jsx
│   │   │   ├── Leaderboard/
│   │   │   │   ├── LiveBoard.jsx      # Realtime leaderboard
│   │   │   │   └── FilterBar.jsx
│   │   │   ├── Dashboard/
│   │   │   │   ├── ProgressChart.jsx
│   │   │   │   └── AttemptHistory.jsx
│   │   │   └── Admin/
│   │   │       ├── QuestionUpload.jsx
│   │   │       └── UndoPanel.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Quiz.jsx
│   │   │   ├── CodingChallenge.jsx
│   │   │   ├── Leaderboard.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Admin.jsx
│   │   ├── store/                     # Zustand state
│   │   │   ├── quizStore.js           # Quiz session state (queue, stack)
│   │   │   └── authStore.js
│   │   ├── lib/
│   │   │   └── supabaseClient.js
│   │   └── App.jsx
│   ├── package.json
│   └── tailwind.config.js
│
├── supabase/                          # Supabase config & edge functions
│   ├── migrations/
│   │   └── 001_initial_schema.sql     # All table definitions
│   ├── functions/
│   │   ├── validate-signup/           # Restrict to college email domain
│   │   │   └── index.ts
│   │   ├── calculate-score/           # Calls C++ engine via HTTP
│   │   │   └── index.ts
│   │   └── submit-code/               # Routes submission to judge
│   │       └── index.ts
│   └── config.toml
│
├── judge-engine/                      # C++ core — the DS layer
│   ├── src/
│   │   ├── main.cpp                   # Entry point — HTTP server (cpp-httplib)
│   │   ├── judge/
│   │   │   ├── Judge.cpp              # Compile + run + compare output
│   │   │   ├── Judge.h
│   │   │   ├── OutputMatcher.cpp      # String-based output comparison
│   │   │   └── OutputMatcher.h
│   │   ├── quiz/
│   │   │   ├── QuizSession.cpp        # Queue for question delivery
│   │   │   ├── QuizSession.h
│   │   │   ├── Navigator.cpp          # Stack for back navigation
│   │   │   └── Navigator.h
│   │   ├── leaderboard/
│   │   │   ├── Leaderboard.cpp        # Sorted linked list
│   │   │   └── Leaderboard.h
│   │   ├── questionbank/
│   │   │   ├── QuestionBank.cpp       # Hash map for question lookup
│   │   │   ├── QuestionBank.h
│   │   │   ├── DuplicateDetector.cpp  # Hashing for duplicate MCQs
│   │   │   └── DuplicateDetector.h
│   │   ├── submission/
│   │   │   ├── SubmissionQueue.cpp    # Queue for concurrent submissions
│   │   │   └── SubmissionQueue.h
│   │   └── utils/
│   │       ├── CodeValidator.cpp      # Stack-based bracket checker
│   │       └── StringUtils.cpp        # Trim, compare, tokenise
│   ├── tests/
│   │   ├── test_judge.cpp
│   │   ├── test_leaderboard.cpp
│   │   └── test_quizsession.cpp
│   ├── CMakeLists.txt
│   └── Dockerfile                     # Containerised for Railway/Render
│
├── docs/
│   ├── PRD.md                         # This file
│   ├── ARCHITECTURE.md
│   └── API.md
│
└── README.md
```

---

## 9. System Architecture

```
[Student Browser]
      |
      | HTTPS
      v
[React Frontend — Vercel]
      |
      |--- Supabase JS Client
      |         |
      |         |--- Auth (Google OAuth)
      |         |--- PostgreSQL (questions, sessions, scores)
      |         |--- Realtime (leaderboard live updates)
      |         |--- Edge Functions
      |                   |
      |                   |--- POST /calculate-score -----> [C++ Judge Engine — Railway]
      |                   |--- POST /submit-code    -----> [C++ Judge Engine — Railway]
      |
      |--- Monaco Editor (code input)
      
[C++ Judge Engine — Docker Container]
      |
      |--- SubmissionQueue (std::queue)
      |--- QuestionBank    (unordered_map)
      |--- Leaderboard     (sorted linked list)
      |--- QuizSession     (std::queue + std::stack)
      |--- CodeValidator   (std::stack)
      |--- Judge           (compile via g++, compare via string match)
      |
      |--- Piston API (fallback sandbox for Python/Java execution)
```

---

## 10. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Quiz load time | < 1 second |
| Leaderboard update latency | < 500ms (Realtime) |
| Code execution time limit | 2 seconds per submission |
| Concurrent users supported | 200+ (Supabase free tier handles this) |
| Auth restriction | `@kkwagh.edu.in` only |
| Mobile responsive | Yes |

---

## 11. Out of Scope (v1.0)

- Video explanations for questions
- Inter-college competitions
- AI-generated questions
- Mobile app (web only for now)

---

## 12. Success Metrics

- 100+ active students in first month
- 500+ quiz attempts in first semester
- Faculty uploading questions for at least 3 subjects
- Leaderboard checked by students at least 3x per week on average

---

*Document prepared by Team Beyond Just Programming, K.K. Wagh Institute, Nashik.*
