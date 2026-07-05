// popup.js — Group Sender CRM v3.0 UI Controller
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Auxiliares de segurança para evitar que a UI trave se um elemento não existir
const safeClick = (id, fn) => { const el = $(id); if (el) el.onclick = fn; else console.warn(`Element #${id} not found for click`); };
const safeInput = (id, fn) => { const el = $(id); if (el) el.oninput = fn; else console.warn(`Element #${id} not found for input`); };
const safeChange = (id, fn) => { const el = $(id); if (el) el.onchange = fn; else console.warn(`Element #${id} not found for change`); };

// ── STATE ────────────────────────────────────────────────────────────────────
let allGroups = [], selected = new Set();
let running = false, paused = false, cancelled = false;
let cfg = { delayMin: 15, delayMax: 45, dailyLimit: 50, mentionLimit: 20, signature: '', darkMode: true, themeColor: '#25d366' };
let sentToday = 0;
let mediaFile = null;
let massIconFile = null;
let variations = [{ text: '', media: [] }];
let activeV = 0;
let templates = [];
let useTemplatesCycle = false;
let autoSettings = {
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
  modAntiLink: false,
  modAntiLinkAction: 'delete',
  modAntiFlood: false,
  modFloodMaxMsgs: 5,
  modFloodSeconds: 10,
  modAntiFloodAction: 'delete',
  modAntiProfanity: false,
  modProfanityWords: '',
  modAntiProfanityAction: 'delete',
  modWarnMsg: '⚠️ @membro, este comportamento não é permitido neste grupo.',
  modCmdAllowAdmins: false,
  modCmdDeleteCmd: true,
  modCmdBan: 'ban',
  modCmdPromote: 'adm',
  modCmdDemote: 'deadm',
  modCmdInfo: 'infog',
  modCmdTagAll: 'tagall',
  modAntiAudio: false,
  modAntiImage: false,
  modAntiVideo: false,
  modAntiDocument: false,
  modAntiSticker: false,
  modAction: 'delete',
  autoReplyEnabled: false,
  autoReplyScope: 'private',
  autoReplyDelay: 2,
  autoReplyRules: [] // [{keyword, message, oncePerContact}]
};
let autoSelectedGroups = new Set();
let saveTimeout = null;



// ── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Check Hardware/Software Integrity (Dead Man's Switch)
  // if (typeof window.__GCRM_SHIELD__ === 'undefined' || !window.__GCRM_SHIELD__.id.startsWith('GCRM_SEC_')) {
  //   document.body.innerHTML = `
  //         <div style="background:#0f172a; color:white; height:100vh; display:flex; align-items:center; justify-content:center; flex-direction:column; padding:20px; text-align:center; font-family:sans-serif;">
  //             <h1 style="color:#ef4444; margin-bottom:10px;">🛑 ERRO DE INTEGRIDADE</h1>
  //             <p style="color:#94a3b8; font-size:14px; line-height:1.6;">O sistema detectou que arquivos de segurança essenciais foram removidos ou corrompidos.<br>A extensão foi desativada por segurança.</p>
  //         </div>
  //     `;
  //   return;
  // }

  // Check Security Layer
  chrome.runtime.sendMessage({ action: 'checkWA' }, (r) => {
    if (r?.error === 'INTEGRITY_FAILURE') {
      window.location.reload(); // Força recarregamento para mostrar o erro de integridade acima
      return;
    }
    if (!r || !r.isAuthorized) {
      // O license.js já cuida de injetar a UI se não autorizado, 
      // mas garantimos que a UI principal não seja interativa.
    }
  });

  try { loadState(); } catch (e) { console.error('Error loadState:', e); }

  chrome.runtime.sendMessage({ action: 'taskGetState' }, (r) => {
    try {
      if (r?.state?.running) {
        const s = r.state;
        chrome.runtime.sendMessage({ action: 'taskProgress', state: s });
      }
    } catch (e) { }
  });

  const setups = [
    { name: 'Tabs', fn: setupTabs },
    { name: 'Groups', fn: setupGroups },
    { name: 'GroupIcons', fn: setupGroupIcons },
    { name: 'Config', fn: setupConfig },
    { name: 'Media', fn: setupMedia },
    { name: 'Status', fn: setupStatus },
    { name: 'Poll', fn: setupPoll },
    { name: 'Extract', fn: setupExtract },
    { name: 'Join', fn: setupJoin },
    { name: 'Templates', fn: setupTemplates },
    { name: 'AddMembers', fn: setupAddMembers },
    { name: 'Verifier', fn: setupVerifier },
    { name: 'Campaign', fn: setupCampaign },
    { name: 'Mod', fn: setupMod },
    { name: 'Bot', fn: setupBot },
    { name: 'AutoReply', fn: setupAutoReply },
    { name: 'Appearance', fn: setupAppearance }
  ];

  setups.forEach(s => {
    try { s.fn(); } catch (e) { console.error(`Error in setup${s.name}:`, e); }
  });

  try {
    setInterval(checkConn, 5000);
    checkConn();
  } catch (e) { }
});


// ── CONNECTION ───────────────────────────────────────────────────────────────
async function checkConn() {
  try {
    chrome.runtime.sendMessage({ action: 'checkWA' }, (r) => {
      if (chrome.runtime.lastError) return; // Ignora se o background estiver reiniciando
      const badge = $('connBadge');
      if (r?.connected) {
        badge.className = 'status-badge online';
        $('connTxt').textContent = 'Conectado';
      } else {
        badge.className = 'status-badge offline';
        $('connTxt').textContent = 'Offline';
      }
    });
  } catch (e) { }
}

// ── TABS ─────────────────────────────────────────────────────────────────────
function setupTabs() {
  const btnPopOut = $('btnPopOut');
  if (btnPopOut) {
    chrome.windows.getCurrent((win) => {
      const isPopup = win.type === 'popup';
      if (isPopup) {
        btnPopOut.title = "Voltar para o Painel Lateral";
        btnPopOut.textContent = "⇲";
      }

      btnPopOut.onclick = async () => {
        if (isPopup) {
          try {
            const normalWin = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
            if (normalWin) {
              await chrome.sidePanel.open({ windowId: normalWin.id });
              window.close();
            }
          } catch (e) {
            console.error('Erro ao abrir painel:', e);
            alert("Não foi possível abrir o painel lateral automaticamente. Feche esta janela e clique no ícone da extensão no navegador.");
          }
        } else {
          chrome.windows.create({
            url: chrome.runtime.getURL("popup.html"),
            type: "popup",
            width: 480,
            height: 750,
            focused: true
          });
          window.close();
        }
      };
    });
  }

  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;

      document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));

      btn.classList.add("active");

      const panel = document.getElementById("p-" + tab);
      if (panel) {
        panel.classList.add("active");
      } else {
        console.error("Painel não encontrado:", "p-" + tab);
      }
    });
  });
}

