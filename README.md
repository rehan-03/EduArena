# 📚 EduArena — Project Explained Like You're 6!

> **K.K. Wagh Institute · B.Tech Computer Engineering · Semester IV**
> MCQ Practice Platform with a C++ Brain inside!

---

## 🧸 What is EduArena?

Imagine your school gave you a **magic quiz book** 📖.

- You open it and pick a subject — like **Data Structures** or **Networking**
- It asks you 10 questions with a **timer** ⏰
- When you're done, it tells you your score 🎯
- Your name goes on a **big board** for everyone to see 🏆
- You can also see which topics you're bad at, so you can get better!

That's EduArena. It's a website where students practice MCQ (Multiple Choice Questions) before exams.

---

## 🗺️ The Map of the Project

```
DS_mini/
│
├── frontend/          ← The pretty website (React + JavaScript)
│   └── src/
│       ├── pages/     ← Each screen (Home, Quiz, Leaderboard, Dashboard, Login)
│       ├── store/     ← Memory of the app (quizStore, authStore)
│       ├── lib/       ← Helpers (Supabase, local saving, AI questions)
│       └── components/← Building blocks (quiz card, nav bar, etc.)
│
├── judge-engine/      ← The C++ brain 🧠
│   └── src/
│       ├── judge/         ← Checks if answers are right
│       ├── quiz/          ← Runs the quiz session
│       ├── leaderboard/   ← Keeps the scoreboard sorted
│       ├── questionbank/  ← Stores all questions
│       ├── submission/    ← Waits in line to be checked
│       └── utils/         ← Helper tools
│
├── judge-server/      ← A tiny Node.js waiter 🍽️ (connects C++ to website)
├── sem4_schema.sql    ← The recipe for the database 🗄️
└── sy-2023.pdf        ← The real K.K. Wagh Semester IV syllabus
```

---

## 🧠 The C++ Brain — Data Structures Used

This is the fun part! The `judge-engine` is written in **C++** and uses real Data Structures from your syllabus. Let's go through each one like a story.

---

### 1. 🔗 Linked List — The Leaderboard (`Leaderboard.h`)

**What is a Linked List?**
Imagine a train 🚂. Each compartment (node) knows the name of the next compartment. That's a linked list!

**How it's used:**
The leaderboard is a **sorted linked list**. Every student is a node:

```
[Aarav: 48pts] → [Siya: 48pts] → [Neha: 44pts] → [Ishan: 41pts] → NULL
```

When a new student finishes the quiz, they are **inserted in the right position** — highest score first. If scores are tied, the one who finished **faster** goes first!

```cpp
struct LeaderboardNode {
    std::string studentName;
    int totalScore;
    double timeTaken;
    LeaderboardNode* next;   // 👈 this is the "next compartment" pointer
};
```

**Operations it does:**
| Action | What happens |
|--------|-------------|
| `insert()` | Adds a student in the right rank position |
| `remove()` | Takes out a student from the list |
| `getRank()` | Walks the list counting until it finds you |
| `clear()` | Deletes every node one by one |

> **6-year-old version:** It's like a line at the water fountain. The fastest kid goes to the front. Every time someone new arrives, they find their right spot!

---

### 2. 📦 Queue — Question Delivery & Submissions (`QuizSession.h`, `SubmissionQueue.h`)

**What is a Queue?**
Imagine a slide at a park 🛝. First kid to climb goes first — **First In, First Out (FIFO)**.

**How it's used — Quiz Questions:**
When a quiz starts, all 10 question IDs are put in a **queue**. As you answer, questions come out from the front:

```cpp
std::queue<int> questionQueue;  // Questions waiting to be asked
```

```
Front → [Q1] [Q3] [Q7] [Q2] [Q5] ← Back
         ↑ you answer this one first
```

**How it's used — Submissions:**
When you submit your answer, it doesn't get checked immediately. It goes into a **Submission Queue** and waits its turn:

```cpp
struct Submission { std::string code; std::string studentId; ... };
std::queue<Submission> queue;   // Line of submissions waiting to be judged
```

> **6-year-old version:** It's like waiting for ice cream 🍦. You stand in line. First person in line gets served first. No cutting!

---

### 3. ⬆️ Stack — Going Back in the Quiz (`Navigator.h`) and Bracket Checker (`CodeValidator.h`)

**What is a Stack?**
Imagine a stack of pancakes 🥞. You can only add or remove from the **top** — Last In, First Out (LIFO).

**How it's used — Quiz Navigation:**
When you move to the next question, the current question is **pushed** onto a stack. If you click "Go Back", it **pops** from the stack to return to the previous question:

```cpp
std::stack<int> visitedStack;   // History of questions you've visited

void pushCurrent() { visitedStack.push(currentIndex); }  // Save where you are

int goBack() {
    currentIndex = visitedStack.top();   // Look at top
    visitedStack.pop();                  // Remove from top
    return currentIndex;
}
```

