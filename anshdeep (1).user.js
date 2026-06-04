// ==UserScript==
// @name         Static Response Expected Answer Auto-Fill
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Two-step picker on "Inaccurate" radio click — fills Expected Response textarea
// @match        https://orbit-beta.beta.harmony.a2z.com/*
// @match        https://orbit-gamma.beta.harmony.a2z.com/*
// @run-at       document-idle
// @grant        GM_addStyle
// ==/UserScript==


(function () {
    'use strict';

    // ═══════════════════════════════════════════════
    // RESPONSE MAP — Category → Responses
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
        ]
    };

    // FIX #6 — Namespaced storage key to avoid collision
    const CUSTOM_CATEGORY_KEY = 'orbit_sr_v2_custom_responses';

    // ═══════════════════════════════════════════════
    // FIX #2 — HTML escape helper to prevent injection
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
    // STYLES
    // ═══════════════════════════════════════════════

    GM_addStyle(`
        #sr-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.55); z-index: 99998; display: none;
        }

        #sr-picker {
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: #fff; border: 2px solid #0073bb;
            border-radius: 12px; padding: 22px; z-index: 99999;
            display: none; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            min-width: 480px; max-width: 580px;
            max-height: 82vh; overflow-y: auto;
            font-family: Arial, sans-serif;
        }

        #sr-picker h3 {
            margin: 0 0 6px; font-size: 15px; color: #0073bb;
            border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;
        }

        #sr-picker .sr-step-label {
            font-size: 11px; color: #879596; margin-bottom: 10px;
            text-transform: uppercase; letter-spacing: 1px;
        }

        #sr-picker .sr-search {
            width: 100%; padding: 8px 10px; margin-bottom: 12px;
            border: 1px solid #ccc; border-radius: 6px;
            font-size: 13px; box-sizing: border-box;
        }

        #sr-picker .sr-search:focus {
            outline: none; border-color: #0073bb;
            box-shadow: 0 0 0 2px rgba(0,115,187,0.2);
        }

        #sr-picker .sr-opt-row {
            display: flex; align-items: flex-start;
            gap: 6px; margin-bottom: 6px;
        }

        #sr-picker .sr-opt {
            flex: 1; padding: 10px 13px;
            background: #f4f6f8; border: 1px solid #d5dbdb;
            border-radius: 7px; cursor: pointer;
            text-align: left; font-size: 13px;
            color: #16191f; line-height: 1.5;
            box-sizing: border-box; white-space: normal;
        }

        #sr-picker .sr-opt:hover {
            background: #0073bb; color: #fff; border-color: #0073bb;
        }

        #sr-picker .sr-opt-custom {
            background: #fef8e7; border-color: #f5a623;
        }

        #sr-picker .sr-opt-custom:hover {
            background: #f5a623; color: #fff; border-color: #f5a623;
        }

        #sr-picker .sr-opt-ninth {
            background: #f0fff4; border-color: #1d8102; color: #1d8102;
            font-weight: bold;
        }

        #sr-picker .sr-opt-ninth:hover {
            background: #1d8102; color: #fff; border-color: #1d8102;
        }

        #sr-picker .sr-category-badge {
            display: inline-block; background: #e7f4ff;
            color: #0073bb; padding: 4px 12px;
            border-radius: 12px; font-size: 12px;
            margin-bottom: 12px; font-weight: bold;
        }

        #sr-picker .sr-category-badge-custom {
            display: inline-block; background: #f0fff4;
            color: #1d8102; padding: 4px 12px;
            border-radius: 12px; font-size: 12px;
            margin-bottom: 12px; font-weight: bold;
        }

        #sr-picker .sr-del-btn {
            padding: 7px 10px; background: #ff4d4d; color: #fff;
            border: none; border-radius: 6px; cursor: pointer;
            font-size: 13px; font-weight: bold;
            flex-shrink: 0; align-self: flex-start; margin-top: 2px;
        }

        #sr-picker .sr-del-btn:hover { background: #cc0000; }

        #sr-picker .sr-custom-section {
            margin-top: 12px; padding-top: 12px;
            border-top: 1px dashed #ccc;
        }

        #sr-picker .sr-custom-label {
            font-size: 12px; color: #1d8102;
            margin-bottom: 6px; font-weight: bold;
        }

        #sr-picker .sr-custom-divider {
            font-size: 11px; color: #879596;
            margin: 10px 0 6px; text-transform: uppercase;
            letter-spacing: 1px; border-top: 1px dashed #ddd;
            padding-top: 8px;
        }

        #sr-picker textarea.sr-custom-input {
            width: 100%; padding: 8px 10px;
            border: 1px solid #ccc; border-radius: 6px;
            font-size: 13px; box-sizing: border-box;
            resize: vertical; min-height: 80px;
            font-family: Arial, sans-serif; line-height: 1.5;
        }

        #sr-picker textarea.sr-custom-input:focus {
            outline: none; border-color: #1d8102;
            box-shadow: 0 0 0 2px rgba(29,129,2,0.2);
        }

        #sr-picker .sr-add-row {
            display: flex; gap: 6px;
            align-items: flex-end; margin-top: 8px;
        }

        #sr-picker .sr-add-btn {
            padding: 9px 20px; background: #1d8102; color: #fff;
            border: none; border-radius: 6px; cursor: pointer;
            font-size: 13px; font-weight: bold;
            white-space: nowrap; flex-shrink: 0;
        }

        #sr-picker .sr-add-btn:hover { background: #168001; }

        #sr-picker .sr-back {
            display: block; width: 100%; padding: 9px 12px;
            margin-top: 10px; background: #545b64; color: #fff;
            border: none; border-radius: 6px; cursor: pointer;
            font-size: 13px; font-weight: bold; box-sizing: border-box;
        }

        #sr-picker .sr-back:hover { background: #3d4148; }

        #sr-picker .sr-cancel {
            display: block; width: 100%; padding: 9px 12px;
            margin-top: 6px; background: #d13212; color: #fff;
            border: none; border-radius: 6px; cursor: pointer;
            font-size: 13px; font-weight: bold; box-sizing: border-box;
        }

        #sr-picker .sr-cancel:hover { background: #a82a10; }

        .sr-hide { display: none !important; }

        .sr-hint {
            font-size: 11px; color: #879596;
            margin-top: 5px; font-style: italic;
        }

        #sr-badge {
            position: fixed; bottom: 15px; right: 15px;
            background: #0073bb; color: #fff;
            padding: 8px 16px; border-radius: 20px;
            font-size: 12px; z-index: 99997;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            font-family: Arial, sans-serif;
        }

        .sr-confirm-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.6); z-index: 100001;
            display: flex; align-items: center; justify-content: center;
        }

        .sr-confirm-box {
            background: #fff; border-radius: 10px; padding: 24px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.3);
            min-width: 340px; font-family: Arial; text-align: center;
        }

        .sr-confirm-box h4 { margin: 0 0 8px; color: #d13212; font-size: 16px; }
        .sr-confirm-box p  { margin: 0 0 16px; font-size: 13px; color: #545b64; }

        .sr-confirm-btns { display: flex; gap: 10px; justify-content: center; }

        .sr-confirm-btns button {
            padding: 8px 24px; border: none; border-radius: 6px;
            font-size: 13px; font-weight: bold; cursor: pointer;
        }

        .sr-confirm-yes { background: #d13212; color: #fff; }
        .sr-confirm-yes:hover { background: #a82a10; }
        .sr-confirm-no  { background: #e8e8e8; color: #16191f; }
        .sr-confirm-no:hover { background: #d0d0d0; }
    `);

    // ═══════════════════════════════════════════════
    // UI ELEMENTS
    // ═══════════════════════════════════════════════

    const badge = document.createElement('div');
    badge.id = 'sr-badge';
    badge.textContent = '🟢 SR Filler Active';
    document.body.appendChild(badge);

    const overlay = document.createElement('div');
    overlay.id = 'sr-overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', hidePicker);

    const picker = document.createElement('div');
    picker.id = 'sr-picker';
    document.body.appendChild(picker);

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
        const categories = Object.keys(RESPONSE_MAP);

        let html = `<h3>📋 Expected Response — Step 1 of 2</h3>`;
        html += `<div class="sr-step-label">Select a Response Category</div>`;
        html += `<input type="text" class="sr-search" placeholder="🔍 Search categories..." />`;

        // Built-in 8 categories
        // FIX #7 — count recalculated fresh on every render
       categories.forEach(cat => {
    html += `
        <div class="sr-opt-row" data-search="${escapeHtml(cat.toLowerCase())}">
            <button class="sr-opt sr-cat-opt" data-cat="${escapeHtml(cat)}">
                📁 ${escapeHtml(cat)}
            </button>
        </div>`;
});

