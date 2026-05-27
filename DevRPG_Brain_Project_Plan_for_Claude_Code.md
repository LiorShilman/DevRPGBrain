# DevRPG Brain — מסמך תכנון ומימוש מלא ל־Claude Code

## 1. תקציר הפרויקט

**DevRPG Brain** הוא כלי Desktop למפתחים, המשלב:

1. **AI Second Brain for Developers**  
   מערכת שמבינה את הפרויקטים של המשתמש, עוקבת אחרי ההתקדמות, זוכרת החלטות, מסכמת סשנים, ומחזירה למפתח את ההקשר המדויק שבו עצר.

2. **Developer RPG / Habit Combat**  
   שכבת משחקיות שמתרגמת עבודה אמיתית על פרויקטים ל־XP, משימות, streaks, הישגים, boss fights, מדדי עקביות ו־AI motivational narrative.

המטרה היא לבנות כלי יומיומי שמפתח פותח בתחילת יום עבודה ושואל:

> “איפה עצרתי, מה הכי נכון לעשות עכשיו, ואיך אני מתקדם בלי לאבד הקשר?”

---

## 2. מטרת המוצר

המוצר נועד לפתור בעיות אמיתיות אצל מפתחים:

- איבוד הקשר בין סשנים.
- קושי לחזור לפרויקט אחרי כמה ימים.
- עומס בין הרבה פרויקטים במקביל.
- שכחה של החלטות ארכיטקטוניות.
- חוסר תיעוד של “למה עשינו את זה”.
- חוסר מוטיבציה ונטישה של פרויקטים צדדיים.
- קושי למדוד התקדמות אמיתית.
- צורך בסיכום יומי / שבועי אוטומטי.

---

## 3. קהל יעד

### קהל ראשי
מפתחים עצמאיים, סטודנטים, יוצרי פרויקטים, מפתחי Full Stack, DevOps learners, ומפתחים שמנהלים כמה פרויקטים במקביל.

### קהל משני
צוותים קטנים שרוצים כלי lightweight להבנת התקדמות, תיעוד החלטות ו־developer momentum.

---

## 4. עקרונות מוצר

1. **Passive first**  
   כמה שפחות הזנה ידנית. המערכת אוספת מידע מ־Git, קבצים, terminal history, VSCode, וסשנים.

2. **Local first**  
   ב־MVP המידע נשמר מקומית. המשתמש שולט בדאטה.

3. **Context over chat**  
   המערכת אינה רק chatbot. היא בונה זיכרון מתמשך לפי פרויקט.

4. **AI as project memory**  
   ה־AI מסכם, מזהה דפוסים, מייצר next steps ומסביר החלטות.

5. **Gamification that reflects real work**  
   XP מתקבל על עבודה אמיתית, לא רק על סימון checkbox.

6. **Build slow and educational**  
   הפרויקט מיועד גם ללמידה. יש לממש בשלבים קטנים, ברורים, עם הסברים והפרדה נקייה בין מודולים.

---

## 5. שם זמני

**DevRPG Brain**

שמות חלופיים:
- CodeQuest Brain
- Shellman Brain
- DevMemory RPG
- ProjectSoul
- ContextForge
- CodeChronicle RPG

---

## 6. MVP — גרסה ראשונה

### מטרת MVP
אפליקציית Desktop מקומית שמאפשרת:

- להוסיף פרויקטים מקומיים.
- לסרוק Git repo.
- לזהות commits, branches, קבצים ששונו, TODOs ומבנה פרויקט.
- לבצע Daily Check-in קצר.
- לייצר Session Summary עם AI.
- להציג “Continue where I left off”.
- לתת XP לפי פעילות.
- להציג Project Health Score.
- להציג Daily Developer Briefing.

---

## 7. Tech Stack מוצע

### Desktop
- Electron
- React
- TypeScript
- Vite

### Backend פנימי
- Node.js
- TypeScript
- Express או Fastify

### Database ב־MVP
אפשרות מומלצת להתחלה:
- SQLite

אפשרות מתקדמת:
- PostgreSQL

המלצה:
להתחיל עם SQLite כדי לפשט התקנה מקומית, ובהמשך להוסיף adapter ל־PostgreSQL.

### ORM
- Prisma

### AI Providers
לבנות שכבת Provider abstraction:
- OpenAI
- Claude
- Gemini

לא לקשור את הקוד לספק אחד.

### Embeddings / Vector Search
ב־MVP:
- שמירת summaries ו־chunks בטבלאות רגילות.
- חיפוש טקסטואלי פשוט.