// ── GROUPS ───────────────────────────────────────────────────────────────────
function setupGroups() {
  safeClick('btnRefreshGroups', refreshGroups);
  safeClick('btnDiagnose', refreshGroups);

  safeClick('btnSelectAll', () => {
    const boxes = document.querySelectorAll('.group-check');
    const allSet = Array.from(boxes).every(b => b.checked);
    boxes.forEach(b => {
      b.checked = !allSet;
      b.dispatchEvent(new Event('change'));
    });
  });

  safeClick('btnClearSelection', () => {
    const boxes = document.querySelectorAll('.group-check');
    boxes.forEach(b => {
      b.checked = false;
      b.dispatchEvent(new Event('change'));
    });
    selected.clear();
    updateSelectedCount();
    saveState();
  });

  safeInput('groupSearch', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('.group-item').forEach(item => {
      const name = item.querySelector('.group-name').textContent.toLowerCase();
      item.style.display = name.includes(q) ? 'flex' : 'none';
    });
  });

  safeClick('btnApplyMassAction', applyMassAction);

  safeClick('btnOpenGroups', () => applyAdminAction('open'));
  safeClick('btnCloseGroups', () => applyAdminAction('close'));
  safeClick('btnGetGroupLinks', () => applyAdminAction('links'));
  safeClick('btnClearChatGroups', () => {
    if (confirm('Tem certeza que deseja APAGAR o histórico de mensagens dos grupos selecionados? Isso afeta apenas o seu celular.')) {
      applyAdminAction('clear');
    }
  });
  safeClick('btnLeaveGroups', () => {
    if (confirm('Tem certeza que deseja SAIR dos grupos selecionados? Isso não pode ser desfeito.')) {
      applyAdminAction('leave');
    }
  });

  safeClick('btnPromote', () => applyParticipantAction('promote'));
  safeClick('btnDemote', () => applyParticipantAction('demote'));
  safeClick('btnBan', () => {
    if (confirm('Tem certeza que deseja BANIR este contato dos grupos selecionados?')) {
      applyParticipantAction('remove');
    }
  });

  async function applyAdminAction(actionType) {
    const groupsToEnv = allGroups.filter(g => selected.has(g.id));
    if (!groupsToEnv.length) return alert('Selecione os grupos na lista!');
    
    const statusDiv = $('adminActionStatus');
    if (statusDiv) {
      statusDiv.style.color = 'var(--primary)';
      statusDiv.textContent = `Iniciando...`;
    }
    
    let success = 0;
    let links = [];

    const btns = ['btnOpenGroups', 'btnCloseGroups', 'btnGetGroupLinks', 'btnLeaveGroups'];
    btns.forEach(b => { if ($(b)) $(b).disabled = true; });

    for (let i = 0; i < groupsToEnv.length; i++) {
      const g = groupsToEnv[i];
      if (statusDiv) statusDiv.textContent = `Processando ${i + 1}/${groupsToEnv.length}...`;
      
      let res;
      if (actionType === 'open') {
        res = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'setGroupProperty', groupId: g.id, property: 'announcement', value: false }, resolve));
      } else if (actionType === 'close') {
        res = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'setGroupProperty', groupId: g.id, property: 'announcement', value: true }, resolve));
      } else if (actionType === 'leave') {
        res = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'leaveGroup', groupId: g.id }, resolve));
      } else if (actionType === 'clear') {
        res = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'clearChat', groupId: g.id }, resolve));
      } else if (actionType === 'links') {
        res = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'getInviteCode', groupId: g.id }, resolve));
        if (res?.ok && res.code) links.push(`https://chat.whatsapp.com/${res.code}`);
      }

      if (res?.ok) success++;
      await sleep(800);
    }

    if (actionType === 'links' && links.length > 0) {
      const blob = new Blob([links.join('\\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'links_grupos.txt';
      a.click();
      URL.revokeObjectURL(url);
      if (statusDiv) statusDiv.textContent = `✅ Finalizado! ${success} links extraídos e baixados.`;
    } else if (actionType === 'links' && links.length === 0) {
      if (statusDiv) {
        statusDiv.textContent = `❌ Nenhum link extraído. Verifique se você é admin.`;
        statusDiv.style.color = 'var(--error)';
      }
    } else {
      if (statusDiv) statusDiv.textContent = `✅ Finalizado! Ação concluída em ${success} de ${groupsToEnv.length} grupos.`;
      if (actionType === 'leave') refreshGroups();
    }

    btns.forEach(b => { if ($(b)) $(b).disabled = false; });
  }

  async function applyParticipantAction(actionType) {
    const groupsToEnv = allGroups.filter(g => selected.has(g.id));
    if (!groupsToEnv.length) return alert('Selecione os grupos na lista!');
    
    let targetNum = $('targetParticipant').value.replace(/\D/g, '');
    if (!targetNum || targetNum.length < 8) return alert('Digite um número de contato válido!');
    const targetJid = `${targetNum}@c.us`;

    const statusDiv = $('participantActionStatus');
    if (statusDiv) {
      statusDiv.style.color = 'var(--primary)';
      statusDiv.textContent = `Iniciando...`;
    }
    
    let success = 0;
    const btns = ['btnPromote', 'btnDemote', 'btnBan'];
    btns.forEach(b => { if ($(b)) $(b).disabled = true; });

    for (let i = 0; i < groupsToEnv.length; i++) {
      const g = groupsToEnv[i];
      if (statusDiv) statusDiv.textContent = `Processando ${i + 1}/${groupsToEnv.length}...`;
      
      let res;
      if (actionType === 'promote') {
        res = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'promoteParticipant', groupId: g.id, participant: targetJid }, resolve));
      } else if (actionType === 'demote') {
        res = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'demoteParticipant', groupId: g.id, participant: targetJid }, resolve));
      } else if (actionType === 'remove') {
        res = await new Promise(resolve => chrome.runtime.sendMessage({ action: 'removeParticipant', groupId: g.id, participant: targetJid }, resolve));
      }

      if (res?.ok) success++;
      await sleep(800);
    }

    if (statusDiv) statusDiv.textContent = `✅ Finalizado! Ação concluída em ${success} de ${groupsToEnv.length} grupos.`;
    btns.forEach(b => { if ($(b)) $(b).disabled = false; });
  }

  safeClick('btnCreateGroup', async () => {
    const name = $('newGroupName').value.trim();
    const participant = $('newGroupParticipant').value.replace(/\D/g, '');

    if (!name) return alert('Digite o nome do grupo!');
    if (!participant) return alert('O WhatsApp exige pelo menos 1 participante inicial para criar um grupo. Digite um número válido!');

    const btn = $('btnCreateGroup');
    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Criando...';
    $('createGroupResult').textContent = '';

    const res = await new Promise(resolve => {
      chrome.runtime.sendMessage({
        action: 'createGroup',
        name,
        participant: `${participant}@c.us`,
        iconBase64: window.newGroupIconBase64 || null
      }, resolve);
    });

    btn.disabled = false;
    btn.textContent = oldText;

    if (res?.ok) {
      $('createGroupResult').textContent = '✅ Grupo criado! Atualizando lista...';
      $('createGroupResult').style.color = 'var(--primary)';
      $('newGroupName').value = '';
      $('newGroupParticipant').value = '';
      // Seleciona o novo grupo automaticamente após o refresh (se possível)
      await refreshGroups();
      if (res.groupId) {
        selected.add(res.groupId);
        renderGroups();
      }
    } else {
      $('createGroupResult').textContent = '❌ Erro: ' + (res?.error || 'Desconhecido');
      $('createGroupResult').style.color = 'var(--error)';
    }
  });

  safeClick('btnCreateGroupAdd', async () => {
    const name = $('newGroupNameAdd').value.trim();
    const participant = $('newGroupParticipantAdd').value.replace(/\D/g, '');

    if (!name) return alert('Digite o nome do grupo!');
    if (!participant) return alert('O WhatsApp exige pelo menos 1 participante inicial para criar um grupo. Digite um número válido!');

    const btn = $('btnCreateGroupAdd');
    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Criando...';
    $('createGroupResultAdd').textContent = '';

    const res = await new Promise(resolve => {
      chrome.runtime.sendMessage({
        action: 'createGroup',
        name,
        participant: `${participant}@c.us`,
        iconBase64: window.newGroupIconBase64Add || null
      }, resolve);
    });

    btn.disabled = false;
    btn.textContent = oldText;

    if (res?.ok) {
      $('createGroupResultAdd').textContent = '✅ Grupo criado e já selecionado!';
      $('createGroupResultAdd').style.color = 'var(--primary)';
      $('newGroupNameAdd').value = '';
      $('newGroupParticipantAdd').value = '';

      await refreshGroups();
      if (res.groupId) {
        selected.add(res.groupId);
        renderGroups();
      }
    } else {
      $('createGroupResultAdd').textContent = '❌ Erro: ' + (res?.error || 'Desconhecido');
      $('createGroupResultAdd').style.color = 'var(--error)';
    }
  });

  // Mass Icon Upload
  safeClick('btnSelectMassIcon', () => {
    const input = $('massIconInput');
    if (input) input.click();
  });

  const massInput = $('massIconInput');
  if (massInput) {
    massInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        massIconFile = reader.result;
        if ($('btnSelectMassIcon')) $('btnSelectMassIcon').style.display = 'none';
        if ($('massIconPreview')) $('massIconPreview').style.display = 'flex';
        if ($('massIconImg')) $('massIconImg').src = massIconFile;
      };
      reader.readAsDataURL(file);
    };
  }

  safeClick('btnRemoveMassIcon', () => {
    massIconFile = null;
    if ($('btnSelectMassIcon')) $('btnSelectMassIcon').style.display = 'flex';
    if ($('massIconPreview')) $('massIconPreview').style.display = 'none';
    if ($('massIconInput')) $('massIconInput').value = '';
  });
}

// ── GRUPOS - ÍCONES E MEMBROS (dentro do DOMContentLoaded via setupGroups) ──
function setupGroupIcons() {
  // New Group Icon Logic (Grupos Tab)
  window.newGroupIconBase64 = null;
  safeClick('btnSelectNewGroupIcon', () => {
    if ($('newGroupIconInput')) $('newGroupIconInput').click();
  });

  const newGroupIconInput = $('newGroupIconInput');
  if (newGroupIconInput) {
    newGroupIconInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        window.newGroupIconBase64 = ev.target.result;
        $('newGroupIconImg').src = window.newGroupIconBase64;
        $('newGroupIconPreview').style.display = 'flex';
        $('btnSelectNewGroupIcon').style.display = 'none';
      };
      reader.readAsDataURL(file);
    };
  }

  safeClick('btnRemoveNewGroupIcon', () => {
    window.newGroupIconBase64 = null;
    if ($('newGroupIconInput')) $('newGroupIconInput').value = '';
    if ($('newGroupIconPreview')) $('newGroupIconPreview').style.display = 'none';
    if ($('btnSelectNewGroupIcon')) $('btnSelectNewGroupIcon').style.display = 'flex';
  });

  // New Group Icon Logic (Add Members Tab)
  window.newGroupIconBase64Add = null;
  safeClick('btnSelectNewGroupIconAdd', () => {
    if ($('newGroupIconInputAdd')) $('newGroupIconInputAdd').click();
  });

  const newGroupIconInputAdd = $('newGroupIconInputAdd');
  if (newGroupIconInputAdd) {
    newGroupIconInputAdd.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        window.newGroupIconBase64Add = ev.target.result;
        $('newGroupIconImgAdd').src = window.newGroupIconBase64Add;
        $('newGroupIconPreviewAdd').style.display = 'flex';
        $('btnSelectNewGroupIconAdd').style.display = 'none';
      };
      reader.readAsDataURL(file);
    };
  }

  safeClick('btnRemoveNewGroupIconAdd', () => {
    window.newGroupIconBase64Add = null;
    if ($('newGroupIconInputAdd')) $('newGroupIconInputAdd').value = '';
    if ($('newGroupIconPreviewAdd')) $('newGroupIconPreviewAdd').style.display = 'none';
    if ($('btnSelectNewGroupIconAdd')) $('btnSelectNewGroupIconAdd').style.display = 'flex';
  });
}

async function applyMassAction() {
  const subject = $('massGroupName').value;
  const description = $('massGroupDesc').value;
  const groupsToEnv = allGroups.filter(g => selected.has(g.id));

  if (!groupsToEnv.length) return alert('Selecione os grupos na lista acima!');
  if (!subject && !description && !massIconFile) return alert('Digite um novo Nome, Descrição ou selecione uma Foto!');

  const btn = $('btnApplyMassAction');
  const oldText = btn.textContent;
  btn.disabled = true;

  let success = 0;
  for (let i = 0; i < groupsToEnv.length; i++) {
    const g = groupsToEnv[i];
    btn.textContent = `Atualizando ${i + 1}/${groupsToEnv.length}...`;

    const res = await new Promise(resolve => {
      chrome.runtime.sendMessage({
        action: 'updateGroupProfile',
        groupId: g.id,
        subject,
        description,
        iconBase64: massIconFile
      }, resolve);
    });

    if (res?.ok) success++;
    await sleep(1000); // Pequeno delay entre alterações
  }

  btn.disabled = false;
  btn.textContent = oldText;
  alert(`Finalizado! ${success} de ${groupsToEnv.length} grupos atualizados.`);
}

async function refreshGroups() {
  const btn = $('btnRefreshGroups');
  if (!btn) return;
  btn.textContent = 'Buscando...';
  btn.disabled = true;

  chrome.runtime.sendMessage({ action: 'getGroups' }, (r) => {
    if (btn) {
      btn.textContent = 'Atualizar Lista';
      btn.disabled = false;
    }

    if (r?.groups && r.groups.length > 0) {
      allGroups = r.groups;
      renderGroups();

      if ($('diagBox')) $('diagBox').textContent = `✅ ${allGroups.length} grupos encontrados via ${r.method}.\nTotal de chats: ${r.total}`;
    } else {
      const errorMsg = r?.error || 'Nenhum grupo encontrado.';
      $('groupList').innerHTML = `<div style="padding:20px; text-align:center; color:var(--error); font-size:12px;">Erro: ${errorMsg}</div>`;
      $('diagBox').textContent = `❌ Falha ao buscar grupos.\nErro: ${errorMsg}`;
    }
  });
}


function renderGroups() {
  const list = $('groupList');
  list.innerHTML = '';
  allGroups.forEach(g => {
    const item = document.createElement('div');
    item.className = 'group-item';
    const closedBadge = g.isClosed
      ? `<span title="Grupo fechado — só admins podem enviar" style="font-size:9px; color:#f59e0b; background:rgba(245,158,11,0.15); padding:1px 5px; border-radius:4px; margin-left:4px;">🔒 Fechado</span>`
      : '';
    item.innerHTML = `
      <input type="checkbox" class="group-check" data-id="${g.id}" ${selected.has(g.id) ? 'checked' : ''}>
      <div class="group-info">
        <div class="group-name">${g.name} <span style="font-size:8px; color:var(--primary); background:rgba(37,211,102,0.1); padding:1px 4px; border-radius:4px;">${g.type || 'Grupo'}</span>${closedBadge}</div>
        <div class="group-meta">${g.id} • ${g.memberCount || '?'} membros</div>
      </div>
      <div class="status-dot" id="dot-${g.id.replace(/[^a-z0-9]/gi, '')}"></div>
    `;
    const check = item.querySelector('.group-check');
    check.onchange = () => {
      if (check.checked) selected.add(g.id);
      else selected.delete(g.id);
      updateSelectedCount();
      saveState();
    };
    item.onclick = (e) => { if (e.target !== check) check.click(); };
    list.appendChild(item);
  });
  updateSelectedCount();
}

