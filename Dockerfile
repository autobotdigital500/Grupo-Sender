FROM node:18

# Instalar dependências do Chrome
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Definir variáveis de ambiente para o Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Criar pasta da aplicação
WORKDIR /usr/src/app

# Copiar package.json
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar os outros arquivos
COPY . .

# Comando de build que usamos no Render
RUN mkdir -p src public && mv api.js bot.js src/ 2>/dev/null || true && mv index.html style.css logo.png extension.html extension.js public/ 2>/dev/null || true

# Expor a porta
EXPOSE 3000

# Comando para rodar
CMD [ "npm", "start" ]