בהמשך:
- SQLite vector extension / LanceDB / Chroma / pgvector.

### Git Integration
- simple-git npm package

### File System
- Node fs/promises
- glob / fast-glob

### Scheduling
- node-cron או scheduler פנימי פשוט

---

## 8. מבנה תיקיות מוצע

```txt
devrpg-brain/
│
├── apps/
│   ├── desktop/
│   │   ├── src/
│   │   │   ├── main/
│   │   │   │   ├── main.ts
│   │   │   │   ├── preload.ts
│   │   │   │   └── ipc.ts
│   │   │   │
│   │   │   ├── renderer/
│   │   │   │   ├── App.tsx
│   │   │   │   ├── main.tsx
│   │   │   │   ├── routes/
│   │   │   │   ├── components/
│   │   │   │   ├── pages/
│   │   │   │   ├── hooks/
│   │   │   │   ├── services/
│   │   │   │   └── styles/
│   │   │   │
│   │   │   └── shared/
│   │   │       ├── types.ts
│   │   │       └── constants.ts
│   │   │
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   └── api/
│       ├── src/
│       │   ├── server.ts
│       │   ├── app.ts
│       │   ├── config/
│       │   ├── modules/
│       │   │   ├── projects/
│       │   │   ├── git/
│       │   │   ├── scans/
│       │   │   ├── sessions/
│       │   │   ├── ai/
│       │   │   ├── rpg/
│       │   │   ├── briefing/
│       │   │   └── health/
│       │   ├── db/
│       │   └── shared/
│       │
│       └── package.json
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── roadmap.md
│   └── prompts.md
│
├── .env.example
├── package.json
├── README.md
└── turbo.json
```

---

## 9. מודולים מרכזיים

## 9.1 Project Manager

### אחריות
ניהול פרויקטים שהמשתמש מוסיף למערכת.

### יכולות
- הוספת פרויקט לפי path מקומי.
- שמירת שם, path, סוג פרויקט, שפות, תאריך הוספה.
- בדיקה אם path קיים.
- בדיקה אם זה Git repo.
- הצגת רשימת פרויקטים.
- ארכוב פרויקט.
- בחירת פרויקט פעיל.

### Entity
```ts
Project {
  id: string;
  name: string;
  path: string;
  description?: string;
  primaryLanguage?: string;
  framework?: string;
  isGitRepo: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastOpenedAt?: Date;
  archivedAt?: Date;
}
```

---

## 9.2 Git Analyzer

### אחריות
ניתוח Git repository.

### נתונים לאיסוף
- current branch
- latest commits
- changed files
- uncommitted changes
- last commit date
- commit frequency
- contributors, אם רלוונטי
- branch list
- files changed since last scan

### פונקציות
```ts
scanGitStatus(projectId: string): Promise<GitSnapshot>
getRecentCommits(projectPath: string, limit: number): Promise<Commit[]>
getChangedFiles(projectPath: string): Promise<ChangedFile[]>
detectActivityLevel(projectId: string): Promise<ActivityLevel>
```

### Entity
```ts
GitSnapshot {
  id: string;
  projectId: string;
  branch: string;
  lastCommitHash?: string;
  lastCommitMessage?: string;
  lastCommitDate?: Date;
  changedFilesCount: number;
  uncommittedChangesCount: number;
  createdAt: Date;
}
```

---

## 9.3 Repo Scanner

### אחריות
סריקת קבצי הפרויקט והבנת המבנה.

### מה לסרוק
- package.json
- tsconfig.json
- Dockerfile
- docker-compose.yml
- README.md
- .env.example
- src tree
- TODO/FIXME comments
- docs folder
- architecture files
- config files

### להימנע מסריקה
- node_modules
- dist
- build
- .git
- .next
- coverage
- target
- bin/obj
- קבצים גדולים מדי

### Entity
```ts
RepoScan {
  id: string;
  projectId: string;
  detectedStack: string[];
  detectedLanguages: string[];
  importantFiles: string[];
  todoCount: number;
  fixmeCount: number;
  fileCount: number;
  summary?: string;
  createdAt: Date;
}
```

---

## 9.4 Session Tracker

### אחריות
שמירת סשני עבודה.

### סוגי סשנים
1. ידני — המשתמש לוחץ Start Session / End Session.
2. אוטומטי — בהמשך, לפי VSCode/IDE או שינויי Git.

