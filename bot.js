const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

let sock = null;
let ioInstance = null;
let settings = {};

function isGroupAllowed(groupId) {
  return settings.applyToAll || (settings.allowedGroups && settings.allowedGroups.includes(groupId));
}

function isBotJid(jid) {
  if (!jid) return false;
  const botPatterns = ['@g.us', 'bot', 'whatsapp', 'api', 'service', 'support'];
  return botPatterns.some(p => jid.toLowerCase().includes(p));
}

function sanitizeMessage(text) {
  return text ? text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim() : '';
}

async function handleGroupParticipantChanged(evt) {
  try {
    const groupId = evt.id;
    if (!groupId) return;
    const action = evt.action;
    if (!action) return;

    const isJoin = (action === 'add');
    const isLeave = (action === 'remove');

    if ((isJoin && !settings.welcomeEnabled) || (isLeave && !settings.leaveEnabled)) return;
    if (!isGroupAllowed(groupId)) return;

    const participants = evt.participants || [];
    if (participants.length === 0) return;

    const myJid = sock.user?.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : null;
    const uniqueParticipants = [...new Set(participants)].filter(jid => jid && jid !== myJid);
    if (uniqueParticipants.length === 0) return;

    for (const participantJid of uniqueParticipants) {
      if (settings.ignoreBots && isBotJid(participantJid)) continue;

      let text = isJoin ? settings.welcomeMsg : settings.leaveMsg;
      if (!text || !text.trim()) continue;

      const groupEnabled = isJoin ? settings.welcomeGroupEnabled : settings.leaveGroupEnabled;
      const privateEnabled = isJoin ? settings.welcomePrivateEnabled : settings.leavePrivateEnabled;

      if (!groupEnabled && !privateEnabled) continue;

      let mentions = [];
      let groupName = 'Grupo';

      if (text.includes('{nome_grupo}')) {
        try {
          const groupInfo = await sock.groupMetadata(groupId);
          groupName = groupInfo.subject || 'Grupo';
          text = text.replace(/{nome_grupo}/g, groupName);
        } catch (e) {
          text = text.replace(/{nome_grupo}/g, groupName);
        }
      }

      if (text.includes('{nome_membro}')) {
        text = text.replace(/{nome_membro}/g, 'Membro');
      }

      if (text.includes('@membro') || text.includes('{mencao}')) {
        const mentionTag = `@${participantJid.split('@')[0]}`;
        text = text.replace(/@membro|{mencao}/g, mentionTag);
        mentions.push(participantJid);
      }

      text = sanitizeMessage(text);

      await delay(settings.delayBetweenMessages || 1500);

      if (groupEnabled) {
        await sock.sendMessage(groupId, { text, mentions });
      }
      if (privateEnabled) {
        await sock.sendMessage(participantJid, { text });
      }
    }
  } catch (err) {
    console.error('Erro no handleGroupParticipantChanged:', err);
  }
}