function updateSelectedCount() {
  const el = $('selectedExtractCount');
  if (el) {
    const count = selected.size;
    el.textContent = `${count} ${count === 1 ? 'grupo selecionado' : 'grupos selecionados'}`;
  }
}

// ── MEDIA ────────────────────────────────────────────────────────────────────
function setupMedia() {
  $('btnSelectMedia').onclick = () => $('fileInput').click();
  $('btnAddMoreMedia').onclick = () => $('fileInput').click();

  $('fileInput').onchange = async (e) => {
    const files = e.target.files;
    if (!files.length) return;

    if (!variations[activeV].media) {
      variations[activeV].media = [];
    }

    // Convert old single media to array
    if (!Array.isArray(variations[activeV].media)) {
      variations[activeV].media = [variations[activeV].media];
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      const fileData = await new Promise(resolve => {
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });

      variations[activeV].media.push({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type,
        data: fileData
      });
    }

    showMediaPreview();
    $('fileInput').value = '';
    saveState();
  };
}

function showMediaPreview() {
  const mediaList = variations[activeV].media || [];
  const listArray = Array.isArray(mediaList) ? mediaList : [mediaList].filter(Boolean);

  if (listArray.length === 0) {
    $('btnSelectMedia').style.display = 'flex';
    $('mediaPreviewContainer').style.display = 'none';
    $('btnAddMoreMedia').style.display = 'none';
    return;
  }

  $('btnSelectMedia').style.display = 'none';
  $('mediaPreviewContainer').style.display = 'flex';
  $('btnAddMoreMedia').style.display = 'block';

  const container = $('mediaPreviewContainer');
  container.innerHTML = '';

  listArray.forEach((m, index) => {
    const div = document.createElement('div');
    div.className = 'media-preview';
    div.style.display = 'flex';
    div.innerHTML = `
      ${m.type.startsWith('image/') ? `<img src="${m.data}" style="display:block">` : `<div style="display:block">📄</div>`}
      <div class="media-info">
        <div class="media-name">${m.name}</div>
        <div class="media-size">${m.size}</div>
      </div>
      <div class="media-remove" data-index="${index}">✕</div>
    `;

    div.querySelector('.media-remove').onclick = (e) => {
      e.stopPropagation();
      listArray.splice(index, 1);
      variations[activeV].media = listArray;
      showMediaPreview();
      saveState();
    };

    container.appendChild(div);
  });
}

// ── STATUS ───────────────────────────────────────────────────────────────────
let statusMediaFiles = [];

function setupStatus() {
  // Abre o seletor de arquivo ao clicar no botão
  safeClick('btnSelectStatusImg', () => $('statusImgInput').click());

  // Processa os arquivos selecionados
  const fileInput = $('statusImgInput');
  if (fileInput) {
    fileInput.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;

      statusMediaFiles = [];
      $('statusPreviewList').innerHTML = '<div style="text-align:center;color:var(--txt2)">Processando...</div>';
      $('btnSelectStatusImg').style.display = 'none';
      $('statusImgPreview').style.display = 'flex';

      for (const f of files) {
        // Valida tipo antes de ler
        if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
          alert(`Arquivo "${f.name}" ignorado. Apenas imagens e vídeos são aceitos.`);
          continue;
        }
        const b64 = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(f);
        });
        statusMediaFiles.push({ name: f.name, type: f.type, data: b64 });
      }

      if (statusMediaFiles.length === 0) {
        // Nenhum arquivo válido
        $('btnSelectStatusImg').style.display = 'flex';
        $('statusImgPreview').style.display = 'none';
        return;
      }

      $('statusPreviewList').innerHTML = statusMediaFiles
        .map((m, i) => `<div style="padding:2px 0">${i + 1}. ${m.name} <span style="color:var(--txt2);font-size:10px">(${m.type.split('/')[0]})</span></div>`)
        .join('');
    };
  }

  // Limpa a seleção de mídia
  safeClick('btnRemoveStatusImg', () => {
    statusMediaFiles = [];
    if ($('statusImgInput')) $('statusImgInput').value = '';
    $('btnSelectStatusImg').style.display = 'flex';
    $('statusImgPreview').style.display = 'none';
    $('statusResult').textContent = '';
  });

  // Botão de postar
  safeClick('btnPostStatus', postStatus);

  // Toggle de repetição
  const repeatToggle = $('repeatStatusToggle');
  if (repeatToggle) {
    repeatToggle.onchange = (e) => {
      const cfg = $('repeatStatusConfig');
      if (cfg) cfg.style.display = e.target.checked ? 'block' : 'none';
    };
  }

  // Toggle de menção — mostra info
  const mentionToggle = $('statusMentionToggle');
  if (mentionToggle) {
    mentionToggle.onchange = (e) => {
      const info = $('statusMentionInfo');
      if (info) info.style.display = e.target.checked ? 'block' : 'none';
      if (!e.target.checked) {
        $('statusMembersList').innerHTML = '';
        $('statusMembersList').style.display = 'none';
        $('statusMentionCount').textContent = '';
      }
    };
  }

  // Extrair contatos para menção no status
  safeClick('btnExtractStatusMembers', async () => {
    const groupsToUse = allGroups.filter(g => selected.has(g.id));
    if (groupsToUse.length === 0) {
      alert('Selecione pelo menos um grupo na aba Grupos primeiro!');
      return;
    }

    const listEl = $('statusMembersList');
    listEl.style.display = 'flex';
    listEl.innerHTML = '<span style="color:var(--txt2); font-size:11px;">Carregando contatos...</span>';

    // Coleta números já resolvidos (inclui @lid → número real) via nova API
    const seenNums = new Set();
    const allMembers = [];
    for (const g of groupsToUse) {
      try {
        const res = await new Promise(resolve =>
          chrome.runtime.sendMessage({ action: 'getParticipants', groupId: g.id }, resolve)
        );
        // Nova API retorna res.numbers = array de números puros (ex: "5511999999999")
        const nums = res?.numbers || [];
        for (const num of nums) {
          if (num && !seenNums.has(num)) {
            seenNums.add(num);
            allMembers.push(num);
          }
        }
      } catch (e) { console.error('Erro ao buscar membros de', g.id, e); }
    }

    if (allMembers.length === 0) {
      listEl.innerHTML = '<span style="color:var(--error); font-size:11px;">Nenhum contato encontrado.</span>';
      return;
    }
    listEl.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--brd); padding-bottom:5px; margin-bottom:5px;">
        <label style="font-weight:bold; cursor:pointer; font-size:11px;">
          <input type="checkbox" id="chkStatusSelectAll"> Selecionar Todos
        </label>
        <span style="font-size:10px; color:var(--txt2);">${allMembers.length} contatos</span>
      </div>
      <div id="statusCheckboxesWrapper" style="display:flex; flex-direction:column; gap:5px;"></div>
    `;

    const wrapper = $('statusCheckboxesWrapper');
    allMembers.forEach(num => {
      // Monta JID @s.whatsapp.net para garantir compatibilidade com a API de menção
      const jid = `${num}@c.us`;
      const div = document.createElement('div');
      div.innerHTML = `<label style="cursor:pointer; font-size:11px; word-break:break-all;"><input type="checkbox" class="chk-status-mention" value="${jid}"> ${num}</label>`;
      wrapper.appendChild(div);
    });

    $('chkStatusSelectAll').onchange = (e) => {
      document.querySelectorAll('.chk-status-mention').forEach(chk => chk.checked = e.target.checked);
      updateStatusMentionSelectedCount();
    };

    document.querySelectorAll('.chk-status-mention').forEach(chk => {
      chk.onchange = updateStatusMentionSelectedCount;
    });

    updateStatusMentionSelectedCount();
  });

  function updateStatusMentionSelectedCount() {
    const count = document.querySelectorAll('.chk-status-mention:checked').length;
    $('statusMentionCount').innerHTML = `<b>${count}</b> selecionados para menção.<br><span style="color:var(--error); font-size:10px;">Atenção: O WhatsApp pode limitar e não notificar todas as pessoas se você marcar muitas de uma vez no Status.</span>`;
  }

  // Toggle de avisar nos grupos
  const notifyToggle = $('statusNotifyGroupsToggle');
  if (notifyToggle) {
    notifyToggle.onchange = (e) => {
      const cfg = $('statusNotifyGroupsConfig');
      if (cfg) cfg.style.display = e.target.checked ? 'block' : 'none';
    };
  }

  // Botão de parar
  safeClick('btnStopStatus', () => {
    chrome.runtime.sendMessage({ action: 'taskStop' });
  });

  // Botão de limpar tudo
  safeClick('btnClearStatus', () => {
    statusMediaFiles = [];
    if ($('statusCaption')) $('statusCaption').value = '';
    if ($('statusImgInput')) $('statusImgInput').value = '';
    $('btnSelectStatusImg').style.display = 'flex';
    $('statusImgPreview').style.display = 'none';
    $('statusResult').textContent = '';
    $('statusTaskArea').style.display = 'none';
    $('statusActionButtons').style.display = 'grid';
    $('btnStopStatus').style.display = 'none';
  });
}

// ── POLLS ────────────────────────────────────────────────────────────────────
function setupPoll() {
  $('btnAddPollOption').onclick = () => {
    const list = $('pollOptionsList');
    const div = document.createElement('div');
    div.className = 'row';
    div.style.gap = '5px';
    div.innerHTML = `
      <input type="text" class="poll-opt" placeholder="Opção ${list.children.length + 1}">
      <button class="btn btn-outline btn-remove-opt" style="padding:0 8px;">✕</button>
    `;
    div.querySelector('.btn-remove-opt').onclick = () => div.remove();
    list.appendChild(div);
  };

  document.querySelectorAll('.btn-remove-opt').forEach(btn => {
    btn.onclick = (e) => e.target.closest('.row').remove();
  });

  $('btnStopPoll').onclick = () => { chrome.runtime.sendMessage({ action: 'taskStop' }); };

  $('btnSendPoll').onclick = sendPollMass;
}

function sendPollMass() {
  const question = $('pollQuestion').value;
  const options = Array.from(document.querySelectorAll('.poll-opt'))
    .map(i => i.value.trim()).filter(v => v.length > 0);
  const groupsToEnv = allGroups.filter(g => selected.has(g.id));

  if (!question) return alert('Digite a pergunta da enquete!');
  if (options.length < 2) return alert('Adicione pelo menos 2 opções!');
  if (!groupsToEnv.length) return alert('Selecione os grupos na aba "Grupos"!');

  $('btnSendPoll').style.display = 'none';
  $('btnStopPoll').style.display = 'flex';
  $('pollStatusArea').style.display = 'block';
  $('pollTimerTxt').textContent = 'Iniciando...';

  chrome.runtime.sendMessage({
    action: 'taskStart',
    payload: {
      type: 'poll',
      items: groupsToEnv,
      question,
      options,
      multiSelect: $('pollMultiSelect').checked,
      cfg
    }
  });
}

// ── EXTRACTION ───────────────────────────────────────────────────────────────
let extractedLeads = [];

function setupExtract() {
  $('btnStartExtract').onclick = startExtraction;
  $('btnExtractLinks').onclick = extractGroupLinks;
  $('btnDownloadExtract').onclick = () => {
    if (!extractedLeads.length) return;
    const blob = new Blob([extractedLeads.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
}

function startExtraction() {
  const groupsToEnv = allGroups.filter(g => selected.has(g.id));
  if (!groupsToEnv.length) return alert('Selecione os grupos na aba "Grupos"!');

  const btn = $('btnStartExtract');
  btn.disabled = true;
  btn.textContent = 'Extraindo...';
  $('btnDownloadExtract').style.display = 'none';
  $('extractResultArea').style.display = 'block';
  $('extractCount').textContent = '0';

  chrome.runtime.sendMessage({
    action: 'taskStart',
    payload: {
      type: 'extract',
      items: groupsToEnv,
      filter: $('extractFilter').value
    }
  });
}

async function extractGroupLinks() {
  const groupsToEnv = allGroups.filter(g => selected.has(g.id));
  if (!groupsToEnv.length) return alert('Selecione os grupos na aba "Grupos"!');

  const btn = $('btnExtractLinks');
  btn.disabled = true;
  btn.textContent = 'Pegando Links...';
  $('btnDownloadExtract').style.display = 'none';
  $('extractResultArea').style.display = 'block';
  $('extractCount').textContent = '0';

  const links = [];
  for (let i = 0; i < groupsToEnv.length; i++) {
    const g = groupsToEnv[i];
    btn.textContent = `Link ${i + 1}/${groupsToEnv.length}...`;
    const code = await new Promise(resolve => {
      chrome.runtime.sendMessage({ action: 'getInviteCode', groupId: g.id }, resolve);
    });
    if (code) links.push(`https://chat.whatsapp.com/${code}`);
    $('extractCount').textContent = links.length;
    await new Promise(r => setTimeout(r, 300));
  }

  extractedLeads = links;
  btn.disabled = false;
  btn.textContent = 'Extrair Links (Admin)';
  if (links.length > 0) $('btnDownloadExtract').style.display = 'block';
  else alert('Nenhum link capturado. Verifique se você é ADMIN nos grupos selecionados.');
}

