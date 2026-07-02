FROM node:20-alpine

WORKDIR /app

# Instala as dependências (otimizando cache do Docker)
COPY package.json package-lock.json ./
RUN npm ci

# Copia o código da aplicação e arquivos do banco
COPY . .

# Gera o Prisma Client do PostgreSQL
RUN npx prisma generate

# Compila o Next.js
RUN npm run build

# Expõe a porta e define ambiente de produção
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

# Inicia a aplicação
CMD ["npm", "run", "start"]