```
After visiting Q1 → Q3 → Q7:
Stack (top to bottom): [Q7 index] [Q3 index] [Q1 index]
Click BACK → pop Q7 index → you're back at Q3!
```

**How it's used — Bracket Validator:**
Before running student code, the `CodeValidator` checks if all brackets `()`, `[]`, `{}` are properly matched — using a **Stack**!

```cpp
std::stack<char> bracketStack;
// See '(' → push it
// See ')' → pop and check if it matches the '(' on top
// At the end, if stack is empty → all brackets matched ✅
```

```
Code: int main() { return 0; }
Stack trace:
  see '(' → push → [( ]
  see ')' → pop → match! → []
  see '{' → push → [{ ]
  see '}' → pop → match! → []
Result: Stack empty = VALID ✅
```

> **6-year-old version:** Stacks are like a stack of plates. You put a plate on top, you take a plate from top. Can't take from the middle!

---

### 4. 🗃️ Hash Map — Question Bank (`QuestionBank.h`)

**What is a Hash Map?**
Imagine a giant magic dictionary 📖. You whisper a word (the **key**) and it instantly tells you the meaning (the **value**). No need to search page by page!

**How it's used:**
All questions are stored in an `unordered_map` where the **key is the question ID** and the **value is the Question data**:

```cpp
std::unordered_map<std::string, Question> bank;
//                  ↑ question ID          ↑ full question object
```

Getting a question by ID is **O(1)** — instant, like magic! 🪄

```cpp
Question* getQuestion(const std::string& id) {
    auto it = bank.find(id);      // Hash lookup — super fast!
    if (it != bank.end()) return &it->second;
    return nullptr;
}
```

> **6-year-old version:** It's like a toy box where every toy has a special sticker number. You call the number, the toy pops out immediately. You don't have to dig through the whole box!

---

### 5. 🔍 Hash Set — Duplicate Detection & Attempted Tracking (`DuplicateDetector.h`, `QuizSession.h`)

**What is a Hash Set?**
Like a Hash Map, but you only care about **whether something exists** (true/false), not its value. Like a guest list at a party.

**Used in two places:**

**a) DuplicateDetector** — stops the same question being added twice:
```cpp
std::unordered_set<size_t> seenHashes;

bool isDuplicate(const std::string& questionText) {
    size_t h = std::hash<std::string>{}(questionText); // Convert text → number
    return seenHashes.count(h) > 0;  // "Is this number on the list?"
}
```

The question text is **hashed** into a number using `std::hash`. Same text always gives same number. If the hash is already in the set → it's a duplicate!

**b) Attempted Questions Tracker** in QuizSession:
```cpp
std::unordered_set<std::string> attemptedQuestionIds;
// Tracks which questions you've already answered
// O(1) lookup — way faster than scanning a vector!
```

> **6-year-old version:** Imagine a stamp 📮. Every question gets stamped when you answer it. Before asking a new question, the teacher checks — "Does this one already have a stamp?" Yes → skip it!

---

### 6. 📋 Vector — Ordered Question List (`Navigator.h`, `QuizSession.h`)

**What is a Vector?**
Like an array, but it can grow and shrink. Think of it as a **stretchy row of seats** 🪑🪑🪑.

**How it's used:**
The question order is stored in a `vector<int>` after shuffling (Fisher-Yates algorithm):

```cpp
std::vector<int> questionOrder;

// Fisher-Yates Shuffle (in QuizSession.h)
for (int i = shuffled.size() - 1; i > 0; i--) {
    int j = std::rand() % (i + 1);
    std::swap(shuffled[i], shuffled[j]);  // Random swap!
}
```

This makes sure every student gets questions in a **random order** — no two quizzes are the same!

> **6-year-old version:** Imagine 10 cards face down 🃏🃏🃏. Someone shuffles them randomly. That's what the Fisher-Yates shuffle does — completely random every time!

---

## 🏗️ Full DSA Summary Table

| Data Structure | C++ Type | File | Real-World Use |
|---|---|---|---|
| **Linked List** | Custom `LeaderboardNode*` | `Leaderboard.h` | Sorted leaderboard rankings |
| **Queue** | `std::queue<int>` | `QuizSession.h` | Question delivery order |
| **Queue** | `std::queue<Submission>` | `SubmissionQueue.h` | Fair submission processing |
| **Stack** | `std::stack<int>` | `Navigator.h` | "Go Back" in quiz |
| **Stack** | `std::stack<char>` | `CodeValidator.h` | Bracket matching |
| **Hash Map** | `std::unordered_map` | `QuestionBank.h` | O(1) question lookup by ID |
| **Hash Set** | `std::unordered_set<size_t>` | `DuplicateDetector.h` | Detect duplicate questions |
| **Hash Set** | `std::unordered_set<string>` | `QuizSession.h` | Track attempted questions |
| **Vector** | `std::vector<int>` | `Navigator.h` | Random shuffled question order |