async function handleMessage(msg) {
  try {
    const isGroup = msg.key.remoteJid.endsWith('@g.us');
    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const sender = msg.key.remoteJid;
    const fromMe = msg.key.fromMe;

    // Auto-resposta
    if (settings.autoReplyEnabled && body && !fromMe) {
      const scope = settings.autoReplyScope || 'private';
      let shouldCheck = true;
      if (scope === 'private' && isGroup) shouldCheck = false;
      if (scope === 'groups' && !isGroup) shouldCheck = false;

      if (shouldCheck) {
        const rules = settings.autoReplyRules || [];
        const bodyLower = body.toLowerCase().trim();

        for (const rule of rules) {
          if (!rule.keyword || !rule.message) continue;
          const kw = rule.keyword.toLowerCase().trim();

          if (rule.matchType === 'exact') {
            if (bodyLower !== kw) continue;
          } else {
            if (!bodyLower.includes(kw)) continue;
          }

          const delayMs = (settings.autoReplyDelay || 2) * 1000;
          await delay(delayMs);

          let reply = rule.message;
          if (reply.includes('{nome}')) {
            reply = reply.replace(/{nome}/g, 'você');
          }

          await sock.sendMessage(sender, { text: reply });
          break;
        }
      }
    }

    // Moderação
    if (isGroup && !fromMe && isGroupAllowed(sender)) {
      let shouldDelete = false;
      const textLower = body.toLowerCase();

      if (settings.modAntiLink && /(https?:\/\/[^\s]+|www\.[^\s]+|wa\.me\/\d+)/gi.test(textLower)) shouldDelete = true;
      if (settings.modAntiAudio && (msg.message?.audioMessage)) shouldDelete = true;
      if (settings.modAntiImage && msg.message?.imageMessage) shouldDelete = true;
      if (settings.modAntiVideo && msg.message?.videoMessage) shouldDelete = true;
      if (settings.modAntiDocument && msg.message?.documentMessage) shouldDelete = true;
      if (settings.modAntiSticker && msg.message?.stickerMessage) shouldDelete = true;
      if (settings.modAntiProfanity && settings.modProfanityWords) {
        const badWords = settings.modProfanityWords.split(',').map(w => w.trim().toLowerCase()).filter(w => w);
        if (badWords.some(w => textLower.includes(w))) shouldDelete = true;
      }

      if (shouldDelete) {
        const action = settings.modAction || 'delete';
        if (action === 'delete' || action === 'delete_ban') {
          await sock.sendMessage(sender, { delete: msg.key });
        }
        if (action === 'ban' || action === 'delete_ban') {
          await sock.groupParticipantsUpdate(sender, [msg.key.participant || sender], 'remove');
        }
        if (settings.modWarnMsg && settings.modWarnMsg.trim() !== '') {
          let warn = settings.modWarnMsg;
          let mentions = [];
          const target = msg.key.participant || sender;
          if (warn.includes('@membro')) {
            warn = warn.replace(/@membro/g, `@${target.split('@')[0]}`);
            mentions.push(target);
          }
          await sock.sendMessage(sender, { text: warn, mentions });
        }
      }
    }
  } catch (err) {
    console.error('Erro no handleMessage:', err);
  }
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('sessions');
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ["Group Sender CRM", "Chrome", "10.0"],
    generateHighQualityLinkPreview: false,
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && ioInstance) {
      try {
        const qrUrl = await QRCode.toDataURL(qr);
        ioInstance.emit('qr_code', qrUrl);
        ioInstance.emit('session_status', 'Aguardando Escanear');
      } catch (e) {
        console.error('Erro gerando QR', e);
      }
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);

      if (shouldReconnect) {
        setTimeout(() => connectToWhatsApp(), 5000);
      } else {
        if (ioInstance) ioInstance.emit('session_status', 'Desconectado');
        try { fs.rmSync('sessions', { recursive: true, force: true }); } catch (e) { }
        setTimeout(() => connectToWhatsApp(), 2000);
      }
    } else if (connection === 'open') {
      console.log('Opened connection');
      if (ioInstance) {
        ioInstance.emit('session_status', 'Online');
        let phone = sock.user?.id ? sock.user.id.split(':')[0] : 'Desconhecido';
        ioInstance.emit('connected_phone', phone);
      }
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    if (m.type === 'notify') {
      for (let msg of m.messages) {
        await handleMessage(msg);
      }
    }
  });

  sock.ev.on('group-participants.update', async (evt) => {
    await handleGroupParticipantChanged(evt);
  });
}

