# AdaptIQ — Adaptive Learning Platform

An AI-powered adaptive learning platform built with the MERN stack. AdaptIQ uses **Bayesian Knowledge Tracing (BKT)** to model each student's knowledge state in real-time and **Anthropic Claude AI** to generate personalised questions and feedback. The system adjusts difficulty dynamically based on demonstrated mastery, ensuring learners are always challenged at the optimal pace.

---

## Features

- **JWT Authentication** — access + refresh token rotation with httpOnly cookies
- **Bayesian Knowledge Tracing** — per-concept knowledge modelling (pL, pT, pS, pG)
- **AI-Generated Questions** — Claude API generates context-aware questions targeting weak areas
- **Adaptive Difficulty Engine** — difficulty 1-5 adjusts automatically based on student's pL
- **4 Subjects** — Mathematics (text), Algorithms (C#), OOP (C#), Databases (SQL)
- **3 Answer Types** — multiple choice, free text, code
- **AI Evaluation & Feedback** — instant scoring, explanations, and encouragement
- **Progress Tracking** — per-subject accuracy, session history, weak area detection
- **Admin Panel** — global stats, user management, session overview
- **Streak Tracking** — daily learning streak with visual indicators
- **Responsive UI** — dark theme, mobile-friendly, Tailwind CSS

---

## Tech Stack

| Technology | Purpose |
|---|---|
| MongoDB | Database — stores users, sessions, answers, concept mastery |
| Express.js | Backend REST API framework |
| React 18 | Frontend UI library |
| Node.js | Server runtime |
| Tailwind CSS | Utility-first CSS framework |
| Recharts | Data visualisation (charts) |
| JWT | Authentication (access + refresh tokens) |
| Anthropic Claude API | AI question generation and answer evaluation |
| Bayesian Knowledge Tracing | Adaptive learning algorithm |
| Vite | Frontend build tool and dev server |
| bcryptjs | Password hashing |
| Mongoose | MongoDB ODM |

---

## Project Structure

```
adaptive-tutor/
├── server/
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js     # Register, login, refresh, logout, me, changePassword
│   │   ├── quizController.js     # Start, answer, end, hint
│   │   ├── progressController.js # Overview, history, weak areas, session detail
│   │   └── adminController.js    # Users, stats, sessions, delete
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification
│   │   ├── adminMiddleware.js    # Role-based access control
│   │   ├── errorHandler.js       # Global error handler
│   │   └── rateLimiter.js        # Rate limiting
│   ├── models/
│   │   ├── User.js
│   │   ├── Session.js
│   │   ├── Answer.js
│   │   └── ConceptMastery.js     # BKT state per user/concept
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── quiz.routes.js
│   │   ├── progress.routes.js
│   │   └── admin.routes.js
│   ├── services/
│   │   └── aiService.js          # Claude API integration
│   ├── utils/
│   │   ├── tokenUtils.js         # JWT generation/verification
│   │   └── bktEngine.js          # Bayesian Knowledge Tracing
│   ├── seed.js                   # Database seeder
│   ├── server.js                 # Express app entry point
│   ├── .env.example
│   └── package.json
├── client/
│   ├── src/
│   │   ├── api/
│   │   │   └── axiosInstance.js   # Configured Axios instance
│   │   ├── components/
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx    # Auth state management
│   │   ├── hooks/
│   │   │   ├── useQuiz.js
│   │   │   └── useProgress.js
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Quiz.jsx
│   │   │   ├── Results.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── Admin.jsx
│   │   │   └── NotFound.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## Setup & Installation

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Anthropic API key

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/ChiraCosminFlorian/adaptive-tutor.git
   cd adaptive-tutor
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Configure environment variables**
   ```bash
   cp server/.env.example server/.env
   ```
   Edit `server/.env` and fill in all values (see table below).

5. **Seed the database (optional)**
   ```bash
   cd server
   node seed.js
   ```
   This creates 2 test users with sessions, answers, and concept mastery data.

6. **Start the server**
   ```bash
   cd server
   npm run dev
   ```

7. **Start the client**
   ```bash
   cd client
   npm run dev
   ```

8. **Open the app**
   Navigate to [http://localhost:5173](http://localhost:5173)

### Test Credentials (after seeding)

| Email | Password |
|---|---|
| `student1@test.com` | `Test1234` |
| `student2@test.com` | `Test1234` |

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/adaptive_learning` |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens | Random string |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | Random string |
| `CLIENT_URL` | Frontend URL (for CORS) | `http://localhost:5173` |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | `sk-ant-...` |
| `NODE_ENV` | Environment mode | `development` |
| `ADMIN_EMAIL` | Email that gets admin role on register | `admin@adaptiq.com` |

---

## API Documentation

### Auth Routes — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | No | Create account (rate limited) |
| POST | `/login` | No | Sign in (rate limited) |
| POST | `/refresh` | Cookie | Rotate refresh token, get new access token |
| POST | `/logout` | Cookie | Invalidate refresh token |
| GET | `/me` | Bearer | Get current user profile |
| PUT | `/password` | Bearer | Change password |

### Quiz Routes — `/api/quiz`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/start` | Bearer | Start a quiz session (subject + concept) |
| POST | `/answer` | Bearer | Submit answer, get AI evaluation + next question |
| POST | `/end` | Bearer | End session early |
| POST | `/hint` | Bearer | Get AI-generated hint for current question |

### Progress Routes — `/api/progress`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/overview` | Bearer | Dashboard stats, subject breakdown, recent sessions |
| GET | `/history` | Bearer | Paginated answer history (optional subject filter) |
| GET | `/weak-areas` | Bearer | Top 5 weakest concepts per subject |
| GET | `/session/:id` | Bearer | Session detail with answers and concept mastery |

### Admin Routes — `/api/admin`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/users` | Admin | List all users |
| DELETE | `/users/:userId` | Admin | Delete user and all their data |
| GET | `/stats` | Admin | Global platform statistics |
| GET | `/sessions` | Admin | Paginated sessions across all users |

### Health Check

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | No | Server status, uptime, timestamp |

---

## Academic Context

This platform was developed as a bachelor's thesis project exploring the integration of **Bayesian Knowledge Tracing** (Corbett & Anderson, 1994) with **Large Language Models** for adaptive educational content generation. The BKT algorithm maintains a probabilistic model of each student's knowledge state per concept, using four parameters: P(Learned), P(Transit), P(Slip), and P(Guess). After each student response, the posterior probability of knowledge is updated, and the system dynamically selects question difficulty and targets weak areas. Claude AI generates contextually appropriate questions and provides detailed, personalised feedback, creating a fully adaptive learning loop without requiring a pre-authored question bank.

---

## License

MIT
