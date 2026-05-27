-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "description" TEXT,
    "primaryLanguage" TEXT,
    "framework" TEXT,
    "isGitRepo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastOpenedAt" DATETIME,
    "archivedAt" DATETIME
);

-- CreateTable
CREATE TABLE "GitSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "branch" TEXT,
    "lastCommitHash" TEXT,
    "lastCommitMessage" TEXT,
    "lastCommitDate" DATETIME,
    "changedFilesCount" INTEGER NOT NULL DEFAULT 0,
    "uncommittedChangesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GitSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RepoScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "detectedStack" TEXT NOT NULL DEFAULT '[]',
    "detectedLanguages" TEXT NOT NULL DEFAULT '[]',
    "importantFiles" TEXT NOT NULL DEFAULT '[]',
    "todoCount" INTEGER NOT NULL DEFAULT 0,
    "fixmeCount" INTEGER NOT NULL DEFAULT 0,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RepoScan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "title" TEXT,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "durationMinutes" INTEGER,
    "userNotes" TEXT,
    "aiSummary" TEXT,
    "blockers" TEXT DEFAULT '[]',
    "decisions" TEXT DEFAULT '[]',
    "nextSteps" TEXT DEFAULT '[]',
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "energyLevel" INTEGER NOT NULL,
    "moodLevel" INTEGER NOT NULL,
    "focusProjectId" TEXT,
    "mainGoal" TEXT,
    "possibleBlocker" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MemoryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MemoryItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectHealth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reasons" TEXT NOT NULL DEFAULT '[]',
    "recommendations" TEXT NOT NULL DEFAULT '[]',
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectHealth_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RpgProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" INTEGER NOT NULL DEFAULT 1,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "focus" INTEGER NOT NULL DEFAULT 1,
    "discipline" INTEGER NOT NULL DEFAULT 1,
    "engineering" INTEGER NOT NULL DEFAULT 1,
    "consistency" INTEGER NOT NULL DEFAULT 1,
    "creativity" INTEGER NOT NULL DEFAULT 1,
    "problemSolving" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "XpEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT,
    "sessionId" TEXT,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AchievementUnlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "achievementKey" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_path_key" ON "Project"("path");

-- CreateIndex
CREATE UNIQUE INDEX "DailyCheckIn_date_key" ON "DailyCheckIn"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AchievementUnlock_achievementKey_key" ON "AchievementUnlock"("achievementKey");