### Session Data
```ts
WorkSession {
  id: string;
  projectId: string;
  title?: string;
  startedAt: Date;
  endedAt?: Date;
  durationMinutes?: number;
  userNotes?: string;
  aiSummary?: string;
  blockers?: string[];
  decisions?: string[];
  nextSteps?: string[];
  xpAwarded: number;
}
```

### End Session Flow
כאשר המשתמש מסיים סשן:
1. שומרים זמן.
2. אוספים Git diff metadata.
3. שואלים 3 שאלות:
   - על מה עבדת?
   - מה תקע אותך?
   - מה הצעד הבא?
4. שולחים ל־AI ליצירת summary.
5. שומרים XP.
6. מעדכנים project health.

---

## 9.5 Daily Check-In

### מטרה
קלט יומי קצר של 30–60 שניות.

### שאלות
1. על איזה פרויקט אתה מתכנן לעבוד היום?
2. מה המשימה הכי חשובה?
3. מה יכול להפריע לך?
4. רמת אנרגיה 1–5.
5. מצב רוח 1–5.

### Entity
```ts
DailyCheckIn {
  id: string;
  date: string;
  energyLevel: number;
  moodLevel: number;
  focusProjectId?: string;
  mainGoal?: string;
  possibleBlocker?: string;
  createdAt: Date;
}
```

---

## 9.6 AI Memory Engine

### אחריות
לבנות זיכרון מתמשך לפי פרויקט.

### סוגי זיכרונות
- Session summaries
- Architecture decisions
- Blockers
- Next steps
- Repeated patterns
- Important files
- Project milestones
- User preferences

### Entity
```ts
MemoryItem {
  id: string;
  projectId?: string;
  type: "SESSION_SUMMARY" | "DECISION" | "BLOCKER" | "NEXT_STEP" | "MILESTONE" | "PATTERN" | "NOTE";
  title: string;
  content: string;
  importance: number;
  source: "AI" | "USER" | "GIT" | "SCAN";
  createdAt: Date;
  updatedAt: Date;
}
```

### Memory Retrieval
ב־MVP:
- חיפוש לפי projectId
- חיפוש לפי type
- חיפוש טקסטואלי פשוט

בהמשך:
- embeddings
- semantic search
- timeline retrieval
- “why did we decide X?”

---

## 9.7 AI Provider Layer

### מטרה
שכבה אחת אחידה לכל ספק AI.

### Interface
```ts
export interface AIProvider {
  generateText(input: AIGenerateInput): Promise<AIGenerateOutput>;
  summarizeSession(input: SessionSummaryInput): Promise<SessionSummaryOutput>;
  createDailyBriefing(input: DailyBriefingInput): Promise<DailyBriefingOutput>;
  analyzeProjectHealth(input: ProjectHealthInput): Promise<ProjectHealthOutput>;
}
```

### Providers
- OpenAIProvider
- ClaudeProvider
- GeminiProvider
- MockAIProvider for tests

### חשוב
בכל מקום בקוד יש להשתמש ב־AIProvider interface ולא בספק ספציפי.

---

## 9.8 Prompt Templates

יש לשמור prompts בקובץ נפרד:

```txt
apps/api/src/modules/ai/prompts/
├── session-summary.prompt.ts
├── daily-briefing.prompt.ts
├── project-health.prompt.ts
├── next-action.prompt.ts
└── rpg-narrative.prompt.ts
```

### Prompt: Session Summary

ה־AI מקבל:
- project name
- user notes
- changed files
- recent commits
- TODOs
- previous next steps

ומחזיר JSON בלבד:

```json
{
  "summary": "...",
  "workedOn": ["..."],
  "blockers": ["..."],
  "decisions": ["..."],
  "nextSteps": ["..."],
  "importantFiles": ["..."],
  "confidence": 0.82
}
```

### Prompt: Daily Briefing

מחזיר:

```json
{
  "headline": "...",
  "recommendedProjectId": "...",
  "recommendedNextAction": "...",
  "riskWarnings": ["..."],
  "motivationalLine": "...",
  "estimatedRestartTimeMinutes": 15
}
```

---

## 9.9 RPG Engine

### אחריות
תרגום עבודה אמיתית להתקדמות משחקית.

