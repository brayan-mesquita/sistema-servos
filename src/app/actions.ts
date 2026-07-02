"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

/**
 * Normalizes phone numbers to digits only, adding Brazil country code (55) if missing.
 * Must be async as it's exported in a Server Actions file.
 */
export async function normalizePhoneNumber(phone: string): Promise<string> {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // If it starts with 55 and is a full number (e.g. 5565999999999 or 556599999999)
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }
  
  // Brazilian mobile/landline with area code (10 or 11 digits, like 65999999999)
  if (digits.length === 10 || digits.length === 11) {
    return '55' + digits;
  }
  
  // Return digits as is for other formats
  return digits;
}

/**
 * Coordinator login with auto-seeding for default coordinators to ensure seamless testing
 */
export async function loginCoordinator(email: string, passwordText: string) {
  try {
    let coordinator = await prisma.coordenador.findUnique({
      where: { email },
      include: { setor: true }
    });

    const hashedPassword = hashPassword(passwordText);

    // Auto-create default users if they don't exist
    if (!coordinator && (email === 'coordenadores@legendarios.com' || email === 'admin@legendarios.com')) {
      const isAdmin = email === 'admin@legendarios.com';
      const defaultName = isAdmin ? 'Admin Geral' : 'Coordenador Geral';
      const defaultRawPassword = isAdmin 
        ? (process.env.ADMIN_PASSWORD || 'legendarios') 
        : (process.env.COORD_PASSWORD || 'legendarios');
      
      // Let's link 'Coordenador Geral' to a default sector if there is one (e.g., 'Segurança')
      let defaultSectorId = null;
      if (!isAdmin) {
        const sector = await prisma.setor.findUnique({ where: { name: 'Segurança' } });
        if (sector) {
          defaultSectorId = sector.id;
        }
      }

      coordinator = await prisma.coordenador.create({
        data: {
          nome: defaultName,
          email,
          passwordHash: hashPassword(defaultRawPassword),
          setorId: defaultSectorId
        },
        include: { setor: true }
      });
    }

    if (!coordinator) {
      return { success: false, error: "Credenciais inválidas." };
    }

    // Verify hashed password matches
    if (coordinator.passwordHash !== hashedPassword) {
      return { success: false, error: "Senha incorreta." };
    }

    return { 
      success: true, 
      data: {
        id: coordinator.id,
        nome: coordinator.nome,
        email: coordinator.email,
        isAdmin: coordinator.email === 'admin@legendarios.com',
        sectorId: coordinator.setorId,
        sectorName: coordinator.setor?.name || null
      }
    };
  } catch (error: any) {
    console.error("Error logging in:", error);
    return { success: false, error: error.message || "Erro interno ao fazer login." };
  }
}

/**
 * Fetches all sectors and the count of recruited volunteers for each
 */