// ── AUTO-JOIN ───────────────────────────────────────────────────────────────
function setupJoin() {
  $('btnStartJoin').onclick = startJoin;
  $('btnStopJoin').onclick = () => { chrome.runtime.sendMessage({ action: 'taskStop' }); };

  safeClick('btnWebSearch', async () => {
    const keyword = $('webSearchKeyword').value.trim();
    if (!keyword) return alert('Digite uma palavra-chave!');
    
    $('btnWebSearch').textContent = 'Buscando...';
    $('btnWebSearch').disabled = true;

    // Anima o texto enquanto busca (pode demorar até 60s)
    const msgs = [
      'Buscando no Google... (isso pode levar até 60s)',
      'Navegando pelas páginas de resultados...',
      'Extraindo links do Google...',
      'Tentando Bing como fallback...',
      'Finalizando busca...'
    ];
    let msgIdx = 0;
    const resultEl = $('webSearchResult');
    resultEl.style.color = 'var(--txt2)';
    resultEl.textContent = msgs[0];
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % msgs.length;
      if (resultEl) resultEl.textContent = msgs[msgIdx];
    }, 8000);
    
    chrome.runtime.sendMessage({ action: 'searchWebGroups', keyword }, (res) => {
      clearInterval(msgInterval);
      $('btnWebSearch').textContent = 'Buscar Grupos';
      $('btnWebSearch').disabled = false;
      
      if (res?.ok && res.links?.length > 0) {
        const currentLinks = $('joinLinksList').value.trim();
        const newLinks = res.links.join('\n');
        $('joinLinksList').value = currentLinks ? currentLinks + '\n' + newLinks : newLinks;
        resultEl.textContent = `✅ ${res.links.length} grupos encontrados e adicionados à lista!`;
        resultEl.style.color = 'var(--primary)';
      } else {
        resultEl.textContent = res?.error || '❌ Nenhum grupo encontrado. Tente outra palavra-chave ou aguarde alguns minutos.';
        resultEl.style.color = 'var(--error)';
      }
    });
  });
}

function startJoin() {
  const rawLinks = $('joinLinksList').value.split('\n').map(l => l.trim()).filter(l => l.length > 5);
  if (!rawLinks.length) return alert('Cole pelo menos um link de grupo!');

  $('btnStartJoin').style.display = 'none';
  $('btnStopJoin').style.display = 'flex';
  $('joinStatusArea').style.display = 'block';
  $('joinTimerTxt').textContent = 'Iniciando...';

  chrome.runtime.sendMessage({
    action: 'taskStart',
    payload: {
      type: 'join',
      items: rawLinks,
      cfg
    }
  });
}










async function postStatus() {
  if (!statusMediaFiles || statusMediaFiles.length === 0) {
    return alert('Selecione pelo menos uma imagem ou vídeo para o status!');
  }

  const caption = $('statusCaption') ? $('statusCaption').value.trim() : '';
  const isRepeat = !!($('repeatStatusToggle') && $('repeatStatusToggle').checked);
  const repeatInterval = ($('repeatStatusInterval') && $('repeatStatusInterval').value) ? $('repeatStatusInterval').value : '10';
  const useMention = !!($('statusMentionToggle') && $('statusMentionToggle').checked);

  // Se mencionar está ativo, pega as menções selecionadas
  let mentionedList = [];
  if (useMention) {
    const checkboxes = document.querySelectorAll('.chk-status-mention:checked');
    checkboxes.forEach(chk => mentionedList.push(chk.value));

    if (checkboxes.length === 0) {
      return alert('Você ativou a menção no Status mas não selecionou nenhum contato!\nClique em "Extrair contatos", marque quem deseja mencionar e tente novamente.');
    }

    $('statusActionButtons').style.display = 'none';
    $('statusTaskArea').style.display = 'block';
    $('statusTimerTxt').textContent = `${mentionedList.length} contatos marcados. Iniciando...`;
    $('statusResult').textContent = '';
  } else {
    // Atualiza UI normalmente
    $('statusActionButtons').style.display = 'none';
  }

  const notifyGroups = !!($('statusNotifyGroupsToggle') && $('statusNotifyGroupsToggle').checked);
  const notifyMsg = ($('statusNotifyMsg') && $('statusNotifyMsg').value.trim())
    ? $('statusNotifyMsg').value.trim()
    : 'Acabei de postar um novo status! Vai lá conferir 👆';
  const groupsToNotify = notifyGroups ? allGroups.filter(g => selected.has(g.id)) : [];

  $('statusTaskArea').style.display = 'block';
  $('statusTimerTxt').textContent = 'Iniciando...';
  $('statusResult').textContent = '';

  $('btnStopStatus').style.display = 'block';
  $('statusProgBar').style.width = '0%';
  $('statusProgCount').textContent = '';

  // Salva as mídias no storage para o background buscar
  await chrome.storage.local.set({ tempStatusMedia: statusMediaFiles });

  // Dispara a tarefa no background
  chrome.runtime.sendMessage({
    action: 'taskStart',
    payload: {
      type: 'status',
      caption,
      isRepeat,
      repeatInterval,
      mentionedList,
      notifyGroups: groupsToNotify,
      notifyMsg
    }
  }, (res) => {
    if (chrome.runtime.lastError) {
      $('statusResult').textContent = '❌ Erro ao iniciar: ' + chrome.runtime.lastError.message;
      $('statusResult').style.color = 'var(--error)';
      $('statusActionButtons').style.display = 'grid';
      $('btnStopStatus').style.display = 'none';
      $('statusTaskArea').style.display = 'none';
    }
  });
}

// Atualiza o contador de membros quando o toggle de menção é ativado
function updateStatusMentionCount() {
  const el = $('statusMentionCount');
  if (!el) return;
  const groupsToUse = allGroups.filter(g => selected.has(g.id));
  if (groupsToUse.length === 0) {
    el.textContent = '⚠️ Nenhum grupo selecionado. Vá na aba Grupos e selecione.';
    return;
  }
  const total = groupsToUse.reduce((acc, g) => acc + (g.memberCount || 0), 0);
  el.textContent = `${groupsToUse.length} grupo(s) selecionado(s) — aprox. ${total} membros serão mencionados.`;
}


// ── PROGRESS LISTENER (BACKGROUND → UI) ─────────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action !== 'taskProgress') return;
  const s = msg.state;
  if (!s) return;

  // Campanha
  if (s.type === 'campaign') {
    if (s.running || ['Finalizado', 'Cancelado', 'Interrompido'].includes(s.textStatus)) {
      $('btnStart').style.display = s.running ? 'none' : 'block';
      $('campaignControls').style.display = s.running ? 'flex' : 'none';
      $('campaignStatus').style.display = 'block';
      if (s.total > 0) {
        const p = (s.progress / s.total) * 100;
        $('progBar').style.width = `${p}%`;
        $('progCount').textContent = `${s.progress}/${s.total}`;
      }
      const isOk = s.currentStatus === 'sent';
      $('methodTxt').textContent = s.textStatus;
      $('methodTxt').style.color = isOk ? 'var(--primary)' : (s.currentStatus === 'error' ? 'var(--error)' : '');
      if (s.currentItem) setDotStatus(s.currentItem, s.currentStatus || 'sending');
      if (!s.running) {
        $('campaignControls').style.display = 'none';
        $('btnPause').textContent = 'Pausar';
      }
    }
  }

  // Status
  if (s.type === 'status') {
    // Atualiza texto de status
    $('statusTimerTxt').textContent = s.textStatus || '';

    // Atualiza barra de progresso
    if (s.total > 0) {
      const pct = Math.round((s.progress / s.total) * 100);
      $('statusProgBar').style.width = pct + '%';
      $('statusProgCount').textContent = s.progress + '/' + s.total;
    }

    // Quando terminar
    if (!s.running) {
      $('statusActionButtons').style.display = 'grid';
      $('btnStopStatus').style.display = 'none';
      $('statusTaskArea').style.display = 'none';

      const txt = s.textStatus || '';
      const isOk = txt === 'Finalizado' || txt === 'Interrompido';
      const isErr = txt.startsWith('Erro');

      $('statusResult').style.color = isErr ? 'var(--error)' : 'var(--primary)';
      $('statusResult').textContent = isOk ? '✅ ' + txt + '!' : (isErr ? '❌ ' + txt : txt);

      // Limpa preview se finalizou com sucesso
      if (txt === 'Finalizado') {
        statusMediaFiles = [];
        if ($('statusCaption')) $('statusCaption').value = '';
        if ($('statusImgInput')) $('statusImgInput').value = '';
        $('btnSelectStatusImg').style.display = 'flex';
        $('statusImgPreview').style.display = 'none';
      }
    }
  }

  // Enquete
  if (s.type === 'poll') {
    if (s.total > 0) {
      const p = (s.progress / s.total) * 100;
      $('pollProgBar').style.width = `${p}%`;
      $('pollProgCount').textContent = `${s.progress}/${s.total}`;
    }
    $('pollTimerTxt').textContent = s.textStatus;
    if (!s.running) {
      $('btnSendPoll').style.display = 'flex';
      $('btnStopPoll').style.display = 'none';
      const ok = s.errors.length === 0;
      $('pollResult').textContent = s.textStatus.startsWith('Finalizado') ? `✅ ${s.textStatus}` : `❌ ${s.textStatus}`;
      $('pollResult').style.color = ok ? 'var(--primary)' : 'var(--error)';
    }
  }

  // Extração
  if (s.type === 'extract') {
    $('extractCount').textContent = s.extracted ? s.extracted.length : 0;
    if (!s.running) {
      const btn = $('btnStartExtract');
      btn.disabled = false;
      btn.textContent = 'Iniciar Extração';
      if (s.extracted && s.extracted.length > 0) {
        extractedLeads = s.extracted;
        $('btnDownloadExtract').style.display = 'block';
      } else {
        alert('Nenhum número encontrado com os critérios selecionados.');
      }
    }
  }

  // Add Members
  if (s.type === 'addMembers') {
    if (s.total > 0) {
      const p = (s.progress / s.total) * 100;
      $('addMembersProgBar').style.width = `${p}%`;
      $('addMembersProgCount').textContent = `${s.progress}/${s.total}`;
    }
    $('addMembersTimerTxt').textContent = s.textStatus;
    if (!s.running) {
      $('btnStartAddMembers').style.display = 'flex';
      $('btnStopAddMembers').style.display = 'none';
    }
  }

  // Entrada em Grupos
  if (s.type === 'join') {
    if (s.total > 0) {
      const p = (s.progress / s.total) * 100;
      $('joinProgBar').style.width = `${p}%`;
      $('joinProgCount').textContent = `${s.progress}/${s.total}`;
    }
    $('joinTimerTxt').textContent = s.textStatus;
    if (!s.running) {
      $('btnStartJoin').style.display = 'flex';
      $('btnStopJoin').style.display = 'none';
      const ok = !s.errors || s.errors.length === 0;
      const resultEl = $('joinResult');
      if (resultEl) {
        resultEl.textContent = s.textStatus.startsWith('Finalizado') && ok ? `✅ ${s.textStatus}` : `❌ ${s.textStatus}`;
        resultEl.style.color = ok ? 'var(--primary)' : 'var(--error)';
        if (!ok && s.errors) {
          resultEl.innerHTML += '<br><div style="text-align:left; max-height:80px; overflow-y:auto; margin-top:5px; padding:5px; border:1px solid var(--error); border-radius:4px;">' + s.errors.join('<br>') + '</div>';
        }
      }
    }
  }
});