### Stats
```ts
RpgStats {
  id: string;
  userId: string;
  level: number;
  totalXp: number;
  focus: number;
  discipline: number;
  engineering: number;
  consistency: number;
  creativity: number;
  problemSolving: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### XP Rules
- Start session: +5 XP
- Complete session מעל 25 דקות: +20 XP
- Add useful notes: +10 XP
- Commit detected: +15 XP
- Complete next step: +25 XP
- Work on abandoned project: +30 XP
- Resolve blocker: +40 XP
- 3-day streak: +50 XP
- 7-day streak: +150 XP

### Achievements
```ts
Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  xpReward: number;
  icon: string;
}
```

דוגמאות:
- First Commit Captured
- Context Rescuer
- Debug Dragon Slayer
- Seven Day Builder
- Architecture Keeper
- Comeback Coder

### Boss Fights
Boss Fight הוא אתגר שבועי או חודשי.

דוגמאות:
- The Procrastination Monster
- The Legacy Code Beast
- The Context Loss Demon
- The Unfinished Project Hydra

---

## 9.10 Project Health Score

### מטרה
לתת מדד פשוט וברור למצב הפרויקט.

### פרמטרים
- ימים מאז סשן אחרון
- מספר commits אחרונים
- כמות TODO/FIXME
- כמות blockers פתוחים
- האם יש next step ברור
- האם README קיים
- האם יש בדיקות
- האם יש build command
- האם יש תיעוד החלטות

### תוצאה
```ts
ProjectHealth {
  projectId: string;
  score: number; // 0-100
  status: "HEALTHY" | "STALLED" | "RISKY" | "ABANDONED" | "UNKNOWN";
  reasons: string[];
  recommendations: string[];
  calculatedAt: Date;
}
```

---

## 9.11 Daily Developer Briefing

### מטרה
מסך פתיחה יומי:

- איפה עצרתי?
- על מה כדאי לעבוד?
- מה הסיכון?
- מה הצעד הבא?
- כמה XP אפשר לקבל היום?
- איזה boss fight פעיל?

### Output לדוגמה
```txt
Today’s Dev Briefing

Recommended focus:
Shellman

Why:
You stopped yesterday while implementing command parsing.
The next step is small and clear: add quote escaping tests.

Risk:
If you postpone this again, the parser context may become harder to recover.

Suggested action:
Open parser.test.ts and add 3 failing tests.

Reward:
+35 XP if completed today.
```

---

## 10. מסכי UI

## 10.1 Dashboard

### רכיבים
- Daily briefing card
- Active project card
- XP / level progress
- Current streak
- Project health list
- Recent sessions
- Active boss fight
- Quick actions

### Quick Actions
- Add Project
- Start Session
- End Session
- Daily Check-In
- Ask Project Brain
- Generate Briefing

---

## 10.2 Projects Page

### רכיבים
- רשימת פרויקטים
- חיפוש
- פילטר לפי status
- project cards

### Project Card
- name
- stack
- last activity
- health score
- current branch
- uncommitted changes
- next step
- XP earned from this project

---

## 10.3 Project Detail Page

Tabs:
1. Overview
2. Timeline
3. Sessions
4. Memories
5. Git
6. TODOs
7. RPG

### Overview
- Continue where I left off
- Next steps
- Project health
- Recent commits
- Important decisions

---

## 10.4 Session Page

### Start Session
- choose project
- goal
- expected duration
- optional notes

### Active Session
- timer
- current goal
- quick note
- add blocker
- add decision
- end session

### End Session
- 3 questions
- AI summary
- XP result

---

## 10.5 Memory Page

### יכולות
- חיפוש memory
- סינון לפי type
- הצגת timeline
- יצירת note ידנית
- Ask AI about project memory

---

## 10.6 RPG Page

### רכיבים
- Level
- XP progress
- Stats radar
- Achievements
- Boss fights
- Streaks
- Weekly quests
- Project quests

---

## 10.7 Settings Page

### הגדרות
- AI provider
- API key
- local data folder
- ignored folders
- scan frequency
- privacy mode
- enable/disable RPG
- enable/disable Git scan

---

## 11. Database Schema — Prisma Draft

```prisma
model Project {
  id              String        @id @default(uuid())
  name            String
  path            String        @unique
  description     String?
  primaryLanguage String?
  framework       String?
  isGitRepo       Boolean       @default(false)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  lastOpenedAt    DateTime?
  archivedAt      DateTime?

  gitSnapshots    GitSnapshot[]
  repoScans       RepoScan[]
  sessions        WorkSession[]
  memories        MemoryItem[]
  healthScores    ProjectHealth[]
}