function init(io) {
  ioInstance = io;
  console.log('🚀 Iniciando servidor do bot (Baileys)...');

  connectToWhatsApp().catch(err => console.error('Error in connectToWhatsApp:', err));

  io.on('connection', (socket) => {

    // Ponte simples para as extensões (apenas mock para não dar erro)
    socket.on('chrome_message', async (msg, callback) => {
      console.log('[chrome_message recebida via WS]', msg);
      if (msg.action === 'checkWA') {
        const connected = sock && sock.user ? true : false;
        if (callback) callback({ connected, isAuthorized: true });
      }
      else if (msg.action === 'taskGetState') {
        if (callback) callback({ state: { running: false } });
      }
      else if (msg.action === 'updateAutoSettings') {
        settings = msg.settings || {};
        if (callback) callback({ success: true });
      }
      else if (msg.action === 'taskStart' && msg.payload.type === 'campaign') {
        console.log("=========================================");
        console.log(">>> INICIANDO CAMPANHA RECEBIDA NO BACKEND!");
        console.log(">>> Quantidade de Grupos Selecionados:", msg.payload.items ? msg.payload.items.length : 0);
        console.log(">>> Variações de Mensagem:", msg.payload.variations ? msg.payload.variations.length : 0);

        if (callback) callback({ success: true });

        const payload = msg.payload;
        const items = payload.items || [];
        const variations = payload.variations || [];
        const cfg = payload.cfg || { delayMin: 5, delayMax: 15 };

        if (!sock || !sock.user) {
          console.log(">>> ERRO: WhatsApp não está conectado (Aguardando QR Code)!");
          socket.emit('chrome_event', { action: 'taskProgress', state: { running: false, type: 'campaign', textStatus: 'Erro: Escaneie o QR Code primeiro!', errors: ['Desconectado'] } });
          return;
        }

        socket.emit('chrome_event', { action: 'taskProgress', state: { running: true, type: 'campaign', progress: 0, total: items.length, textStatus: 'Iniciando...' } });

        let progress = 0;
        let errors = [];

        (async () => {
          console.log(">>> Entrando no loop de envio de campanha...");
          for (let i = 0; i < items.length; i++) {
            const group = items[i];
            const delayMin = Number(cfg.delayMin) || 5;
            const delayMax = Number(cfg.delayMax) || 15;
            const delayMs = Math.floor(Math.random() * (delayMax - delayMin + 1) + delayMin) * 1000;

            console.log(`\n📦 Processando ${i+1}/${items.length}: ${group.name}`);
            console.log(`⏳ Aguardando ${Math.round(delayMs/1000)}s...`);

            const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
            const waitSeconds = Math.round(delayMs / 1000);
            for (let s = waitSeconds; s > 0; s--) {
              socket.emit('chrome_event', { action: 'taskProgress', state: { running: true, type: 'campaign', progress, total: items.length, textStatus: `Aguardando ${s}s para enviar para ${group.name}...` } });
              await sleep(1000);
            }

            try {
              console.log(`>>> Enviando mensagem para ${group.name}...`);
              const variation = variations[Math.floor(Math.random() * variations.length)];
              if (!variation && variations.length > 0) continue;

              let text = variation ? (variation.text || '') : '';
              text = text.replace(/{nome_grupo}/g, group.name || 'Grupo');
              text = sanitizeMessage(text);

              let mentions = [];
              if (payload.mentionAll) {
                try {
                  const meta = await sock.groupMetadata(group.id);
                  mentions = meta.participants.map(p => p.id);
                  if (!text.includes('@everyone')) text += '\n\n' + mentions.map(m => `@${m.split('@')[0]}`).join(' ');
                } catch (e) {
                  console.log(">>> Aviso: Não foi possível obter membros para menção.");
                }
              }

              if (variation && variation.media && variation.media.length > 0) {
                const media = variation.media[0];
                const base64Data = media.data.split(';base64,').pop();
                const buffer = Buffer.from(base64Data, 'base64');
                console.log(`>>> Enviando MÍDIA (${media.type}) para ${group.name}`);

                if (media.type.startsWith('image/')) {
                  await sock.sendMessage(group.id, { image: buffer, caption: text, mentions });
                } else if (media.type.startsWith('video/')) {
                  await sock.sendMessage(group.id, { video: buffer, caption: text, mentions });
                } else {
                  await sock.sendMessage(group.id, { document: buffer, mimetype: media.type, fileName: media.name, caption: text, mentions });
                }
              } else {
                if (!text) throw new Error("A mensagem de texto não pode estar vazia.");
                console.log(`>>> Enviando TEXTO para ${group.name}`);
                await sock.sendMessage(group.id, { text, mentions });
              }
              console.log(`>>> Sucesso ao enviar para ${group.name}!`);
              progress++;
            } catch (err) {
              console.error('>>> ERRO ao enviar para', group.name, ':', err.message);
              errors.push(`Erro no grupo ${group.name}: ${err.message}`);
            }
          }

          console.log(">>> CAMPANHA FINALIZADA!");
          socket.emit('chrome_event', { action: 'taskProgress', state: { running: false, type: 'campaign', progress, total: items.length, textStatus: 'Finalizado', errors } });
        })();
      }
      else if (msg.action === 'getGroups') {
        try {
          if (!sock) return callback && callback({ groups: [] });
          const groups = await sock.groupFetchAllParticipating();
          const list = Object.values(groups).map(g => ({
            id: g.id,
            name: g.subject || 'Grupo',
            participants: (g.participants || []).length,
            isCreator: g.owner ? g.owner === sock.user?.id?.split(':')[0] + '@s.whatsapp.net' : false
          }));
          if (callback) callback({ groups: list });
        } catch (e) {
          console.error(e);
          if (callback) callback({ groups: [], error: e.message });
        }
      }
      else {
        if (callback) callback({ success: false, error: 'Ação não suportada no novo backend.' });
      }
    });

    socket.on('disconnect', () => {
      //
    });
  });
}

module.exports = {
  init
};