// 9th option — Custom Response
html += `
    <div class="sr-opt-row" data-search="custom response">
        <button class="sr-opt sr-opt-ninth sr-custom-cat-opt">
            ✏️ Custom Response
        </button>
    </div>`;


        html += `<button class="sr-cancel">✖ Cancel</button>`;
        picker.innerHTML = html;

        // Search
        const searchBox = picker.querySelector('.sr-search');
        if (searchBox) {
            searchBox.addEventListener('input', function () {
                const q = this.value.toLowerCase();
                picker.querySelectorAll('.sr-opt-row').forEach(row =>
                    row.classList.toggle('sr-hide', !row.dataset.search.includes(q))
                );
            });
        }

        // Built-in category click
        picker.querySelectorAll('.sr-cat-opt').forEach(btn => {
            btn.addEventListener('click', function () {
                renderResponseStep(this.dataset.cat);
            });
        });

        // 9th option click
        const ninthBtn = picker.querySelector('.sr-custom-cat-opt');
        if (ninthBtn) {
            ninthBtn.addEventListener('click', () => renderCustomResponseStep());
        }

        // FIX #9 — null guard on cancel button
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

        let html = `<h3>📋 Expected Response — Step 2 of 2</h3>`;
        html += `<div class="sr-step-label">Select a Response</div>`;
        html += `<div class="sr-category-badge">📁 ${escapeHtml(category)}</div><br/>`;
        html += `<input type="text" class="sr-search" placeholder="🔍 Search responses..." />`;

        // FIX #8 — removed unused idx parameter
        builtIn.forEach(resp => {
            html += `
                <div class="sr-opt-row" data-search="${escapeHtml(resp.toLowerCase())}">
                    <button class="sr-opt sr-resp-opt"
                        data-val="${encodeURIComponent(resp)}">
                        ${escapeHtml(resp)}
                    </button>
                </div>`;
        });

        // Custom responses for this category
        if (custom.length > 0) {
            html += `<div class="sr-custom-divider">⭐ Custom Responses</div>`;
            custom.forEach(resp => {
                html += `
                    <div class="sr-opt-row" data-search="${escapeHtml(resp.toLowerCase())}">
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

        // Add custom for this category
        html += `
            <div class="sr-custom-section">
                <div class="sr-custom-label">➕ Add Custom Response for "${escapeHtml(category)}"</div>
                <textarea class="sr-custom-input"
                    placeholder="Type your custom expected response..."></textarea>
                <div class="sr-hint">Tip: Press Ctrl+Enter to quickly add</div>
                <div class="sr-add-row">
                    <button class="sr-add-btn">ADD</button>
                </div>
            </div>`;

        html += `<button class="sr-back">⬅ Back to Categories</button>`;
        html += `<button class="sr-cancel">✖ Cancel</button>`;

        picker.innerHTML = html;

        // Search
        const searchBox = picker.querySelector('.sr-search');
        if (searchBox) {
            searchBox.addEventListener('input', function () {
                const q = this.value.toLowerCase();
                picker.querySelectorAll('.sr-opt-row').forEach(row =>
                    row.classList.toggle('sr-hide', !row.dataset.search.includes(q))
                );
            });
        }

        // FIX #5 — find textarea BEFORE hiding picker
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

        // Delete custom response
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

        // Add custom response
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
                if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); addCustomResponse(); }
            });
        }

        // FIX #9 — null guards on back and cancel
        const backBtn = picker.querySelector('.sr-back');
        const cancelBtn = picker.querySelector('.sr-cancel');
        if (backBtn) backBtn.addEventListener('click', renderCategoryStep);
        if (cancelBtn) cancelBtn.addEventListener('click', hidePicker);

        setTimeout(() => { if (searchBox) searchBox.focus(); }, 100);
    }

    // ═══════════════════════════════════════════════
    // STEP 2B — CUSTOM RESPONSE STEP (9th category)
    // ═══════════════════════════════════════════════

    function renderCustomResponseStep() {
        const savedCustoms = getCustomOptions(CUSTOM_CATEGORY_KEY);

        let html = `<h3>📋 Expected Response — Step 2 of 2</h3>`;
        html += `<div class="sr-step-label">Write or Select a Custom Response</div>`;
        html += `<div class="sr-category-badge-custom">✏️ Custom Response</div><br/>`;

        html += `
            <div class="sr-custom-label">✍️ Type Your Custom Response</div>
            <textarea class="sr-custom-input" id="sr-new-custom-input"
                placeholder="Type the expected response you want to fill in..."></textarea>
            <div class="sr-hint">Tip: Ctrl+Enter to fill directly without saving</div>
            <div class="sr-add-row">
                <button class="sr-add-btn" id="sr-fill-now-btn">✅ Fill Now</button>
                <button class="sr-add-btn" id="sr-save-fill-btn"
                    style="background:#0073bb;">
                    💾 Save &amp; Fill
                </button>
            </div>`;

        if (savedCustoms.length > 0) {
            html += `<div class="sr-custom-divider">💾 Previously Saved Custom Responses</div>`;
            html += `<input type="text" class="sr-search" id="sr-saved-search"
                        placeholder="🔍 Search saved responses..."
                        style="margin-top:6px;" />`;
            savedCustoms.forEach(resp => {
                html += `
                    <div class="sr-opt-row" data-search="${escapeHtml(resp.toLowerCase())}">
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

        html += `<button class="sr-back">⬅ Back to Categories</button>`;
        html += `<button class="sr-cancel">✖ Cancel</button>`;

        picker.innerHTML = html;

        const newInput = picker.querySelector('#sr-new-custom-input');
        const fillNowBtn = picker.querySelector('#sr-fill-now-btn');
        const saveFillBtn = picker.querySelector('#sr-save-fill-btn');

        // FIX #5 — find textarea BEFORE hiding picker
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

        // FIX #5 — find textarea BEFORE hiding picker
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
                if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); fillNow(); }
            });
        }

        // Search saved responses
        const savedSearch = picker.querySelector('#sr-saved-search');
        if (savedSearch) {
            savedSearch.addEventListener('input', function () {
                const q = this.value.toLowerCase();
                picker.querySelectorAll('.sr-opt-row').forEach(row =>
                    row.classList.toggle('sr-hide', !row.dataset.search.includes(q))
                );
            });
        }

        // FIX #5 — find textarea BEFORE hiding picker
        picker.querySelectorAll('.sr-saved-resp-opt').forEach(btn => {
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

        // Delete saved response
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

        // FIX #9 — null guards on back and cancel
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
        // Try by placeholder
        const byPlaceholder = document.querySelector(
            'textarea[placeholder*="expected response" i]'
        );
        if (byPlaceholder) return byPlaceholder;

        // Try by label proximity
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
                    if (ta) return ta;
                    parent = parent.parentElement;
                }
            }
        }

        // Fallback — any visible textarea with relevant placeholder
        const allTextareas = document.querySelectorAll('textarea');
        for (const ta of allTextareas) {
            const ph = (ta.placeholder || '').toLowerCase();
            if (ph.includes('expected') || ph.includes('response') || ph.includes('bot')) {
                return ta;
            }
        }

        return null;
    }

    // ═══════════════════════════════════════════════
    // FIX #3 — SMART FILL — detects input vs textarea
    // ═══════════════════════════════════════════════

    function smartFill(field, value) {
        field.focus();
        field.click();

        setTimeout(() => {
            // Detect correct prototype based on element type
            const proto = field.tagName === 'TEXTAREA'
                ? window.HTMLTextAreaElement.prototype
                : window.HTMLInputElement.prototype;

            const nativeSet = Object.getOwnPropertyDescriptor(proto, 'value').set;

            nativeSet.call(field, '');
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));

            setTimeout(() => {
                nativeSet.call(field, value);
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));

                setTimeout(() => {
                    field.dispatchEvent(new Event('blur', { bubbles: true }));
                }, 200);
            }, 100);
        }, 100);
    }

    // ═══════════════════════════════════════════════
    // SHOW / HIDE PICKER
    // ═══════════════════════════════════════════════

    function showPicker() {
        overlay.style.display = 'block';
        picker.style.display = 'block';
        renderCategoryStep();
    }

    function hidePicker() {
        overlay.style.display = 'none';
        picker.style.display = 'none';
    }

    // ═══════════════════════════════════════════════
    // TOAST
    // ═══════════════════════════════════════════════

    function showToast(msg) {
        const t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = `
            position: fixed; bottom: 60px; right: 15px;
            background: #1d8102; color: #fff; padding: 10px 20px;
            border-radius: 8px; font-size: 13px; z-index: 100002;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-family: Arial;
        `;
        document.body.appendChild(t);
        setTimeout(() => {
            t.style.opacity = '0';
            t.style.transition = 'opacity 0.3s';
            setTimeout(() => t.remove(), 300);
        }, 2500);
    }

    // ═══════════════════════════════════════════════
    // FIND & BIND "INACCURATE" RADIO
    // ═══════════════════════════════════════════════

    const boundRadios = new WeakSet();
    let lastTriggerTime = 0;
    const DEBOUNCE_MS = 2000;

    function findInaccurateRadio() {
        // Try by value — exact and case-insensitive
        const allRadios = document.querySelectorAll('input[type="radio"]');
        for (const radio of allRadios) {
            if (radio.value.toLowerCase() === 'inaccurate') return radio;
        }

        // Try by parent/label text
        for (const radio of allRadios) {
            const parent = radio.closest('label') || radio.parentElement;
            if (parent && parent.textContent.trim().toLowerCase().includes('inaccurate')) {
                return radio;
            }
        }

        return null;
    }

    function bindInaccurateRadio(radio) {
        if (boundRadios.has(radio)) return;
        boundRadios.add(radio);

        console.log('[SR] Bound Inaccurate radio:', radio);
        badge.textContent = '🟢 SR Filler — Bound';
        setTimeout(() => { badge.textContent = '🟢 SR Filler Active'; }, 2000);

        function tryOpen() {
            const now = Date.now();
            if (now - lastTriggerTime < DEBOUNCE_MS) return;
            if (overlay.style.display === 'block') return;
            lastTriggerTime = now;
            badge.textContent = '🟡 Inaccurate selected';
            setTimeout(() => { badge.textContent = '🟢 SR Filler Active'; }, 3000);
            setTimeout(() => showPicker(), 350);
        }

        // FIX #4 — only bind 'change' on the radio to prevent double-fire
        radio.addEventListener('change', function () {
            if (this.checked) tryOpen();
        });

        // Keep label click binding for Cloudscape UI compatibility
        const label = radio.closest('label');
        if (label) {
            label.addEventListener('click', function (e) {
                // FIX #4 — improved guard to prevent double-fire
                if (e.target.type === 'radio') return;
                setTimeout(() => { if (radio.checked) tryOpen(); }, 60);
            });
        }
    }

    function scanAndBind() {
        const radio = findInaccurateRadio();
        if (radio && !boundRadios.has(radio)) {
            bindInaccurateRadio(radio);
            return true;
        }
        return false;
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
    });

    // ═══════════════════════════════════════════════
    // INIT — Scan + Observer + Interval
    // ═══════════════════════════════════════════════

    setTimeout(() => {
        console.log('[SR] Initial scan...');
        scanAndBind();
    }, 2000);

    let scanTimeout = null;
    const observer = new MutationObserver(() => {
        if (scanTimeout) clearTimeout(scanTimeout);
        scanTimeout = setTimeout(() => scanAndBind(), 800);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setInterval(() => scanAndBind(), 5000);

    console.log('[SR] Static Response Filler v2.1 loaded');
})();
