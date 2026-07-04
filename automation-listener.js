(function() {
  console.log('🤖 Group Sender CRM: Sensor de Boas-vindas e Comandos v2.2 (auto‑reply fix)');

  // Configurações padrão
  let settings = {
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
    // Auto‑resposta
    autoReplyEnabled: false,
    autoReplyScope: 'private', // 'private', 'groups', 'both'
    autoReplyDelay: 2,         // segundos
    autoReplyRules: [],         // [{ keyword, message, matchType: 'includes'|'exact', oncePerContact }]
    // Moderação
    modAntiLink: false,
    modAntiAudio: false,
    modAntiImage: false,
    modAntiVideo: false,
    modAntiDocument: false,
    modAntiSticker: false,
    modAction: 'delete',       // 'delete' ou 'ban'
    // Assinatura
    signature: ''
  };

  // Fila de processamento para evitar sobrecarga
  let processingQueue = new Set();
  let lastMessageTime = 0;

  // Recebe configurações do Background
  if (!window.GCRM_SettingsListenerAdded) {
    window.GCRM_SettingsListenerAdded = true;
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'GCRM_UPDATE_AUTO_SETTINGS') {
        if (!event.data.settings || !event.data.settings.sig || !event.data.settings.sig.startsWith('GCRM_SEC_')) {
          console.error('🤖 GCRM: Falha de integridade nas configurações. Ignorando.');
          return;
        }
        settings = { ...settings, ...event.data.settings };
        console.log('🤖 Configurações atualizadas:', {
          welcomeEnabled: settings.welcomeEnabled,
          leaveEnabled: settings.leaveEnabled,
          applyToAll: settings.applyToAll,
          allowedGroupsCount: settings.allowedGroups.length,
          autoReplyEnabled: settings.autoReplyEnabled,
          autoReplyRulesCount: (settings.autoReplyRules || []).length
        });
      }
    });
  }

  // Inicia o interceptador DOM de assinatura
  if (!window.GCRM_InterceptorAdded) {
    window.GCRM_InterceptorAdded = true;
    setupSignatureInterceptor();
  }

  // Aguarda o WPP ficar pronto
  if (!window.GCRM_WppListenersAdded) {
    window.GCRM_WppListenersAdded = true;
    const checkWPP = setInterval(() => {
      if (window.WPP && window.WPP.isReady) {
        clearInterval(checkWPP);
        console.log('🤖 WPP conectado, iniciando listeners...');
        setupListeners();
        window.postMessage({ type: 'GCRM_REQUEST_SETTINGS' }, '*');
      }
    }, 1000);
    setTimeout(() => clearInterval(checkWPP), 30000);
  }

  function setupSignatureInterceptor() {
    const injectSignature = (composer) => {
      if (!settings.signature) return;
      let text = composer.innerText || '';
      if (text.trim() === '' || text.includes(settings.signature)) return;
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(composer);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        document.execCommand('insertText', false, '\n\n' + settings.signature);
        composer.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      } catch (e) { console.warn('🤖 Erro ao injetar assinatura:', e); }
    };

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const target = e.target;
        if (target.isContentEditable && target.closest('footer')) {
          injectSignature(target);
        }
      }
    }, { capture: true });

    document.addEventListener('click', (e) => {
      const sendBtn = e.target.closest('[data-icon="send"]');
      if (sendBtn) {
        const footer = sendBtn.closest('footer');
        if (footer) {
          const composer = footer.querySelector('div[contenteditable="true"]');
          if (composer) injectSignature(composer);
        }
      }
    }, { capture: true });
  }

  function setupListeners() {
    // ──────────────────────── BOAS-VINDAS / DESPEDIDAS ────────────────────────
    const handleParticipantEvent = async (evt) => {
      try {
        const groupId = extractGroupId(evt);
        if (!groupId) return;
        const action = evt.action || evt.subtype;
        if (!action) return;
        const isJoin = (action === 'add' || action === 'join');
        const isLeave = (action === 'remove' || action === 'leave');
        if ((isJoin && !settings.welcomeEnabled) || (isLeave && !settings.leaveEnabled)) return;
        if (!isGroupAllowed(groupId)) return;
        let participants = extractParticipants(evt);
        if (participants.length === 0) return;
        const myJid = getMyJidSafe();
        const uniqueParticipants = [...new Set(participants)].filter(jid => jid && jid !== myJid);
        if (uniqueParticipants.length === 0) return;
        console.log(`🤖 Processando ${isJoin ? 'entrada' : 'saída'} de ${uniqueParticipants.length} participantes no grupo ${groupId}`);
        for (const jid of uniqueParticipants) {
          await processWithDelay(() => processParticipantEvent(groupId, jid, isJoin ? 'join' : 'leave'));
        }
      } catch (err) { console.error('🤖 Erro no handleParticipantEvent:', err); }
    };

    window.WPP.on('group.participant_changed', handleParticipantEvent);

    // Fallback via mensagens de sistema
    const handleSystemMessage = async (msg) => {
      try {
        if (!msg || (msg.type !== 'gp2' && msg.type !== 'notification')) return;
        const subtype = msg.subtype || '';
        const isJoin = (subtype === 'add' || subtype === 'join');
        const isLeave = (subtype === 'remove' || subtype === 'leave');
        if (!isJoin && !isLeave) return;
        const groupId = msg.to?._serialized || msg.to || msg.chatId;
        if (!groupId) return;
        const participants = msg.recipients || (msg.author ? [msg.author] : []);
        if (participants.length === 0) return;
        await handleParticipantEvent({
          id: groupId,
          action: subtype,
          participants: participants
        });
      } catch (err) { console.error('🤖 Erro no handleSystemMessage:', err); }
    };

    // ──────────────────────── MODERAÇÃO ────────────────────────
    const handleModerationMessage = async (msg) => {
      try {
        if (!msg || !msg.isGroupMsg || msg.author === getMyJidSafe() || !isGroupAllowed(msg.chatId)) return;
        let shouldDelete = false;
        const body = (msg.body || '').toLowerCase();
        if (settings.modAntiLink && /(https?:\/\/[^\s]+|www\.[^\s]+|wa\.me\/\d+)/gi.test(body)) shouldDelete = true;
        if (settings.modAntiAudio && (msg.type === 'ptt' || msg.type === 'audio')) shouldDelete = true;
        if (settings.modAntiImage && msg.type === 'image') shouldDelete = true;
        if (settings.modAntiVideo && msg.type === 'video') shouldDelete = true;
        if (settings.modAntiDocument && msg.type === 'document') shouldDelete = true;
        if (settings.modAntiSticker && msg.type === 'sticker') shouldDelete = true;
        if (shouldDelete) {
          console.log(`🛡️ Moderação: deletando mensagem (${msg.type}) de ${msg.author} no grupo ${msg.chatId}`);
          try { await window.WPP.chat.deleteMessage(msg.chatId, msg.id, true, true); } catch (e) {}
          if (settings.modAction === 'ban') {
            console.log(`🛡️ Moderação: banindo infrator ${msg.author}`);
            try { await window.WPP.group.removeParticipants(msg.chatId, [msg.author]); } catch (e) {}
          }
        }
      } catch (err) { console.error('🛡️ Erro na moderação:', err); }
    };

    // ──────────────────────── AUTO‑RESPOSTA (CORRIGIDA) ────────────────────────
    const autoReplyCache = new Map();
    const processedAutoReply = new Set();
    const MAX_PROCESSED = 2000;

    // Toast de Debug Visual
    function showDebugToast(text) {
      try {
        let toast = document.getElementById('gcrm-debug-toast');
        if (!toast) {
          toast = document.createElement('div');
          toast.id = 'gcrm-debug-toast';
          toast.style.cssText = 'position:fixed;top:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:#fff;padding:10px 20px;border-radius:20px;z-index:999999;font-family:sans-serif;font-size:14px;pointer-events:none;transition:opacity 0.3s;';
          document.body.appendChild(toast);
        }
        toast.innerText = text;
        toast.style.opacity = '1';
        clearTimeout(toast.timeout);
        toast.timeout = setTimeout(() => toast.style.opacity = '0', 3000);
      } catch(e) {}
    }

    const handleAutoReply = async (msg) => {
      try {
        if (!settings.autoReplyEnabled) return;
        const body = msg?.body || msg?.message || msg?.text || '';
        if (!body || typeof body !== 'string' || !body.trim()) return;
        
        // Evita auto-responder se a mensagem foi enviada pelo próprio bot
        const fromMe = msg?.fromMe === true || msg?.id?.fromMe === true;
        if (fromMe) return;

        const msgId = msg?.id?._serialized || (typeof msg?.id === 'string' ? msg.id : null);
        if (msgId && processedAutoReply.has(msgId)) return;
        
        const senderObj = msg?.author || msg?.from || msg?.chatId;
        const sender = senderObj?._serialized || (typeof senderObj === 'string' ? senderObj : '') || '';
        const myJid = getMyJidSafe();
        if (sender === myJid) return;

        const chatIdObj = msg?.id?.remote || msg?.chatId;
        const chatId = chatIdObj?._serialized || (typeof chatIdObj === 'string' ? chatIdObj : '') || sender;
        const isGroup = !!(msg?.isGroupMsg || (typeof chatId === 'string' && chatId.includes('@g.us')));

        const scope = settings.autoReplyScope || 'private';
        if (scope === 'private' && isGroup) return;
        if (scope === 'groups' && !isGroup) return;

        const rules = settings.autoReplyRules || [];
        if (!rules.length) return;

        const bodyLower = body.toLowerCase().trim();
        console.log(`🤖 Auto-Resposta: Analisando mensagem de ${sender}: "${bodyLower}"`);
        showDebugToast(`🤖 Analisando: "${bodyLower}"`);

        for (const rule of rules) {
          if (!rule.keyword || !rule.message) continue;
          const kw = rule.keyword.toLowerCase().trim();
          
          console.log(`🤖 Comparando com regra: "${kw}" (tipo: ${rule.matchType})`);

          if (rule.matchType === 'exact') {
            if (bodyLower !== kw) continue;
          } else {
            if (!bodyLower.includes(kw)) continue;
          }

          console.log(`🤖 Deu Match! Regra escolhida: "${kw}"`);

          // Só marca a mensagem como processada SE cair em uma regra válida,
          // assim evita processar a mesma mensagem várias vezes na mesma regra
          if (msgId) {
            processedAutoReply.add(msgId);
            if (processedAutoReply.size > MAX_PROCESSED) {
              const first = processedAutoReply.values().next().value;
              processedAutoReply.delete(first);
            }
          }

          if (rule.oncePerContact) {
            const cacheKey = `${sender}:${rule.keyword}`;
            const lastSent = autoReplyCache.get(cacheKey) || 0;
            if (Date.now() - lastSent < 24 * 60 * 60 * 1000) continue;
            autoReplyCache.set(cacheKey, Date.now());
          }

          const delayMs = (settings.autoReplyDelay || 2) * 1000;
          await new Promise(r => setTimeout(r, delayMs));

          let reply = rule.message;
          if (reply.includes('{nome}')) {
            try {
              const contact = await window.WPP.contact.get(sender);
              reply = reply.replace(/{nome}/g, contact?.name || contact?.pushname || 'você');
            } catch (e) { reply = reply.replace(/{nome}/g, 'você'); }
          }

          const targetChatStr = isGroup ? chatId : chatId;
          
          if (!targetChatStr || typeof targetChatStr !== 'string') {
             console.error('🤖 Auto-Resposta falhou: targetChat inválido ou não-texto', targetChatStr);
             break;
          }

          const opts = { createChat: true };
          if (isGroup && msgId) opts.quotedMsg = msgId;

          console.log(`🤖 Auto-Resposta: enviando para ${targetChatStr}`);
          await window.WPP.chat.sendTextMessage(targetChatStr, reply, opts);
          console.log(`✅ Auto-Resposta: "${rule.keyword}" → enviado para ${sender}`);
          break; // Para na primeira regra que der match
        }
      } catch (err) {
        console.error('🤖 Erro na auto-resposta:', err);
      }
    };

    // ──────────── NOVA ESTRATÉGIA DE CAPTURA ────────────
    // 1. MutationObserver para detectar novas mensagens no DOM
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1 && node.getAttribute) {
              // Procura data-id no próprio nó ou em filhos
              const msgIdAttr = node.getAttribute('data-id') || node.querySelector?.('[data-id]')?.getAttribute('data-id');
              if (!msgIdAttr) continue;
              // Exemplo de data-id: "true_5511999999999@c.us_ABCDEF123..."
              const parts = msgIdAttr.split('_');
              if (parts.length < 3) continue;
              const jidPart = parts[1];
              // Extrai o chat ID (antes do '@')
              const chatId = jidPart.includes('@') ? jidPart : null;
              if (!chatId) continue;
              // Busca a mensagem via WPP para obter objeto completo
              (async () => {
                try {
                  const fullMsg = await window.WPP.chat.getMessageById(chatId, msgIdAttr);
                  if (fullMsg && fullMsg.id) {
                    handleAutoReply(fullMsg).catch(() => {});
                    handleModerationMessage(fullMsg).catch(() => {});
                    handleSystemMessage(fullMsg).catch(() => {});
                  }
                } catch (e) { /* silêncio */ }
              })();
            }
          }
        }
      }
    });

    // Observa o container inteiro para garantir que pegue o #main assim que surgir
    observer.observe(document.body, { childList: true, subtree: true });

    // 2. Polling como fallback (Robusto contra erro de relógio)
    let isPollingWarmup = true;
    setInterval(async () => {
      try {
        if (!settings.autoReplyEnabled && !settings.welcomeEnabled) return;
        const chats = await window.WPP.chat.list({ count: 20 }); 
        if (!chats?.length) return;
        for (const chat of chats) {
          try {
            const realChatId = chat.id?._serialized || chat.id;
            if (!realChatId) continue;
            
            // Se não for warmup, otimiza puxando só se tiver unread (se suportado)
            if (!isPollingWarmup && chat.unreadCount === 0) continue;

            const msgs = await window.WPP.chat.getMessages(realChatId, { count: 5 });
            if (!msgs?.length) continue;
            
            for (const msg of msgs) {
              const msgId = msg?.id?._serialized || (typeof msg?.id === 'string' ? msg.id : null);
              if (!msgId) continue;

              if (isPollingWarmup) {
                // No primeiro ciclo, apenas memoriza as mensagens antigas para não responder de novo
                processedAutoReply.add(msgId);
                continue;
              }

              // Se a mensagem já foi processada, pula
              if (processedAutoReply.has(msgId)) continue;

              handleAutoReply(msg).catch(() => {});
              handleModerationMessage(msg).catch(() => {});
              handleSystemMessage(msg).catch(() => {});
            }
          } catch (e) {}
        }
        isPollingWarmup = false;
      } catch (e) {}
    }, 2000);

    // Tenta também os eventos nativos do WPP
    const evtNames = ['chat.new_message', 'message', 'new_message', 'msg.new_message'];
    evtNames.forEach(evt => {
      try {
        window.WPP.on(evt, (m) => handleAutoReply(m).catch(() => {}));
        window.WPP.on(evt, handleModerationMessage);
        window.WPP.on(evt, handleSystemMessage);
      } catch(e) {}
    });

    // Hook no Store.Msg, se disponível (o mais eficiente)
    try {
      const MsgStore = (window.Store && window.Store.Msg) || (window.WPP?.whatsapp?.Msg);
      if (MsgStore && typeof MsgStore.on === 'function') {
        MsgStore.on('add', (msg) => {
          if (msg && msg.id && msg.body) {
            handleAutoReply(msg).catch(() => {});
            handleModerationMessage(msg).catch(() => {});
            handleSystemMessage(msg).catch(() => {});
          }
        });
      }
    } catch (e) {}

    console.log('🤖 Listeners configurados com sucesso (nova captura Híbrida v3)');
  }

  // Funções auxiliares (inalteradas)
  function extractGroupId(evt) {
    return evt.id?._serialized || evt.id || evt.chatId?._serialized || evt.chatId || evt.groupId || evt.to?._serialized;
  }
  function extractParticipants(evt) {
    let participants = evt.participants || [];
    if (evt.who) {
      const whoArray = Array.isArray(evt.who) ? evt.who : [evt.who];
      participants = [...participants, ...whoArray];
    }
    if (evt.recipients) {
      const recArray = Array.isArray(evt.recipients) ? evt.recipients : [evt.recipients];
      participants = [...participants, ...recArray];
    }
    if (evt.author && !participants.includes(evt.author)) participants.push(evt.author);
    return participants.map(p => typeof p === 'string' ? p : p._serialized || p.id?._serialized || p.id || p).filter(Boolean);
  }
  function isGroupAllowed(groupId) { return settings.applyToAll || settings.allowedGroups.includes(groupId); }
  function escapeRegExp(string) { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  async function processWithDelay(fn) {
    const now = Date.now();
    const timeSinceLast = now - lastMessageTime;
    if (timeSinceLast < settings.delayBetweenMessages) {
      await new Promise(resolve => setTimeout(resolve, settings.delayBetweenMessages - timeSinceLast));
    }
    lastMessageTime = Date.now();
    return await fn();
  }
  async function processParticipantEvent(groupId, participantJid, type, retryCount = 0) {
    const isJoin = type === 'join';
    const queueKey = `${groupId}-${participantJid}-${type}`;
    if (processingQueue.has(queueKey)) return;
    processingQueue.add(queueKey);
    try {
      if (settings.ignoreBots && isBotJid(participantJid)) { console.log(`🤖 Ignorando bot: ${participantJid}`); return; }
      let text = isJoin ? settings.welcomeMsg : settings.leaveMsg;
      if (!text || !text.trim()) return;
      const groupEnabled = isJoin ? settings.welcomeGroupEnabled : settings.leaveGroupEnabled;
      const privateEnabled = isJoin ? settings.welcomePrivateEnabled : settings.leavePrivateEnabled;
      if (!groupEnabled && !privateEnabled) return;
      let mentions = [], groupName = 'Grupo';
      if (text.includes('{nome_grupo}')) {
        try { const group = await window.WPP.chat.get(groupId); groupName = group.name || group.subject || 'Grupo'; text = text.replace(/{nome_grupo}/g, groupName); } catch(e) { text = text.replace(/{nome_grupo}/g, groupName); }
      }
      if (text.includes('{nome_membro}')) {
        try { const contact = await window.WPP.contact.get(participantJid); text = text.replace(/{nome_membro}/g, contact.name || contact.pushname || 'Membro'); } catch(e) { text = text.replace(/{nome_membro}/g, 'Membro'); }
      }
      if (text.includes('@membro') || text.includes('{mencao}')) {
        const mentionTag = `@${participantJid.split('@')[0]}`;
        text = text.replace(/@membro|{mencao}/g, mentionTag);
        mentions.push(participantJid);
      }
      text = sanitizeMessage(text);
      if (text.includes('@everyone')) {
        try {
          const participants = await window.WPP.group.getParticipants(groupId);
          if (participants?.length) {
            const allJids = participants.map(x => x.id._serialized || x.id);
            mentions = [...new Set([...mentions, ...allJids])];
            text = text.replace(/@everyone/g, '').trim();
            text += "\n" + "\u200B".repeat(4000) + allJids.map(m => "@" + m.split('@')[0]).join(' ');
          }
        } catch(e) { text = text.replace(/@everyone/g, '').trim(); }
      }
      if (groupEnabled) {
        await window.WPP.chat.sendTextMessage(groupId, text, { mentions, createChat: true, waitForAck: true });
      }
      if (privateEnabled) {
        await window.WPP.chat.sendTextMessage(participantJid, text, { createChat: true, waitForAck: true });
      }
      console.log(`✅ Evento ${type} processado para ${participantJid}`);
    } catch(err) {
      console.error(`❌ Falha no evento ${type} (tentativa ${retryCount+1}/${settings.maxRetries}):`, err);
      if (retryCount < settings.maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, retryCount)*1000));
        await processParticipantEvent(groupId, participantJid, type, retryCount+1);
      }
    } finally {
      processingQueue.delete(queueKey);
    }
  }
  function isBotJid(jid) {
    if (!jid) return false;
    const botPatterns = ['@g.us', 'bot', 'whatsapp', 'api', 'service', 'support'];
    return botPatterns.some(p => jid.toLowerCase().includes(p));
  }
  function sanitizeMessage(text) {
    return text ? text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim() : '';
  }
  function getMyJidSafe() {
    try {
      if (window.WPP?.conn?.getMyUserId) return window.WPP.conn.getMyUserId()._serialized || window.WPP.conn.getMyUserId();
      if (window.WPP?.whatsapp?.UserPrefs?.getMeUser) return window.WPP.whatsapp.UserPrefs.getMeUser()._serialized;
      if (window.WPP?.whatsapp?.conn?.me) {
        const me = window.WPP.whatsapp.conn.me;
        return typeof me === 'string' ? me : me._serialized || me.user + '@' + me.server;
      }
    } catch(e) {}
    return '';
  }

  window.GCRM_WelcomeSensor = {
    getStatus: () => ({
      active: settings.welcomeEnabled,
      groupsCount: settings.allowedGroups.length,
      applyToAll: settings.applyToAll
    }),
    updateSettings: (newSettings) => { settings = { ...settings, ...newSettings }; }
  };

  console.log('🤖 Sensor de boas-vindas inicializado com sucesso (v2.2)');
})();