// ── CAMPAIGN ─────────────────────────────────────────────────────────────────
function setupCampaign() {
  $('btnStart').onclick = startCampaign;
  $('btnPause').onclick = () => {
    const nowPaused = $('btnPause').textContent !== 'Continuar';
    $('btnPause').textContent = nowPaused ? 'Continuar' : 'Pausar';
    chrome.runtime.sendMessage({ action: 'taskPause', paused: nowPaused });
  };
  $('btnStop').onclick = () => {
    if (confirm('Deseja realmente parar a campanha?')) {
      chrome.runtime.sendMessage({ action: 'taskStop' });
    }
  };

  $('repeatCampaignToggle').onchange = (e) => {
    $('repeatConfig').style.display = e.target.checked ? 'block' : 'none';
  };

  // Sincronização em tempo real entre os dois inputs de tempo
  $('repeatInterval').oninput = (e) => {
    if ($('templateRepeatInterval')) $('templateRepeatInterval').value = e.target.value;
  };
  if ($('templateRepeatInterval')) {
    $('templateRepeatInterval').oninput = (e) => {
      $('repeatInterval').value = e.target.value;
    };
  }

  // Variacoes
  $('btnAddVariation').onclick = () => {
    if (variations.length >= 5) return alert('Máximo de 5 variações permitidas.');
    variations.push({ text: '', media: null });
    renderVariationTabs();
    switchVariation(variations.length - 1);
  };

  $('btnRemoveVariation').onclick = () => {
    if (variations.length <= 1) return;
    variations.splice(activeV, 1);
    // Pular para a variacao anterior ou a primeira
    const newIdx = Math.max(0, activeV - 1);
    switchVariation(newIdx);
    saveState();
  };

  $('mainMessage').oninput = (e) => {
    variations[activeV].text = e.target.value;
    $('charCount').textContent = `${e.target.value.length}/4096`;
    saveState();
  };

  document.querySelectorAll('.btn-tag').forEach(btn => {
    btn.onclick = () => {
      const tag = btn.dataset.tag;
      const input = $('mainMessage');
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const text = input.value;
      input.value = text.substring(0, start) + tag + text.substring(end);
      input.focus();
      input.selectionStart = input.selectionEnd = start + tag.length;
      variations[activeV].text = input.value;
      saveState();
    };
  });
}

function renderVariationTabs() {
  const container = $('variationTabs');
  const remBtn = $('btnRemoveVariation');
  if (!container) return;
  container.innerHTML = '';

  variations.forEach((v, i) => {
    const btn = document.createElement('button');
    btn.className = `v-tab ${i === activeV ? 'active' : ''}`;
    btn.textContent = `V${i + 1}`;
    btn.onclick = () => switchVariation(i);
    container.appendChild(btn);
  });

  if (remBtn) {
    remBtn.style.display = variations.length > 1 ? 'block' : 'none';
  }
}

function switchVariation(index) {
  if (index < 0 || index >= variations.length) index = 0;
  activeV = index;
  const v = variations[index];
  const textVal = v ? (v.text || '') : '';
  $('mainMessage').value = textVal;
  $('charCount').textContent = `${textVal.length}/4096`;

  showMediaPreview();

  renderVariationTabs();
}



function startCampaign(cycleIndex = 0) {
  const groupsToEnv = allGroups.filter(g => selected.has(g.id));
  if (!groupsToEnv.length) return alert('Selecione pelo menos um grupo!');

  // Aviso de grupos fechados
  const closedGroups = groupsToEnv.filter(g => g.isClosed);
  if (closedGroups.length > 0) {
    const openGroups = groupsToEnv.filter(g => !g.isClosed);
    const msg = `⚠️ Atenção: ${closedGroups.length} grupo(s) selecionado(s) estão FECHADOS (somente admins):\n\n` +
      closedGroups.slice(0, 5).map(g => `🔒 ${g.name}`).join('\n') +
      (closedGroups.length > 5 ? `\n... e mais ${closedGroups.length - 5}` : '') +
      `\n\nO envio vai falhar nesses grupos.\n\n` +
      (openGroups.length > 0
        ? `Deseja enviar apenas nos ${openGroups.length} grupo(s) abertos?`
        : `Todos os grupos estão fechados. Não há como enviar.`);

    if (openGroups.length === 0) return alert(msg);

    const choice = confirm(msg);
    if (!choice) return; // cancelou

    // Remove grupos fechados da seleção temporariamente
    selected.clear();
    openGroups.forEach(g => selected.add(g.id));
  }

  const isTemplateCycle = $('repeatCampaignToggle').checked && useTemplatesCycle && templates.length > 0;
  if (!isTemplateCycle) {
    const hasContent = variations.some(v => {
      const textHasContent = (v.text || '').trim().length > 0;
      const mediaArray = Array.isArray(v.media) ? v.media : (v.media ? [v.media] : []);
      return textHasContent || mediaArray.length > 0;
    });
    if (!hasContent) return alert('Adicione texto ou mídia em pelo menos uma variação ou ative os Modelos no Ciclo!');
  }

  // Salva imediatamente para que o background pegue os dados mais recentes do storage
  try {
    chrome.storage.local.set({
      variations,
      templates,
      selected: Array.from(selected),
      allGroups,
      cfg,
      useTemplatesCycle
    }, () => {
      if (chrome.runtime.lastError) console.error('Save error in startCampaign:', chrome.runtime.lastError);
    });
  } catch (e) {
    console.error('Exception in storage.local.set during startCampaign:', e);
  }

  $('btnStart').style.display = 'none';
  $('campaignControls').style.display = 'flex';
  $('campaignStatus').style.display = 'block';
  $('methodTxt').textContent = 'Iniciando...';

  const isExtension = !!(chrome.runtime && chrome.runtime.id);
  const payload = {
    type: 'campaign',
    items: groupsToEnv.map(g => ({ id: g.id, name: g.name })),
    isTemplateCycle,
    cfg,
    mentionAll: $('mentionMembersToggle').checked,
    repeatCampaign: $('repeatCampaignToggle').checked,
    repeatInterval: $('repeatInterval').value || '60',
    cycleIndex
  };

  if (!isExtension) {
    // Na versão Web/SaaS, o backend Node.js não acessa o chrome.storage, então enviamos via Socket
    payload.variations = variations;
    payload.templates = templates;
  }

  const sendAction = () => {
    chrome.runtime.sendMessage({ action: 'taskStart', payload }, (r) => {
      if (chrome.runtime.lastError) {
        console.error('TaskStart Error:', chrome.runtime.lastError);
      } else if (r && r.error === 'ALREADY_RUNNING') {
        // Se estiver travado no background, força a parada e tenta iniciar de novo
        chrome.runtime.sendMessage({ action: 'taskStop' }, () => {
          setTimeout(() => {
            chrome.runtime.sendMessage({ action: 'taskStart', payload });
          }, 1000);
        });
      }
    });
  };

  try {
    sendAction();
  } catch (e) {
    console.error('Exception in sendMessage during startCampaign:', e);
  }
}



function updateProg(curr, total) {
  const p = total > 0 ? (curr / total) * 100 : 0;
  $('progBar').style.width = `${p}%`;
  $('progCount').textContent = `${curr}/${total}`;
}

function setDotStatus(id, status) {
  const dotId = `dot-${id.replace(/[^a-z0-9]/gi, '')}`;
  const dot = $(dotId);
  if (!dot) return;
  dot.className = 'status-dot ' + status;
}

// ── UTILS ────────────────────────────────────────────────────────────────────
function addVar(v) {
  const input = $('mainMessage');
  const start = input.selectionStart;
  const end = input.selectionEnd;
  input.value = input.value.substring(0, start) + v + input.value.substring(end);
  input.dispatchEvent(new Event('input')); // Atualiza o contador de caracteres
  input.focus();
}

function addVarToAuto(v) {
  const welcome = $('welcomeMsg');
  const leave = $('leaveMsg');

  // Decide qual textarea focar/inserir baseada no último foco ou por ordem
  const active = document.activeElement;
  const target = (active === leave) ? leave : welcome;

  const start = target.selectionStart;
  const end = target.selectionEnd;
  target.value = target.value.substring(0, start) + v + target.value.substring(end);
  target.focus();
  saveState();
}

function setupAddMembers() {
  $('btnStartAddMembers').onclick = () => {
    const numbers = $('addMembersNumbers').value.split('\n').map(n => n.trim()).filter(n => n.length > 5);
    const batchSize = parseInt($('addMembersBatch').value) || 5;
    const intervalMin = parseInt($('addMembersInterval').value) || 5;

    const groupsToEnv = allGroups.filter(g => selected.has(g.id));

    if (!numbers.length) return alert('Cole pelo menos um número!');
    if (!groupsToEnv.length) return alert('Selecione pelo menos um grupo na aba "Grupos"!');

    $('btnStartAddMembers').style.display = 'none';
    $('btnStopAddMembers').style.display = 'flex';
    $('addMembersStatusArea').style.display = 'block';
    $('addMembersTimerTxt').textContent = 'Iniciando...';

    chrome.runtime.sendMessage({
      action: 'taskStart',
      payload: {
        type: 'addMembers',
        items: groupsToEnv,
        numbers,
        batchSize,
        intervalMin
      }
    });
  };

  $('btnStopAddMembers').onclick = () => { chrome.runtime.sendMessage({ action: 'taskStop' }); };
}

