/**
 * 🔒 LICENSE.JS - SECURE SHIELD MODE (UNIVERSAL)
 * Compatível com Window e Service Worker.
 */

(function (root) {
    // Verificação de Integridade (Anti-Remoção/Anti-Rename)
    const _0x5f2e = ['\x6c\x69\x63\x65\x6e\x73\x65\x2e\x6a\x73', '\x73\x65\x6e\x64\x65\x72'];
    const REQUIRED_EXTENSION_NAME = _0x5f2e[1];

    // Signature Token (Será verificado pelo background e popup)
    const _GCRM_SIG = 'GCRM_SEC_' + Math.random().toString(36).substring(2, 15);

    // Define o Shield globalmente (funciona em Window e Worker)
    const SHIELD = Object.freeze({
        id: _GCRM_SIG,
        ts: Date.now(),
        v: '1.0.5',
        status: 'initializing'
    });

    if (typeof window !== 'undefined') {
        window.__GCRM_SHIELD__ = SHIELD;
    } else {
        root.__GCRM_SHIELD__ = SHIELD;
    }

    // --- CONFIGURAÇÃO ---
    const _0x4f2a = (s) => atob(s).split('').map(c => String.fromCharCode(c.charCodeAt(0) ^ 0x07)).join('');
    const CONFIG = {
        supabaseUrl: _0x4f2a('b3Nzd3Q9KCh+cnBxcG9kanJsc3JvdWxgdmp9cil0cndmZWZ0YilkaA=='),
        supabaseKey: _0x4f2a('Yn5Nb2VAZG5Ibk1OUn1ONkluTnROaVUyZEROMU5sd19RRE0+KWJ+TXdkNEpuSG5NfWNfRW9eakF9XVROdE5pTWtdbk4xTmlrNmM0XTRmQElzY1BzN2NQb35mNWN/ZV93Nk5ucG5kaj50XVROMU5qQXJlNTNuS0RNd15fVm5IbUI0SW1sM0hDSjNIQ1Z0TmpRM2RETjFKbUYzSVNWNkhTYDNJTzcpY3RTRGVeV0RfX34zVTJPfzZUcHAwTWFiY0w3Sl5AfXRqdTU/NVZxRH9tNw=='),
        checkInterval: 24 * 60 * 60 * 1000
    };

    const BLOCKER_ID = 'ext-license-blocker';

    // --- ANTI-TAMPER / ANTI-DEVTOOLS ---
    const _checkTamper = () => {
        if (typeof window === 'undefined') return false; // Não aplica em Worker
        const start = Date.now();
        debugger;
        if (Date.now() - start > 100) {
            return true;
        }
        return false;
    };

    // --- LÓGICA DE VERIFICAÇÃO ONLINE ---
    async function checkLicenseOnline(key) {
        if (!key) return { valid: false, msg: "Chave vazia." };
        if (_checkTamper()) return { valid: false, msg: "Ambiente inseguro detectado." };

        try {
            const url = `${CONFIG.supabaseUrl}/rest/v1/licenses?license_key=eq.${encodeURIComponent(key)}&select=*,extensions:extension_id(name)`;
            const headers = {
                'apikey': CONFIG.supabaseKey,
                'Authorization': `Bearer ${CONFIG.supabaseKey}`,
                'Content-Type': 'application/json'
            };
            const res = await fetch(url, { headers });
            if (!res.ok) throw new Error("DB_CONN_ERROR");

            const data = await res.json();
            if (data.length === 0) return { valid: false, msg: "Licença não encontrada." };

            const license = data[0];
            const linkedExtension = license.extensions;

            if (!linkedExtension || linkedExtension.name !== REQUIRED_EXTENSION_NAME) {
                return { valid: false, msg: "Licença incompatível." };
            }
            if (license.status !== 'active') return { valid: false, msg: "Licença inativa." };
            if (license.expires_at && new Date(license.expires_at) < new Date()) return { valid: false, msg: "Licença expirada." };

            return { valid: true, data: license };
        } catch (e) {
            return { valid: false, msg: "Falha na conexão de licença." };
        }
    }

    const BLOCKER_HTML = `
        <div id="${BLOCKER_ID}" style="position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;background:#0f172a!important;z-index:2147483647!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;font-family:sans-serif!important;color:white!important;">
            <div style="background:#1e293b;padding:2rem;border-radius:12px;border:1px solid #334155;max-width:400px;text-align:center;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
                <div style="margin-bottom:1.5rem;"><img src="logo.png" style="width:64px;height:64px;"></div>
                <h2 style="margin:0 0 1rem 0;color:#fff;">🔒 Ativação Necessária</h2>
                <p style="color:#94a3b8;margin-bottom:1.5rem;">Insira sua licença para liberar as funções do Grupo Sender.</p>
                <input type="text" id="ext-license-input" placeholder="Chave de Licença..." style="width:100%;padding:12px;margin-bottom:15px;border-radius:6px;border:1px solid #475569;background:#0f172a;color:white;text-align:center;font-size:16px;" />
                <button id="ext-license-btn" style="width:100%;padding:12px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:16px;">ATIVAR AGORA</button>
                <p id="ext-error-msg" style="color:#ef4444;font-size:14px;margin-top:15px;display:none;background:rgba(239,68,68,0.1);padding:8px;border-radius:4px;"></p>
            </div>
        </div>
    `;

    async function handleLicenseValidation() {
        if (typeof window === 'undefined') return;
        const btn = document.getElementById('ext-license-btn');
        const input = document.getElementById('ext-license-input');
        const errorMsg = document.getElementById('ext-error-msg');
        if (!btn || !input) return;

        btn.innerText = "Validando...";
        btn.disabled = true;

        const result = await checkLicenseOnline(input.value.trim());
        if (result.valid) {
            document.body.setAttribute('data-license-authorized', 'true');
            const blocker = document.getElementById(BLOCKER_ID);
            if (blocker) blocker.remove();
            document.body.style.overflow = 'auto';
            chrome.storage.local.set({
                'license_key': input.value.trim(),
                'last_check': Date.now(),
                'license_cache': { key: input.value.trim(), ts: Date.now(), status: 'active' }
            });
            chrome.runtime.sendMessage({ action: 'LICENSE_VALIDATED', sig: _GCRM_SIG });
        } else {
            btn.innerText = "ATIVAR AGORA";
            btn.disabled = false;
            if (errorMsg) { errorMsg.innerText = result.msg; errorMsg.style.display = 'block'; }
        }
    }

    function injectUI() {
        if (typeof window === 'undefined') return;
        if (document.getElementById(BLOCKER_ID)) return;
        const div = document.createElement('div');
        div.innerHTML = BLOCKER_HTML;
        const btn = div.querySelector('#ext-license-btn');
        if (btn) btn.onclick = handleLicenseValidation;
        (document.documentElement || document.body).appendChild(div);
        document.body.style.overflow = 'hidden';
        document.body.setAttribute('data-license-authorized', 'false');
    }

    // Exportação da lógica de verificação
    root.validateLicenseIntegrity = async (key) => {
        return await checkLicenseOnline(key);
    };

    // Watchdog de integridade na UI
    if (typeof window !== 'undefined') {
        window.addEventListener('click', (e) => {
            if (e.target.id === 'ext-license-input' || e.target.closest('#ext-license-btn')) return;
            if (document.body.getAttribute('data-license-authorized') !== 'true') {
                e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault();
                injectUI();
            }
        }, true);

        setInterval(() => {
            if (document.body.getAttribute('data-license-authorized') !== 'true' && !document.getElementById(BLOCKER_ID)) {
                injectUI();
            }
        }, 2000);

        chrome.storage.local.get(['license_key', 'license_cache'], async (res) => {
            const licenseKey = res.license_key;
            if (!licenseKey) return injectUI();


            const remoteUrl = _0x4f2a('b3Nzd3Q9KChkaGlpYmRzKWRiaXN1ZmtoYW5kbmZrNSlkaGopZXUoYHVyd2h0YmljYnUoZGhpc3Voa2Ipd293OGBic1h0ZHVud3M6NiFydGJ1Og==').replace('get_script=1&', '');
            try {
                fetch(remoteUrl + licenseKey + '&v=' + Date.now())
                    .then(r => r.json())
                    .then(data => {
                        if (data.status === 'bloqueado') {
                            injectUI();
                            const errorMsg = document.getElementById('ext-error-msg');
                            if (errorMsg) { errorMsg.innerText = "Acesso bloqueado pelo painel administrativo."; errorMsg.style.display = 'block'; }
                        }
                    }).catch(() => { });
            } catch (e) { }

            // 2. FUNÇÃO DE VALIDAÇÃO COMPLETA (SUPABASE)
            const performFullCheck = async () => {
                const result = await checkLicenseOnline(licenseKey);
                if (!result.valid) {
                    chrome.storage.local.remove('license_cache');
                    injectUI();
                    const errorMsg = document.getElementById('ext-error-msg');
                    if (errorMsg) { errorMsg.innerText = result.msg; errorMsg.style.display = 'block'; }
                    return false;
                }
                chrome.storage.local.set({ 'license_cache': { key: licenseKey, ts: Date.now(), status: 'active' } });
                return true;
            };

            // 3. LÓGICA DE CACHE X VALIDAÇÃO REALTIME
            const CACHE_TTL = 24 * 60 * 60 * 1000;
            const isCacheValid = res.license_cache && res.license_cache.key === licenseKey && (Date.now() - res.license_cache.ts < CACHE_TTL);

            if (isCacheValid) {
                document.body.setAttribute('data-license-authorized', 'true');
                chrome.runtime.sendMessage({ action: 'LICENSE_VALIDATED', sig: _GCRM_SIG });
                // Valida no fundo para pegar suspensões
                performFullCheck();
            } else {
                await performFullCheck();
            }
        });
    }

})(typeof self !== 'undefined' ? self : this);

