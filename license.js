/**
 * 🔒 LICENSE.JS - SECURE SHIELD MODE (WEB CONTEXT)
 * Funciona diretamente no navegador, sem dependência de chrome.storage.
 * Armazenamento via localStorage. Validação via Supabase.
 */
(function () {
    'use strict';

    // ─── CONFIGURAÇÃO ───────────────────────────────────────────────────────────
    const BLOCKER_ID     = 'ext-license-blocker';
    const LS_KEY         = 'gcrm_license_key';
    const LS_CACHE       = 'gcrm_license_cache';
    const CACHE_TTL      = 24 * 60 * 60 * 1000; // 24h

    const _d = (s) => atob(s).split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 0x07)).join('');
    const SUPABASE_URL   = _d('b3Nzd3Q9KCh+cnBxcG9kanJsc3JvdWxgdmp9cil0cndmZWZ0YilkaA==');
    const SUPABASE_KEY   = _d('Yn5Nb2VAZG5Ibk1OUn1ONkluTnROaVUyZEROMU5sd19RRE0+KWJ+TXdkNEpuSG5NfWNfRW9eakF9XVROdE5pTWtdbk4xTmlrNmM0XTRmQElzY1BzN2NQb35mNWN/ZV93Nk5ucG5kaj50XVROMU5qQXJlNTNuS0RNd15fVm5IbUI0SW1sM0hDSjNIQ1Z0TmpRM2RETjFKbUYzSVNWNkhTYDNJTzcpY3RTRGVeV0RfX34zVTJPfzZUcHAwTWFiY0w3Sl5AfXRqdTU/NVZxRH9tNw==');

    // ─── HTML DO BLOQUEADOR ──────────────────────────────────────────────────────
    const BLOCKER_HTML = `
        <div id="${BLOCKER_ID}" style="position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;background:#0f172a!important;z-index:2147483647!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;font-family:Inter,sans-serif!important;color:white!important;">
            <div style="background:#1e293b;padding:2.5rem;border-radius:16px;border:1px solid #334155;max-width:420px;width:90%;text-align:center;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);">
                <div style="margin-bottom:1.5rem;">
                    <img src="logo.png" onerror="this.style.display='none'" style="width:72px;height:72px;border-radius:12px;">
                </div>
                <h2 style="margin:0 0 0.5rem 0;color:#fff;font-size:1.4rem;">🔒 Ativação Necessária</h2>
                <p style="color:#94a3b8;margin-bottom:1.5rem;font-size:0.95rem;line-height:1.5;">Insira sua chave de licença para liberar o Grupo Sender.</p>
                <input type="text" id="ext-license-input" placeholder="Chave de Licença..." autocomplete="off"
                    style="width:100%;padding:13px;margin-bottom:12px;border-radius:8px;border:1px solid #475569;background:#0f172a;color:white;text-align:center;font-size:15px;box-sizing:border-box;outline:none;" />
                <button id="ext-license-btn"
                    style="width:100%;padding:13px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:15px;letter-spacing:0.5px;transition:opacity .2s;">
                    ATIVAR AGORA
                </button>
                <p id="ext-error-msg" style="color:#ef4444;font-size:13px;margin-top:14px;display:none;background:rgba(239,68,68,0.1);padding:10px;border-radius:6px;"></p>
            </div>
        </div>
    `;

    // ─── VERIFICAÇÃO ONLINE NO SUPABASE ──────────────────────────────────────────
    async function checkLicenseOnline(key) {
        if (!key) return { valid: false, msg: 'Chave inválida.' };
        try {
            const url = `${SUPABASE_URL}/rest/v1/licenses?license_key=eq.${encodeURIComponent(key)}&select=*,extensions:extension_id(name)`;
            const res = await fetch(url, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) throw new Error('DB_ERR');
            const data = await res.json();
            if (!data.length) return { valid: false, msg: 'Licença não encontrada.' };

            const lic = data[0];
            if (!lic.extensions || lic.extensions.name !== 'sender')
                return { valid: false, msg: 'Licença incompatível com este produto.' };
            if (lic.status !== 'active')
                return { valid: false, msg: 'Licença inativa. Contate o suporte.' };
            if (lic.expires_at && new Date(lic.expires_at) < new Date())
                return { valid: false, msg: 'Licença expirada.' };

            return { valid: true, data: lic };
        } catch (e) {
            return { valid: false, msg: 'Sem conexão com servidor de licenças.' };
        }
    }

    // ─── INJETAR BLOQUEADOR ───────────────────────────────────────────────────────
    function injectUI() {
        if (document.getElementById(BLOCKER_ID)) return;
        const wrapper = document.createElement('div');
        wrapper.innerHTML = BLOCKER_HTML;
        const btn = wrapper.querySelector('#ext-license-btn');
        if (btn) btn.addEventListener('click', handleValidation);
        document.body.appendChild(wrapper);
        document.body.style.overflow = 'hidden';
    }

    // ─── LIBERAR TELA ────────────────────────────────────────────────────────────
    function unlockUI() {
        document.body.setAttribute('data-license-authorized', 'true');
        document.body.style.overflow = '';
        const blocker = document.getElementById(BLOCKER_ID);
        if (blocker) blocker.remove();
    }

    // ─── HANDLER DO BOTÃO ATIVAR ─────────────────────────────────────────────────
    async function handleValidation() {
        const btn      = document.getElementById('ext-license-btn');
        const input    = document.getElementById('ext-license-input');
        const errorMsg = document.getElementById('ext-error-msg');
        if (!btn || !input) return;

        const key = input.value.trim();
        if (!key) {
            if (errorMsg) { errorMsg.innerText = 'Digite a chave de licença.'; errorMsg.style.display = 'block'; }
            return;
        }

        btn.innerText = 'Validando...';
        btn.disabled  = true;
        if (errorMsg) errorMsg.style.display = 'none';

        const result = await checkLicenseOnline(key);

        if (result.valid) {
            // Salva no localStorage para não pedir na próxima vez (por 24h)
            localStorage.setItem(LS_KEY, key);
            localStorage.setItem(LS_CACHE, JSON.stringify({ key, ts: Date.now(), status: 'active' }));
            unlockUI();
        } else {
            btn.innerText = 'ATIVAR AGORA';
            btn.disabled  = false;
            if (errorMsg) { errorMsg.innerText = result.msg; errorMsg.style.display = 'block'; }
        }
    }

    // ─── WATCHDOG (reinjeta se alguém tentar remover o blocker via DevTools) ────
    setInterval(() => {
        if (document.body.getAttribute('data-license-authorized') !== 'true' && !document.getElementById(BLOCKER_ID)) {
            injectUI();
        }
    }, 2000);

    window.addEventListener('click', (e) => {
        if (e.target.id === 'ext-license-input') return;
        if (e.target.id === 'ext-license-btn' || e.target.closest && e.target.closest('#ext-license-btn')) return;
        if (document.body.getAttribute('data-license-authorized') !== 'true') {
            e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault();
            injectUI();
        }
    }, true);

    // ─── INICIALIZAÇÃO ────────────────────────────────────────────────────────────
    function init() {
        const cachedKey = localStorage.getItem(LS_KEY);
        if (!cachedKey) {
            // Sem chave salva → mostra bloqueio imediatamente
            return injectUI();
        }

        // Tem chave: verifica cache local de 24h
        try {
            const cache = JSON.parse(localStorage.getItem(LS_CACHE) || '{}');
            const cacheOk = cache.key === cachedKey && (Date.now() - cache.ts < CACHE_TTL);

            if (cacheOk) {
                // Cache válido → libera imediatamente e valida em segundo plano
                unlockUI();
                checkLicenseOnline(cachedKey).then(r => {
                    if (!r.valid) {
                        // Licença revogada no servidor → volta a bloquear
                        localStorage.removeItem(LS_KEY);
                        localStorage.removeItem(LS_CACHE);
                        document.body.removeAttribute('data-license-authorized');
                        injectUI();
                        const err = document.getElementById('ext-error-msg');
                        if (err) { err.innerText = r.msg; err.style.display = 'block'; }
                    }
                });
            } else {
                // Cache expirado → valida agora e bloqueia até confirmar
                injectUI();
                checkLicenseOnline(cachedKey).then(r => {
                    if (r.valid) {
                        localStorage.setItem(LS_CACHE, JSON.stringify({ key: cachedKey, ts: Date.now(), status: 'active' }));
                        unlockUI();
                    } else {
                        localStorage.removeItem(LS_KEY);
                        localStorage.removeItem(LS_CACHE);
                        const err = document.getElementById('ext-error-msg');
                        if (err) { err.innerText = r.msg; err.style.display = 'block'; }
                    }
                });
            }
        } catch (e) {
            injectUI();
        }
    }

    // Aguarda o DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