function setupMod() { }

let validVerifiedLinks = [];

function setupVerifier() {
  // ── Verificador de números em massa ───────────────────────────────────────
  const btnCheck = $('btnCheckNumber');
  const inputArea = $('numberCheckerInput');
  const resultBox = $('numberCheckerResult');
  let validNumbers = [];
  let checkRunning = false;

  if (btnCheck && inputArea) {
    btnCheck.onclick = async () => {
      if (checkRunning) return;

      const raw = inputArea.value;
      const numbers = raw.split('\n')
        .map(n => n.replace(/\D/g, '').trim())
        .filter(n => n.length >= 7);

      if (!numbers.length) {
        if (resultBox) resultBox.innerHTML = '<span style="color:var(--error);">⚠️ Cole pelo menos um número válido (um por linha).</span>';
        return;
      }

      checkRunning = true;
      validNumbers = [];
      btnCheck.disabled = true;
      btnCheck.textContent = 'Verificando...';
      if ($('btnDownloadValidNumbers')) $('btnDownloadValidNumbers').style.display = 'none';
      if ($('numberCheckProgArea')) $('numberCheckProgArea').style.display = 'block';
      if (resultBox) resultBox.innerHTML = '';

      let validCount = 0;
      let invalidCount = 0;
      const resultItems = [];

      for (let i = 0; i < numbers.length; i++) {
        const num = numbers[i];
        const jid = `${num}@c.us`;

        // Atualiza progresso
        const pct = Math.round(((i) / numbers.length) * 100);
        if ($('numberCheckBar')) $('numberCheckBar').style.width = pct + '%';
        if ($('numberCheckCount')) $('numberCheckCount').textContent = `${i}/${numbers.length}`;
        if ($('numberCheckStatus')) $('numberCheckStatus').textContent = `Verificando ${num}...`;

        const res = await new Promise(resolve =>
          chrome.runtime.sendMessage({ action: 'checkNumberExists', jid }, resolve)
        );

        if (res?.exists) {
          validCount++;
          validNumbers.push(num);
          resultItems.push(`<div style="padding:6px 8px; background:rgba(37,211,102,0.08); border-left:3px solid var(--primary); border-radius:4px; margin-bottom:4px; font-size:11px;">
            ✅ <b>${num}</b>${res.name ? ` — ${res.name}` : ''}${res.isBusiness ? ' 🏢' : ''}
          </div>`);
        } else if (res && !res.error) {
          invalidCount++;
          resultItems.push(`<div style="padding:6px 8px; background:rgba(239,68,68,0.06); border-left:3px solid var(--error); border-radius:4px; margin-bottom:4px; font-size:11px;">
            ❌ <b>${num}</b> — sem WhatsApp
          </div>`);
        } else {
          resultItems.push(`<div style="padding:6px 8px; background:var(--bg3); border-left:3px solid var(--brd); border-radius:4px; margin-bottom:4px; font-size:11px;">
            ⚠️ <b>${num}</b> — erro na verificação
          </div>`);
        }

        // Delay entre verificações para não ser bloqueado
        if (i < numbers.length - 1) await new Promise(r => setTimeout(r, 800));
      }

      // Finaliza
      checkRunning = false;
      btnCheck.disabled = false;
      btnCheck.textContent = '✅ Verificar Números';
      if ($('numberCheckBar')) $('numberCheckBar').style.width = '100%';
      if ($('numberCheckCount')) $('numberCheckCount').textContent = `${numbers.length}/${numbers.length}`;
      if ($('numberCheckStatus')) $('numberCheckStatus').textContent = `Concluído! ${validCount} válidos, ${invalidCount} inválidos`;

      if (resultBox) {
        resultBox.innerHTML = `
          <div style="font-size:12px; font-weight:bold; margin-bottom:8px; color:var(--primary);">
            Resultado: ${validCount} com WhatsApp / ${invalidCount} sem WhatsApp de ${numbers.length} total
          </div>
          <div style="max-height:200px; overflow-y:auto;">
            ${resultItems.join('')}
          </div>
        `;
      }

      if (validNumbers.length > 0 && $('btnDownloadValidNumbers')) {
        $('btnDownloadValidNumbers').style.display = 'block';
      }
    };
  }

  // Botão de baixar válidos
  safeClick('btnDownloadValidNumbers', () => {
    if (!validNumbers.length) return;
    const blob = new Blob([validNumbers.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `numeros_validos_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // ── Verificador de links de grupos ────────────────────────────────────────
  $('btnCopyVerifierLinks').onclick = () => {
    if (!validVerifiedLinks.length) return alert('Nenhum link válido para copiar.');
    navigator.clipboard.writeText(validVerifiedLinks.join('\n'));
    alert('Links copiados para a área de transferência!');
  };

  $('btnDownloadVerifierLinks').onclick = () => {
    if (!validVerifiedLinks.length) return alert('Nenhum link válido para baixar.');
    const blob = new Blob([validVerifiedLinks.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'links_validos_wpp.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  $('btnStartVerifier').onclick = async () => {
    const links = $('verifierLinksList').value.split('\n').map(l => l.trim()).filter(l => l.length > 5);
    if (!links.length) return alert('Cole pelo menos um link de grupo!');

    validVerifiedLinks = [];
    $('verifierActions').style.display = 'none';

    const btn = $('btnStartVerifier');
    btn.disabled = true;
    btn.textContent = 'Verificando...';

    const area = $('verifierResultArea');
    area.style.display = 'flex';
    area.innerHTML = '<div style="text-align:center; color:var(--txt2); font-size:12px;">Processando ' + links.length + ' links...</div>';

    chrome.runtime.sendMessage({ action: 'verifyLinks', links }, (res) => {
      btn.disabled = false;
      btn.textContent = 'Verificar Links';

      area.innerHTML = '';
      if (!res || !res.results) {
        area.innerHTML = `<div style="color:var(--error); font-size:12px; text-align:center;">Erro: ${res?.error || 'WhatsApp Web não encontrado ou desconectado'}.</div>`;
        return;
      }

      let validCount = 0;

      res.results.forEach(r => {
        const item = document.createElement('div');
        item.style.cssText = 'padding:10px; background:var(--bg3); border-radius:6px; font-size:12px; display:flex; flex-direction:column; gap:4px; border-left: 3px solid ' + (r.ok ? 'var(--primary)' : 'var(--error)');
        if (r.ok) {
          validVerifiedLinks.push(r.link);
          validCount++;
          item.innerHTML = `
            <div style="font-weight:bold; color:var(--primary);">✅ Válido: ${r.info.title || 'Grupo'}</div>
            <div style="color:var(--txt2); font-size:10px;">Link: ${r.link}</div>
            <div style="color:var(--txt2); font-size:10px;">Membros: ${r.info.size || '?'} | Criador: ${r.info.owner ? r.info.owner.split('@')[0] : '?'}</div>
          `;
        } else {
          item.innerHTML = `
            <div style="font-weight:bold; color:var(--error);">❌ Inválido / Erro</div>
            <div style="color:var(--txt2); font-size:10px;">Link: ${r.link}</div>
            <div style="color:var(--error); font-size:9px;">Motivo: ${r.error || 'Desconhecido'}</div>
          `;
        }
        area.appendChild(item);
      });

      if (validCount > 0) {
        $('verifierActions').style.display = 'flex';
      }
    });
  };
}

function setupConfig() {
  $('btnSaveCfg').onclick = () => {
    cfg.delayMin = parseInt($('cfgDelayMin').value);
    cfg.delayMax = parseInt($('cfgDelayMax').value);
    cfg.dailyLimit = parseInt($('cfgLimit').value);
    cfg.mentionLimit = parseInt($('cfgMentionLimit').value);
    cfg.signature = $('cfgSignature').value;
    saveState();
    alert('Ajustes salvos!');
  };

  // ── Botões de formatação da assinatura ──────────────────────────────────
  function wrapSignatureSelection(prefix, suffix) {
    const ta = $('cfgSignature');
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.substring(start, end);
    if (!selected) {
      // Se nada selecionado, insere os marcadores e posiciona o cursor entre eles
      const newText = ta.value.substring(0, start) + prefix + suffix + ta.value.substring(end);
      ta.value = newText;
      ta.selectionStart = ta.selectionEnd = start + prefix.length;
    } else {
      // Já tem o formato? Remove. Senão, aplica.
      const before = ta.value.substring(start - prefix.length, start);
      const after = ta.value.substring(end, end + suffix.length);
      if (before === prefix && after === suffix) {
        // Remove formatação
        ta.value = ta.value.substring(0, start - prefix.length)
          + selected
          + ta.value.substring(end + suffix.length);
        ta.selectionStart = start - prefix.length;
        ta.selectionEnd = end - prefix.length;
      } else {
        ta.value = ta.value.substring(0, start) + prefix + selected + suffix + ta.value.substring(end);
        ta.selectionStart = start;
        ta.selectionEnd = end + prefix.length + suffix.length;
      }
    }
    ta.focus();
    cfg.signature = ta.value;
  }

  const btnSigBold = $('btnSigBold');
  if (btnSigBold) btnSigBold.onclick = () => { wrapSignatureSelection('*', '*'); updateSigPreview(); };

  const btnSigItalic = $('btnSigItalic');
  if (btnSigItalic) btnSigItalic.onclick = () => { wrapSignatureSelection('_', '_'); updateSigPreview(); };

  const btnSigUnderline = $('btnSigUnderline');
  if (btnSigUnderline) btnSigUnderline.onclick = () => { wrapSignatureSelection('*_', '_*'); updateSigPreview(); };

  // ── Preview em tempo real ────────────────────────────────────────────────
  function parseWAFormat(text) {
    // Escapa HTML para não injetar tags
    let safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Ordem importa: combos primeiro, depois individuais
    safe = safe
      .replace(/\*_(.+?)_\*/g, '<b><i>$1</i></b>')   // *_negrito+itálico_*
      .replace(/\*(.+?)\*/g,   '<b>$1</b>')           // *negrito*
      .replace(/_(.+?)_/g,     '<i>$1</i>')           // _itálico_
      .replace(/~(.+?)~/g,     '<s>$1</s>');          // ~tachado~

    return safe;
  }

  function updateSigPreview() {
    const ta = $('cfgSignature');
    const wrap = $('sigPreviewWrap');
    const preview = $('sigPreview');
    if (!ta || !wrap || !preview) return;

    const val = ta.value;
    if (!val.trim()) {
      wrap.style.display = 'none';
      return;
    }
    wrap.style.display = 'block';
    preview.innerHTML = parseWAFormat(val);
  }

  const sigTA = $('cfgSignature');
  if (sigTA) {
    sigTA.addEventListener('input', updateSigPreview);
    // Atualiza ao carregar (caso tenha valor salvo)
    updateSigPreview();
  }

}

function saveState() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    chrome.storage.local.set({
      selected: Array.from(selected),
      cfg,
      variations,
      allGroups,
      autoSettings: { ...autoSettings, allowedGroups: Array.from(autoSelectedGroups) },
      templates,
      useTemplatesCycle
    }, () => {
      if (chrome.runtime.lastError) console.error('Save error:', chrome.runtime.lastError);
      saveTimeout = null;
    });
  }, 500); // Espera 500ms de inatividade para salvar
}

function saveStateAndSync() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = null;
  chrome.storage.local.set({
    selected: Array.from(selected),
    cfg,
    variations,
    allGroups,
    autoSettings: { ...autoSettings, allowedGroups: Array.from(autoSelectedGroups) },
    templates,
    useTemplatesCycle
  }, () => {
    if (chrome.runtime.lastError) console.error('Save error:', chrome.runtime.lastError);
    chrome.runtime.sendMessage({ action: 'getAutoSettings' });
  });
}

let templateMediaFiles = [];

function renderTemplateMedia() {
  const container = $('templateMediaPreviewContainer');
  const empty = $('templateMediaEmpty');
  const addMore = $('btnAddMoreTemplateMedia');

  if (!container || !empty || !addMore) return;

  if (templateMediaFiles.length === 0) {
    container.style.display = 'none';
    empty.style.display = 'flex';
    addMore.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  container.style.display = 'flex';
  empty.style.display = 'none';
  addMore.style.display = 'block';
  container.innerHTML = '';

  templateMediaFiles.forEach((m, idx) => {
    const item = document.createElement('div');
    item.className = 'media-preview';
    item.style.display = 'flex';
    item.innerHTML = `
      <img src="${m.type && m.type.startsWith('image/') ? m.data : 'icon_file.png'}" style="width:40px; height:40px; object-fit:cover; border-radius:4px; background:#fff;">
      <div class="media-info" style="flex:1;">
        <div class="media-name" style="font-size:11px;">${m.name}</div>
        <div class="media-size" style="font-size:10px;">${m.size ? (m.size / 1024).toFixed(1) + ' KB' : ''}</div>
      </div>
      <svg class="media-remove" viewBox="0 0 24 24" style="width:18px; fill:currentColor; cursor:pointer; color:var(--error);"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
    `;
    item.querySelector('.media-remove').onclick = () => {
      templateMediaFiles.splice(idx, 1);
      $('templateMediaInput').value = '';
      renderTemplateMedia();
    };
    container.appendChild(item);
  });
}

function setupTemplates() {
  $('btnNewTemplate').onclick = () => {
    $('templateEditorCard').style.display = 'block';
    $('btnNewTemplate').style.display = 'none';
    $('templateMsg').value = '';
    templateMediaFiles = [];
    $('templateMediaInput').value = '';
    renderTemplateMedia();
  };

  $('btnCancelTemplate').onclick = () => {
    $('templateEditorCard').style.display = 'none';
    $('btnNewTemplate').style.display = 'block';
  };

  $('useTemplatesCycleToggle').onchange = (e) => {
    useTemplatesCycle = e.target.checked;
    saveState();
  };

  // Media
  $('templateMediaEmpty').onclick = () => $('templateMediaInput').click();
  $('btnAddMoreTemplateMedia').onclick = () => $('templateMediaInput').click();

  $('templateMediaInput').onchange = async (e) => {
    const files = e.target.files;
    if (!files.length) return;

    const btn = $('templateMediaEmpty');
    const oldText = btn.innerHTML;
    btn.innerHTML = '<span style="font-size:12px;">Processando arquivos...</span>';

    for (const file of files) {
      const data = await new Promise(r => {
        const reader = new FileReader();
        reader.onload = () => r(reader.result);
        reader.readAsDataURL(file);
      });
      templateMediaFiles.push({
        name: file.name,
        type: file.type,
        size: file.size,
        data: data
      });
    }
    btn.innerHTML = oldText;
    $('templateMediaInput').value = '';
    renderTemplateMedia();
  };

  $('btnSaveTemplate').onclick = () => {
    const text = $('templateMsg').value;
    if (!text.trim() && templateMediaFiles.length === 0) return alert('O modelo não pode estar vazio!');
    templates.push({
      id: Date.now().toString(),
      text: text,
      media: [...templateMediaFiles]
    });
    // Atualiza a UI imediatamente
    renderTemplates();
    $('btnCancelTemplate').click();
    
    // Tenta salvar de forma assíncrona
    try {
      chrome.storage.local.set({ templates }, () => {
        if (chrome.runtime.lastError) console.error('Erro ao salvar templates:', chrome.runtime.lastError);
      });
      saveState();
    } catch (e) {
      console.error('Exceção ao salvar templates:', e);
      saveState(); // Fallback
    }
  };

  $('btnStartTemplates').onclick = () => {
    if (templates.length === 0) return alert('Crie pelo menos um modelo primeiro!');

    // Força a ativação do ciclo e salva
    useTemplatesCycle = true;
    $('useTemplatesCycleToggle').checked = true;
    $('repeatCampaignToggle').checked = true;

    // Sincroniza o intervalo do ciclo
    const intervalVal = $('templateRepeatInterval').value || '60';
    $('repeatInterval').value = intervalVal;

    saveState();

    // Pula para a aba da campanha e inicia
    document.querySelector('.tab[data-tab="send"]').click();
    startCampaign(0);
  };

  // Chips de Variáveis
  $('btnChipGroupName').onclick = () => { addVarToTemplate('{nome_grupo}'); };
  $('btnChipDate').onclick = () => { addVarToTemplate('{data}'); };
}

function addVarToTemplate(v) {
  const input = $('templateMsg');
  const start = input.selectionStart;
  const end = input.selectionEnd;
  input.value = input.value.substring(0, start) + v + input.value.substring(end);
  input.focus();
};

function renderTemplates() {
  const list = $('templateList');
  if (!list) return;
  list.innerHTML = '';
  if (templates.length === 0) {
    list.innerHTML = '<div style="text-align:center; color:var(--txt2); font-size:12px;">Nenhum modelo salvo.</div>';
    return;
  }
  templates.forEach((t, index) => {
    const item = document.createElement('div');
    item.style.cssText = 'display:flex; align-items:center; gap:10px; padding:10px; background:var(--bg3); border-radius:6px; border:1px solid var(--brd);';
    item.innerHTML = `
      <div style="flex:1; overflow:hidden;">
        <div style="font-size:12px; font-weight:bold; color:var(--primary); margin-bottom:4px;">Modelo ${index + 1}</div>
        <div style="font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${t.text || '(Apenas Mídia)'}</div>
        ${Array.isArray(t.media) ? (t.media.length > 0 ? `<div style="font-size:10px; color:var(--txt2); margin-top:2px;">📎 ${t.media.length} arquivo(s)</div>` : '') : (t.media ? `<div style="font-size:10px; color:var(--txt2); margin-top:2px;">📎 ${t.media.name}</div>` : '')}
      </div>
      <button class="btn btn-outline" style="width:auto; padding:6px 10px; border-color:var(--error); color:var(--error);" title="Excluir">X</button>
    `;
    item.querySelector('button').onclick = () => {
      templates.splice(index, 1);
      
      // Atualiza a UI imediatamente
      renderTemplates();
      
      try {
        chrome.storage.local.set({ templates }, () => {
          if (chrome.runtime.lastError) console.error('Erro ao excluir template:', chrome.runtime.lastError);
        });
        saveState();
      } catch (e) {
        console.error('Exceção ao excluir template:', e);
        saveState();
      }
    };
    list.appendChild(item);
  });
}





function setupBot() {
  safeChange('welcomeEnabled', e => { 
    autoSettings.welcomeEnabled = e.target.checked; 
    $('welcomeSettings').style.display = e.target.checked ? 'block' : 'none';
    saveState(); 
  });
  safeChange('welcomeMsg', e => { autoSettings.welcomeMsg = e.target.value; saveState(); });

  safeChange('antiLink', e => { autoSettings.modAntiLink = e.target.checked; saveState(); });
  safeChange('antiAudio', e => { autoSettings.modAntiAudio = e.target.checked; saveState(); });
  safeChange('antiImage', e => { autoSettings.modAntiImage = e.target.checked; saveState(); });
  safeChange('antiVideo', e => { autoSettings.modAntiVideo = e.target.checked; saveState(); });
  safeChange('antiDocument', e => { autoSettings.modAntiDocument = e.target.checked; saveState(); });
  safeChange('antiSticker', e => { autoSettings.modAntiSticker = e.target.checked; saveState(); });
  safeChange('moderationAction', e => { autoSettings.modAction = e.target.value; saveState(); });
  
  safeClick('btnSaveModeration', () => { 
    saveState(); 
    alert('Regras de Moderação Salvas e Ativas! Mantenha a aba aberta.'); 
  });

  async function applyActiveChatAction(actionType) {
    let extraText = '';
    if (actionType === 'clear') {
      if (!confirm('Tem certeza que deseja APAGAR o histórico de mensagens deste grupo? Isso afeta apenas o seu celular.')) return;
    } else if (actionType === 'tagall') {
      extraText = prompt('Digite a mensagem para Marcar Todos:', 'Olá grupo!');
      if (extraText === null) return;
    } else if (actionType === 'hidetag') {
      extraText = prompt('Digite a mensagem para o Hidetag (avisos):', 'Comunicado importante!');
      if (extraText === null) return;
    }

    const tabs = await chrome.tabs.query({ url: '*://web.whatsapp.com/*' });
    if (!tabs.length) return alert('WhatsApp Web não está aberto.');
    
    const res = await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      world: 'MAIN',
      func: async (type, extra) => {
        try {
          const chat = await window.WPP?.chat?.getActiveChat();
          if (!chat) return { error: 'Nenhum chat aberto no WhatsApp Web.' };
          const gid = chat.id._serialized || chat.id;
          
          if (!gid.includes('@g.us') && !chat.isGroup && !chat.isCommunity && !chat.isAnnounceGrp) {
             return { error: 'Abra um grupo no WhatsApp Web primeiro.' };
          }

          if (type === 'open') {
            await window.WPP.group.setProperty(gid, 'announcement', false);
            return { ok: true, msg: 'Grupo aberto com sucesso!' };
          } else if (type === 'close') {
            await window.WPP.group.setProperty(gid, 'announcement', true);
            return { ok: true, msg: 'Grupo fechado com sucesso!' };
          } else if (type === 'clear') {
            await window.WPP.chat.clear(gid);
            return { ok: true, msg: 'Chat limpo com sucesso!' };
          } else if (type === 'links') {
            const code = await window.WPP.group.getInviteCode(gid);
            if (code) return { ok: true, link: `https://chat.whatsapp.com/${code}` };
            return { error: 'Não foi possível obter o link (você é admin?).' };
          } else if (type === 'tagall' || type === 'hidetag') {
            const p = await window.WPP.group.getParticipants(gid);
            if (!p || !p.length) return { error: 'Não foi possível obter os participantes.' };
            const mentions = p.map(x => x.id._serialized || x.id);
            let text = '';
            let options = { createChat: true, waitForAck: true, mentions };
            
            if (type === 'hidetag') {
              text = extra + "\\n" + "\\u200B".repeat(4000) + mentions.map(m => "@" + m.split('@')[0]).join(' ');
            } else {
               text = extra + "\\n\\n" + mentions.map(m => "@" + m.split('@')[0]).join(' ');
            }
            await window.WPP.chat.sendTextMessage(gid, text, options);
            return { ok: true, msg: 'Mensagem enviada com sucesso!' };
          }
        } catch (e) {
          return { error: e.message };
        }
      },
      args: [actionType, extraText]
    });

    const result = res?.[0]?.result;
    if (result?.error) {
      alert(result.error);
    } else if (result?.ok) {
      if (result.link) prompt("Link do Grupo:", result.link);
      else if (result.msg) alert(result.msg);
    }
  }

  safeClick('btnGroupOpen', () => applyActiveChatAction('open'));
  safeClick('btnGroupClose', () => applyActiveChatAction('close'));
  safeClick('btnGroupClear', () => applyActiveChatAction('clear'));
  safeClick('btnGroupLink', () => applyActiveChatAction('links'));
  safeClick('btnGroupTagAll', () => applyActiveChatAction('tagall'));
  safeClick('btnGroupHideTag', () => applyActiveChatAction('hidetag'));
}