model GitSnapshot {
  id                       String   @id @default(uuid())
  projectId                String
  branch                   String?
  lastCommitHash            String?
  lastCommitMessage         String?
  lastCommitDate            DateTime?
  changedFilesCount         Int      @default(0)
  uncommittedChangesCount   Int      @default(0)
  createdAt                 DateTime @default(now())

  project                  Project  @relation(fields: [projectId], references: [id])
}

model RepoScan {
  id                String   @id @default(uuid())
  projectId         String
  detectedStack     String
  detectedLanguages String
  importantFiles    String
  todoCount         Int      @default(0)
  fixmeCount        Int      @default(0)
  fileCount         Int      @default(0)
  summary           String?
  createdAt         DateTime @default(now())

  project           Project  @relation(fields: [projectId], references: [id])
}

model WorkSession {
  id              String   @id @default(uuid())
  projectId       String
  title           String?
  startedAt       DateTime
  endedAt         DateTime?
  durationMinutes Int?
  userNotes       String?
  aiSummary       String?
  blockers        String?
  decisions       String?
  nextSteps       String?
  xpAwarded       Int      @default(0)
  createdAt       DateTime @default(now())

  project         Project  @relation(fields: [projectId], references: [id])
}

model DailyCheckIn {
  id              String   @id @default(uuid())
  date            String
  energyLevel     Int
  moodLevel       Int
  focusProjectId  String?
  mainGoal        String?
  possibleBlocker String?
  createdAt       DateTime @default(now())
}

model MemoryItem {
  id          String   @id @default(uuid())
  projectId   String?
  type        String
  title       String
  content     String
  importance  Int      @default(1)
  source      String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  project     Project? @relation(fields: [projectId], references: [id])
}

model ProjectHealth {
  id              String   @id @default(uuid())
  projectId       String
  score           Int
  status          String
  reasons         String
  recommendations String
  calculatedAt    DateTime @default(now())

  project         Project @relation(fields: [projectId], references: [id])
}

