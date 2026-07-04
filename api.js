const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const configPath = path.join(__dirname, '../config.json');

// Configurações padrão
const defaultSettings = {
  welcomeEnabled: false,
  welcomeMsg: '',
  welcomeGroupEnabled: true,
  welcomePrivateEnabled: false,
  leaveEnabled: false,
  leaveMsg: '',
  leaveGroupEnabled: false,
  leavePrivateEnabled: false,
  allowedGroups: [],
  applyToAll: false,
  delayBetweenMessages: 1500,
  maxRetries: 3,
  ignoreBots: true,
  autoReplyEnabled: false,
  autoReplyScope: 'private',
  autoReplyDelay: 2,
  autoReplyRules: [],
  modAntiLink: false,
  modAntiAudio: false,
  modAntiImage: false,
  modAntiVideo: false,
  modAntiDocument: false,
  modAntiSticker: false,
  modAction: 'delete',
  signature: ''
};

// Carrega as configurações
function loadConfig() {
  if (fs.existsSync(configPath)) {
    try {
      const data = fs.readFileSync(configPath, 'utf8');
      return { ...defaultSettings, ...JSON.parse(data) };
    } catch (e) {
      console.error('Erro ao ler config.json', e);
      return defaultSettings;
    }
  }
  return defaultSettings;
}

// Salva as configurações
function saveConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Obter configurações
router.get('/settings', (req, res) => {
  res.json(loadConfig());
});

// Atualizar configurações
router.post('/settings', (req, res) => {
  const newConfig = { ...loadConfig(), ...req.body };
  saveConfig(newConfig);
  // Notifica o bot
  const bot = require('./bot');
  bot.updateSettings(newConfig);
  res.json({ success: true, settings: newConfig });
});

module.exports = router;