function loadState() {
  chrome.storage.local.get(['selected', 'cfg', 'autoSettings', 'variations', 'allGroups', 'templates', 'useTemplatesCycle', 'GCRM_TASK_STATE'], (r) => {
    if (r.selected) selected = new Set(r.selected);
    if (r.allGroups) {
      allGroups = r.allGroups;
      renderGroups();
    }
    if (r.variations) {
      variations = r.variations;
      activeV = 0;
      switchVariation(0);
    }
    if (r.templates) {
      templates = r.templates;
      renderTemplates();
    }
    if (r.useTemplatesCycle !== undefined) {
      useTemplatesCycle = r.useTemplatesCycle;
      const toggle = $('useTemplatesCycleToggle');
      if (toggle) toggle.checked = useTemplatesCycle;
    }
    if (r.cfg) {
      cfg = { ...cfg, ...r.cfg };
      $('cfgDelayMin').value = cfg.delayMin;
      $('cfgDelayMax').value = cfg.delayMax;
      $('cfgLimit').value = cfg.dailyLimit;
      $('cfgMentionLimit').value = cfg.mentionLimit;
      const sigEl = $('cfgSignature');
      if (sigEl) {
        sigEl.value = cfg.signature || '';
        sigEl.dispatchEvent(new Event('input'));
      }

      if ($('cfgDarkMode')) $('cfgDarkMode').checked = cfg.darkMode;
      if ($('cfgThemeColor')) $('cfgThemeColor').value = cfg.themeColor;
      applyTheme(cfg.darkMode, cfg.themeColor);
    }
    if (r.autoSettings) {
      autoSettings = { ...autoSettings, ...r.autoSettings };

      if ($('welcomeEnabled')) {
        $('welcomeEnabled').checked = autoSettings.welcomeEnabled;
        if (autoSettings.welcomeEnabled) $('welcomeSettings').style.display = 'block';
      }
      if ($('welcomeMsg')) $('welcomeMsg').value = autoSettings.welcomeMsg || '';

      if ($('antiLink')) $('antiLink').checked = autoSettings.modAntiLink;
      if ($('antiAudio')) $('antiAudio').checked = autoSettings.modAntiAudio;
      if ($('antiImage')) $('antiImage').checked = autoSettings.modAntiImage;
      if ($('antiVideo')) $('antiVideo').checked = autoSettings.modAntiVideo;
      if ($('antiDocument')) $('antiDocument').checked = autoSettings.modAntiDocument;
      if ($('antiSticker')) $('antiSticker').checked = autoSettings.modAntiSticker;
      if ($('moderationAction')) $('moderationAction').value = autoSettings.modAction || 'delete';

      // UI Sync
      if ($('welcomeEnabled')) $('welcomeEnabled').checked = !!autoSettings.welcomeEnabled;
      if ($('welcomeMsg')) $('welcomeMsg').value = autoSettings.welcomeMsg || '';
      if ($('welcomeGroupEnabled')) $('welcomeGroupEnabled').checked = !!autoSettings.welcomeGroupEnabled;
      if ($('welcomePrivateEnabled')) $('welcomePrivateEnabled').checked = !!autoSettings.welcomePrivateEnabled;

      if ($('leaveEnabled')) $('leaveEnabled').checked = !!autoSettings.leaveEnabled;
      if ($('leaveMsg')) $('leaveMsg').value = autoSettings.leaveMsg || '';
      if ($('leaveGroupEnabled')) $('leaveGroupEnabled').checked = !!autoSettings.leaveGroupEnabled;
      if ($('leavePrivateEnabled')) $('leavePrivateEnabled').checked = !!autoSettings.leavePrivateEnabled;

      if ($('autoApplyToAll')) $('autoApplyToAll').checked = !!autoSettings.applyToAll;



      if (r.autoSettings.allowedGroups) autoSelectedGroups = new Set(r.autoSettings.allowedGroups);
      
      if (typeof window.renderAutoReplyRules === 'function') window.renderAutoReplyRules();
    }
    if (r.GCRM_TASK_STATE) {
      // Sincroniza a UI com o progresso atual do background
      chrome.runtime.sendMessage({ action: 'taskProgress', state: r.GCRM_TASK_STATE });
    }
  });
}

