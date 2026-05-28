-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "description" TEXT,
    "primaryLanguage" TEXT,
    "framework" TEXT,
    "isGitRepo" BOOLEAN NOT NULL DEFAULT false,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lastOpenedAt" DATETIME,
    "archivedAt" DATETIME
);
INSERT INTO "new_Project" ("archivedAt", "createdAt", "description", "framework", "id", "isGitRepo", "lastOpenedAt", "name", "path", "primaryLanguage", "updatedAt") SELECT "archivedAt", "createdAt", "description", "framework", "id", "isGitRepo", "lastOpenedAt", "name", "path", "primaryLanguage", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_path_key" ON "Project"("path");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
