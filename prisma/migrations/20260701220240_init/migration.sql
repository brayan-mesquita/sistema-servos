-- CreateTable
CREATE TABLE "Setor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Voluntario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Available',
    "setorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Voluntario_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "Setor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Coordenador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "setorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Coordenador_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "Setor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Setor_name_key" ON "Setor"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Voluntario_telefone_key" ON "Voluntario"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "Coordenador_email_key" ON "Coordenador"("email");