model RpgProfile {
  id              String   @id @default(uuid())
  level           Int      @default(1)
  totalXp         Int      @default(0)
  focus           Int      @default(1)
  discipline      Int      @default(1)
  engineering     Int      @default(1)
  consistency     Int      @default(1)
  creativity      Int      @default(1)
  problemSolving  Int      @default(1)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model XpEvent {
  id          String   @id @default(uuid())
  projectId   String?
  sessionId   String?
  amount      Int
  reason      String
  category    String
  createdAt   DateTime @default(now())
}

model AchievementUnlock {
  id             String   @id @default(uuid())
  achievementKey String
  unlockedAt     DateTime @default(now())
}
```

---

## 12. API Endpoints

Base URL:
```txt
http://localhost:PORT/api
```

### Projects
```txt
GET    /projects
POST   /projects
GET    /projects/:id
PATCH  /projects/:id
DELETE /projects/:id
POST   /projects/:id/scan
POST   /projects/:id/git-scan
GET    /projects/:id/health
GET    /projects/:id/continue
```

### Sessions
```txt
GET    /sessions
POST   /sessions/start
POST   /sessions/:id/end
GET    /sessions/:id
GET    /projects/:id/sessions
```

### Memory
```txt
GET    /memory
POST   /memory
GET    /projects/:id/memory
POST   /projects/:id/ask
```

### Daily
```txt
POST   /daily/check-in
GET    /daily/check-in/today
GET    /daily/briefing
POST   /daily/briefing/generate
```

### RPG
```txt
GET    /rpg/profile
GET    /rpg/xp-events
POST   /rpg/award-xp
GET    /rpg/achievements
GET    /rpg/boss-fights
```

### AI
```txt
POST   /ai/session-summary
POST   /ai/project-health
POST   /ai/next-action
POST   /ai/briefing
```

---

## 13. שלבי מימוש מומלצים

## Phase 0 — Bootstrap

### מטרות
הקמת הפרויקט.

### משימות
1. צור monorepo.
2. התקן TypeScript.
3. הקם Electron + React + Vite.
4. הקם API פנימי Node.js.
5. חבר renderer ל־API.
6. הוסף ESLint + Prettier.
7. הוסף .env.example.
8. הוסף README ראשוני.

### Acceptance Criteria
- ניתן להריץ Desktop app.
- יש מסך פתיחה.
- API מחזיר health check.
- יש פקודות npm ברורות.

---

## Phase 1 — Database + Project Manager

### משימות
1. התקן Prisma.
2. הגדר SQLite.
3. צור Project model.
4. צור CRUD לפרויקטים.
5. צור UI להוספת פרויקט לפי path.
6. בצע validation ל־path.
7. הצג רשימת פרויקטים.

### Acceptance Criteria
- המשתמש יכול להוסיף פרויקט.
- הפרויקט נשמר במסד.
- לאחר restart האפליקציה מציגה אותו.

---

## Phase 2 — Git Analyzer

### משימות
1. התקן simple-git.
2. מימוש git status.
3. מימוש recent commits.
4. שמירת GitSnapshot.
5. הצגת branch ו־last commit ב־UI.
6. הצגת changed files count.
7. כפתור Scan Git.

### Acceptance Criteria
- פרויקט Git מציג branch נכון.
- מוצגים commits אחרונים.
- Snapshot נשמר במסד.

---

## Phase 3 — Repo Scanner

### משימות
1. סריקת קבצים עם ignore folders.
2. זיהוי stack לפי קבצים.
3. זיהוי TODO/FIXME.
4. זיהוי README / Dockerfile / package.json.
5. שמירת RepoScan.
6. UI להצגת detected stack ו־TODO count.

### Acceptance Criteria
- המערכת מזהה stack בסיסי.
- המערכת לא סורקת node_modules.
- מוצג summary טכני בסיסי.

---

## Phase 4 — Manual Work Sessions

### משימות
1. Start Session.
2. Timer.
3. Add notes during session.
4. End Session.
5. שאלות סיום.
6. שמירת WorkSession.
7. חישוב duration.
8. הצגת sessions בפרויקט.

### Acceptance Criteria
- ניתן להתחיל ולסיים סשן.
- הסשן נשמר.
- מוצג בפרויקט timeline.

---

## Phase 5 — AI Session Summary

### משימות
1. צור AIProvider interface.
2. צור MockAIProvider.
3. צור OpenAI/Claude/Gemini provider אחד לפחות.
4. צור prompt ל־session summary.
5. בסיום סשן שלח context ל־AI.
6. שמור aiSummary, blockers, decisions, nextSteps.
7. צור MemoryItems אוטומטיים.

### Acceptance Criteria
- בסיום סשן מתקבל summary.
- next steps נשמרים.
- ניתן לראות decisions במסך memory.

---

## Phase 6 — Continue Where I Left Off

### משימות
1. שלוף session אחרון.
2. שלוף nextSteps אחרונים.
3. שלוף GitSnapshot אחרון.
4. צור endpoint:
   `/projects/:id/continue`
5. הצג card בפרויקט:
   - Last worked on
   - Last blocker
   - Next step
   - Estimated restart time

### Acceptance Criteria
- כל פרויקט מציג נקודת המשך ברורה.
- אם אין מספיק מידע, המערכת אומרת זאת.

---

## Phase 7 — RPG Engine Basic

### משימות
1. צור RpgProfile.
2. צור XpEvent.
3. צור XP rules.
4. הענק XP על session.
5. הענק XP על commit detected.
6. חשב level לפי total XP.
7. UI להצגת XP/Level.
8. Recent XP events.

### נוסחת Level פשוטה
```ts
level = Math.floor(Math.sqrt(totalXp / 100)) + 1
```

### Acceptance Criteria
- סיום session מעניק XP.
- XP נשמר.
- Level מתעדכן.

---

## Phase 8 — Achievements

### משימות
1. צור רשימת achievements בקובץ config.
2. בדוק unlock אחרי XP event.
3. שמור AchievementUnlock.
4. UI להצגת achievements.
5. Toast כשנפתח achievement.

### דוגמאות
- First Session Completed
- First AI Summary
- Three Day Streak
- Debug Dragon Slayer
- Context Keeper

### Acceptance Criteria
- Achievement נפתח אוטומטית לפי תנאים.
- המשתמש רואה אותו ב־RPG page.

---

## Phase 9 — Project Health Score

### משימות
1. כתוב calculator.
2. שלב Git + RepoScan + Sessions + Memory.
3. צור endpoint health.
4. הצג score בפרויקט.
5. צור AI explanation אופציונלי.

### Acceptance Criteria
- לכל פרויקט יש score.
- score מוסבר בסיבות.
- יש recommendations.

---

## Phase 10 — Daily Check-In + Briefing

### משימות
1. UI ל־Daily Check-In.
2. שמירת energy/mood/main goal.
3. יצירת briefing עם AI.
4. הצגת briefing בדשבורד.
5. המלצה על פרויקט ומעשה הבא.

### Acceptance Criteria
- המשתמש מקבל briefing יומי.
- briefing מתבסס על פרויקטים וסשנים קיימים.

---

## Phase 11 — Ask Project Brain

### מטרה
Chat פנימי על פרויקט.

### משימות
1. UI שאלה לפרויקט.
2. שליפת memories רלוונטיים.
3. שליפת sessions אחרונים.
4. שליחת context ל־AI.
5. תשובה עם מקורות פנימיים:
   - session date
   - memory type
   - commit info אם רלוונטי

### שאלות לדוגמה
- איפה עצרתי?
- למה בחרתי SQLite?
- מה הבעיות הפתוחות?
- איזה קובץ כדאי לפתוח עכשיו?
- מה החלטות הארכיטקטורה בפרויקט הזה?

### Acceptance Criteria
- ניתן לשאול שאלה ולקבל תשובה לפי memory.
- אם אין מספיק מידע, ה־AI אומר שאין מספיק מידע.

---

## Phase 12 — Polish + Packaging

### משימות
1. שיפור UI.
2. Dark mode.
3. Error handling.
4. Loading states.
5. Empty states.
6. Electron packaging.
7. Installer.
8. Docs.

---

## 14. הנחיות UX/UI

### סגנון
- מקצועי
- כהה כברירת מחדל
- Developer tool vibe
- Dashboard cards
- צבעי XP עדינים
- לא ילדותי מדי למרות RPG

### צבעים מוצעים
- Background: #0f172a
- Cards: #111827
- Primary: #38bdf8
- Success: #22c55e
- Warning: #f59e0b
- Danger: #ef4444
- Text: #e5e7eb

### קומפוננטות
- Card
- Badge
- Progress bar
- Timeline
- Command palette
- Toast
- Modal
- Tabs
- Project selector

---

## 15. Privacy & Security

### דרישות
1. לא לשלוח קוד מלא ל־AI בלי אישור.
2. כברירת מחדל לשלוח metadata וסיכומים בלבד.
3. אפשרות privacy mode.
4. API keys נשמרים מקומית.
5. לא לסרוק קבצים חסויים:
   - .env
   - secrets
   - private keys
   - credentials
6. להציג למשתמש איזה מידע נשלח ל־AI.

### AI Send Policy
בכל קריאה ל־AI יש לבנות object שקוף:

```ts
{
  provider: "claude",
  purpose: "SESSION_SUMMARY",
  dataSent: {
    projectName: true,
    changedFiles: true,
    commitMessages: true,
    fullCode: false,
    envFiles: false
  }
}
```

---

## 16. Error Handling

### כללי
- אין לקרוס אם Git לא קיים.
- אין לקרוס אם path נמחק.
- אין לקרוס אם AI provider נכשל.
- תמיד להחזיר הודעה ברורה.

### דוגמאות
- “This project path no longer exists.”
- “AI summary failed, but your session was saved.”
- “Git scan unavailable because this is not a Git repository.”
- “No memory found yet for this project.”

---

## 17. Testing Plan

### Unit Tests
- XP calculator
- Level calculator
- Project health calculator
- Git parser mocks
- Prompt output parser
- Repo scanner ignore logic

### Integration Tests
- Add project
- Scan project
- Start/end session
- Generate summary with MockAI
- Award XP

### E2E
- User adds project
- Starts session
- Ends session
- Sees AI summary
- Gets XP
- Sees continue card

---

## 18. קבצים ראשונים שכדאי ליצור

1. `README.md`
2. `.env.example`
3. `docs/architecture.md`
4. `apps/api/src/modules/projects/project.types.ts`
5. `apps/api/src/modules/projects/project.service.ts`
6. `apps/api/src/modules/projects/project.controller.ts`
7. `apps/api/src/modules/git/git.service.ts`
8. `apps/api/src/modules/scans/repo-scanner.service.ts`
9. `apps/api/src/modules/sessions/session.service.ts`
10. `apps/api/src/modules/ai/ai-provider.interface.ts`
11. `apps/api/src/modules/rpg/xp.service.ts`
12. `apps/api/src/modules/health/project-health.service.ts`
13. `apps/desktop/src/renderer/pages/DashboardPage.tsx`
14. `apps/desktop/src/renderer/pages/ProjectsPage.tsx`
15. `apps/desktop/src/renderer/pages/ProjectDetailPage.tsx`

---

## 19. Claude Code Implementation Instructions

יש לממש את הפרויקט בהדרגה.

### כללים חשובים ל־Claude Code

1. אל תבנה הכל בבת אחת.
2. בכל שלב:
   - צור קבצים נדרשים.
   - הסבר מה נבנה.
   - הרץ בדיקות אם אפשר.
   - ודא שהאפליקציה עדיין רצה.
3. שמור על קוד נקי ומודולרי.
4. TypeScript strict mode.
5. אל תקשור את המערכת לספק AI אחד.
6. אל תשלח קוד מלא ל־AI כברירת מחדל.
7. צור MockAIProvider כבר בהתחלה כדי שאפשר יהיה לבדוק בלי API key.
8. השתמש ב־Prisma.
9. התחל עם SQLite.
10. כתוב TODO comments רק במקומות מוצדקים.
11. כל feature צריך להיות מחולק ל־service, controller, types.
12. שמור על הפרדה בין Electron main process ל־renderer.

---

## 20. MVP Definition of Done

ה־MVP נחשב מוכן כאשר:

1. אפשר להוסיף פרויקט מקומי.
2. אפשר לסרוק Git.
3. אפשר לסרוק מבנה פרויקט.
4. אפשר להתחיל ולסיים work session.
5. בסיום session נוצר AI summary.
6. נשמרים blockers, decisions, next steps.
7. יש Continue Where I Left Off.
8. יש XP ו־Level.
9. יש achievements בסיסיים.
10. יש Project Health Score.
11. יש Daily Briefing.
12. כל המידע נשמר מקומית.
13. יש README שמסביר איך להריץ.
14. יש Dark UI בסיסי.
15. יש MockAIProvider לבדיקות ללא API.

---

## 21. פקודות הרצה רצויות

```bash
npm install
npm run dev
npm run dev:api
npm run dev:desktop
npm run prisma:migrate
npm run prisma:studio
npm run test
npm run lint
npm run build
```

---

## 22. Roadmap עתידי

### V1.1
- VSCode extension
- terminal history parser
- better semantic memory
- project tags
- local notifications

### V1.2
- Voice dump
- speech-to-text
- automatic idea capture
- meeting notes

### V1.3
- GitHub integration
- Jira/Trello integration
- calendar integration

### V2
- Team mode
- shared project memory
- team RPG quests
- code review assistant
- architecture drift detection

### V3
- Full local AI support
- local embeddings
- offline mode
- plugin system
- marketplace

---

## 23. רעיון מרכזי לשיווק

### משפט מוצר
> The AI that remembers your projects, restores your coding context, and turns progress into a game.

### כאב
> Every developer loses context. DevRPG Brain gives it back.

### רגע ה־WOW
המשתמש פותח את האפליקציה אחרי שבוע ומקבל:

```txt
You stopped at the parser escaping issue in Shellman.
Last blocker: quotes inside arguments.
Suggested restart: open parser.test.ts and add 3 failing tests.
Estimated restart time: 12 minutes.
Reward: +35 XP.
```

---

## 24. הערות חשובות

- לא להפוך את המוצר ל־chatbot רגיל.
- ה־AI צריך להיות סביב project context.
- המשחקיות צריכה לחזק עבודה אמיתית, לא להפריע.
- הקלט צריך להיות כמה שיותר אוטומטי.
- MVP צריך להיות קטן אבל מרשים.
- חשוב לבנות תשתית נכונה כדי לאפשר הרחבות בעתיד.

---

## 25. Prompt פתיחה מומלץ ל־Claude Code

הדבק ל־Claude Code:

```txt
I want you to implement the DevRPG Brain project according to this planning document.

Important:
- Work step by step.
- Start with the MVP foundation.
- Use Electron + React + TypeScript for the desktop app.
- Use Node.js + TypeScript for the internal API.
- Use Prisma with SQLite first.
- Keep the architecture modular.
- Create a MockAIProvider before implementing real AI providers.
- Do not send full source code to AI by default.
- After each phase, explain what was implemented and how to run/test it.
- Prefer clean, professional code over rushing.
- This project is also for learning, so explain important architecture decisions while coding.
```

---

## 26. סיכום

DevRPG Brain הוא מוצר שמשלב:

- זיכרון פרויקטים
- AI Context Recovery
- ניתוח Git
- סיכום סשנים
- החלטות ארכיטקטוניות
- ניהול next steps
- משחקיות למפתחים
- הרגלי עבודה
- התקדמות מדידה

החזון הוא ליצור כלי שמפתח ירצה לפתוח כל יום, כי הוא מחזיר לו את הדבר הכי יקר:

**הקשר.**
