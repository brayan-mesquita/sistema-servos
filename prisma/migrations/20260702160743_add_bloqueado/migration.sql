-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Voluntario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "bloqueado" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_Voluntario" ("anotacoes", "areasServidas", "createdAt", "dataNascimento", "email", "id", "idade", "igreja", "nome", "nomePastor", "numeroLegendario", "opcao1", "opcao2", "quantidadeServicos", "setorId", "status", "telefone", "telefonePastor", "updatedAt") SELECT "anotacoes", "areasServidas", "createdAt", "dataNascimento", "email", "id", "idade", "igreja", "nome", "nomePastor", "numeroLegendario", "opcao1", "opcao2", "quantidadeServicos", "setorId", "status", "telefone", "telefonePastor", "updatedAt" FROM "Voluntario";
DROP TABLE "Voluntario";
ALTER TABLE "new_Voluntario" RENAME TO "Voluntario";
CREATE UNIQUE INDEX "Voluntario_telefone_key" ON "Voluntario"("telefone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
