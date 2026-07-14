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
      result.push(currentVal.trim());
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  result.push(currentVal.trim());
  return result;
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
      // skip
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

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

async function main() {
  const csvPath = path.join(__dirname, '../dadosemailtodosservos.csv');
  console.log(`Carregando CSV de: ${csvPath}`);
  
  if (!fs.existsSync(csvPath)) {
    console.error('Arquivo CSV não encontrado!');
    return;
  }

  const rows = parseCSV(csvPath);
  console.log(`Total de linhas lidas no CSV: ${rows.length}`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    const phoneRaw = row['Phone'];
    const emailRaw = row['Email'];
    const nameRaw = row['First Name'] || row['Nome'] || '';

    if (!phoneRaw || !emailRaw) {
      skippedCount++;
      continue;
    }

    const normalizedPhone = normalizePhone(phoneRaw);
    const cleanedEmail = emailRaw.trim().toLowerCase();

    // Atualizar e-mail com base no telefone normalizado
    const result = await prisma.voluntario.updateMany({
      where: { telefone: normalizedPhone },
      data: { email: cleanedEmail }
    });

    if (result.count > 0) {
      updatedCount += result.count;
    } else {
      skippedCount++;
    }
  }

  console.log('\n--- Resultado da Importação ---');
  console.log(`✔ Voluntários atualizados com sucesso: ${updatedCount}`);
  console.log(`⚠ Registros pulados ou não encontrados: ${skippedCount}`);
  
  // Exibir contagem final do banco de dados
  const totalVolunteers = await prisma.voluntario.count();
  const withEmail = await prisma.voluntario.count({ where: { NOT: { email: null } } });
  console.log(`Total de voluntários no banco: ${totalVolunteers}`);
  console.log(`Voluntários com e-mail preenchido: ${withEmail}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
