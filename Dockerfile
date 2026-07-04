FROM node:18

# Criar pasta da aplicação
WORKDIR /usr/src/app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências (sem o Puppeteer, será super rápido)
RUN npm install

# Copiar os outros arquivos
COPY . .

# Expor a porta
EXPOSE 3000

# Comando para rodar
CMD [ "npm", "start" ]