export async function getSectors() {
  try {
    const sectors = await prisma.setor.findMany({
      include: {
        _count: {
          select: {
            voluntarios: {
              where: { status: "Recruited" }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Map fields for ease of use in UI
    const mapped = sectors.map(s => ({
      id: s.id,
      name: s.name,
      meta: s.meta,
      allocatedCount: s._count.voluntarios
    }));

    return { success: true, data: mapped };
  } catch (error: any) {
    console.error("Error getting sectors:", error);
    return { success: false, error: "Erro ao carregar setores." };
  }
}

/**
 * Updates the volunteer target/goal (meta) for a specific sector
 */
export async function updateSectorMeta(sectorId: string, meta: number) {
  try {
    const updated = await prisma.setor.update({
      where: { id: sectorId },
      data: { meta: Number(meta) }
    });
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating sector meta:", error);
    return { success: false, error: "Erro ao atualizar meta do setor." };
  }
}

/**
 * Gets the current system-wide selection phase (1 or 2)
 */
export async function getSystemPhase() {
  try {
    const config = await prisma.config.findUnique({
      where: { key: "system_phase" }
    });
    return { success: true, phase: config ? config.value : "1" };
  } catch (error: any) {
    console.error("Error getting system phase:", error);
    return { success: true, phase: "1" };
  }
}

/**
 * Updates the system-wide phase (1: First Option Only, 2: First + Second Option)
 */
export async function updateSystemPhase(phase: string) {
  try {
    const config = await prisma.config.upsert({
      where: { key: "system_phase" },
      update: { value: phase },
      create: { key: "system_phase", value: phase }
    });
    return { success: true, data: config };
  } catch (error: any) {
    console.error("Error updating system phase:", error);
    return { success: false, error: "Erro ao atualizar fase do sistema." };
  }
}

/**
 * Fetches available volunteers for a specific sector, considering system phase, search search strings,
 * church, and priority selection option.
 */
export async function getVolunteers(
  sectorId: string,
  search: string = "",
  church: string = "",
  priority: string = ""
) {
  try {
    const sector = await prisma.setor.findUnique({
      where: { id: sectorId }
    });
    if (!sector) {
      return { success: false, error: `Setor com ID ${sectorId} não encontrado.` };
    }

    const phaseResult = await getSystemPhase();
    const phase = phaseResult.phase;

    // Build SQLite search query filters
    const whereConditions: any = {
      status: "Available"
    };

    if (search.trim()) {
      whereConditions.nome = {
        contains: search.trim()
      };
    }

    if (church.trim() && church !== "Filtrar por Igreja" && church !== "Todas") {
      whereConditions.igreja = {
        contains: church.trim()
      };
    }

    // Filter based on phase options
    if (phase === "1") {
      whereConditions.opcao1 = sector.name;
    } else {
      // Phase 2: Option 1 OR Option 2 matches the sector name
      whereConditions.OR = [
        { opcao1: sector.name },
        { opcao2: sector.name }
      ];
    }

    // Direct priority option override
    if (priority === "opcao1" || priority === "Alta (1ª Opção)") {
      delete whereConditions.OR;
      whereConditions.opcao1 = sector.name;
    } else if (priority === "opcao2" || priority === "Média (2ª Opção)") {
      delete whereConditions.OR;
      whereConditions.opcao2 = sector.name;
    }

    const volunteers = await prisma.voluntario.findMany({
      where: whereConditions,
      orderBy: { nome: 'asc' }
    });

    return { success: true, data: volunteers };
  } catch (error: any) {
    console.error("Error getting volunteers:", error);
    return { success: false, error: "Erro ao carregar lista de candidatos." };
  }
}

/**
 * Fetches already recruited volunteers for a specific sector
 */
export async function getRecruitedVolunteers(sectorId: string) {
  try {
    const volunteers = await prisma.voluntario.findMany({
      where: {
        setorId: sectorId,
        status: "Recruited"
      },
      orderBy: { nome: 'asc' }
    });
    return { success: true, data: volunteers };
  } catch (error: any) {
    console.error("Error getting recruited volunteers:", error);
    return { success: false, error: "Erro ao buscar equipe do setor." };
  }
}

/**
 * Saves specific notes/annotations for a volunteer
 */
export async function updateVolunteerNotes(volunteerId: string, notes: string) {
  try {
    const updated = await prisma.voluntario.update({
      where: { id: volunteerId },
      data: { anotacoes: notes }
    });
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating volunteer notes:", error);
    return { success: false, error: "Erro ao salvar anotações do servo." };
  }
}

/**
 * Fetches admin statistics for total, alocated, and available volunteers
 */
export async function getAdminStats() {
  try {
    const total = await prisma.voluntario.count();
    const allocated = await prisma.voluntario.count({
      where: { status: "Recruited" }
    });
    const available = await prisma.voluntario.count({
      where: { status: "Available" }
    });

    return {
      success: true,
      data: { total, allocated, available }
    };
  } catch (error: any) {
    console.error("Error getting admin stats:", error);
    return { success: false, data: { total: 0, allocated: 0, available: 0 } };
  }
}

/**
 * Claim/recruit a volunteer to a sector using an atomic check to prevent race conditions.
 */
export async function claimVolunteer(volunteerId: string, sectorId: string) {
  try {
    // 1. Verify sector exists
    const sector = await prisma.setor.findUnique({
      where: { id: sectorId }
    });
    if (!sector) {
      return { success: false, error: `Setor com ID ${sectorId} não encontrado.` };
    }

    // 2. Verify volunteer is not blocked
    const volunteerCheck = await prisma.voluntario.findUnique({
      where: { id: volunteerId }
    });
    if (!volunteerCheck) {
      return { success: false, error: "Servo não encontrado." };
    }
    if (volunteerCheck.bloqueado) {
      return { success: false, error: "Servo não atendeu aos requisitos da coordenação." };
    }

    // Check system phase for 2nd option
    const phaseResult = await getSystemPhase();
    if (phaseResult.success && phaseResult.phase === "1" && volunteerCheck.opcao1 !== sector.name) {
      return { success: false, error: "Recrutamento de 2ª Opção indisponível (Fase 2 não habilitada)." };
    }

    // 3. Atomically update the volunteer status from "Available" to "Recruited"
    // and assign the sectorId. If status is already "Recruited", the updateMany where clause
    // will not find the row, returning count: 0. This is SQLite atomic.
    const updated = await prisma.voluntario.updateMany({
      where: {
        id: volunteerId,
        status: "Available"
      },
      data: {
        status: "Recruited",
        setorId: sectorId
      }
    });

    if (updated.count === 0) {
      // Check if it exists or is already claimed
      const volunteer = await prisma.voluntario.findUnique({
        where: { id: volunteerId }
      });
      if (!volunteer) {
        return { success: false, error: "Servo não encontrado." };
      }
      return { 
        success: false, 
        error: `Servo já está recrutado ou indisponível (Status atual: ${volunteer.status}).` 
      };
    }

    // Fetch and return the updated volunteer
    const volunteer = await prisma.voluntario.findUnique({
      where: { id: volunteerId },
      include: { setor: true }
    });

    revalidatePath("/recrutamento");
    revalidatePath("/equipe");
    revalidatePath("/admin");
    return { success: true, data: volunteer };
  } catch (error: any) {
    console.error("Error claiming volunteer:", error);
    return { success: false, error: error.message || "Erro interno ao reivindicar servo." };
  }
}

/**
 * Release a volunteer, setting status to Available and sectorId to null.
 */
export async function releaseVolunteer(volunteerId: string) {
  try {
    const updated = await prisma.voluntario.update({
      where: { id: volunteerId },
      data: {
        status: "Available",
        setorId: null
      },
      include: { setor: true }
    });

    revalidatePath("/recrutamento");
    revalidatePath("/equipe");
    revalidatePath("/admin");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error releasing volunteer:", error);
    if (error.code === 'P2025') { // Record to update not found
      return { success: false, error: "Servo não encontrado." };
    }
    return { success: false, error: error.message || "Erro interno ao liberar servo." };
  }
}

/**
 * Incremental spreadsheet importer. Takes parsed CSV rows, normalizes phone numbers,
 * checks if phone already exists, inserts new rows, and skips duplicates.
 */
export async function importVolunteers(
  rows: Array<{
    nome?: string;
    name?: string;
    telefone?: string;
    phone?: string;
    email?: string;
    opcao1?: string;
    opcao2?: string;
    idade?: number;
    dataNascimento?: string;
    igreja?: string;
    quantidadeServicos?: number;
    areasServidas?: string;
    nomePastor?: string;
    telefonePastor?: string;
    numeroLegendario?: string;
    anotacoes?: string;
  }>
) {
  try {
    let importedCount = 0;
    let skippedCount = 0;
    const results: Array<{ nome: string; phone: string; status: 'imported' | 'skipped'; reason?: string }> = [];
    const processedPhonesInBatch = new Set<string>();

    for (const row of rows) {
      const rawNome = row.nome || row.name || '';
      const rawTelefone = row.telefone || row.phone || '';
      const rawEmail = row.email || null;

      // Skip invalid rows
      if (!rawNome.trim() || !rawTelefone.trim()) {
        skippedCount++;
        continue;
      }

      const normalizedTelefone = await normalizePhoneNumber(rawTelefone);

      // Check if processed in this batch to avoid unique constraint issues within the batch
      if (processedPhonesInBatch.has(normalizedTelefone)) {
        skippedCount++;
        results.push({
          nome: rawNome.trim(),
          phone: normalizedTelefone,
          status: 'skipped',
          reason: 'Duplicado no arquivo de importação'
        });
        continue;
      }

      processedPhonesInBatch.add(normalizedTelefone);

      // Check database for existing phone
      const existing = await prisma.voluntario.findUnique({
        where: { telefone: normalizedTelefone }
      });

      if (existing) {
        skippedCount++;
        results.push({
          nome: rawNome.trim(),
          phone: normalizedTelefone,
          status: 'skipped',
          reason: 'Telefone já cadastrado'
        });
        continue;
      }

      // Create new volunteer
      await prisma.voluntario.create({
        data: {
          nome: rawNome.trim(),
          telefone: normalizedTelefone,
          email: rawEmail ? rawEmail.trim() : null,
          status: 'Available',
          opcao1: row.opcao1 || null,
          opcao2: row.opcao2 || null,
          idade: row.idade ? Number(row.idade) : null,
          dataNascimento: row.dataNascimento || null,
          igreja: row.igreja || null,
          quantidadeServicos: row.quantidadeServicos ? Number(row.quantidadeServicos) : 0,
          areasServidas: row.areasServidas || null,
          nomePastor: row.nomePastor || null,
          telefonePastor: row.telefonePastor || null,
          numeroLegendario: row.numeroLegendario || null,
          anotacoes: row.anotacoes || null
        }
      });

      importedCount++;
      results.push({
        nome: rawNome.trim(),
        phone: normalizedTelefone,
        status: 'imported'
      });
    }

    return {
      success: true,
      importedCount,
      skippedCount,
      results
    };
  } catch (error: any) {
    console.error("Error importing volunteers:", error);
    return { success: false, error: error.message || "Erro interno no importador." };
  }
}

/**
 * Fetches a single volunteer by ID, including their sector if assigned.
 */
export async function getVolunteerById(id: string) {
  try {
    const volunteer = await prisma.voluntario.findUnique({
      where: { id },
      include: { setor: true }
    });
    if (!volunteer) {
      return { success: false, error: "Servo não encontrado." };
    }
    return { success: true, data: volunteer };
  } catch (error: any) {
    console.error("Error getting volunteer by ID:", error);
    return { success: false, error: "Erro ao buscar detalhes do servo." };
  }
}

/**
 * Fetches all volunteers in the database (admin only)
 */
export async function getAllVolunteers() {
  try {
    const volunteers = await prisma.voluntario.findMany({
      orderBy: { nome: 'asc' },
      include: { setor: true }
    });
    return { success: true, data: volunteers };
  } catch (error: any) {
    console.error("Error getting all volunteers:", error);
    return { success: false, error: "Erro ao buscar a lista geral de servos." };
  }
}

/**
 * Updates all registration details of a volunteer
 */
export async function updateVolunteer(id: string, data: any) {
  try {
    const updated = await prisma.voluntario.update({
      where: { id },
      data: {
        nome: data.nome,
        telefone: data.telefone,
        email: data.email || null,
        opcao1: data.opcao1 || null,
        opcao2: data.opcao2 || null,
        idade: data.idade ? parseInt(data.idade) : null,
        dataNascimento: data.dataNascimento || null,
        igreja: data.igreja || null,
        nomePastor: data.nomePastor || null,
        telefonePastor: data.telefonePastor || null,
        numeroLegendario: data.numeroLegendario || null,
        quantidadeServicos: data.quantidadeServicos ? parseInt(data.quantidadeServicos) : 0,
        areasServidas: data.areasServidas || null,
        anotacoes: data.anotacoes || null,
        status: data.status || "Available",
        setorId: data.setorId || null
      }
    });
    revalidatePath("/admin");
    revalidatePath("/recrutamento");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating volunteer:", error);
    return { success: false, error: error.message || "Erro ao salvar alterações do servo." };
  }
}

/**
 * Toggles blocked state of a volunteer
 */
export async function toggleVolunteerBlock(id: string, blocked: boolean) {
  try {
    const updated = await prisma.voluntario.update({
      where: { id },
      data: {
        bloqueado: blocked
      }
    });
    revalidatePath("/admin");
    revalidatePath("/recrutamento");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error toggling volunteer block:", error);
    return { success: false, error: `Erro no servidor: ${error.message || error}` };
  }
}
