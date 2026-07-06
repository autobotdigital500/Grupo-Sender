FROM node:20

# Criar pasta da aplicação
WORKDIR /usr/src/app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências (sem o Puppeteer, será super rápido)
RUN npm install

# Copiar os outros arquivos
COPY . .

# Como você envia os arquivos soltos pelo site, precisamos colocar nas pastas certas lá dentro
RUN mkdir -p src public && mv api.js bot.js src/ 2>/dev/null || true && mv index.html style.css logo.png extension.html extension.js license.js public/ 2>/dev/null || true

# Expor a porta
EXPOSE 3000

# Comando para rodar
CMD [ "npm", "start" ]
