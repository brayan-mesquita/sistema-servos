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

function normalizeSectorName(option: string | null | undefined): string | null {
  if (!option) return null;
  const opt = option.toLowerCase().trim();
  if (opt.includes('adm') || opt.includes('administração') || opt.includes('administracao')) return 'ADM';
  if (opt.includes('segurança') || opt.includes('seguranca') || opt.includes('prevenção') || opt.includes('prevencao')) return 'Segurança';
  if (opt.includes('eventos') || opt.includes('percorrer')) return 'Eventos';
  if (opt.includes('mídia') || opt.includes('midia')) return 'Mídia';
  if (opt.includes('logística') || opt.includes('logistica')) return 'Logística';
  if (opt.includes('intercessão') || opt.includes('intercessao') || opt.includes('dip') || opt.includes('prédica') || opt.includes('predica')) return 'DIP';
  if (opt.includes('qap') || opt.includes('suporte')) return 'QAP';
  if (opt.includes('hakuna')) return 'Hakunas';
  if (opt.includes('comunicação') || opt.includes('comunicacao')) return 'Comunicação';
  return option;
}

function calculateAge(birthDateStr: string | undefined | null): number | null {
  if (!birthDateStr) return null;
  const parts = birthDateStr.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  const birthDate = new Date(year, month, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function mapQtyServices(qtyStr: string | number | undefined | null): number {
  if (!qtyStr) return 0;
  if (typeof qtyStr === 'number') return qtyStr;
  const clean = qtyStr.toString().toLowerCase();
  if (clean.includes('3') || clean.includes('três') || clean.includes('tres')) return 3;
  if (clean.includes('1') || clean.includes('2') || clean.includes('uma') || clean.includes('duas')) return 1;
  return 0;
}

function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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



    if (church.trim() && church !== "Filtrar por Igreja" && church !== "Todas") {
      whereConditions.igreja = {
        contains: church.trim()
      };
    }

    // Filter based on phase options and priority override
    if (priority === "opcao1" || priority === "Alta (1ª Opção)") {
      whereConditions.opcao1 = sector.name;
    } else if (priority === "opcao2" || priority === "Média (2ª Opção)") {
      whereConditions.opcao2 = sector.name;
    } else {
      if (phase === "1") {
        whereConditions.opcao1 = sector.name;
      } else {
        // Phase 2: Option 1 OR Option 2 matches the sector name
        whereConditions.OR = [
          { opcao1: sector.name },
          { opcao2: sector.name }
        ];
      }
    }

    const volunteers = await prisma.voluntario.findMany({
      where: whereConditions,
      orderBy: { nome: 'asc' }
    });

    if (search.trim()) {
      const cleanSearch = normalizeText(search);
      const filtered = volunteers.filter(v => 
        normalizeText(v.nome).includes(cleanSearch)
      );
      return { success: true, data: filtered };
    }

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

    // Trigger webhook for recruited (asynchronously)
    getWebhookConfigs().then((webhookRes) => {
      if (webhookRes.success && webhookRes.recruitedUrl) {
        triggerWebhook(webhookRes.recruitedUrl, {
          event: "recruited",
          timestamp: new Date().toISOString(),
          setor: volunteer?.setor?.name || "Desconhecido",
          voluntario: {
            id: volunteer?.id,
            nome: volunteer?.nome,
            telefone: volunteer?.telefone,
            email: volunteer?.email,
            opcao1: volunteer?.opcao1,
            opcao2: volunteer?.opcao2,
            idade: volunteer?.idade,
            igreja: volunteer?.igreja,
            nomePastor: volunteer?.nomePastor,
            telefonePastor: volunteer?.telefonePastor,
            numeroLegendario: volunteer?.numeroLegendario,
            anotacoes: volunteer?.anotacoes
          }
        });
      }
    }).catch(err => console.error("Error invoking webhook trigger promise:", err));

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
    const volunteerBefore = await prisma.voluntario.findUnique({
      where: { id: volunteerId },
      include: { setor: true }
    });

    const updated = await prisma.voluntario.update({
      where: { id: volunteerId },
      data: {
        status: "Available",
        setorId: null
      },
      include: { setor: true }
    });

    // Trigger webhook for released (asynchronously)
    getWebhookConfigs().then((webhookRes) => {
      if (webhookRes.success && webhookRes.releasedUrl) {
        triggerWebhook(webhookRes.releasedUrl, {
          event: "released",
          timestamp: new Date().toISOString(),
          setor: volunteerBefore?.setor?.name || "Nenhum",
          voluntario: {
            id: updated.id,
            nome: updated.nome,
            telefone: updated.telefone,
            email: updated.email,
            opcao1: updated.opcao1,
            opcao2: updated.opcao2,
            idade: updated.idade,
            igreja: updated.igreja,
            nomePastor: updated.nomePastor,
            telefonePastor: updated.telefonePastor,
            numeroLegendario: updated.numeroLegendario,
            anotacoes: updated.anotacoes
          }
        });
      }
    }).catch(err => console.error("Error invoking webhook trigger promise:", err));

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
    idade?: string | number;
    dataNascimento?: string;
    igreja?: string;
    quantidadeServicos?: string | number;
    areasServidas?: string;
    nomePastor?: string;
    telefonePastor?: string;
    numeroLegendario?: string;
    anotacoes?: string;
    instagram?: string;
    fotoUrl?: string;
  }>,
  mode: 'insert' | 'update' = 'insert'
) {
  try {
    let importedCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;
    const results: Array<{ nome: string; phone: string; status: 'imported' | 'updated' | 'skipped'; reason?: string }> = [];
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
        if (mode === 'update') {
          // Update existing volunteer
          await prisma.voluntario.update({
            where: { id: existing.id },
            data: {
              nome: rawNome.trim(),
              email: rawEmail ? rawEmail.trim() : null,
              // Mantém o status original se já foi alocado/recrutado, ou reseta se necessário?
              // Geralmente, atualizamos apenas dados pessoais. Mantemos o status existente.
              opcao1: normalizeSectorName(row.opcao1) || null,
              opcao2: normalizeSectorName(row.opcao2) || null,
              idade: row.idade && !isNaN(Number(row.idade)) ? Number(row.idade) : calculateAge(row.dataNascimento),
              dataNascimento: row.dataNascimento || null,
              igreja: row.igreja || null,
              quantidadeServicos: mapQtyServices(row.quantidadeServicos),
              areasServidas: row.areasServidas || null,
              nomePastor: row.nomePastor || null,
              telefonePastor: row.telefonePastor ? await normalizePhoneNumber(row.telefonePastor) : null,
              numeroLegendario: row.numeroLegendario || null,
              anotacoes: row.anotacoes || null,
              instagram: row.instagram || null,
              fotoUrl: row.fotoUrl || null
            }
          });
          updatedCount++;
          results.push({
            nome: rawNome.trim(),
            phone: normalizedTelefone,
            status: 'updated'
          });
        } else {
          skippedCount++;
          results.push({
            nome: rawNome.trim(),
            phone: normalizedTelefone,
            status: 'skipped',
            reason: 'Telefone já cadastrado'
          });
        }
        continue;
      }

      // Create new volunteer
      await prisma.voluntario.create({
        data: {
          nome: rawNome.trim(),
          telefone: normalizedTelefone,
          email: rawEmail ? rawEmail.trim() : null,
          status: 'Available',
          opcao1: normalizeSectorName(row.opcao1) || null,
          opcao2: normalizeSectorName(row.opcao2) || null,
          idade: row.idade && !isNaN(Number(row.idade)) ? Number(row.idade) : calculateAge(row.dataNascimento),
          dataNascimento: row.dataNascimento || null,
          igreja: row.igreja || null,
          quantidadeServicos: mapQtyServices(row.quantidadeServicos),
          areasServidas: row.areasServidas || null,
          nomePastor: row.nomePastor || null,
          telefonePastor: row.telefonePastor ? await normalizePhoneNumber(row.telefonePastor) : null,
          numeroLegendario: row.numeroLegendario || null,
          anotacoes: row.anotacoes || null,
          instagram: row.instagram || null,
          fotoUrl: row.fotoUrl || null
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
      updatedCount,
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
        telefone: await normalizePhoneNumber(data.telefone),
        email: data.email || null,
        opcao1: normalizeSectorName(data.opcao1) || null,
        opcao2: normalizeSectorName(data.opcao2) || null,
        idade: data.idade ? parseInt(data.idade) : null,
        dataNascimento: data.dataNascimento || null,
        igreja: data.igreja || null,
        nomePastor: data.nomePastor || null,
        telefonePastor: data.telefonePastor ? await normalizePhoneNumber(data.telefonePastor) : null,
        numeroLegendario: data.numeroLegendario || null,
        quantidadeServicos: data.quantidadeServicos ? parseInt(data.quantidadeServicos) : 0,
        areasServidas: data.areasServidas || null,
        anotacoes: data.anotacoes || null,
        status: data.status || "Available",
        setorId: data.setorId || null,
        instagram: data.instagram || null,
        fotoUrl: data.fotoUrl || null
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
 * Creates a new volunteer in the database
 */
export async function createVolunteer(data: any) {
  try {
    if (!data.nome) {
      return { success: false, error: "O nome é obrigatório." };
    }
    if (!data.telefone) {
      return { success: false, error: "O telefone é obrigatório." };
    }

    const normalizedTelefone = await normalizePhoneNumber(data.telefone);

    // Check if phone number is already registered
    const existing = await prisma.voluntario.findFirst({
      where: { telefone: normalizedTelefone }
    });
    if (existing) {
      return { success: false, error: "Já existe um voluntário cadastrado com este telefone." };
    }

    const newVolunteer = await prisma.voluntario.create({
      data: {
        nome: data.nome,
        telefone: normalizedTelefone,
        email: data.email || null,
        opcao1: normalizeSectorName(data.opcao1) || null,
        opcao2: normalizeSectorName(data.opcao2) || null,
        idade: data.idade ? parseInt(data.idade) : null,
        dataNascimento: data.dataNascimento || null,
        igreja: data.igreja || null,
        nomePastor: data.nomePastor || null,
        telefonePastor: data.telefonePastor ? await normalizePhoneNumber(data.telefonePastor) : null,
        numeroLegendario: data.numeroLegendario || null,
        quantidadeServicos: data.quantidadeServicos ? parseInt(data.quantidadeServicos) : 0,
        areasServidas: data.areasServidas || null,
        anotacoes: data.anotacoes || null,
        status: data.status || "Available",
        setorId: data.setorId || null,
        instagram: data.instagram || null,
        fotoUrl: data.fotoUrl || null
      }
    });

    revalidatePath("/admin");
    revalidatePath("/recrutamento");
    revalidatePath("/equipe");
    return { success: true, data: newVolunteer };
  } catch (error: any) {
    console.error("Error creating volunteer:", error);
    return { success: false, error: error.message || "Erro ao criar voluntário." };
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

/**
 * Fetches the URLs configured for webhooks
 */
export async function getWebhookConfigs() {
  try {
    const recruited = await prisma.config.findUnique({
      where: { key: "webhook_recruited" }
    });
    const released = await prisma.config.findUnique({
      where: { key: "webhook_released" }
    });
    return {
      success: true,
      recruitedUrl: recruited ? recruited.value : "",
      releasedUrl: released ? released.value : ""
    };
  } catch (error: any) {
    console.error("Error getting webhook configs:", error);
    return { success: false, error: "Erro ao buscar configurações de webhooks." };
  }
}

/**
 * Saves/Updates the URLs configured for webhooks
 */
export async function saveWebhookConfigs(recruitedUrl: string, releasedUrl: string) {
  try {
    await prisma.config.upsert({
      where: { key: "webhook_recruited" },
      update: { value: recruitedUrl },
      create: { key: "webhook_recruited", value: recruitedUrl }
    });
    await prisma.config.upsert({
      where: { key: "webhook_released" },
      update: { value: releasedUrl },
      create: { key: "webhook_released", value: releasedUrl }
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error saving webhook configs:", error);
    return { success: false, error: "Erro ao salvar configurações de webhooks." };
  }
}

/**
 * Helper function to trigger a webhook asynchronously (non-blocking)
 */
function triggerWebhook(url: string, payload: any) {
  if (!url || !url.trim().startsWith("http")) {
    return;
  }
  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload)
  }).catch((err) => {
    console.error(`Failed to send webhook to ${url}:`, err);
  });
}
