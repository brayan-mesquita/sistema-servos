import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(cleanValue(currentVal));
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  result.push(cleanValue(currentVal));
  return result;
}

function cleanValue(val: string): string {
  let cleaned = val.trim();
  if (cleaned.startsWith('=')) {
    cleaned = cleaned.substring(1).trim();
  }
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  cleaned = cleaned.replace(/""/g, '"');
  return cleaned.trim();
}

function parseCSV(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        currentLine += char + content[i + 1];
        i++;
      } else {
        inQuotes = !inQuotes;
        currentLine += char;
      }
    } else if (char === '\n' && !inQuotes) {
      lines.push(currentLine);
      currentLine = '';
    } else if (char === '\r' && !inQuotes) {
      // skip carriage return
    } else {
      currentLine += char;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  const headersLine = lines[0];
  if (!headersLine) return [];

  const headers = parseCSVLine(headersLine);

  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const values = parseCSVLine(line);
    const rowObj: any = {};
    headers.forEach((header, index) => {
      rowObj[header] = values[index] !== undefined ? values[index] : '';
    });
    result.push(rowObj);
  }
  return result;
}

function normalizePhoneNumber(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return '55' + digits;
  }
  return digits;
}

function toTitleCase(name: string): string {
  if (!name) return '';
  const prepositions = ['de', 'do', 'da', 'dos', 'das', 'e'];
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && prepositions.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function getSectorFromOption(option: string | null | undefined): string | null {
  if (!option) return null;
  const opt = option.toLowerCase();
  if (opt.includes('evento')) return 'Eventos';
  if (opt.includes('segurança') || opt.includes('seguranca')) return 'Segurança';
  if (opt.includes('logistica') || opt.includes('logística')) return 'Logística';
  if (opt.includes('dip') || opt.includes('intercessão') || opt.includes('intercessao')) return 'DIP';
  if (opt.includes('hakuna')) return 'Hakunas';
  if (opt.includes('comunicação') || opt.includes('comunicacao')) return 'Comunicação';
  if (opt.includes('mídia') || opt.includes('midia')) return 'Mídia';
  if (opt.includes('qap')) return 'QAP';
  if (opt.includes('adm') || opt.includes('administração') || opt.includes('administracao')) return 'ADM';
  return null;
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

function mapQtyServices(qtyStr: string | undefined | null): number {
  if (!qtyStr) return 0;
  const clean = qtyStr.toLowerCase();
  if (clean.includes('3') || clean.includes('três') || clean.includes('tres')) return 3;
  if (clean.includes('1') || clean.includes('2') || clean.includes('uma') || clean.includes('duas')) return 1;
  return 0;
}

async function main() {
  const csvPath = path.join(__dirname, '../prisma/servos.csv');
  console.log(`Reading CSV from: ${csvPath}`);
  const rows = parseCSV(csvPath);
  console.log(`Total rows read: ${rows.length}`);

  let imported = 0;
  let skippedEmptySector = 0;
  let skippedDuplicate = 0;

  for (const row of rows) {
    const nomeRaw = row['Nome'];
    const telefoneRaw = row['Seu telefone'];
    const emailRaw = row['Email'];
    const nascimentoRaw = row['Data de nascimento'];
    const numeroLgndRaw = row['Numero do legendário'];
    const pastorNomeRaw = row['Nome pastor ou padre ou líder'];
    const pastorTelRaw = row['Tel. pastor ou padre ou líder'];
    const igrejaRaw = row['Igreja que participa'];
    const quantidadeServicosRaw = row['Quantas vezes serviu no LGND?'];
    const areasServidasRaw = row['Em que áreas você já serviu?'];
    const opcao1Raw = row['1 opção para servir'];
    const opcao2Raw = row['2 opção para servir'];
    const instagramRaw = row['Instagram'];
    const fotoUrlRaw = row['Foto servo (self)'];

    // Check if sector option 1 is empty or missing
    if (!opcao1Raw || opcao1Raw.trim() === '') {
      skippedEmptySector++;
      continue;
    }

    const titleCasedNome = toTitleCase(nomeRaw);
    const normalizedTelefone = normalizePhoneNumber(telefoneRaw);

    if (!normalizedTelefone) {
      console.log(`Skipping row with empty telephone: ${nomeRaw}`);
      continue;
    }

    // Check database for duplicate phone
    const existing = await prisma.voluntario.findUnique({
      where: { telefone: normalizedTelefone }
    });

    if (existing) {
      skippedDuplicate++;
      continue;
    }

    const titleCasedPastorNome = pastorNomeRaw ? toTitleCase(pastorNomeRaw) : null;
    const normalizedPastorTel = pastorTelRaw ? normalizePhoneNumber(pastorTelRaw) : null;
    const mappedOpcao1 = getSectorFromOption(opcao1Raw);
    const mappedOpcao2 = getSectorFromOption(opcao2Raw);
    const age = calculateAge(nascimentoRaw);
    const qtyServices = mapQtyServices(quantidadeServicosRaw);

    await prisma.voluntario.create({
      data: {
        nome: titleCasedNome,
        telefone: normalizedTelefone,
        email: emailRaw ? emailRaw.trim().toLowerCase() : null,
        status: 'Available',
        opcao1: mappedOpcao1,
        opcao2: mappedOpcao2,
        idade: age,
        dataNascimento: nascimentoRaw || null,
        igreja: igrejaRaw ? igrejaRaw.trim() : null,
        quantidadeServicos: qtyServices,
        areasServidas: areasServidasRaw || null,
        nomePastor: titleCasedPastorNome,
        telefonePastor: normalizedPastorTel,
        numeroLegendario: numeroLgndRaw || null,
        anotacoes: null,
        instagram: instagramRaw ? instagramRaw.trim() : null,
        fotoUrl: fotoUrlRaw ? fotoUrlRaw.trim() : null
      }
    });

    imported++;
  }

  console.log('Import summary:');
  console.log(`- Imported: ${imported}`);
  console.log(`- Skipped (empty sectors): ${skippedEmptySector}`);
  console.log(`- Skipped (duplicates/existing): ${skippedDuplicate}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
