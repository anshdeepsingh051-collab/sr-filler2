// ==UserScript==
// @name         Static Response Expected Answer Auto-Fill
// @namespace    http://tampermonkey.net/
// @version      2.8
// @description  Two-step picker on "Inaccurate" radio click — fills Expected Response textarea. Supports 9 categories including Language Guardrails and Custom Response.
// @match        https://orbit-beta.beta.harmony.a2z.com/*
// @match        https://orbit-gamma.beta.harmony.a2z.com/*
// @run-at       document-idle
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    // ═══════════════════════════════════════════════
    // RESPONSE MAP
    // ═══════════════════════════════════════════════

    const RESPONSE_MAP = {
        'Outside Knowledge Base': [
            "I'm sorry, but I couldn't find a specific answer to your question. For best assistance, I'd like to connect you with our customer service team. They'll be able to help you more directly. Is that okay?",
            "I'm sorry, the information about 'TOPIC' is not available in my knowledge base. I'd be happy to connect you with a customer service representative who can assist you further with this query.",
            "I can't find information about this in my current resources. Please contact Amazon Business Customer Service for assistance."
        ],
        'Understanding Customer Question': [
            "I'm not sure what you're looking for — could you please let me know what Amazon Business help you need?",
            "Could you please clarify what specific help you need related to Amazon Business features? Are you asking about 'TOPIC' (e.g., Pay by Invoice) or something else?",
            "I'm having trouble understanding your question — could you please clarify what specific Amazon Business help you need?",
            "Could you please rephrase your question so I can better assist you with your Amazon Business needs?"
        ],
        'Greeting': [
            "Hi there. How can I help you?"
        ],
        'Conclude Conversation': [
            "Thanks for reaching out. Feel free to contact us anytime if you need further assistance with Amazon Business!",
            "Have a great day, and we're here whenever you need help!"
        ],
        'Route to Customer Service (CS) and (CSAI)': [
            "Looking for more assistance? For faster support, start with our help pages."
        ],
        'Out of Scope': [
            "I'm still learning, and right now my expertise is focused on Amazon Business. Can I answer any questions about this topic?"
        ],
        'Trigger Guardrail': [
            "I apologize, but I'm not able to respond to that request. Could you please rephrase your question or ask about something else? I'm here to help with Amazon Business-related topics."
        ],
        'General Amazon Business Support': [
            "I'm sorry, but I couldn't find a specific answer to your question. For best assistance, I'd like to connect you with our customer service team. They'll be able to help you more directly. Is that okay?"
        ],
        'Language Guardrails': [
            "I notice you're writing in another language. Currently I'm only able to chat in English. Ask again in English?"
        ]
    };

    const CUSTOM_CATEGORY_KEY = 'orbit_sr_v2_custom_responses';

    // ═══════════════════════════════════════════════
    // HTML ESCAPE HELPER
    // ═══════════════════════════════════════════════

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ═══════════════════════════════════════════════
    // STORAGE HELPERS
    // ═══════════════════════════════════════════════

    function getCustomOptions(key) {
        try {
            const stored = localStorage.getItem('orbit_sr_' + key);
            return stored ? JSON.parse(stored) : [];
        } catch (e) { return []; }
    }

    function saveCustomOptions(key, options) {
        try {
            localStorage.setItem('orbit_sr_' + key, JSON.stringify(options));
        } catch (e) {}
    }

    function removeCustomOption(key, value) {
        let customs = getCustomOptions(key);
        customs = customs.filter(o => o !== value);
        saveCustomOptions(key, customs);
    }

    // ═══════════════════════════════════════════════
    // STYLES — Amazon Dark Theme
    // ═══════════════════════════════════════════════

    GM_addStyle(`

        /* ── Overlay ── */
        #sr-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.65); z-index: 99998; display: none;
        }

        /* ── Main Picker Container ── */
        #sr-picker {
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: #ffffff;
            border: none;
            border-radius: 12px;
            padding: 0;
            z-index: 99999;
            display: none;
            box-shadow: 0 12px 40px rgba(0,0,0,0.45);
            min-width: 480px; max-width: 560px;
            max-height: 85vh; overflow-y: auto;
            font-family: Arial, sans-serif;
        }

        /* ── Header Banner ── */
        #sr-picker .sr-header {
            background: #131921;
            padding: 16px 20px 14px;
            border-radius: 12px 12px 0 0;
            position: sticky; top: 0; z-index: 10;
        }

        #sr-picker .sr-header h3 {
            margin: 0 0 4px;
            font-size: 15px;
            font-weight: bold;
            color: #FF9900;
            letter-spacing: 0.3px;
        }

        #sr-picker .sr-step-label {
            font-size: 10px;
            color: #aaaaaa;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            margin: 0;
        }

        /* ── Body ── */
        #sr-picker .sr-body {
            padding: 14px 20px 20px;
        }

        /* ── Search Bar ── */
        #sr-picker .sr-search {
            width: 100%; padding: 9px 14px;
            margin-bottom: 12px;
            border: 1.5px solid #dddddd;
            border-radius: 6px;
            font-size: 13px;
            box-sizing: border-box;
            background: #f9f9f9;
            color: #131921;
        }

        #sr-picker .sr-search:focus {
            outline: none;
            border-color: #FF9900;
            background: #fff;
            box-shadow: 0 0 0 2px rgba(255,153,0,0.15);
        }

        /* ── Option Rows ── */
        #sr-picker .sr-opt-row {
            display: flex; align-items: flex-start;
            gap: 6px; margin-bottom: 7px;
        }

        /* ── Option Buttons ── */
        #sr-picker .sr-opt {
            flex: 1; padding: 10px 14px 10px 16px;
            background: #f8f8f8;
            border: 1px solid #e0e0e0;
            border-left: 5px solid #FF9900;
            border-radius: 6px;
            cursor: pointer;
            text-align: left;
            font-size: 13px;
            color: #131921;
            line-height: 1.5;
            box-sizing: border-box;
            white-space: normal;
            transition: background 0.15s, color 0.15s;
        }

        #sr-picker .sr-opt:hover {
            background: #131921;
            color: #FF9900;
            border-left-color: #FF9900;
            border-color: #131921;
        }

        /* ── Custom option starred ── */
        #sr-picker .sr-opt-custom {
            background: #fff8ee;
            border-left-color: #FF9900;
            border-color: #ffe0a0;
        }

        #sr-picker .sr-opt-custom:hover {
            background: #131921;
            color: #FF9900;
            border-color: #131921;
            border-left-color: #FF9900;
        }

        /* ── 10th Custom Response button ── */
        #sr-picker .sr-opt-tenth {
            background: #fff8ee;
            border: 1.5px solid #FF9900;
            border-left: 5px solid #FF9900;
            color: #cc7a00;
            font-weight: bold;
        }

        #sr-picker .sr-opt-tenth:hover {
            background: #131921;
            color: #FF9900;
            border-color: #131921;
            border-left-color: #FF9900;
        }

        /* ── Category badge ── */
        #sr-picker .sr-category-badge {
            display: inline-block;
            background: #131921;
            color: #FF9900;
            padding: 4px 14px;
            border-radius: 20px;
            font-size: 12px;
            margin-bottom: 12px;
            font-weight: bold;
            letter-spacing: 0.3px;
        }

        #sr-picker .sr-category-badge-custom {
            display: inline-block;
            background: #fff8ee;
            color: #cc7a00;
            padding: 4px 14px;
            border-radius: 20px;
            font-size: 12px;
            margin-bottom: 12px;
            font-weight: bold;
        }

        /* ── Delete button ── */
        #sr-picker .sr-del-btn {
            padding: 7px 10px;
            background: #cc0000;
            color: #fff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: bold;
            flex-shrink: 0;
            align-self: flex-start;
            margin-top: 2px;
            transition: background 0.15s;
        }

        #sr-picker .sr-del-btn:hover { background: #990000; }

        /* ── Custom add section ── */
        #sr-picker .sr-custom-section {
            margin-top: 14px;
            padding-top: 14px;
            border-top: 1px dashed #dddddd;
        }

        #sr-picker .sr-custom-label {
            font-size: 12px;
            color: #FF9900;
            margin-bottom: 6px;
            font-weight: bold;
        }

        #sr-picker .sr-custom-divider {
            font-size: 11px;
            color: #999999;
            margin: 12px 0 6px;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-top: 1px dashed #e0e0e0;
            padding-top: 10px;
        }

        /* ── Textarea ── */
        #sr-picker textarea.sr-custom-input {
            width: 100%; padding: 9px 12px;
            border: 1.5px solid #dddddd;
            border-radius: 6px;
            font-size: 13px;
            box-sizing: border-box;
            resize: vertical;
            min-height: 80px;
            font-family: Arial, sans-serif;
            line-height: 1.5;
            color: #131921;
            background: #fafafa;
        }

        #sr-picker textarea.sr-custom-input:focus {
            outline: none;
            border-color: #FF9900;
            background: #fff;
            box-shadow: 0 0 0 2px rgba(255,153,0,0.15);
        }

        /* ── Add row ── */
        #sr-picker .sr-add-row {
            display: flex; gap: 8px;
            align-items: flex-end;
            margin-top: 8px;
        }

        /* ── Add / Fill Now button ── */
        #sr-picker .sr-add-btn {
            padding: 9px 20px;
            background: #FF9900;
            color: #131921;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: bold;
            white-space: nowrap;
            flex-shrink: 0;
            transition: background 0.15s;
        }

        #sr-picker .sr-add-btn:hover { background: #e68a00; }

        /* ── Save and Fill button ── */
        #sr-picker .sr-save-btn {
            padding: 9px 20px;
            background: #131921;
            color: #FF9900;
            border: 1.5px solid #FF9900;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: bold;
            white-space: nowrap;
            flex-shrink: 0;
            transition: background 0.15s, color 0.15s;
        }

        #sr-picker .sr-save-btn:hover {
            background: #FF9900;
            color: #131921;
        }

        /* ── Back button ── */
        #sr-picker .sr-back {
            display: block; width: 100%;
            padding: 10px 12px; margin-top: 10px;
            background: #f0f0f0;
            color: #131921;
            border: 1px solid #cccccc;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: bold;
            box-sizing: border-box;
            transition: background 0.15s, color 0.15s;
        }

        #sr-picker .sr-back:hover {
            background: #131921;
            color: #ffffff;
            border-color: #131921;
        }

        /* ── Cancel button ── */
        #sr-picker .sr-cancel {
            display: block; width: 100%;
            padding: 10px 12px; margin-top: 6px;
            background: #131921;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: bold;
            box-sizing: border-box;
            transition: background 0.15s;
        }

        #sr-picker .sr-cancel:hover { background: #000000; }

        /* ── Hide class ── */
        .sr-hide { display: none !important; }

        /* ── Hint text ── */
        .sr-hint {
            font-size: 11px;
            color: #999999;
            margin-top: 5px;
            font-style: italic;
        }

        /* ── Badge ── */
        #sr-badge {
            position: fixed; bottom: 15px; right: 15px;
            background: #131921;
            color: #FF9900;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            z-index: 99997;
            box-shadow: 0 2px 10px rgba(0,0,0,0.4);
            font-family: Arial, sans-serif;
            cursor: pointer;
            border: 1.5px solid #FF9900;
            transition: background 0.15s, color 0.15s;
        }

        #sr-badge:hover {
            background: #FF9900;
            color: #131921;
        }

        /* ── Confirm overlay ── */
        .sr-confirm-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.65); z-index: 100001;
            display: flex; align-items: center; justify-content: center;
        }

        .sr-confirm-box {
            background: #ffffff;
            border-radius: 10px;
            padding: 28px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.35);
            min-width: 340px;
            font-family: Arial;
            text-align: center;
            border-top: 4px solid #FF9900;
        }

        .sr-confirm-box h4 {
            margin: 0 0 8px;
            color: #131921;
            font-size: 16px;
        }

        .sr-confirm-box p {
            margin: 0 0 18px;
            font-size: 13px;
            color: #555555;
        }

        .sr-confirm-btns {
            display: flex; gap: 10px; justify-content: center;
        }

        .sr-confirm-btns button {
            padding: 9px 26px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.15s;
        }

        .sr-confirm-yes {
            background: #cc0000; color: #fff;
        }

        .sr-confirm-yes:hover { background: #990000; }

        .sr-confirm-no {
            background: #131921;
            color: #FF9900;
            border: 1.5px solid #FF9900;
        }

        .sr-confirm-no:hover {
            background: #FF9900;
            color: #131921;
        }

        /* ── Debug Panel ── */
        #sr-debug-panel {
            position: fixed; bottom: 55px; right: 15px;
            background: #131921;
            color: #FF9900;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 11px;
            z-index: 99997;
            font-family: monospace;
            max-width: 420px;
            max-height: 200px;
            overflow-y: auto;
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
            display: none;
            white-space: pre-wrap;
            word-break: break-all;
            border: 1px solid #FF9900;
        }

        /* ── Toast ── */
        .sr-toast {
            position: fixed; bottom: 60px; right: 15px;
            background: #131921;
            color: #FF9900;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 13px;
            z-index: 100002;
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            font-family: Arial;
            border: 1px solid #FF9900;
            font-weight: bold;
        }

    `);

    // ═══════════════════════════════════════════════
    // UI ELEMENTS
    // ═══════════════════════════════════════════════

    const badge = document.createElement('div');
    badge.id = 'sr-badge';
    badge.textContent = '🟠 SR Filler Active';
    badge.title = 'Click to open picker manually';
    badge.addEventListener('click', () => showPicker());
    document.body.appendChild(badge);

    const debugPanel = document.createElement('div');
    debugPanel.id = 'sr-debug-panel';
    document.body.appendChild(debugPanel);

    const overlay = document.createElement('div');
    overlay.id = 'sr-overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', hidePicker);

    const picker = document.createElement('div');
    picker.id = 'sr-picker';
    document.body.appendChild(picker);

    // ═══════════════════════════════════════════════
    // DEBUG LOGGER
    // ═══════════════════════════════════════════════

    let debugLines = [];
    function debugLog(msg) {
        debugLines.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
        if (debugLines.length > 30) debugLines.shift();
        debugPanel.textContent = debugLines.join('\n');
        debugPanel.scrollTop = debugPanel.scrollHeight;
    }

    // ═══════════════════════════════════════════════
    // PICKER BUSY FLAG
    // ═══════════════════════════════════════════════

    let pickerBusy = false;

    function showPicker() {
        pickerBusy = true;
        overlay.style.display = 'block';
        picker.style.display = 'block';
        renderCategoryStep();
    }

    function hidePicker() {
        overlay.style.display = 'none';
        picker.style.display = 'none';
        setTimeout(() => { pickerBusy = false; }, 500);
    }

    // ═══════════════════════════════════════════════
    // EVENT DELEGATION
    // ═══════════════════════════════════════════════

    let lastTriggerTime = 0;
    const DEBOUNCE_MS = 2500;

    function isInaccurateTarget(target) {
        if (!target) return false;

        if (target.type === 'radio') {
            const val = (target.value || '').trim().toLowerCase();
            const id  = (target.id   || '').toLowerCase();
            if (val === 'inaccurate' || id.includes('inaccurate')) return true;
        }

        if (target.tagName === 'LABEL') {
            const forId = target.htmlFor;
            if (forId) {
                const radio = document.getElementById(forId);
                if (radio) {
                    const val = (radio.value || '').trim().toLowerCase();
                    const id  = (radio.id   || '').toLowerCase();
                    if (val === 'inaccurate' || id.includes('inaccurate')) return true;
                }
            }
            const inner = target.querySelector('input[type="radio"]');
            if (inner) {
                const val = (inner.value || '').trim().toLowerCase();
                const id  = (inner.id   || '').toLowerCase();
                if (val === 'inaccurate' || id.includes('inaccurate')) return true;
            }
        }

        const parentLabel = target.closest('label');
        if (parentLabel) {
            const text = parentLabel.textContent.trim().toLowerCase();
            if (text === 'inaccurate') return true;
            if (parentLabel.htmlFor) {
                const radio = document.getElementById(parentLabel.htmlFor);
                if (radio) {
                    const val = (radio.value || '').trim().toLowerCase();
                    if (val === 'inaccurate') return true;
                }
            }
        }

        // FIX #4 — scoped to radio class names only
        const radioDiv = target.closest(
            '.radio-option, .radio-group, [class*="radio"], [class*="Radio"]'
        );
        if (radioDiv) {
            const radio = radioDiv.querySelector('input[type="radio"]');
            if (radio) {
                const val = (radio.value || '').trim().toLowerCase();
                const id  = (radio.id   || '').toLowerCase();
                if (val === 'inaccurate' || id.includes('inaccurate')) return true;
            }
        }

        return false;
    }

    function tryOpen(source) {
        const now = Date.now();
        if (now - lastTriggerTime < DEBOUNCE_MS) {
            debugLog(`Debounced (${source})`);
            return;
        }
        if (pickerBusy) {
            debugLog('Picker busy — skipping');
            return;
        }
        lastTriggerTime = now;
        debugLog(`Opening picker (${source})`);
        badge.textContent = '🟠 Inaccurate selected';
        setTimeout(() => { badge.textContent = '🟠 SR Filler Active'; }, 3000);
        setTimeout(() => showPicker(), 350);
    }

    // FIX #4 — picker.contains guard on both listeners
    document.addEventListener('click', function (e) {
        if (pickerBusy) return;
        if (picker.contains(e.target)) return;
        if (isInaccurateTarget(e.target)) {
            debugLog(`Click: tag=${e.target.tagName} id="${e.target.id}"`);
            tryOpen('click');
        }
    }, true);

    document.addEventListener('change', function (e) {
        if (pickerBusy) return;
        if (picker.contains(e.target)) return;
        const t = e.target;
        if (t.type === 'radio' && t.checked) {
            const val = (t.value || '').trim().toLowerCase();
            const id  = (t.id   || '').toLowerCase();
            if (val === 'inaccurate' || id.includes('inaccurate')) {
                debugLog(`Change: id="${t.id}" value="${t.value}"`);
                tryOpen('change');
            }
        }
    }, true);

    // ═══════════════════════════════════════════════
    // DELETE CONFIRMATION
    // ═══════════════════════════════════════════════

    function showDeleteConfirm(value, onConfirm) {
        const el = document.createElement('div');
        el.className = 'sr-confirm-overlay';
        el.innerHTML = `
            <div class="sr-confirm-box">
                <h4>🗑️ Delete Custom Response?</h4>
                <p>This will permanently remove this custom response.</p>
                <div class="sr-confirm-btns">
                    <button class="sr-confirm-yes">🗑️ Delete</button>
                    <button class="sr-confirm-no">Cancel</button>
                </div>
            </div>`;
        document.body.appendChild(el);
        el.querySelector('.sr-confirm-yes').onclick = () => { el.remove(); onConfirm(); };
        el.querySelector('.sr-confirm-no').onclick = () => el.remove();
    }

    // ═══════════════════════════════════════════════
    // STEP 1 — CATEGORY PICKER
    // ═══════════════════════════════════════════════

    function renderCategoryStep() {
        let html = `
            <div class="sr-header">
                <h3>📋 Expected Response</h3>
                <div class="sr-step-label">Step 1 of 2 — Select a Response Category</div>
            </div>
            <div class="sr-body">
                <input type="text" class="sr-search"
                    placeholder="🔍 Search categories..." />`;

        Object.keys(RESPONSE_MAP).forEach(cat => {
            html += `
                <div class="sr-opt-row"
                    data-search="${escapeHtml(cat.toLowerCase())}">
                    <button class="sr-opt sr-cat-opt"
                        data-cat="${escapeHtml(cat)}">
                        📁 ${escapeHtml(cat)}
                    </button>
                </div>`;
        });

        // FIX #6 — updated class from sr-opt-ninth to sr-opt-tenth
        // since Language Guardrails is now the 9th category
        html += `
            <div class="sr-opt-row" data-search="custom response">
                <button class="sr-opt sr-opt-tenth sr-custom-cat-opt">
                    ✏️ Custom Response
                </button>
            </div>
            <button class="sr-cancel">✖ Cancel</button>
            </div>`;

        picker.innerHTML = html;

        const searchBox = picker.querySelector('.sr-search');
        if (searchBox) {
            searchBox.addEventListener('input', function () {
                const q = this.value.toLowerCase();
                picker.querySelectorAll('.sr-opt-row').forEach(row =>
                    row.classList.toggle('sr-hide',
                        !row.dataset.search.includes(q))
                );
            });
        }

        picker.querySelectorAll('.sr-cat-opt').forEach(btn => {
            btn.addEventListener('click', function () {
                renderResponseStep(this.dataset.cat);
            });
        });

        const tenthBtn = picker.querySelector('.sr-custom-cat-opt');
        if (tenthBtn) tenthBtn.addEventListener('click', () =>
            renderCustomResponseStep()
        );

        const cancelBtn = picker.querySelector('.sr-cancel');
        if (cancelBtn) cancelBtn.addEventListener('click', hidePicker);

        setTimeout(() => { if (searchBox) searchBox.focus(); }, 100);
    }

    // ═══════════════════════════════════════════════
    // STEP 2A — BUILT-IN CATEGORY RESPONSE PICKER
    // ═══════════════════════════════════════════════

    function renderResponseStep(category) {
        const builtIn = RESPONSE_MAP[category] || [];
        const custom = getCustomOptions('resp_' + category);

        let html = `
            <div class="sr-header">
                <h3>📋 Expected Response</h3>
                <div class="sr-step-label">Step 2 of 2 — Select a Response</div>
            </div>
            <div class="sr-body">
                <div class="sr-category-badge">
                    📁 ${escapeHtml(category)}
                </div><br/>
                <input type="text" class="sr-search"
                    placeholder="🔍 Search responses..." />`;

        builtIn.forEach(resp => {
            html += `
                <div class="sr-opt-row"
                    data-search="${escapeHtml(resp.toLowerCase())}">
                    <button class="sr-opt sr-resp-opt"
                        data-val="${encodeURIComponent(resp)}">
                        ${escapeHtml(resp)}
                    </button>
                </div>`;
        });

        if (custom.length > 0) {
            html += `<div class="sr-custom-divider">⭐ Custom Responses</div>`;
            custom.forEach(resp => {
                html += `
                    <div class="sr-opt-row"
                        data-search="${escapeHtml(resp.toLowerCase())}">
                        <button class="sr-opt sr-opt-custom sr-resp-opt"
                            data-val="${encodeURIComponent(resp)}">
                            ⭐ ${escapeHtml(resp)}
                        </button>
                        <button class="sr-del-btn sr-del-resp"
                            data-del="${encodeURIComponent(resp)}"
                            title="Delete">✕</button>
                    </div>`;
            });
        }

        html += `
            <div class="sr-custom-section">
                <div class="sr-custom-label">
                    ➕ Add Custom Response for "${escapeHtml(category)}"
                </div>
                <textarea class="sr-custom-input"
                    placeholder="Type your custom expected response...">
                </textarea>
                <div class="sr-hint">Tip: Press Ctrl+Enter to quickly add</div>
                <div class="sr-add-row">
                    <button class="sr-add-btn">ADD</button>
                </div>
            </div>
            <button class="sr-back">⬅ Back to Categories</button>
            <button class="sr-cancel">✖ Cancel</button>
            </div>`;

        picker.innerHTML = html;

        const searchBox = picker.querySelector('.sr-search');
        if (searchBox) {
            searchBox.addEventListener('input', function () {
                const q = this.value.toLowerCase();
                picker.querySelectorAll('.sr-opt-row').forEach(row =>
                    row.classList.toggle('sr-hide',
                        !row.dataset.search.includes(q))
                );
            });
        }

        picker.querySelectorAll('.sr-resp-opt').forEach(btn => {
            btn.addEventListener('click', function () {
                const val = decodeURIComponent(this.dataset.val);
                const textarea = findExpectedResponseField();
                hidePicker();
                setTimeout(() => {
                    if (textarea) {
                        smartFill(textarea, val);
                        showToast('✅ Expected Response filled!');
                    } else {
                        alert('❌ Could not find Expected Response textarea!');
                    }
                }, 400);
            });
        });

        picker.querySelectorAll('.sr-del-resp').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const val = decodeURIComponent(this.dataset.del);
                showDeleteConfirm(val, () => {
                    removeCustomOption('resp_' + category, val);
                    showToast('🗑️ Deleted custom response');
                    renderResponseStep(category);
                });
            });
        });

        const customInput = picker.querySelector('.sr-custom-input');
        const addBtn = picker.querySelector('.sr-add-btn');

        function addCustomResponse() {
            const v = customInput.value.trim();
            if (!v) { showToast('⚠️ Please type a response first!'); return; }
            const all = [...builtIn, ...getCustomOptions('resp_' + category)];
            if (all.includes(v)) { showToast('⚠️ Response already exists!'); return; }
            const c = getCustomOptions('resp_' + category);
            c.push(v);
            saveCustomOptions('resp_' + category, c);
            showToast('✅ Custom response added!');
            renderResponseStep(category);
        }

        if (addBtn) addBtn.addEventListener('click', addCustomResponse);
        if (customInput) {
            customInput.addEventListener('keydown', e => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    addCustomResponse();
                }
            });
        }

        const backBtn = picker.querySelector('.sr-back');
        const cancelBtn = picker.querySelector('.sr-cancel');
        if (backBtn) backBtn.addEventListener('click', renderCategoryStep);
        if (cancelBtn) cancelBtn.addEventListener('click', hidePicker);

        setTimeout(() => { if (searchBox) searchBox.focus(); }, 100);
    }

    // ═══════════════════════════════════════════════
    // STEP 2B — CUSTOM RESPONSE STEP
    // ═══════════════════════════════════════════════

    function renderCustomResponseStep() {
        const savedCustoms = getCustomOptions(CUSTOM_CATEGORY_KEY);

        let html = `
            <div class="sr-header">
                <h3>📋 Expected Response</h3>
                <div class="sr-step-label">
                    Step 2 of 2 — Write or Select a Custom Response
                </div>
            </div>
            <div class="sr-body">
                <div class="sr-category-badge-custom">✏️ Custom Response</div><br/>
                <div class="sr-custom-label">✍️ Type Your Custom Response</div>
                <textarea class="sr-custom-input" id="sr-new-custom-input"
                    placeholder="Type the expected response you want to fill in...">
                </textarea>
                <div class="sr-hint">Tip: Ctrl+Enter to fill directly without saving</div>
                <div class="sr-add-row">
                    <button class="sr-add-btn" id="sr-fill-now-btn">
                        ✅ Fill Now
                    </button>
                    <button class="sr-save-btn" id="sr-save-fill-btn">
                        💾 Save &amp; Fill
                    </button>
                </div>`;

        if (savedCustoms.length > 0) {
            html += `
                <div class="sr-custom-divider">
                    💾 Previously Saved Custom Responses
                </div>
                <input type="text" class="sr-search" id="sr-saved-search"
                    placeholder="🔍 Search saved responses..."
                    style="margin-top:6px;" />`;
            savedCustoms.forEach(resp => {
                html += `
                    <div class="sr-opt-row"
                        data-search="${escapeHtml(resp.toLowerCase())}">
                        <button class="sr-opt sr-opt-custom sr-saved-resp-opt"
                            data-val="${encodeURIComponent(resp)}">
                            ⭐ ${escapeHtml(resp)}
                        </button>
                        <button class="sr-del-btn sr-del-saved"
                            data-del="${encodeURIComponent(resp)}"
                            title="Delete">✕</button>
                    </div>`;
            });
        }

        html += `
            <button class="sr-back">⬅ Back to Categories</button>
            <button class="sr-cancel">✖ Cancel</button>
            </div>`;

        picker.innerHTML = html;

        const newInput = picker.querySelector('#sr-new-custom-input');
        const fillNowBtn = picker.querySelector('#sr-fill-now-btn');
        const saveFillBtn = picker.querySelector('#sr-save-fill-btn');

        function fillNow() {
            const v = newInput ? newInput.value.trim() : '';
            if (!v) { showToast('⚠️ Please type a response first!'); return; }
            const textarea = findExpectedResponseField();
            hidePicker();
            setTimeout(() => {
                if (textarea) {
                    smartFill(textarea, v);
                    showToast('✅ Expected Response filled!');
                } else {
                    alert('❌ Could not find Expected Response textarea!');
                }
            }, 400);
        }

        function saveFill() {
            const v = newInput ? newInput.value.trim() : '';
            if (!v) { showToast('⚠️ Please type a response first!'); return; }
            const existing = getCustomOptions(CUSTOM_CATEGORY_KEY);
            if (!existing.includes(v)) {
                existing.push(v);
                saveCustomOptions(CUSTOM_CATEGORY_KEY, existing);
            }
            const textarea = findExpectedResponseField();
            hidePicker();
            setTimeout(() => {
                if (textarea) {
                    smartFill(textarea, v);
                    showToast('💾 Saved & filled!');
                } else {
                    alert('❌ Could not find Expected Response textarea!');
                }
            }, 400);
        }

        if (fillNowBtn) fillNowBtn.addEventListener('click', fillNow);
        if (saveFillBtn) saveFillBtn.addEventListener('click', saveFill);

        if (newInput) {
            newInput.addEventListener('keydown', e => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    fillNow();
                }
            });
        }

        const savedSearch = picker.querySelector('#sr-saved-search');
        if (savedSearch) {
            savedSearch.addEventListener('input', function () {
                const q = this.value.toLowerCase();
                picker.querySelectorAll('.sr-opt-row').forEach(row =>
                    row.classList.toggle('sr-hide',
                        !row.dataset.search.includes(q))
                );
            });
        }

        picker.querySelectorAll('.sr-saved-resp-opt').forEach(btn => {
            btn.addEventListener('click', function () {
                const val = decodeURIComponent(this.dataset.val);
                const textarea = findExpectedResponseField();
                hidePicker();
                setTimeout(() => {
                    if (textarea) {
                        smartFill(textarea, v);
                        showToast('✅ Expected Response filled!');
                    } else {
                        alert('❌ Could not find Expected Response textarea!');
                    }
                }, 400);
            });
        });

        picker.querySelectorAll('.sr-del-saved').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const val = decodeURIComponent(this.dataset.del);
                showDeleteConfirm(val, () => {
                    removeCustomOption(CUSTOM_CATEGORY_KEY, val);
                    showToast('🗑️ Deleted saved response');
                    renderCustomResponseStep();
                });
            });
        });

        const backBtn = picker.querySelector('.sr-back');
        const cancelBtn = picker.querySelector('.sr-cancel');
        if (backBtn) backBtn.addEventListener('click', renderCategoryStep);
        if (cancelBtn) cancelBtn.addEventListener('click', hidePicker);

        setTimeout(() => { if (newInput) newInput.focus(); }, 100);
    }

    // ═══════════════════════════════════════════════
    // FIND EXPECTED RESPONSE TEXTAREA
    // ═══════════════════════════════════════════════

    function findExpectedResponseField() {
        const byPlaceholder = document.querySelector(
            'textarea[placeholder*="expected response" i]'
        );
        if (byPlaceholder && byPlaceholder.offsetParent !== null) {
            return byPlaceholder;
        }

        const allEls = document.querySelectorAll(
            'label, span, p, div, h3, h4, h5, h6, legend'
        );
        for (const el of allEls) {
            const text = el.textContent.trim().toLowerCase();
            if (text.length > 100) continue;
            if (text.includes('expected response')) {
                let parent = el.parentElement;
                for (let i = 0; i < 6; i++) {
                    if (!parent) break;
                    const ta = parent.querySelector('textarea');
                    if (ta && ta.offsetParent !== null) return ta;
                    parent = parent.parentElement;
                }
            }
        }

        const allTextareas = document.querySelectorAll('textarea');
        for (const ta of allTextareas) {
            const ph = (ta.placeholder || '').toLowerCase();
            const isVisible = ta.offsetParent !== null;
            if (isVisible && (
                ph.includes('expected') ||
                ph.includes('response') ||
                ph.includes('bot')
            )) return ta;
        }

        return null;
    }

    // ═══════════════════════════════════════════════
    // SMART FILL — React compatible
    // ═══════════════════════════════════════════════

    function smartFill(field, value) {
        field.focus();
        field.click();
        setTimeout(() => {
            const proto = field.tagName === 'TEXTAREA'
                ? window.HTMLTextAreaElement.prototype
                : window.HTMLInputElement.prototype;
            const nativeSet = Object.getOwnPropertyDescriptor(proto, 'value').set;
            nativeSet.call(field, '');
            field.dispatchEvent(new Event('input',  { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
            setTimeout(() => {
                nativeSet.call(field, value);
                field.dispatchEvent(new Event('input',  { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
                setTimeout(() => {
                    field.dispatchEvent(new Event('blur', { bubbles: true }));
                }, 200);
            }, 100);
        }, 100);
    }

    // ═══════════════════════════════════════════════
    // TOAST
    // ═══════════════════════════════════════════════

    function showToast(msg) {
        const t = document.createElement('div');
        t.className = 'sr-toast';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transition = 'opacity 0.3s';
            setTimeout(() => t.remove(), 300);
        }, 2500);
    }

    // ═══════════════════════════════════════════════
    // KEYBOARD SHORTCUTS
    // ═══════════════════════════════════════════════

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'E') {
            e.preventDefault();
            showPicker();
        }
        if (e.key === 'Escape') hidePicker();
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            debugPanel.style.display =
                debugPanel.style.display === 'none' ? 'block' : 'none';
        }
    });

    debugLog('SR Filler v2.8 loaded — all fixes applied');

})();
