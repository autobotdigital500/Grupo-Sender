const wppconnect = require('@wppconnect-team/wppconnect');
const fs = require('fs');
const path = require('path');

let client = null;
let io = null;
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
    const groupId = evt.chatId || evt.id;
    if (!groupId) return;
    const action = evt.action;
    if (!action) return;
    
    const isJoin = (action === 'add' || action === 'join');
    const isLeave = (action === 'remove' || action === 'leave');
    
    if ((isJoin && !settings.welcomeEnabled) || (isLeave && !settings.leaveEnabled)) return;
    if (!isGroupAllowed(groupId)) return;
    
    const participants = evt.participants || [];
    if (participants.length === 0) return;
    
    const myJid = await client.getMe().then(me => me.id || me.wid);
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
          const groupInfo = await client.getGroupInfo(groupId); 
          groupName = groupInfo.title || 'Grupo'; 
          text = text.replace(/{nome_grupo}/g, groupName); 
        } catch(e) { 
          text = text.replace(/{nome_grupo}/g, groupName); 
        }
      }
      
      if (text.includes('{nome_membro}')) {
        try { 
          const contact = await client.getContact(participantJid); 
          text = text.replace(/{nome_membro}/g, contact.pushname || contact.name || 'Membro'); 
        } catch(e) { 
          text = text.replace(/{nome_membro}/g, 'Membro'); 
        }
      }
      
      if (text.includes('@membro') || text.includes('{mencao}')) {
        const mentionTag = `@${participantJid.split('@')[0]}`;
        text = text.replace(/@membro|{mencao}/g, mentionTag);
        mentions.push(participantJid);
      }
      
      text = sanitizeMessage(text);
      
      // Delay
      await new Promise(r => setTimeout(r, settings.delayBetweenMessages || 1500));
      
      if (groupEnabled) {
        await client.sendText(groupId, text, { mentionedList: mentions });
      }
      
      if (privateEnabled) {
        await client.sendText(participantJid, text);
      }
    }
  } catch (err) {
    console.error('Erro no handleGroupParticipantChanged:', err);
  }
}

async function handleMessage(msg) {
  try {
    const isGroup = msg.isGroupMsg;
    const body = msg.body || '';
    const sender = msg.from;
    
    // Auto-resposta
    if (settings.autoReplyEnabled && body && !msg.fromMe) {
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
          
          // Delay
          const delayMs = (settings.autoReplyDelay || 2) * 1000;
          await new Promise(r => setTimeout(r, delayMs));
          
          let reply = rule.message;
          if (reply.includes('{nome}')) {
            reply = reply.replace(/{nome}/g, msg.sender.pushname || msg.sender.name || 'você');
          }
          
          await client.sendText(msg.from, reply);
          break; // match first rule only
        }
      }
    }
    
    // Moderação
    if (isGroup && !msg.fromMe && isGroupAllowed(msg.from)) {
      let shouldDelete = false;
      const textLower = body.toLowerCase();
      
      if (settings.modAntiLink && /(https?:\/\/[^\s]+|www\.[^\s]+|wa\.me\/\d+)/gi.test(textLower)) shouldDelete = true;
      if (settings.modAntiAudio && (msg.type === 'ptt' || msg.type === 'audio')) shouldDelete = true;
      if (settings.modAntiImage && msg.type === 'image') shouldDelete = true;
      if (settings.modAntiVideo && msg.type === 'video') shouldDelete = true;
      if (settings.modAntiDocument && msg.type === 'document') shouldDelete = true;
      if (settings.modAntiSticker && msg.type === 'sticker') shouldDelete = true;
      
      if (shouldDelete) {
        try { await client.deleteMessage(msg.from, msg.id, true); } catch (e) {}
        if (settings.modAction === 'ban') {
          try { await client.removeParticipant(msg.from, msg.author); } catch (e) {}
        }
      }
    }
  } catch (e) {
    console.error('Erro ao processar mensagem:', e);
  }
}

function loadConfig() {
  const configPath = path.join(__dirname, '../config.json');
  if (fs.existsSync(configPath)) {
    try {
      const data = fs.readFileSync(configPath, 'utf8');
      settings = JSON.parse(data);
    } catch (e) {}
  }
}

module.exports = {
  init: (socketIo) => {
    io = socketIo;
    loadConfig();
    
    wppconnect.create({
      session: 'group-sender-crm',
      puppeteerOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      },
      catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => {
        console.log('Terminal QR Code:');
        console.log(asciiQR);
        if (io) io.emit('qr_code', base64Qrimg);
      },
      statusFind: (statusSession, session) => {
        console.log('Status da Sessão:', statusSession);
        if (io) io.emit('session_status', statusSession);
      },
      headless: true
    })
    .then((wppClient) => {
      client = wppClient;
      
      client.onMessage(handleMessage);
      client.onGlobalParticipantsChanged(handleGroupParticipantChanged);
      
      console.log('🤖 Bot iniciado com sucesso no backend!');
    })
    .catch((error) => {
      console.log('Erro ao iniciar WPPConnect:', error);
    });
  },
  
  updateSettings: (newSettings) => {
    settings = newSettings;
  }
};