function saveHistory() {
  // Opcional: implementar log de histórico
}

window.addVar = addVar;

function setupAutoReply() {
  // Carrega configurações salvas
window.renderAutoReplyRules = function() {
    const list = $('autoReplyList');
    if (!list) return;
    const rules = autoSettings.autoReplyRules || [];
    if (rules.length === 0) {
      list.innerHTML = '<div style="font-size:11px; color:var(--txt2); text-align:center; padding:10px;">Nenhuma regra cadastrada.</div>';
      return;
    }
    list.innerHTML = '';
    rules.forEach((rule, i) => {
      const div = document.createElement('div');
      div.style.cssText = 'background:var(--bg3); border:1px solid var(--brd); border-radius:8px; padding:10px; position:relative;';
      div.innerHTML = `
        <div style="font-size:12px; font-weight:bold; color:var(--primary); margin-bottom:4px;">
          🔑 [${rule.matchType === 'exact' ? 'Igual' : 'Contém'}] "${rule.keyword}"
          ${rule.oncePerContact ? '<span style="font-size:10px; color:var(--txt2); font-weight:normal;"> · uma vez por contato</span>' : ''}
        </div>
        <div style="font-size:11px; color:var(--txt); white-space:pre-wrap; word-break:break-word; max-height:60px; overflow:hidden;">${rule.message}</div>
        <button data-idx="${i}" class="btn-remove-rule" style="position:absolute; top:8px; right:8px; background:transparent; border:none; color:var(--error); cursor:pointer; font-size:14px;">✕</button>
      `;
      div.querySelector('.btn-remove-rule').onclick = () => {
        autoSettings.autoReplyRules.splice(i, 1);
        window.renderAutoReplyRules();
        saveStateAndSync();
      };
      list.appendChild(div);
    });
  };

  // Carrega estado inicial da UI
  if ($('autoReplyEnabled')) $('autoReplyEnabled').checked = !!autoSettings.autoReplyEnabled;
  if ($('autoReplyScope')) $('autoReplyScope').value = autoSettings.autoReplyScope || 'private';
  if ($('autoReplyDelay')) $('autoReplyDelay').value = autoSettings.autoReplyDelay || 2;
  window.renderAutoReplyRules();

  // Toggle ativar/desativar
  safeChange('autoReplyEnabled', e => {
    autoSettings.autoReplyEnabled = e.target.checked;
    saveStateAndSync();
  });

  safeChange('autoReplyScope', e => {
    autoSettings.autoReplyScope = e.target.value;
    saveStateAndSync();
  });

  safeChange('autoReplyDelay', e => {
    autoSettings.autoReplyDelay = parseInt(e.target.value) || 2;
    saveStateAndSync();
  });

  // Adicionar nova regra
  safeClick('btnAddAutoReply', () => {
    const keyword = $('autoReplyKeyword')?.value.trim();
    const matchType = $('autoReplyMatchType')?.value || 'contains';
    const message = $('autoReplyMessage')?.value.trim();
    const oncePerContact = !!($('autoReplyOncePerContact')?.checked);

    if (!keyword) return alert('Digite uma palavra-chave!');
    if (!message) return alert('Digite a mensagem de resposta!');

    if (!autoSettings.autoReplyRules) autoSettings.autoReplyRules = [];
    autoSettings.autoReplyRules.push({ keyword, matchType, message, oncePerContact });

    // Limpa os campos
    if ($('autoReplyKeyword')) $('autoReplyKeyword').value = '';
    if ($('autoReplyMatchType')) $('autoReplyMatchType').value = 'contains';
    if ($('autoReplyMessage')) $('autoReplyMessage').value = '';
    if ($('autoReplyOncePerContact')) $('autoReplyOncePerContact').checked = false;

    window.renderAutoReplyRules();
    saveStateAndSync();
  });

  // Salvar e sincronizar com o WhatsApp Web
  safeClick('btnSaveAutoReply', () => {
    saveStateAndSync();
    alert('✅ Configurações de Auto-Resposta salvas!');
  });
}

function setupAppearance() {
  const toggle = $('cfgDarkMode');
  const select = $('cfgThemeColor');

  if (toggle) {
    toggle.onchange = (e) => {
      cfg.darkMode = e.target.checked;
      saveState();
      applyTheme(cfg.darkMode, cfg.themeColor);
    };
  }

  if (select) {
    select.onchange = (e) => {
      cfg.themeColor = e.target.value;
      saveState();
      applyTheme(cfg.darkMode, cfg.themeColor);
    };
  }
}

function applyTheme(isDark, color) {
  const root = document.documentElement;

  if (isDark) {
    root.style.setProperty('--bg', '#0b0d12');
    root.style.setProperty('--bg2', '#131720');
    root.style.setProperty('--bg3', '#1a1f2b');
    root.style.setProperty('--brd', '#262d3d');
    root.style.setProperty('--txt', '#f0f2f5');
    root.style.setProperty('--txt2', '#8696a0');
  } else {
    root.style.setProperty('--bg', '#f0f2f5');
    root.style.setProperty('--bg2', '#ffffff');
    root.style.setProperty('--bg3', '#e9edef');
    root.style.setProperty('--brd', '#d1d7db');
    root.style.setProperty('--txt', '#111b21');
    root.style.setProperty('--txt2', '#667781');
  }

  if (color) {
    if (color === '#ffffff' && !isDark) {
      root.style.setProperty('--primary', '#111b21');
    } else {
      root.style.setProperty('--primary', color);
    }
  }
}

// ── WHATSAPP DIRECT LINK ─────────────────────────────────────────────────────
/**
 * Abre uma conversa no WhatsApp com o número informado.
 * @param {string|number} numero - Número com ou sem formatação (ex: "55 21 99999-9999" ou "552199999999")
 * @example abrirConversaWhatsApp("552139509590") → abre https://wa.me/552139509590
 */
function abrirConversaWhatsApp(numero) {
  const limpo = String(numero).replace(/\D/g, '');
  const url = `https://wa.me/${limpo}`;
  window.open(url, '_blank');
}

window.abrirConversaWhatsApp = abrirConversaWhatsApp;
