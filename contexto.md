# Manual de Contexto e Arquitetura - Portal de Servos Legendários

Este documento serve como guia completo de transição para que qualquer agente de Inteligência Artificial (Google Antigravity, Claude, ChatGPT, etc.) possa assumir e dar continuidade ao desenvolvimento do projeto de forma instantânea e contextualizada.

---

## 1. Visão Geral do Projeto e Stack Tecnológica
O **Portal de Servos Legendários** é um sistema web tático desenvolvido para a liderança de campo de acampamentos e desafios. Ele permite que coordenadores de setores específicos recrutem voluntários (servos) de forma coordenada em diferentes fases de seleção.

* **Framework:** Next.js 15+ (App Router)
* **Estilização:** Tailwind CSS v4 (Vanilla CSS integrado com suporte nativo a HSL)
* **Banco de Dados:** PostgreSQL (Produção no EasyPanel) / SQLite (Desenvolvimento local)
* **ORM:** Prisma
* **Segurança:** Hashing de senhas em SHA-256 nativo (Node `crypto`) e variáveis de ambiente no EasyPanel.
* **Repositório GitHub:** `git@github.com:brayan-mesquita/sistema-servos.git`

---

## 2. Estrutura de Arquivos Relevantes
* **[`prisma/schema.prisma`](file:///Users/brayan/Documents/PROJETOS/CLAUDE%20TESTES/selec-servos-legendarios/portal-servos/prisma/schema.prisma):** Definição dos modelos de dados (Setor, Voluntario, Coordenador).
* **[`src/app/actions.ts`](file:///Users/brayan/Documents/PROJETOS/CLAUDE%20TESTES/selec-servos-legendarios/portal-servos/src/app/actions.ts):** Centralização de todas as Server Actions (login, recrutamento, liberação de servos, edição de dados, bloqueios).
* **[`src/app/globals.css`](file:///Users/brayan/Documents/PROJETOS/CLAUDE%20TESTES/selec-servos-legendarios/portal-servos/src/app/globals.css):** Estilos globais e regras de redefinição para o Tema Claro (usando seletores dinâmicos baseados na classe `.dark` do `<html>`).
* **[`src/app/login/page.tsx`](file:///Users/brayan/Documents/PROJETOS/CLAUDE%20TESTES/selec-servos-legendarios/portal-servos/src/app/login/page.tsx):** Tela de Login com imagem da Amazônia e popup centralizado de seleção de setores de coordenação.
* **[`src/app/recrutamento/page.tsx`](file:///Users/brayan/Documents/PROJETOS/CLAUDE%20TESTES/selec-servos-legendarios/portal-servos/src/app/recrutamento/page.tsx):** Fila de recrutamento interativa dos coordenadores com filtros por primeira/segunda opção de fila e gaveta (drawer) detalhada.
* **[`src/app/admin/page.tsx`](file:///Users/brayan/Documents/PROJETOS/CLAUDE%20TESTES/selec-servos-legendarios/portal-servos/src/app/admin/page.tsx):** Painel do administrador geral. Inclui chaves de controle de fases, metas por setor, diretório reativo de servos com modal de edição completa e controle de bloqueio.
* **[`scripts/import-csv.ts`](file:///Users/brayan/Documents/PROJETOS/CLAUDE%20TESTES/selec-servos-legendarios/portal-servos/scripts/import-csv.ts):** Script executável via terminal para ler o arquivo `prisma/servos.csv` e popular o PostgreSQL mantendo a integridade e filtrando duplicatas.
* **[`Dockerfile`](file:///Users/brayan/Documents/PROJETOS/CLAUDE%20TESTES/selec-servos-legendarios/portal-servos/Dockerfile):** Configuração de container para implantação no EasyPanel.

---

## 3. Banco de Dados e Modelagem (Prisma)
O banco de dados é composto por três entidades principais:

```prisma
model Setor {
  id            String        @id @default(cuid())
  name          String        @unique
  meta          Int           @default(10)
  voluntarios   Voluntario[]
  coordenadores Coordenador[]
}

model Voluntario {
  id                 String   @id @default(cuid())
  nome               String
  telefone           String   @unique
  email              String?
  idade              Int?
  dataNascimento     String?
  numeroLegendario   String?
  nomePastor         String?
  telefonePastor     String?
  igreja             String?
  quantidadeServicos Int      @default(0)
  areasServidas      String?
  opcao1             String
  opcao2             String?
  status             String   @default("Available") // "Available", "Recruited"
  setorId            String?
  setor              Setor?   @relation(fields: [setorId], references: [id])
  bloqueado          Boolean  @default(false)
  anotacoes          String?
  createdAt          DateTime @default(now())
}

model Coordenador {
  id           String  @id @default(cuid())
  nome         String
  email        String  @unique
  passwordHash String
  setorId      String?
  setor        Setor?  @relation(fields: [setorId], references: [id])
}
```

---

## 4. Funcionalidades de Regras de Negócio Implementadas

### A. Validação de Fases (Fase 1 vs Fase 2)
* Na **Fase 1** (definida no painel de controle do Administrador), os coordenadores podem ver todos os voluntários, mas o botão de recrutamento de qualquer voluntário que esteja listado na fila de **"Média (2ª Opção)"** é travado com o aviso `🔒 Bloqueado (Fase 1)`.
* Na **Fase 2**, o recrutamento de voluntários de segunda opção é liberado.
* **Exceção de Opções Idênticas (Caso Janderley):** Se um voluntário escolheu o mesmo setor como 1ª e 2ª opção, ele deve aparecer como elegível e livre para recrutamento normalmente durante a Fase 1 quando o coordenador filtrar por "1ª Opção na Fila". Ele só aparecerá bloqueado caso o coordenador mude o filtro para a fila de "2ª Opção". A validação ocorre tanto na interface (`recrutamento/page.tsx`) quanto no backend (`claimVolunteer` em `actions.ts`).

### B. Bloqueio Geral de Servos
* O administrador pode bloquear voluntários que não atendem aos requisitos da coordenação no painel de controle.
* Servos bloqueados exibem uma tarja vermelha `🚫 Bloqueado` no painel.
* Nas filas de recrutamento dos coordenadores, o botão de recrutamento fica desabilitado e um alerta visual é exibido: `"Servo não atendeu aos requisitos da coordenação"`.
* O botão de bloqueio na administração possui **atualização otimista** (altera o estado no cliente instantaneamente para 0ms de latência e reverte com alerta em caso de falha no servidor).

### C. Tema Claro Dinâmico
* O sistema possui um alternador de tema Claro/Escuro no canto superior direito das páginas e no login.
* O tema escuro é o padrão.
* O tema claro foi implementado injetando variáveis de contraste no seletor `html:not(.dark)` em `globals.css` sem a necessidade de reescrever as classes inline do Tailwind.
* **Banner de Login Clicável (`.keep-dark`):** O painel esquerdo da tela de login (que possui a foto da Amazônia e fundo escuro fixo) está marcado com a classe `.keep-dark`, o que impede o tema claro de escurecer seus textos, garantindo contraste perfeito para a palavra "LEGENDÁRIOS" e a descrição "Gerenciamento Tático e Alocação de Servos".

### D. Integração com WhatsApp
* Adicionados atalhos rápidos com ícones de WhatsApp ao lado do telefone do servo e do pastor.
* Clicar no atalho abre diretamente a URL `https://api.whatsapp.com/send?phone=...` com mensagens pré-preenchidas direcionadas.

### E. Importador de Planilha Reutilizável
* O script `scripts/import-csv.ts` lê a base de servos a partir de `prisma/servos.csv`.
* Ele realiza a limpeza de strings, formatação em Title Case para nomes, normalização do número telefônico brasileiro (com DDI 55), ignora duplicatas automaticamente e associa os servos aos setores correspondentes.

---

## 5. Como Iniciar o Desenvolvimento (Comandos Úteis)

### Instalação de dependências:
```bash
npm install
```

### Configurar variáveis locais (.env):
```env
DATABASE_URL="postgresql://postgres:omp9ghusdl0g93ovllng@162.141.109.178:5432/servos?sslmode=disable"
```

### Sincronizar o banco de dados local/remoto com o schema:
```bash
npx prisma db push
```

### Rodar o servidor de desenvolvimento:
```bash
npm run dev
```

### Compilar a versão de produção:
```bash
npm run build
```

### Executar a importação manual de servos (CSV):
```bash
npx tsx scripts/import-csv.ts
```