---

## 🌐 The Frontend (Website)

The website is built with **React** (JavaScript). Think of it as the **face** of EduArena:

### Pages
| Page | What it does |
|------|-------------|
| 🔐 **Login** | Sign in with email or as a guest. White + blue clean design. |
| 🏠 **Home** | Welcome screen. Shows your stats and quick-start quiz buttons. |
| 📝 **Quiz** | The actual MCQ quiz with timer, options, and score at the end. |
| 🏆 **Leaderboard** | Rankings by subject with medals 🥇🥈🥉. Updates live after every quiz. |
| 📊 **Dashboard** | Your progress bars, weak units, and recent attempt history. |
| ⚙️ **Admin** | Faculty can upload questions and see analytics. |

### Smart Pieces
| File | What it does (6-year-old version) |
|------|-----------------------------------|
| `quizStore.js` | The quiz's brain — remembers all your answers |
| `authStore.js` | Knows if you're logged in or a guest |
| `localStore.js` | Writes your quiz results to the browser's notebook (localStorage) |
| `supabaseApi.js` | Talks to the cloud database |
| `groqApi.js` | Asks an AI to make new quiz questions |

---

## 🔄 How a Quiz Works — Step by Step

```
You click "DSA - Start 10 Qs"
        ↓
quizStore.startQuiz()
        ↓
Loads questions from Supabase (or mock data)
        ↓
Fisher-Yates shuffle → random order  [VECTOR + ALGORITHM]
        ↓
First 10 pushed into questionQueue   [QUEUE]
        ↓
You answer Q1 → Q2 → Q3...
Each visited question pushed to visitedStack [STACK]
        ↓
Click "Go Back"? → pop from visitedStack [STACK]
        ↓
Quiz timer hits 0 OR you submit
        ↓
scoreQuiz() counts correct answers
        ↓
saveAttempt() → writes to localStorage [localStore.js]
        ↓
Dashboard refreshes with new data 📊
Leaderboard shows your score 🏆
        ↓
(If logged in) → saved to Supabase cloud ☁️
```

---

## 🗄️ The Database (Supabase / PostgreSQL)

The database (`sem4_schema.sql`) stores everything permanently:

```
subjects     ← DSA, OS, CN, DBMS (Sem IV subjects)
    ↓
units        ← Each chapter/unit of the subject
    ↓
mcq_questions← Each question with 4 options and correct answer
    ↓
quiz_sessions← Record of every quiz you attempted
    ↓
mcq_attempts ← Which option you picked for each question
    ↓
leaderboard  ← Your total score per subject
```

---

## 🤖 The AI Part

When there aren't enough questions in the database, **Groq AI** is called to generate new ones! It reads the subject and unit, then creates fresh MCQ questions in seconds.

> Like a robot teacher who can make an infinite number of exam questions! 🤖📝

---

## 🔐 Authentication (Login System)

| Method | What happens |
|--------|-------------|
| **Email + Password** | Saved in Supabase Auth, session persists |
| **Google OAuth** | One-click Google login (needs Supabase config) |
| **Guest Mode** | Saved in `localStorage` only, no account needed |

All quiz data is saved to `localStorage` instantly for **all users** — including guests!

---

## 🏁 How to Run the Project

```bash
# 1. Start the frontend (website)
cd frontend
npm run dev          # Opens at http://localhost:3000

# 2. Start the judge server (optional, for code evaluation)
cd judge-server
node src/server.js   # Starts at http://localhost:3001

# Or run both at once using the batch file:
run-system.bat
```

You'll need a `.env` file in `frontend/` with your Supabase keys:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## 🎓 Summary — What You'll Learn from This Project

| Topic | Where |
|-------|-------|
| Linked Lists | `Leaderboard.h` — sorted insertion |
| Queues | `QuizSession.h`, `SubmissionQueue.h` |
| Stacks | `Navigator.h`, `CodeValidator.h` |
| Hash Maps | `QuestionBank.h` — O(1) lookup |
| Hash Sets | `DuplicateDetector.h`, `QuizSession.h` |
| Sorting | Linked list insertion sort, leaderboard ranking |
| Hashing | `std::hash<string>` for duplicate detection |
| Shuffling | Fisher-Yates algorithm for random question order |
| React / Zustand | Frontend state management |
| Supabase / PostgreSQL | Cloud database & auth |
| REST APIs | Judge server (Node.js) |
| AI Integration | Groq API for question generation |

---

> Made with ❤️ for K.K. Wagh students — because understanding DSA is easier when it's your own project!
