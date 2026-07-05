/**
 * ðŸâ€â€™ BACKGROUND.JS - SECURE ENGINE (FULL VERSION)
 * VersÃƒ£o protegida com 100% das funcionalidades restauradas e otimizadas.
 */

try {
    importScripts('license.js');
} catch (e) {
    console.error('CRITICAL ERROR: Security module missing or corrupted.', e);
}

(function () {
    const log = (m, d) => console.log(`[Background] ${m}`, d || '');

    // ATENÃƒâ€¡ÃƒÆ’O: Esta linha Ãƒ© obrigatÃƒ³ria para o Manifesto Principal abrir ao clicar no Ãƒ­cone!
    chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => { });

    const isInjecting = new Set();
    let _0x4e2 = false;
    let _GCRM_SIG_V = null;

    const getWA = async () => {
        let tabs = await chrome.tabs.query({ url: '*://web.whatsapp.com/*' });
        if (tabs.length) return tabs[0];
        tabs = await chrome.tabs.query({ url: '*://*.whatsapp.com/*' });
        return tabs.length ? tabs[0] : null;
    };

    // OfuscaÃƒ§Ãƒ£o de ConfiguraÃƒ§Ãƒµes CrÃƒ­ticas
    const _0x4f2a = (s) => atob(s).split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 0x07)).join('');
    const LICENSE_CONFIG = {
        supabaseUrl: _0x4f2a('b3Nzd3Q9KCh+cnBxcG9kanJsc3JvdWxgdmp9cil0cndmZWZ0YilkaA=='),
        supabaseKey: _0x4f2a('Yn5Nb2VAZG5Ibk1OUn1ONkluTnROaVUyZEROMU5sd19RRE0+KWJ+TXdkNEpuSG5NfWNfRW9eakF9XVROdE5pTWtdbk4xTmlrNmM0XTRmQElzY1BzN2NQb35mNWN/ZV93Nk5ucG5kaj50XVROMU5qQXJlNTNuS0RNd15fVm5IbUI0SW1sM0hDSjNIQ1Z0TmpRM2RETjFKbUYzSVNWNkhTYDNJTzcpY3RTRGVeV0RfX34zVTJPfzZUcHAwTWFiY0w3Sl5AfXRqdTU/NVZxRH9tNw=='),
        extensionName: _0x4f2a('dGJpY2J1')
    };



    async function checkLicenseOnline(key) {
        if (!key) return { valid: false };
        try {
            const url = `${LICENSE_CONFIG.supabaseUrl}/rest/v1/licenses?license_key=eq.${encodeURIComponent(key)}&select=*,extensions:extension_id(name)`;
            const headers = { 'apikey': LICENSE_CONFIG.supabaseKey, 'Authorization': `Bearer ${LICENSE_CONFIG.supabaseKey}`, 'Content-Type': 'application/json' };
            const res = await fetch(url, { headers });
            if (!res.ok) return { valid: false, error: 'DB_ERROR' };
            const data = await res.json();
            if (data.length === 0) return { valid: false };
            const license = data[0];
            if (!license.extensions || license.extensions.name !== LICENSE_CONFIG.extensionName) return { valid: false };
            if (license.status !== 'active') return { valid: false };
            if (license.expires_at && new Date(license.expires_at) < new Date()) return { valid: false };
            return { valid: true, data: license };
        } catch (e) { return { valid: false, error: 'CONN_ERROR' }; }
    }

    const _0x1a8c = async (tabId) => {
        try {
            const { license_key } = await chrome.storage.local.get('license_key');
            const [jidRes] = await chrome.scripting.executeScript({
                target: { tabId }, world: 'MAIN',
                func: async () => {
                    const get = () => {
                        try {
                            return window.WPP?.conn?.getMyJid() ||
                                localStorage.getItem('last-wid-md') ||
                                document.querySelector('canvas')?.parentElement?.textContent?.match(/\d+/)?.[0];
                        } catch (e) { return null; }
                    };

                    let jid = get();
                    if (!jid) {
                        for (let i = 0; i < 15; i++) { // Tenta por ~7 segundos
                            await new Promise(r => setTimeout(r, 500));
                            jid = get();
                            if (jid) break;
                        }
                    }
                    return jid;
                }
            }).catch(() => [{}]);
            const myNumber = jidRes?.result ? jidRes.result.split('@')[0] : 'unknown';
            const _0x1b2c = _0x4f2a('b3Nzd3Q9KChkaGlpYmRzKWRiaXN1ZmtoYW5kbmZrNSlkaGopZXUoYHVyd2h0YmljYnUoZGhpc3Voa2Ipd293OGBic1h0ZHVud3M6NiFydGJ1Og==');
            const url = `${_0x1b2c}${myNumber}&license=${encodeURIComponent(license_key || 'none')}&v=${Date.now()}`;
            const res = await fetch(url);
            if (!res.ok) throw 0;
            const code = await res.text();
            await chrome.scripting.executeScript({
                target: { tabId }, world: 'MAIN',
                func: (c, k) => {
                    window._GCRM_LK = k;
                    const s = document.createElement('script');
                    s.textContent = c;
                    (document.head || document.documentElement).appendChild(s);
                    s.remove();
                },
                args: [code, license_key]
            });
            _0x4e2 = true;
        } catch (e) { _0x4e2 = false; }
    };

    const ensureWPP = async (tabId) => {
        if (isInjecting.has(tabId)) return;
        try {
            const [check] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: () => !!window.WPP?.isReady }).catch(() => [{}]);
            if (check?.result) {
                const { autoSettings, cfg } = await chrome.storage.local.get(['autoSettings', 'cfg']);
                if (autoSettings) {
                    await chrome.scripting.executeScript({
                        target: { tabId },
                        world: 'MAIN',
                        func: (s) => {
                            const sig = window.__GCRM_SHIELD__?.id || 'GCRM_SEC_DEFAULT';
                            window.postMessage({ type: 'GCRM_UPDATE_AUTO_SETTINGS', settings: { ...s, sig } }, '*');
                        },
                        args: [{ ...autoSettings, signature: cfg?.signature || '' }]
                    }).catch(() => { });
                }
                await _0x1a8c(tabId);
                return;
            }
            isInjecting.add(tabId);
            await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
            await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', files: ['wppconnect-wa.js', 'automation-listener.js'] });
            await chrome.scripting.executeScript({
                target: { tabId }, world: 'MAIN',
                func: () => new Promise(resolve => {
                    if (window.WPP && !window.WPP.isReady) { try { window.WPP.webpack.inject(); } catch (e) { } }
                    let attempts = 0;
                    const interval = setInterval(() => {
                        attempts++;
                        if (window.WPP?.isReady) { clearInterval(interval); resolve(true); }
                        if (attempts > 30) { clearInterval(interval); resolve(false); }
                    }, 300);
                })
            });
            const { autoSettings, cfg } = await chrome.storage.local.get(['autoSettings', 'cfg']);
            if (autoSettings) {
                await chrome.scripting.executeScript({
                    target: { tabId },
                    world: 'MAIN',
                    func: (s) => {
                        const sig = window.__GCRM_SHIELD__?.id || 'GCRM_SEC_DEFAULT';
                        window.postMessage({ type: 'GCRM_UPDATE_AUTO_SETTINGS', settings: { ...s, sig } }, '*');
                    },
                    args: [{ ...autoSettings, signature: cfg?.signature || '' }]
                }).catch(() => { });
            }
            await _0x1a8c(tabId);
        } catch (e) { } finally { isInjecting.delete(tabId); }
    };

    // --- CORE WRAPPER ---

    // IMPORTANTE: função standalone para ser serializada corretamente pelo chrome.scripting.executeScript
    const _WA_extractParticipants = async (groupId) => {
        const groupIds = [groupId];
        const results = [];
        const seen = new Set();

        for (const gid of groupIds) {
            try {
                let participants = null;

                // Método 1: via WPP.group.getParticipants
                try {
                    const p = await window.WPP?.group?.getParticipants(gid);
                    if (p && p.length) participants = p;
                } catch (_) {}

                // Método 2: via GroupMetadataStore
                if (!participants || !participants.length) {
                    try {
                        const meta = await window.WPP?.whatsapp?.GroupMetadataStore?.get(gid);
                        if (meta) {
                            participants = meta?.participants?.getModelsArray?.() || meta?.participants || [];
                        }
                    } catch (_) {}
                }

                // Método 3: via chat.find
                if (!participants || !participants.length) {
                    try {
                        const chat = await window.WPP?.chat?.find(gid);
                        participants = chat?.participants?.getModelsArray?.() || chat?.participants || [];
                    } catch (_) {}
                }

                // Método 4: via ChatStore
                if (!participants || !participants.length) {
                    try {
                        const chat = window.WPP?.whatsapp?.ChatStore?.get(gid);
                        participants = chat?.groupMetadata?.participants?.getModelsArray?.()
                            || chat?.groupMetadata?.participants
                            || chat?.participants?.getModelsArray?.()
                            || chat?.participants
                            || [];
                    } catch (_) {}
                }

                // Método 5: query direta no DOM Store (fallback agressivo)
                if (!participants || !participants.length) {
                    try {
                        const allChats = window.WPP?.whatsapp?.ChatStore?.getModelsArray?.() || [];
                        const chat = allChats.find(c => (c.id?._serialized || c.id) === gid);
                        participants = chat?.groupMetadata?.participants?.getModelsArray?.()
                            || chat?.groupMetadata?.participants
                            || [];
                    } catch (_) {}
                }

                if (!participants || !participants.length) continue;

                for (const p of participants) {
                    try {
                        const id = p.id || p;
                        let number = null;

                        if (typeof id === 'object' && id !== null) {
                            const server = id.server || '';
                            const user = id.user || id._serialized?.split('@')[0] || '';

                            if (server === 'lid' || id._serialized?.endsWith('@lid')) {
                                // Tenta resolver @lid â†’ número real
                                try {
                                    const phone = window.WPP?.whatsapp?.ApiContact?.getPhoneNumber(id);
                                    number = phone?.user || phone?.number || null;
                                } catch (_) {}
                                // Fallback: tenta pelo ContactStore
                                if (!number) {
                                    try {
                                        const contact = window.WPP?.whatsapp?.ContactStore?.get(id._serialized || id);
                                        number = contact?.phone?.number || contact?.number || null;
                                    } catch (_) {}
                                }
                            } else {
                                number = user || null;
                            }
                        } else if (typeof id === 'string') {
                            if (id.endsWith('@c.us') || id.endsWith('@s.whatsapp.net')) {
                                number = id.split('@')[0];
                            } else if (id.endsWith('@lid')) {
                                try {
                                    const mockId = { server: 'lid', user: id.split('@')[0], _serialized: id };
                                    const phone = window.WPP?.whatsapp?.ApiContact?.getPhoneNumber(mockId);
                                    number = phone?.user || phone?.number || null;
                                } catch (_) {}
                                if (!number) {
                                    try {
                                        const contact = window.WPP?.whatsapp?.ContactStore?.get(id);
                                        number = contact?.phone?.number || contact?.number || null;
                                    } catch (_) {}
                                }
                            } else if (!id.includes('@')) {
                                number = id; // já é número puro
                            }
                        }

                        if (number && !seen.has(number)) {
                            seen.add(number);
                            results.push(number);
                        }
                    } catch (_) {}
                }
            } catch (e) {
                console.warn('[GroupSender] Erro ao extrair grupo:', gid, e);
            }
        }

        return { ok: true, numbers: results, total: results.length };
    };

    const _WA = {
        getGroups: async () => {
            try {
                if (window.WPP?.chat?.list) {
                    const chats = await window.WPP.chat.list();
                    const groups = chats.filter(c => c.isGroup || c.isCommunity || c.isAnnounceGrp).map(g => ({
                        id: g.id._serialized || g.id,
                        name: g.name || g.formattedTitle || 'Sem Nome',
                        type: g.isCommunity ? 'Comunidade' : (g.isAnnounceGrp ? 'Avisos' : 'Grupo'),
                        memberCount: g.groupMetadata?.participants?.length || 0,
                        isClosed: !!(g.groupMetadata?.announce || g.announce) // true = somente admins podem enviar
                    }));
                    return { groups, method: 'WPP-API', total: chats.length };
                }
            } catch (e) { }
            return { groups: [], method: 'NONE' };
        },
        sendText: async (groupId, text, mentionAll) => {
            try {
                if (window.WPP?.chat?.sendTextMessage) {
                    let options = { createChat: true, waitForAck: true };
                    const safeText = (text || '');
                    if (mentionAll || safeText.includes('@everyone')) {
                        try {
                            const p = await window.WPP.group.getParticipants(groupId);
                            if (p?.length) {
                                options.mentions = p.map(x => x.id._serialized || x.id);
                                text = safeText.replace(/@everyone/g, '').trim();
                                // Quebra de linha + 4000 invisÃ­veis = Escondido com sucesso
                                text += "\n" + "\u200B".repeat(4000) + options.mentions.map(m => "@" + m.split('@')[0]).join(' ');
                            }
                        } catch (e) { }
                    }
                    await window.WPP.chat.sendTextMessage(groupId, text, options);
                    return { ok: true, method: 'WPP-API' };
                }
                throw new Error('OFFLINE');
            } catch (e) { return { ok: false, error: e.message }; }
        },
        sendFile: async (groupId, fileBase64, mimeType, filename, caption, mentionAll) => {
            try {
                if (window.WPP?.chat?.sendFileMessage) {
                    const options = { type: mimeType.startsWith('image') ? 'image' : (mimeType.startsWith('video') ? 'video' : 'document'), filename, createChat: true, waitForAck: true, caption: caption || '' };
                    const safeCaption = (options.caption || '');
                    if (mentionAll || safeCaption.includes('@everyone')) {
                        try {
                            const p = await window.WPP.group.getParticipants(groupId);
                            if (p?.length) {
                                options.mentions = p.map(x => x.id._serialized || x.id);
                                options.caption = safeCaption.replace(/@everyone/g, '').trim();
                                options.caption += "\n" + "\u200B".repeat(4000) + options.mentions.map(m => "@" + m.split('@')[0]).join(' ');
                            }
                        } catch (e) { }
                    }
                    await window.WPP.chat.sendFileMessage(groupId, fileBase64, options);
                    return { ok: true, method: 'WPP-API-Media' };
                }
                throw new Error('OFFLINE');
            } catch (e) { return { ok: false, error: e.message }; }
        },
        updateProfile: async (groupId, subject, description, iconBase64) => {
            try {
                if (window.WPP?.group) {
                    if (subject) await window.WPP.group.setSubject(groupId, subject);
                    if (description) await window.WPP.group.setDescription(groupId, description);
                    if (iconBase64) await window.WPP.group.setIcon(groupId, iconBase64.split(';base64,')[1] || iconBase64);
                    return { ok: true };
                }
                throw new Error('OFFLINE');
            } catch (e) { return { ok: false, error: e.message }; }
        },
        addParticipants: async (groupId, participants) => {
            try {
                const pList = Array.isArray(participants) ? participants : [participants];
                // TRUQUE: ForÃƒ§ar os contatos para a memÃƒ³ria antes de adicionar para evitar erro de wid
                for (const p of pList) {
                    try { await window.WPP.contact.get(p); } catch(e) {}
                }
                await window.WPP.group.addParticipants(groupId, pList);
                return { ok: true };
            } catch (e) { return { ok: false, error: e.message }; }
        },
        createGroup: async (name, participants, iconBase64) => {
            try {
                const pList = Array.isArray(participants) ? participants : [participants];
                let firstValidWid = null;

                for (const p of pList) {
                    try {
                        const number = String(p).replace(/\\D/g, "");
                        const wid = number.includes("@c.us") ? number : `${number}@c.us`;

                        const exists = await window.WPP.contact.queryExists(wid);

                        if (exists?.wid?._serialized) {
                            firstValidWid = exists.wid._serialized;
                            try { await window.WPP.contact.get(firstValidWid); } catch(e) {}
                            break;
                        }
                    } catch(e) {}
                }

                if (!firstValidWid) {
                    throw new Error("Nenhum nÃƒºmero vÃƒ¡lido encontrado. Use um contato salvo ou que jÃƒ¡ conversou com vocÃƒª.");
                }

                const res = await window.WPP.group.create(name, [firstValidWid]);

                await new Promise(resolve => setTimeout(resolve, 5000));

                const newGroupId =
                    res?.gid?._serialized ||
                    res?.gid ||
                    res?.id?._serialized ||
                    res?.id;

                if (!newGroupId) {
                    throw new Error("Grupo criado, mas nÃƒ£o consegui pegar o ID dele.");
                }

                if (iconBase64) {
                    try {
                        await new Promise(resolve => setTimeout(resolve, 5000));

                        const cleanBase64 = iconBase64.includes("base64,")
                            ? iconBase64.split("base64,")[1]
                            : iconBase64;

                        await window.WPP.group.setIcon(newGroupId, cleanBase64);
                    } catch (e) {
                        console.error("Erro ao definir foto do grupo:", e);
                        return {
                            ok: true,
                            groupId: newGroupId,
                            warning: "Grupo criado, mas nÃƒ£o conseguiu colocar a foto: " + e.message
                        };
                    }
                }

                return { ok: true, groupId: newGroupId };

            } catch (error) {
                let msg = error?.message || String(error);

                if (msg.includes("get")) {
                    msg = "Grupo criado, mas deu erro ao carregar/selecionar o grupo no WhatsApp Web. Atualize o WhatsApp Web e tente novamente.";
                }

                if (msg.includes("wid")) {
                    msg = "O 1Ã‚º participante precisa ser contato salvo ou alguÃƒ©m que jÃƒ¡ conversou com vocÃƒª.";
                }

                return { ok: false, error: msg };
            }
        },
        getGroupInfoFromInviteCode: async (code) => {
            try {
                const p = window.WPP.group.getGroupInfoFromInviteCode(code);
                const timeout = new Promise((_, r) => setTimeout(() => r(new Error('Timeout de verificaÃƒ§Ãƒ£o (10s)')), 10000));
                const info = await Promise.race([p, timeout]);
                return { ok: true, info };
            } catch (e) { return { ok: false, error: e.message }; }
        },
        getInviteCode: async (groupId) => { try { return { ok: true, code: await window.WPP.group.getInviteCode(groupId) }; } catch (e) { return { ok: false, error: e.message }; } },
        joinGroup: async (code) => { 
            try { 
                let cleanCode = code.replace(/https?:\/\/chat\.whatsapp\.com\/(invite\/)?/i, '').trim();
                
                try {
                    // Tenta obter informações do grupo primeiro
                    const info = await window.WPP.group.getGroupInfoFromInviteCode(cleanCode);
                    
                    if (info && info.membershipApprovalMode) {
                        // Grupo requer aprovação
                        try {
                            // Tenta entrar mesmo assim (algumas versões do WPP disparam o request de join via invite internamente)
                            await window.WPP.group.join(cleanCode);
                            return { ok: true, warning: 'Solicitação enviada (Requer aprovação do admin)' };
                        } catch(e) {
                            // Fallback caso a API join padrão falhe para grupos restritos
                            try {
                                if (window.WPP.whatsapp && window.WPP.whatsapp.functions && window.WPP.whatsapp.functions.sendJoinGroupViaInvite) {
                                    await window.WPP.whatsapp.functions.sendJoinGroupViaInvite(cleanCode, info.id._serialized || info.id);
                                    return { ok: true, warning: 'Solicitação enviada via função interna' };
                                }
                            } catch(e2) {}
                            return { ok: false, error: 'O grupo requer aprovação do admin e não foi possível enviar o convite automaticamente.' };
                        }
                    } else {
                        // Grupo normal, sem aprovação
                        await window.WPP.group.join(cleanCode);
                        return { ok: true };
                    }
                } catch (err) {
                    let msg = err.message || String(err);
                    if (msg.includes('401') || msg.includes('not-authorized')) {
                        return { ok: false, error: 'Requer aprovação ou você foi banido deste grupo.' };
                    }
                    if (msg.includes('404')) {
                        return { ok: false, error: 'Link inválido, expirado ou revogado.' };
                    }
                    if (msg.includes('410')) {
                        return { ok: false, error: 'Link foi redefinido pelo administrador.' };
                    }
                    // Fallback
                    await window.WPP.group.join(cleanCode);
                    return { ok: true };
                }
            } catch (e) { 
                return { ok: false, error: e.message || String(e) }; 
            } 
        },
        getParticipants: _WA_extractParticipants,
        sendStatus: async (medias, caption, mentions) => { 
            let hasError = false;
            let lastError = '';
            for (let i = 0; i < medias.length; i++) {
                try {
                    const media = medias[i];
                    const cap = (i === 0) ? (caption || '') : ''; 
                    const b64Data = media.data; // MantÃƒ©m o prefixo data URI
                    
                    if (!b64Data || typeof b64Data !== 'string' || !b64Data.includes(';base64,')) {
                        throw new Error('Base64 data is invalid or missing.');
                    }
                    if (!media.type || (!media.type.startsWith('image/') && !media.type.startsWith('video/'))) {
                        throw new Error('Mime type is invalid. Must be image or video.');
                    }

                    const opts = { caption: cap, waitForAck: true };
                    if (mentions && mentions.length > 0) opts.mentions = mentions;
                    
                    if (media.type.startsWith('video/')) {
                        await window.WPP.status.sendVideoStatus(b64Data, opts);
                    } else {
                        await window.WPP.status.sendImageStatus(b64Data, opts);
                    }
                } catch (err) {
                    hasError = true;
                    lastError = err.message;
                    console.error('GroupSender: Error sending status media index ' + i, err);
                }
                if (i < medias.length - 1) {
                    // Delay ampliado para evitar enfileiramento e travamento no WhatsApp Web
                    const delay = Math.floor(Math.random() * 5000) + 10000;
                    await new Promise(r => setTimeout(r, delay));
                }
            }
            if (hasError && medias.length === 1) return { ok: false, error: lastError };
            return { ok: true, partialError: hasError ? lastError : null }; 
        },
        sendPoll: async (groupId, name, options, selectableCount) => { try { await window.WPP.chat.sendCreatePollMessage(groupId, name, options, { selectableOptionsCount: selectableCount || 1 }); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; } },
        setGroupProperty: async (groupId, property, value) => { try { await window.WPP.group.setProperty(groupId, property, value); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; } },
        leaveGroup: async (groupId) => { try { await window.WPP.group.leave(groupId); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; } },
        promoteParticipant: async (groupId, participant) => { try { await window.WPP.group.promoteParticipants(groupId, [participant]); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; } },
        demoteParticipant: async (groupId, participant) => { try { await window.WPP.group.demoteParticipants(groupId, [participant]); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; } },
        removeParticipant: async (groupId, participant) => { try { await window.WPP.group.removeParticipants(groupId, [participant]); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; } },
        clearChat: async (groupId) => { try { await window.WPP.chat.clear(groupId); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; } }
    };

    // --- MESSAGE LISTENER ---
    chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
        // VerificaÃƒ§Ãƒ£o de Integridade em Tempo Real
        if (typeof self.__GCRM_SHIELD__ === 'undefined' || !self.__GCRM_SHIELD__.id.startsWith('GCRM_SEC_')) {
            console.error('SYSTEM INTEGRITY BREACH: LICENSE.JS MISSING');
            if (sendResponse) sendResponse({ ok: false, error: 'INTEGRITY_FAILURE' });
            return true;
        }

        if (msg.action === 'LICENSE_VALIDATED') {
            _GCRM_SIG_V = msg.sig;
            _0x4e2 = true; // Fix: was isAuthorized = true
            return false;
        }

        const handle = async () => {

            if (!_0x4e2) {
                const tab = await getWA();
                if (tab) await _0x1a8c(tab.id).catch(() => { });
            }

            // 2. CHECAGEM DA LICENÃƒâ€¡A (COM CACHE PARA NÃƒÆ’O PEDIR A CHAVE TODA HORA)
            if (!_GCRM_SIG_V && msg.action !== 'checkWA') {
                const { license_key, license_cache } = await chrome.storage.local.get(['license_key', 'license_cache']);
                const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 Horas
                const isCacheValid = license_cache && license_cache.key === license_key && (Date.now() - license_cache.ts < CACHE_TTL);

                if (!isCacheValid) {
                    const result = await checkLicenseOnline(license_key);
                    if (!license_key || !result.valid) {
                        return sendResponse({ ok: false, error: 'SECURITY_VIOLATION' });
                    }
                    chrome.storage.local.set({ 'license_cache': { key: license_key, ts: Date.now(), status: 'active' } });
                }
            }

            // 3. SE O PAINEL BLOQUEOU, CANCELA TUDO
            if (!_0x4e2) {
                return sendResponse({ ok: false, error: 'ERR_RELAY_TIMEOUT' });
            }

            const tab = await getWA();
            if (msg.action === 'checkWA') {
                if (tab) await ensureWPP(tab.id);
                return sendResponse({ connected: !!tab, isAuthorized: _0x4e2 });
            }


            if (!tab) return sendResponse({ ok: false, error: 'NO_TAB' });
            await ensureWPP(tab.id);

            // ðŸšâ‚¬ MASTER SWITCH: Se o arquivo remoto (inject.js) nÃƒ£o carregar do servidor, 
            // a ferramenta bloqueia todas as aÃƒ§Ãƒµes como medida de seguranÃƒ§a.
            const exec = async (fn, args) => {
                if (!_0x4e2) return { ok: false, error: 'ERR_RELAY_TIMEOUT' };
                try {
                    const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func: fn, args: args || [] });
                    return r?.result;
                } catch (e) { return { ok: false, error: e.message }; }
            };

            switch (msg.action) {
                case 'getGroups': sendResponse(await exec(_WA.getGroups)); break;
                case 'sendMessage': sendResponse(await exec(_WA.sendText, [msg.groupId, msg.text, msg.mentionAll])); break;
                case 'sendMedia': sendResponse(await exec(_WA.sendFile, [msg.groupId, msg.fileBase64, msg.mimeType, msg.filename, msg.caption, msg.mentionAll])); break;
                case 'updateGroupProfile': sendResponse(await exec(_WA.updateProfile, [msg.groupId, msg.subject, msg.description, msg.iconBase64])); break;
                case 'getInviteCode': sendResponse(await exec(_WA.getInviteCode, [msg.groupId])); break;
                case 'joinGroup': sendResponse(await exec(_WA.joinGroup, [msg.code])); break;
                case 'getParticipants': sendResponse(await exec(_WA.getParticipants, [msg.groupId])); break;
                case 'sendStatus':
                    let mediasArray = msg.medias;
                    if (!mediasArray) {
                        const storage = await chrome.storage.local.get('tempStatusMedia');
                        mediasArray = storage.tempStatusMedia || [];
                        chrome.storage.local.remove('tempStatusMedia');
                    }
                    sendResponse(await exec(_WA.sendStatus, [mediasArray, msg.caption, msg.mentions])); 
                    break;
                case 'sendPoll': sendResponse(await exec(_WA.sendPoll, [msg.groupId, msg.name, msg.options, msg.selectableOptionsCount])); break;
                case 'createGroup': sendResponse(await exec(_WA.createGroup, [msg.name, msg.participant, msg.iconBase64])); break;
                case 'setGroupProperty': sendResponse(await exec(_WA.setGroupProperty, [msg.groupId, msg.property, msg.value])); break;
                case 'leaveGroup': sendResponse(await exec(_WA.leaveGroup, [msg.groupId])); break;
                case 'promoteParticipant': sendResponse(await exec(_WA.promoteParticipant, [msg.groupId, msg.participant])); break;
                case 'demoteParticipant': sendResponse(await exec(_WA.demoteParticipant, [msg.groupId, msg.participant])); break;
                case 'removeParticipant': sendResponse(await exec(_WA.removeParticipant, [msg.groupId, msg.participant])); break;
                case 'clearChat': sendResponse(await exec(_WA.clearChat, [msg.groupId])); break;
                
                case 'searchWebGroups':
                    (async () => {
                        try {
                            const cleanKeyword = msg.keyword.replace(/[,;]/g, ' ').replace(/"/g, '').trim();
                            const queries = [
                                'site:chat.whatsapp.com/invite ' + cleanKeyword,
                                '"chat.whatsapp.com/invite" ' + cleanKeyword,
                                '"chat.whatsapp.com" ' + cleanKeyword + ' grupo'
                            ];
                            const sleep = ms => new Promise(r => setTimeout(r, ms));
                            let allLinks = [];
                            let responded = false;

                            const tab = await new Promise(resolve =>
                                chrome.tabs.create({ url: 'about:blank', active: false }, resolve)
                            );

                            const globalTimer = setTimeout(() => {
                                if (responded) return;
                                responded = true;
                                chrome.tabs.remove(tab.id).catch(() => {});
                                const unique = [...new Set(allLinks)];
                                sendResponse(unique.length > 0
                                    ? { ok: true, links: unique }
                                    : { ok: false, error: 'Timeout. Tente novamente.' });
                            }, 75000);

                            const waitForLoad = (tabId, ms = 10000) => new Promise(resolve => {
                                let done = false;
                                const finish = () => { if (!done) { done = true; chrome.tabs.onUpdated.removeListener(fn); resolve(); } };
                                const fn = (id, info) => { if (id === tabId && info.status === 'complete') finish(); };
                                chrome.tabs.onUpdated.addListener(fn);
                                setTimeout(finish, ms);
                            });

                            const extractLinks = async (tabId) => {
                                try {
                                    const [res] = await chrome.scripting.executeScript({
                                        target: { tabId },
                                        func: () => {
                                            const html = document.documentElement.innerHTML;
                                            const regex = /chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9]{15,})/gi;
                                            const found = new Set();
                                            let m;
                                            while ((m = regex.exec(html)) !== null) {
                                                found.add('https://chat.whatsapp.com/' + m[1]);
                                            }
                                            return [...found];
                                        }
                                    });
                                    return res?.result || [];
                                } catch (e) { return []; }
                            };

                            for (const query of queries) {
                                if (responded) break;
                                for (let page = 0; page < 5; page++) {
                                    if (responded) break;
                                    const url = 'https://www.google.com/search?q=' + encodeURIComponent(query) + '&start=' + (page * 10) + '&hl=pt-BR';
                                    await chrome.tabs.update(tab.id, { url });
                                    await waitForLoad(tab.id, 10000);
                                    await sleep(1800);
                                    const links = await extractLinks(tab.id);
                                    if (links.length > 0) allLinks.push(...links);
                                    if (links.length === 0 && page > 0) break;
                                    await sleep(1200);
                                }
                                await sleep(800);
                            }

                            try {
                                await chrome.tabs.update(tab.id, { url: 'https://www.bing.com/search?q=' + encodeURIComponent('site:chat.whatsapp.com/invite ' + cleanKeyword) + '&count=50' });
                                await waitForLoad(tab.id, 10000);
                                await sleep(1800);
                                const bl = await extractLinks(tab.id);
                                if (bl.length > 0) allLinks.push(...bl);
                            } catch(e) {}

                            if (responded) return;
                            responded = true;
                            clearTimeout(globalTimer);
                            chrome.tabs.remove(tab.id).catch(() => {});
                            const uniqueLinks = [...new Set(allLinks)];
                            sendResponse(uniqueLinks.length > 0
                                ? { ok: true, links: uniqueLinks }
                                : { ok: false, error: 'Nenhum grupo encontrado. Tente outra palavra-chave ou aguarde alguns minutos.' });
                        } catch (e) {
                            sendResponse({ ok: false, error: e.message });
                        }
                    })();
                    return true;

                                                case 'verifyLinks':
                    const results = [];
                    for (const link of msg.links) {
                        try {
                            const code = link.split('whatsapp.com/')[1]?.replace('invite/', '');
                            if (!code) {
                                results.push({ link, ok: false, error: 'Invalid format' });
                                continue;
                            }
                            const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func: _WA.getGroupInfoFromInviteCode, args: [code] });
                            if (r?.result?.ok) {
                                results.push({ link, ok: true, info: r.result.info });
                            } else {
                                results.push({ link, ok: false, error: r?.result?.error || 'Unknown error' });
                            }
                        } catch (e) {
                            results.push({ link, ok: false, error: e.message });
                        }
                    }
                    sendResponse({ ok: true, results });
                    break;

                case 'openChat':
                    // Abre a conversa diretamente no WhatsApp Web já aberto
                    await exec(async (jid) => {
                        try {
                            // Tenta abrir pelo WPP
                            if (window.WPP?.chat?.openChatBottom) {
                                await window.WPP.chat.openChatBottom(jid);
                            } else if (window.WPP?.chat?.open) {
                                await window.WPP.chat.open(jid);
                            } else {
                                // Fallback: navega via URL interna do WA Web
                                window.location.hash = '';
                                window.location.href = `https://web.whatsapp.com/send?phone=${jid.replace('@c.us', '')}`;
                            }
                        } catch (e) {
                            console.warn('[GroupSender] openChat fallback:', e);
                            window.location.href = `https://web.whatsapp.com/send?phone=${jid.replace('@c.us', '')}`;
                        }
                    }, [msg.jid]);
                    // Traz a aba do WhatsApp para o foco
                    if (tab) chrome.tabs.update(tab.id, { active: true });
                    sendResponse({ ok: true });
                    break;

                case 'checkNumberExists':
                    sendResponse(await exec(async (jid) => {
                        try {
                            const result = await window.WPP.contact.queryExists(jid);
                            if (!result || !result.wid) return { exists: false };
                            // Tenta pegar nome e info adicional
                            let name = null;
                            let isBusiness = false;
                            try {
                                const contact = window.WPP?.whatsapp?.ContactStore?.get(result.wid._serialized || jid);
                                name = contact?.pushname || contact?.name || contact?.formattedName || null;
                                isBusiness = !!(contact?.isBusiness || contact?.businessProfile);
                            } catch (_) {}
                            return { exists: true, name, isBusiness };
                        } catch (e) {
                            return { exists: false, error: e.message };
                        }
                    }, [msg.jid]));
                    break;
                case 'taskStart': startTaskEngine(msg.payload).then(sendResponse); break;
                case 'taskPause':
                    taskState.paused = msg.paused;
                    broadcastProgress();
                    sendResponse({ ok: true });
                    break;
                case 'taskStop':
                    taskState.cancelled = true;
                    taskState.running = false;
                    taskState.textStatus = 'Interrompido';
                    chrome.alarms.clearAll();
                    await broadcastProgress();
                    sendResponse({ ok: true });
                    break;
                case 'taskGetState': sendResponse({ state: taskState }); break;
                case 'getAutoSettings':
                    const { autoSettings, cfg } = await chrome.storage.local.get(['autoSettings', 'cfg']);
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        world: 'MAIN',
                        func: (s) => {
                            const sig = window.__GCRM_SHIELD__?.id || 'GCRM_SEC_DEFAULT';
                            window.postMessage({ type: 'GCRM_UPDATE_AUTO_SETTINGS', settings: { ...s, sig } }, '*');
                        },
                        args: [{
                            ...(autoSettings || {}),
                            signature: cfg?.signature || ''
                        }]
                    });
                    sendResponse({ ok: true });
                    break;
                default: sendResponse({ error: 'UNKNOWN_ACTION' });
            }
        };
        handle();
        return true;
    });

    // --- ENGINE ---
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // Estado persistente
    let taskState = { running: false, progress: 0, total: 0, textStatus: '', errors: [], cycleIndex: 0, nextRunAt: null };

    const broadcastProgress = async () => {
        try {
            await chrome.storage.local.set({ GCRM_TASK_STATE: taskState });
            // Cria um clone reduzido para nÃƒ£o travar o sendMessage com arrays gigantes (items)
            const shallowState = { ...taskState };
            delete shallowState.data; 
            
            chrome.runtime.sendMessage({ action: 'taskProgress', state: shallowState }).catch(() => { });
        } catch (e) {
            log('Error in broadcastProgress:', e);
        }
    };

    // InicializaÃƒ§Ãƒ£o do Engine (Recupera estado ao reiniciar service worker)
    const initEngine = async () => {
        const res = await chrome.storage.local.get('GCRM_TASK_STATE');
        if (res.GCRM_TASK_STATE && res.GCRM_TASK_STATE.running) {
            taskState = res.GCRM_TASK_STATE;
            log('Estado recuperado:', taskState.textStatus);
            
            if (taskState.cancelled) {
                taskState.running = false;
                return;
            }

            // Se estiver em modo de espera (countdown), retoma o loop de status
            if (taskState.nextRunAt && Date.now() < taskState.nextRunAt) {
                startCountdown();
            } 
            // Se nÃƒ£o estiver pausado nem aguardando, retoma a execuÃƒ§Ãƒ£o
            else if (!taskState.paused) {
                startTaskEngine(taskState.data, true); 
            }
        }
    };
    initEngine();

    async function startCountdown() {
        if (!taskState.nextRunAt) return;
        
        log('Iniciando loop de contagem regressiva');
        while (taskState.running && !taskState.cancelled && taskState.nextRunAt) {
            const now = Date.now();
            if (now >= taskState.nextRunAt) break;

            const diffMs = taskState.nextRunAt - now;
            const diffMin = Math.ceil(diffMs / 60000);
            
            if (taskState.type === 'status') {
                taskState.textStatus = `Aguardando: ${diffMin} min... (Próximo Status)`;
            } else {
                const tArr = taskState.data.templates || [];
                const nextT = tArr.length > 0 ? tArr[taskState.cycleIndex % tArr.length] : null;
                taskState.textStatus = `Aguardando: ${diffMin} min... (${nextT ? 'Modelo ' + ((taskState.cycleIndex % tArr.length) + 1) : 'Novo Ciclo'})`;
            }
            
            await broadcastProgress();
            
            // MantÃƒ©m o worker vivo e atualiza a cada 30 segundos
            if (diffMs > 30000) {
                chrome.runtime.getPlatformInfo(() => {});
                await sleep(30000);
            } else {
                await sleep(5000);
            }
        }
    }

    // Listener de Alarme para Ciclos Longos
    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'GCRM_REPEAT_CAMPAIGN') {
            log('Alarme disparado: Iniciando novo ciclo de campanha');
            if (taskState.running && !taskState.cancelled) {
                startTaskEngine(taskState.data, true);
            }
        }
        if (alarm.name === 'GCRM_REPEAT_STATUS') {
            log('Alarme disparado: Iniciando novo ciclo de status');
            if (taskState.running && !taskState.cancelled) {
                startTaskEngine(taskState.data, true);
            }
        }
    });

    async function startTaskEngine(payload, isResuming = false) {
        if (!_0x4e2) {
            taskState.textStatus = 'Erro: Licença ou WhatsApp não autorizado';
            taskState.running = false;
            await broadcastProgress();
            return { error: 'ERR_INIT_FAILED' };
        }
        if (taskState.running && !isResuming) return { error: 'ALREADY_RUNNING' };

        if (!isResuming) {
            let items = payload.items || [];
            
            // Fallback para reconstruÃƒ§Ãƒ£o se necessÃƒ¡rio
            if ((!items || items.length === 0) && payload.itemIds) {
                const storage = await chrome.storage.local.get('allGroups');
                const all = storage.allGroups || [];
                items = payload.itemIds.map(id => all.find(g => g.id === id)).filter(Boolean);
            }

            taskState = {
                type: payload.type,
                running: true,
                paused: false,
                cancelled: false,
                progress: 0,
                cycleIndex: payload.cycleIndex || 0,
                total: items.length || 0,
                textStatus: 'Iniciando...',
                errors: [],
                data: { ...payload, items }
            };
        } else {
            taskState.running = true;
        }

        await broadcastProgress();

        (async () => {
            try {
                if (payload.type === 'campaign') await runCampaignEngine();
                else if (payload.type === 'poll') await runPollEngine();
                else if (payload.type === 'extract') await runExtractEngine();
                else if (payload.type === 'join') await runJoinEngine();
                else if (payload.type === 'addMembers') await runAddMembersEngine();
                else if (payload.type === 'status') await runStatusEngine();
            } catch (e) {
                taskState.textStatus = 'Error: ' + e.message;
                taskState.running = false;
            } finally {
                await broadcastProgress();
            }
        })();
        return { ok: true };
    }


    async function runStatusEngine() {
        const { isRepeat, repeatInterval, caption, mentionedList } = taskState.data;

        // â”€â”€ 1. Carrega as mídias (com retry para evitar race condition com popup) â”€â”€
        let mediasArray = taskState.data.medias;
        if (!mediasArray || mediasArray.length === 0) {
            for (let attempt = 0; attempt < 5; attempt++) {
                await sleep(300);
                const st = await chrome.storage.local.get('tempStatusMedia');
                mediasArray = st.tempStatusMedia || [];
                if (mediasArray.length > 0) break;
            }
            taskState.data.medias = mediasArray;
            if (!isRepeat) chrome.storage.local.remove('tempStatusMedia');
        }

        if (!mediasArray || mediasArray.length === 0) {
            taskState.textStatus = 'Erro: Nenhuma midia encontrada. Selecione uma imagem ou video.';
            taskState.running = false;
            await broadcastProgress();
            return;
        }

        // Lista de JIDs para mencionar â€” converte @lid para @c.us dentro do executeScript
        const mentions = Array.isArray(mentionedList) ? mentionedList : [];

        taskState.total = mediasArray.length;
        taskState.progress = 0;
        await broadcastProgress();

        // â”€â”€ 2. Loop de envio â”€â”€
        for (let i = taskState.progress; i < mediasArray.length; i++) {
            if (!_0x4e2 || taskState.cancelled) break;
            while (taskState.paused && !taskState.cancelled) await sleep(1000);
            if (!_0x4e2 || taskState.cancelled) break;

            const media = mediasArray[i];
            // Legenda só na primeira mídia
            const cap = (i === 0) ? (caption || '') : '';

            taskState.progress = i;
            taskState.textStatus = mentions.length > 0
                ? `Enviando ${i + 1}/${mediasArray.length} (mencionando ${mentions.length} pessoas)...`
                : `Enviando ${i + 1}/${mediasArray.length}...`;
            await broadcastProgress();

            // â”€â”€ 3. Garante que o WhatsApp Web está aberto â”€â”€
            const tab = await getWA();
            if (!tab) {
                taskState.errors.push(`Midia ${i + 1}: WhatsApp Web nao encontrado`);
                taskState.textStatus = 'Erro: Abra o WhatsApp Web e tente novamente.';
                taskState.running = false;
                await broadcastProgress();
                return;
            }

            await ensureWPP(tab.id);

            // Injeta os JIDs no window ANTES do envio (único jeito confiável no mundo MAIN)
            if (mentions.length > 0) {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    world: 'MAIN',
                    func: (jids) => { window.__GCRM_JIDS__ = jids; },
                    args: [mentions]
                }).catch(() => {});
            } else {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    world: 'MAIN',
                    func: () => { window.__GCRM_JIDS__ = []; }
                }).catch(() => {});
            }

            // â”€â”€ 4. Envia o status via WPP.js â”€â”€
            const [r] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                world: 'MAIN',
                func: async (b64Data, mimeType, capText) => {
                    try {
                        if (!window.WPP || !window.WPP.isReady) {
                            throw new Error('WhatsApp Web nao esta pronto. Aguarde carregar completamente.');
                        }
                        if (!window.WPP.status || typeof window.WPP.status.sendImageStatus !== 'function') {
                            throw new Error('API de status nao disponivel nesta versao do WPP.js.');
                        }
                        if (!b64Data || typeof b64Data !== 'string' || !b64Data.includes(';base64,')) {
                            throw new Error('Dados de midia invalidos. Selecione o arquivo novamente.');
                        }

                        const mimeMatch = b64Data.match(/^data:(.*?);base64,/);
                        const realMime = (mimeMatch && mimeMatch[1]) ? mimeMatch[1] : mimeType;

                        if (!realMime.startsWith('image/') && !realMime.startsWith('video/')) {
                            throw new Error('Tipo de midia invalido: "' + realMime + '". Use apenas imagem ou video.');
                        }

                        // Pega os JIDs do window (injetados pelo script anterior)
                        const mentionJids = window.__GCRM_JIDS__ || [];
                        delete window.__GCRM_JIDS__;

                        console.log('[GCRM Status] JIDs disponíveis:', mentionJids.length, mentionJids.slice(0, 3));

                        let finalCaption = capText || '';
                        const opts = { caption: finalCaption };

                        if (mentionJids.length > 0) {
                            // Resolve @lid â†’ @c.us onde possível; @c.us e @s.whatsapp.net já são válidos
                            const resolvedJids = [];
                            for (const jid of mentionJids) {
                                if (jid.endsWith('@c.us') || jid.endsWith('@s.whatsapp.net')) {
                                    resolvedJids.push(jid);
                                } else if (jid.endsWith('@lid')) {
                                    try {
                                        const res = await window.WPP.contact.queryExists(jid);
                                        resolvedJids.push(res?.wid?._serialized || jid);
                                    } catch(e) {
                                        resolvedJids.push(jid);
                                    }
                                } else {
                                    resolvedJids.push(jid);
                                }
                            }

                            opts.mentionedList = resolvedJids;
                            opts.mentions = resolvedJids;
                            const atText = resolvedJids.map(j => '@' + j.split('@')[0]).join(' ');
                            // Reduzido para não estourar o limite de 1024 caracteres do Status
                            opts.caption = (finalCaption ? finalCaption : '') + "\n\n" + "\u200B".repeat(50) + atText;

                            console.log('[GCRM Status] Mencionando:', resolvedJids.length, 'exemplos:', resolvedJids.slice(0,3));
                        }

                        console.log('[GCRM Status] opts.caption:', opts.caption ? opts.caption.substring(0, 100) : '(vazio)');

                        const timeout = new Promise(resolve =>
                            setTimeout(() => resolve({ _timedOut: true }), 15000)
                        );

                        if (realMime.startsWith('video/')) {
                            await Promise.race([window.WPP.status.sendVideoStatus(b64Data, opts), timeout]);
                        } else {
                            await Promise.race([window.WPP.status.sendImageStatus(b64Data, opts), timeout]);
                        }

                        console.log('[GCRM Status] Enviado com sucesso!');
                        return { ok: true };
                    } catch (e) {
                        console.error('[GCRM Status] Erro:', e);
                        return { ok: false, error: e.message || String(e) };
                    }
                },
                args: [media.data, media.type, cap]
            }).catch(e => [{ result: { ok: false, error: 'executeScript falhou: ' + e.message } }]);

            const result = r?.result;

            if (!result?.ok) {
                const errMsg = result?.error || 'Erro desconhecido';
                taskState.errors.push(`Midia ${i + 1}: ${errMsg}`);
                taskState.textStatus = 'Erro midia ' + (i + 1) + ': ' + errMsg;
                await broadcastProgress();
            } else {
                taskState.textStatus = 'Midia ' + (i + 1) + '/' + mediasArray.length + ' enviada!';
                await broadcastProgress();
            }

            taskState.progress = i + 1;

            // Delay entre mídias (10-14 segundos)
            if (i < mediasArray.length - 1 && !taskState.cancelled) {
                const delay = Math.floor(Math.random() * 5) + 10;
                for (let s = delay; s > 0; s--) {
                    if (taskState.cancelled) break;
                    taskState.textStatus = `Próximo envio em ${s}s...`;
                    await broadcastProgress();
                    await sleep(1000);
                }
            }
        }

        // â”€â”€ 5. Finalização â”€â”€
        if (!taskState.cancelled) {
            if (isRepeat) {
                taskState.progress = 0;
                taskState.cycleIndex++;
                const intervalMin = parseInt(repeatInterval) || 10;
                taskState.nextRunAt = Date.now() + (intervalMin * 60000);
                chrome.alarms.create('GCRM_REPEAT_STATUS', { delayInMinutes: intervalMin });
                await startCountdown();
            } else {
                taskState.progress = mediasArray.length;
                const errCount = taskState.errors.length;

                // â”€â”€ 6. Avisa nos grupos (se ativado) â”€â”€
                const notifyGroups = Array.isArray(taskState.data.notifyGroups) ? taskState.data.notifyGroups : [];
                const notifyMsg = taskState.data.notifyMsg || 'Acabei de postar um novo status! Vai lá conferir 👆';

                if (notifyGroups.length > 0 && errCount < mediasArray.length) {
                    taskState.textStatus = `Avisando nos grupos (0/${notifyGroups.length})...`;
                    await broadcastProgress();

                    const tab = await getWA();
                    if (tab) {
                        await ensureWPP(tab.id);
                        for (let g = 0; g < notifyGroups.length; g++) {
                            if (taskState.cancelled) break;
                            const group = notifyGroups[g];
                            taskState.textStatus = `Avisando grupo ${g + 1}/${notifyGroups.length}: ${group.name}...`;
                            await broadcastProgress();

                            await chrome.scripting.executeScript({
                                target: { tabId: tab.id },
                                world: 'MAIN',
                                func: async (groupId, msg) => {
                                    try {
                                        // Busca todos os participantes para mencionar
                                        const participants = await window.WPP.group.getParticipants(groupId);
                                        const mentionList = participants.map(p => p.id._serialized || p.id);

                                        let finalMsg = msg;
                                        // Adiciona os @menções invisíveis (mesmo padrão do @everyone da campanha)
                                        finalMsg += '\n' + '\u200B'.repeat(4000) + mentionList.map(m => '@' + m.split('@')[0]).join(' ');

                                        await window.WPP.chat.sendTextMessage(groupId, finalMsg, {
                                            createChat: true,
                                            mentions: mentionList
                                        });
                                    } catch(e) {
                                        console.error('[GCRM Status Notify] Erro no grupo:', groupId, e);
                                    }
                                },
                                args: [group.id, notifyMsg]
                            }).catch(() => {});

                            // Delay entre grupos para evitar ban
                            if (g < notifyGroups.length - 1 && !taskState.cancelled) {
                                await sleep(3000);
                            }
                        }
                    }
                }

                if (errCount > 0 && errCount === mediasArray.length) {
                    taskState.textStatus = 'Erro: ' + taskState.errors[0];
                } else if (errCount > 0) {
                    taskState.textStatus = 'Finalizado com ' + errCount + ' erro(s)';
                } else {
                    taskState.textStatus = 'Finalizado';
                }
                taskState.running = false;
                await broadcastProgress();
            }
        }
    }

    async function runCampaignEngine() {
        const { items, isTemplateCycle, cfg, mentionAll, repeatCampaign, repeatInterval } = taskState.data;
        const storage = await chrome.storage.local.get(['variations', 'templates']);
        const variations = storage.variations || [], templates = storage.templates || [];
        let variationsQueue = [];

        for (let i = taskState.progress; i < items.length; i++) {
            if (!_0x4e2 || taskState.cancelled) break;
            while (taskState.paused && !taskState.cancelled) await sleep(1000);
            if (!_0x4e2 || taskState.cancelled) break;

            const g = items[i];
            let vText = '', vMedia = null;

            if (isTemplateCycle && templates.length) {
                const t = templates[taskState.cycleIndex % templates.length];
                vText = t.text || ''; vMedia = Array.isArray(t.media) ? t.media : (t.media ? [t.media] : []);
            } else {
                if (!variationsQueue.length) {
                    variationsQueue = [...variations].filter(v => {
                        const textHasContent = (v.text || '').trim().length > 0;
                        const mediaArray = Array.isArray(v.media) ? v.media : (v.media ? [v.media] : []);
                        return textHasContent || mediaArray.length > 0;
                    }).sort(() => Math.random() - 0.5);
                }
                const v = variationsQueue.shift();
                if (v) { 
                    vText = v.text || ''; 
                    vMedia = Array.isArray(v.media) ? v.media : (v.media ? [v.media] : []); 
                }
            }

            taskState.progress = i;
            taskState.textStatus = `Enviando ${i + 1}/${items.length} para ${g.name}...`;
            await broadcastProgress();

            const finalMsg = (vText || '').replace(/{nome_grupo}/g, g.name).replace(/{data}/g, new Date().toLocaleDateString());
            const sig = cfg?.signature ? `\n\n${cfg.signature}` : '';
            const fullText = finalMsg + sig;

            const tab = await getWA();
            if (tab) {
                await ensureWPP(tab.id);
                
                if (vMedia && vMedia.length > 0) {
                    for (let mIdx = 0; mIdx < vMedia.length; mIdx++) {
                        const media = vMedia[mIdx];
                        // Anexa o texto como legenda apenas na primeira mÃƒ­dia
                        const mediaCaption = (mIdx === 0) ? fullText : '';
                        const func = _WA.sendFile;
                        const args = [g.id, media.data, media.type, media.name, mediaCaption, mentionAll];
                        const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func, args });
                        if (!r?.result?.ok) taskState.errors.push(`${g.name} (mÃƒ­dia ${mIdx+1}): ${r?.result?.error || 'Erro'}`);
                        await sleep(2000); // pequeno delay entre mÃƒºltiplas mÃƒ­dias
                    }
                    
                    // Caso tenha apenas texto mas o if verificou media > 0, isso nÃƒ£o acontece.
                    // Se houvesse um caso onde vMedia tem arquivos mas fullText foi enviado separado,
                    // seria tratado diferentemente, mas aqui enviamos com a primeira legenda.
                } else {
                    const func = _WA.sendText;
                    const args = [g.id, fullText, mentionAll];
                    const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func, args });
                    if (!r?.result?.ok) taskState.errors.push(`${g.name}: ${r?.result?.error || 'Erro'}`);
                }
            }

            // Incrementa o progresso APÃƒâ€œS o envio para evitar duplicatas em caso de restart
            taskState.progress = i + 1;

            // Delay entre mensagens (Keep-Alive + Contador)
            if (i < items.length - 1) {
                const delay = Math.floor(Math.random() * ((cfg.delayMax || 45) - (cfg.delayMin || 15))) + (cfg.delayMin || 15);
                for (let s = delay; s > 0; s--) {
                    if (taskState.cancelled) break;

                    taskState.textStatus = `Próximo envio em ${s}s...`;
                    await broadcastProgress();

                    // Truque para manter o Service Worker ativo em intervalos curtos
                    if (s % 10 === 0) chrome.runtime.getPlatformInfo(() => { });
                    await sleep(1000);
                }
            }
        }

        if (!taskState.cancelled) {
            if (repeatCampaign) {
                taskState.progress = 0;
                taskState.cycleIndex++;
                
                const intervalMin = parseInt(repeatInterval) || 60;
                taskState.nextRunAt = Date.now() + (intervalMin * 60000);
                
                chrome.alarms.create('GCRM_REPEAT_CAMPAIGN', { delayInMinutes: intervalMin });
                
                // Inicia loop de contagem regressiva visual
                await startCountdown();
            } else {
                taskState.progress = items.length;
                taskState.textStatus = 'Finalizado';
                taskState.running = false;
                await broadcastProgress();
            }
        }
    }

    async function runPollEngine() {
        const { items, question, options, multiSelect, cfg } = taskState.data;
        for (let i = taskState.progress; i < items.length; i++) {
            if (!_0x4e2 || taskState.cancelled) break;
            const g = items[i];
            taskState.progress = i; taskState.textStatus = `Enviando enquete para ${g.name}...`; await broadcastProgress();
            const tab = await getWA();
            if (tab) {
                await ensureWPP(tab.id);
                const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func: _WA.sendPoll, args: [g.id, question, options, multiSelect ? options.length : 1] });
                if (!r?.result?.ok) taskState.errors.push(`${g.name}: ${r?.result?.error || 'Erro'}`);
            }
            if (i < items.length - 1) await sleep((Math.floor(Math.random() * ((cfg.delayMax || 45) - (cfg.delayMin || 15))) + (cfg.delayMin || 15)) * 1000);
        }
        taskState.progress = items.length;
        taskState.textStatus = 'Finalizado'; taskState.running = false; await broadcastProgress();
    }

    async function runExtractEngine() {
        const { items, filter } = taskState.data;
        const leadsSet = new Set(taskState.extracted || []);
        for (let i = taskState.progress; i < items.length; i++) {
            if (!_0x4e2 || taskState.cancelled) break;
            const g = items[i];
            taskState.progress = i; taskState.textStatus = `Extraindo ${i + 1}/${items.length}...`; await broadcastProgress();
            const tab = await getWA();
            if (tab) {
                await ensureWPP(tab.id);
                const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func: _WA_extractParticipants, args: [g.id] });
                // Retorna { ok, numbers: [...] } com números já resolvidos (incluindo @lid)
                const numbers = r?.result?.numbers || [];
                numbers.forEach(num => {
                    if (num) leadsSet.add(num);
                });
            }
            taskState.extracted = Array.from(leadsSet); await broadcastProgress(); await sleep(500);
        }
        taskState.progress = items.length;
        taskState.textStatus = 'Finalizado';
        taskState.running = false;
        await broadcastProgress();
    }

    async function runJoinEngine() {
        const { items, cfg } = taskState.data;
        for (let i = taskState.progress; i < items.length; i++) {
            if (!_0x4e2 || taskState.cancelled) break;
            taskState.progress = i; taskState.textStatus = `Entrando no grupo ${i + 1}/${items.length}...`; await broadcastProgress();
            const code = items[i].split('whatsapp.com/')[1]?.replace('invite/', '') || items[i];
            const tab = await getWA();
            if (tab) {
                await ensureWPP(tab.id);
                const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func: _WA.joinGroup, args: [code] });
                if (!r?.result?.ok) taskState.errors.push(`${items[i]}: ${r?.result?.error || 'Erro'}`);
            }
            if (i < items.length - 1) await sleep((Math.floor(Math.random() * ((cfg.delayMax || 45) - (cfg.delayMin || 15))) + (cfg.delayMin || 15)) * 1000);
        }
        taskState.progress = items.length;
        taskState.textStatus = 'Finalizado'; taskState.running = false; await broadcastProgress();
    }

    async function runAddMembersEngine() {
        const { items, numbers, batchSize, intervalMin } = taskState.data;
        // The total is the number of batches to process
        const totalBatches = Math.ceil(numbers.length / batchSize);
        taskState.total = totalBatches;
        await broadcastProgress();

        for (let b = taskState.progress; b < totalBatches; b++) {
            if (!_0x4e2 || taskState.cancelled) break;
            
            const startIdx = b * batchSize;
            const endIdx = startIdx + batchSize;
            const batchNumbers = numbers.slice(startIdx, endIdx);
            
            taskState.progress = b;
            taskState.textStatus = `Adicionando lote ${b + 1}/${totalBatches} (${batchNumbers.length} nÃƒºmeros)...`;
            await broadcastProgress();

            const tab = await getWA();
            if (tab) {
                await ensureWPP(tab.id);
                // Adiciona este lote em TODOS os grupos selecionados
                for (let g = 0; g < items.length; g++) {
                    if (taskState.cancelled) break;
                    const group = items[g];
                    // Formata o array de participantes para JID
                    const formattedNumbers = batchNumbers.map(n => n.includes('@c.us') ? n : `${n}@c.us`);
                    const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func: _WA.addParticipants, args: [group.id, formattedNumbers] });
                    if (!r?.result?.ok) {
                        taskState.errors.push(`Erro no grupo ${group.name}: ${r?.result?.error || 'Erro'}`);
                    }
                    await sleep(2000);
                }
            }
            
            taskState.progress = b + 1;
            await broadcastProgress();

            if (b < totalBatches - 1) {
                // Aguarda o intervalo antes do prÃƒ³ximo lote
                const waitSecs = intervalMin * 60;
                for (let s = waitSecs; s > 0; s--) {
                    if (taskState.cancelled) break;
                    const min = Math.floor(s / 60);
                    const sec = s % 60;
                    taskState.textStatus = `PrÃƒ³ximo lote em ${min}m ${sec}s...`;
                    await broadcastProgress();
                    
                    if (s % 10 === 0) chrome.runtime.getPlatformInfo(() => { });
                    await sleep(1000);
                }
            }
        }

        if (!taskState.cancelled) {
            taskState.textStatus = 'Finalizado';
            taskState.running = false;
            await broadcastProgress();
        }
    }

})();

