-- CreateTable
CREATE TABLE "Config" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Setor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "meta" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Setor" ("createdAt", "id", "name", "updatedAt") SELECT "createdAt", "id", "name", "updatedAt" FROM "Setor";
DROP TABLE "Setor";
ALTER TABLE "new_Setor" RENAME TO "Setor";
CREATE UNIQUE INDEX "Setor_name_key" ON "Setor"("name");
CREATE TABLE "new_Voluntario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "setorId" TEXT,
    "opcao1" TEXT,
    "opcao2" TEXT,
    "idade" INTEGER,
    "dataNascimento" TEXT,
    "igreja" TEXT,
    "quantidadeServicos" INTEGER NOT NULL DEFAULT 0,
    "areasServidas" TEXT,
    "nomePastor" TEXT,
    "telefonePastor" TEXT,
    "numeroLegendario" TEXT,
    "anotacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Voluntario_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "Setor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Voluntario" ("createdAt", "email", "id", "nome", "setorId", "status", "telefone", "updatedAt") SELECT "createdAt", "email", "id", "nome", "setorId", "status", "telefone", "updatedAt" FROM "Voluntario";
DROP TABLE "Voluntario";
ALTER TABLE "new_Voluntario" RENAME TO "Voluntario";
CREATE UNIQUE INDEX "Voluntario_telefone_key" ON "Voluntario"("telefone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
