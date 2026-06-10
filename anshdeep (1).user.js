// ==UserScript==
// @name         Static Response Expected Answer Auto-Fill
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Three-step HVA Pills picker + two-step category picker on Inaccurate click
// @match        https://orbit-beta.beta.harmony.a2z.com/*
// @match        https://orbit-gamma.beta.harmony.a2z.com/*
// @run-at       document-idle
// @grant        GM_addStyle
// ==/UserScript==

(function () {
    'use strict';

    // ═══════════════════════════════════════════════
    // RESPONSE MAP — Standard Categories
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

    // ═══════════════════════════════════════════════
    // HVA PILLS MAP
    // Structure: HVA Name → { Heading → Response }
    // ═══════════════════════════════════════════════

    const HVA_PILLS_MAP = {

        'Business Prime': {
            'What is Business Prime?': "Business Prime is an annual membership program for Amazon Business customers that offers business-specific benefits. It provides fast, free shipping on eligible items, access to spend visibility tools, and features to help control purchasing across your organization. Plans range from Duo (free for sole proprietors) to Enterprise, with benefits scaling based on your business size.",
            'Benefits': "Business Prime offers several key benefits: Fast, free shipping on eligible business items. Spend Visibility tools to analyze purchasing trends. Guided Buying to control employee purchasing. Access to member-only deals from partners like QuickBooks and CrowdStrike. Flexible payment terms (up to 60 days on higher-tier plans). Business Prime Rewards earning opportunities. Would you like to know more about specific Business Prime plans?",
            'How to sign up': "To sign up for Business Prime: Go to amazon.com/businessprime. Select 'Get started' button. Choose or add a payment method. Select to sign up for Business Prime. You can start with a free 30-day trial and choose a plan that fits your business size. New customers can create a free Amazon Business account first.",
            'Manage Business Prime': "To manage your Prime Business membership, go to Business Settings and select Manage to change your payment method, view receipts, check membership status, or cancel. You can also change your plan if you have the necessary number of members. Would you like help with a specific management task like canceling or changing your plan?"
        },

        'Pay By Invoice': {
            'Set up Pay by Invoice': "Pay by Invoice is an invite-only payment solution for eligible Amazon Business customers. When you sign up, Amazon conducts a credit assessment to determine your eligibility. If approved, you'll receive an activation email, and Pay by Invoice will appear as a payment option in your account's Billing & shipping section. Would you like to know more about how Pay by Invoice works?",
            'Managing invoices': "Amazon Business allows administrators to manage invoices through the Your Invoices for Pay by Invoice page. You can view invoices, update invoice recipients, and customize delivery preferences. Administrators and finance users can access invoices and reports, and can even send invoice copies to the person who placed the order.",
            'Pay by Invoice': "Pay by Invoice offers several key benefits for your business: Buy now, pay later with no upfront interest or fees. Flexible 30-day payment terms. Simplified invoice tracking and reconciliation. Ability to customize invoice delivery and frequency. Helps improve cash flow by deferring payments. Would you like to know more about how Pay by Invoice works?"
        },

        'Subscribe and Save': {
            'Managing subscriptions': "With Subscribe & Save, you can manage your subscriptions easily. You can change re-order frequency, quantity, or cancel at any time before the delivery date. Amazon will notify you of the next delivery price, allowing you to make changes or skip a delivery.",
            'Cancel Subscriptions': "To cancel a Subscribe & Save order, you can modify or cancel your subscription prior to the scheduled delivery date. When Amazon sends you a price notification for the upcoming order, you'll have the option to cancel or make changes. If you take no action by the specified date, the order will be processed as scheduled.",
            'Set up Subscribe and Save': "Subscribe & Save lets you set up automatic deliveries for business essentials and save money. You can save up to 15% on orders of 5+ items, schedule deliveries, and skip or cancel anytime. Would you like to know more about how to set up your first Subscribe & Save subscription?",
            'How it works': "Subscribe & Save lets you set up automatic deliveries for business essentials. You can schedule recurring deliveries, get a 5% immediate discount on eligible items, and save up to 15% when you have 5 or more subscriptions arriving on the same day. You can cancel, skip, or update subscriptions anytime."
        },

        'Custom Quotes': {
            'Negotiated pricing': "Negotiated pricing allows you to purchase items at prenegotiated prices from your suppliers. To add negotiated pricing, go to Business Settings, note your business ID, and contact your supplier to load their price sheet. You'll receive an email to review and approve the pricing. Would you like to know more about how to set up negotiated pricing?",
            'Custom quotes': "Amazon Business' Request for Quote allows you to get custom pricing for bulk purchases. Key features include: Minimum order threshold: 999 units or $10,000 (Books category: 100 units or $1,000). Typical savings of around 17% compared to standard list prices. Ability to request quotes from pre-vetted suppliers. Customized pricing valid for at least 7 days. Sellers typically respond within 1-2 business days. To request a quote, click the 'Request quote for [quantity]+' link on a product page, specify your requirements, and receive competitive offers from multiple suppliers."
        },

        'Amazon Tax Exemption Program (ATEP)': {
            'Eligibility criteria': "The Amazon Tax Exemption Program (ATEP) is available for organizations in the U.S. and Canada. You'll need to have your tax exemption details ready, including your state/territory of enrollment, type of organization, address, and exemption number or form. Would you like to know more about how to enroll?",
            'Program details': "The Amazon Tax Exemption Program (ATEP) allows eligible organizations to make tax-exempt purchases on Amazon Business. It enables you to: Apply your organization's tax-exempt status to eligible purchases. Manage tax exemptions at the group level. Upload tax forms or manually enter tax details. Get automatic tax exemption for qualifying purchases."
        },

        'Quantity Discounts': {
            'Ordering in bulk': "Amazon Business offers bulk savings through multiple channels: 1. Quantity Discounts: Available on millions of products, with discounts starting from as low as 2 units purchased. Automatic price reductions apply when buying larger quantities. 2. Request for Quote (RFQ) Tool: For high-volume purchases over $10,000 or 999 units, allowing custom pricing from pre-vetted suppliers with potential savings up to 10%. 3. Volume-Based Pricing: Progressive discounts increase as order quantities rise, helping businesses reduce per-unit costs. Available across various product categories like office supplies, equipment, and inventory items. Key benefits include cost savings, simplified purchasing, and efficient inventory management. No Business Prime membership is required to access bulk ordering features.",
            'Quantity discounts': "Quantity Discounts on Amazon Business are volume-tiered pricing discounts available on eligible items. When you purchase large quantities of products from selected sellers, you can access pricing discounts. To request a Quantity Discount: Select 'Buying in bulk' on the product detail page. Specify the quantity needed under 'Request a Quantity Discount'. Choose a date by which the seller must respond. Sellers will email you a response about discount availability. Discounts can start from as low as 2 units across millions of products, helping businesses save money on bulk purchases. The more units you buy, the greater potential for cost savings."
        },

        'Business Lists': {
            'How lists work': "Amazon Business Lists help you bookmark and organize products. There are three main types of lists: Reorder Lists: For items you buy repeatedly. Items stay on the list after purchase. Shopping Lists: For one-time purchases. Items disappear after buying. Public Lists: Pre-curated lists of top-rated products you can copy and customize. You can create lists, add items by product keywords or URL, share lists with team members, and set privacy settings. Lists can be accessed on desktop or mobile app.",
            'Editing lists': "You can edit lists in several ways: Add items by using product keywords, ASIN, ISBN, or product URL. Remove items by moving them to another list. Change item quantities. Only list owners can edit items in a list. Would you like to know more about managing your Amazon Business lists?",
            'Creating lists': "Amazon Business lets you create two types of lists: Reorder Lists for frequently purchased items and Shopping Lists for one-time purchases. To create a list, select 'Create a list' in the Lists drop-down menu, choose a list type, and enter a name. Would you like to know more about how to add items to your list?"
        },

        'Add User': {
            'Adding users': "You can add users to your Amazon Business account in three ways: 1. By email (up to 6 people at once). 2. Using a shareable link. 3. Bulk upload via spreadsheet. To add users, go to Business Settings, select Users, and choose 'Add users'. Would you like me to explain these methods in more detail?",
            'User roles and permissions': "Amazon Business offers different user roles to help manage your account effectively. The main roles are: 1. Administrators: Manage business account settings, users, and permissions. 2. Buyers: Place orders for the organization. 3. Finance users: Access reports and financial information. 4. Tech users: Manage system integrations and IT settings. Administrators can assign and modify these roles as needed. Would you like to know more about specific user roles?"
        },

        'Approvals': {
            'Approval prerequisites': "Approval policies help businesses track purchases and enforce compliance. Administrators can set up approval workflows with up to 6 levels and 10 approvers per level. These policies allow you to restrict certain purchases, trigger notifications, and track spending across your business account. Would you like to know more about setting up approval workflows?",
            'Purchase approvals': "Purchase approvals help you track and manage employee purchases across your business account. Administrators can set up approval policies to control spending, requiring designated approvers to review and approve orders before they're finalized. You can add up to 6 levels of approval with up to 10 approvers per level."
        },

        '3 Way Match': {
            'Set up 3WM': "To set up 3-Way Match (3WM), go to your Amazon Business account's Business Settings. Under Billing & Shipping, select Receiving, choose your group, and then select 'Yes, track receiving' to enable 3-Way Match. This allows you to automatically track and reconcile purchase orders, invoices, and item receipts.",
            'Update receiving': "To update receiving confirmation: Go to the Receiving page. Select the order you want to update using filters. Enter the quantity of items received for each item. Select 'Mark everything received' or enter specific quantities. Select Save to confirm the details."
        },

        'SSO': {
            'How to verify a domain': "To verify a domain in Amazon Business, go to Business Settings, select 'Domain Verification' in the System Integration section, click 'Add a domain', enter your root domain, and then add the verification code to your domain DNS server. You may need assistance from your IT team to complete the process."
        },

        'Business Settings': {
            'Default checkout settings': "Checkout defaults help streamline your business purchasing by allowing you to set default shipping addresses and payment methods. As an administrator, you can set these defaults for your entire group or for yourself individually. Would you like to know more about setting up these defaults?"
        }

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

        #sr-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.65); z-index: 99998; display: none;
        }

        #sr-picker {
            position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            background: #ffffff; border: none;
            border-radius: 12px; padding: 0;
            z-index: 99999; display: none;
            box-shadow: 0 12px 40px rgba(0,0,0,0.45);
            min-width: 480px; max-width: 560px;
            max-height: 85vh; overflow-y: auto;
            font-family: Arial, sans-serif;
        }

        #sr-picker .sr-header {
            background: #131921;
            padding: 16px 20px 14px;
            border-radius: 12px 12px 0 0;
            position: sticky; top: 0; z-index: 10;
        }

        #sr-picker .sr-header h3 {
            margin: 0 0 4px; font-size: 15px;
            font-weight: bold; color: #FF9900;
            letter-spacing: 0.3px;
        }

        #sr-picker .sr-step-label {
            font-size: 10px; color: #aaaaaa;
            text-transform: uppercase;
            letter-spacing: 1.2px; margin: 0;
        }

        #sr-picker .sr-body {
            padding: 14px 20px 20px;
        }

        #sr-picker .sr-search {
            width: 100%; padding: 9px 14px;
            margin-bottom: 12px;
            border: 1.5px solid #dddddd;
            border-radius: 6px; font-size: 13px;
            box-sizing: border-box;
            background: #f9f9f9; color: #131921;
        }

        #sr-picker .sr-search:focus {
            outline: none; border-color: #FF9900;
            background: #fff;
            box-shadow: 0 0 0 2px rgba(255,153,0,0.15);
        }

        #sr-picker .sr-opt-row {
            display: flex; align-items: flex-start;
            gap: 6px; margin-bottom: 7px;
        }

        #sr-picker .sr-opt {
            flex: 1; padding: 10px 14px 10px 16px;
            background: #f8f8f8;
            border: 1px solid #e0e0e0;
            border-left: 5px solid #FF9900;
            border-radius: 6px; cursor: pointer;
            text-align: left; font-size: 13px;
            color: #131921; line-height: 1.5;
            box-sizing: border-box; white-space: normal;
            transition: background 0.15s, color 0.15s;
        }

        #sr-picker .sr-opt:hover {
            background: #131921; color: #FF9900;
            border-left-color: #FF9900;
            border-color: #131921;
        }

        #sr-picker .sr-opt-custom {
            background: #fff8ee;
            border-left-color: #FF9900;
            border-color: #ffe0a0;
        }

        #sr-picker .sr-opt-custom:hover {
            background: #131921; color: #FF9900;
            border-color: #131921;
            border-left-color: #FF9900;
        }

        #sr-picker .sr-opt-hva {
            background: #f0fafa;
            border: 1.5px solid #0099a8;
            border-left: 5px solid #0099a8;
            color: #007380; font-weight: bold;
        }

        #sr-picker .sr-opt-hva:hover {
            background: #131921; color: #0099a8;
            border-color: #131921;
            border-left-color: #0099a8;
        }

        #sr-picker .sr-opt-hva-name {
            background: #f0fafa;
            border: 1px solid #d0eaea;
            border-left: 5px solid #0099a8;
            color: #131921;
        }

        #sr-picker .sr-opt-hva-name:hover {
            background: #131921; color: #0099a8;
            border-color: #131921;
            border-left-color: #0099a8;
        }

        #sr-picker .sr-opt-pill {
            background: #f0fafa;
            border: 1px solid #d0eaea;
            border-left: 5px solid #0099a8;
            color: #131921;
        }

        #sr-picker .sr-opt-pill:hover {
            background: #131921; color: #0099a8;
            border-color: #131921;
            border-left-color: #0099a8;
        }

        /* FIX #5 — renamed from sr-opt-tenth to sr-opt-custom-cat
           for semantic clarity */
        #sr-picker .sr-opt-custom-cat {
            background: #fff8ee;
            border: 1.5px solid #FF9900;
            border-left: 5px solid #FF9900;
            color: #cc7a00; font-weight: bold;
        }

        #sr-picker .sr-opt-custom-cat:hover {
            background: #131921; color: #FF9900;
            border-color: #131921;
            border-left-color: #FF9900;
        }

        #sr-picker .sr-category-badge {
            display: inline-block;
            background: #131921; color: #FF9900;
            padding: 4px 14px; border-radius: 20px;
            font-size: 12px; margin-bottom: 12px;
            font-weight: bold; letter-spacing: 0.3px;
        }

        #sr-picker .sr-category-badge-hva {
            display: inline-block;
            background: #0099a8; color: #ffffff;
            padding: 4px 14px; border-radius: 20px;
            font-size: 12px; margin-bottom: 4px;
            font-weight: bold; letter-spacing: 0.3px;
        }

        #sr-picker .sr-hva-name-badge {
            display: inline-block;
            background: #e0f7fa; color: #007380;
            padding: 4px 14px; border-radius: 20px;
            font-size: 12px; margin-bottom: 12px;
            font-weight: bold;
        }

        #sr-picker .sr-category-badge-custom {
            display: inline-block;
            background: #fff8ee; color: #cc7a00;
            padding: 4px 14px; border-radius: 20px;
            font-size: 12px; margin-bottom: 12px;
            font-weight: bold;
        }

        #sr-picker .sr-del-btn {
            padding: 7px 10px; background: #cc0000;
            color: #fff; border: none; border-radius: 6px;
            cursor: pointer; font-size: 13px; font-weight: bold;
            flex-shrink: 0; align-self: flex-start;
            margin-top: 2px; transition: background 0.15s;
        }

        #sr-picker .sr-del-btn:hover { background: #990000; }

        #sr-picker .sr-custom-section {
            margin-top: 14px; padding-top: 14px;
            border-top: 1px dashed #dddddd;
        }

        #sr-picker .sr-custom-label {
            font-size: 12px; color: #FF9900;
            margin-bottom: 6px; font-weight: bold;
        }

        #sr-picker .sr-custom-divider {
            font-size: 11px; color: #999999;
            margin: 12px 0 6px; text-transform: uppercase;
            letter-spacing: 1px;
            border-top: 1px dashed #e0e0e0;
            padding-top: 10px;
        }

        #sr-picker textarea.sr-custom-input {
            width: 100%; padding: 9px 12px;
            border: 1.5px solid #dddddd;
            border-radius: 6px; font-size: 13px;
            box-sizing: border-box; resize: vertical;
            min-height: 80px;
            font-family: Arial, sans-serif;
            line-height: 1.5; color: #131921;
            background: #fafafa;
        }

        #sr-picker textarea.sr-custom-input:focus {
            outline: none; border-color: #FF9900;
            background: #fff;
            box-shadow: 0 0 0 2px rgba(255,153,0,0.15);
        }

        #sr-picker .sr-add-row {
            display: flex; gap: 8px;
            align-items: flex-end; margin-top: 8px;
        }

        #sr-picker .sr-add-btn {
            padding: 9px 20px; background: #FF9900;
            color: #131921; border: none; border-radius: 6px;
            cursor: pointer; font-size: 13px; font-weight: bold;
            white-space: nowrap; flex-shrink: 0;
            transition: background 0.15s;
        }

        #sr-picker .sr-add-btn:hover { background: #e68a00; }

        #sr-picker .sr-save-btn {
            padding: 9px 20px; background: #131921;
            color: #FF9900; border: 1.5px solid #FF9900;
            border-radius: 6px; cursor: pointer;
            font-size: 13px; font-weight: bold;
            white-space: nowrap; flex-shrink: 0;
            transition: background 0.15s, color 0.15s;
        }

        #sr-picker .sr-save-btn:hover {
            background: #FF9900; color: #131921;
        }

        #sr-picker .sr-back {
            display: block; width: 100%;
            padding: 10px 12px; margin-top: 10px;
            background: #f0f0f0; color: #131921;
            border: 1px solid #cccccc; border-radius: 6px;
            cursor: pointer; font-size: 13px; font-weight: bold;
            box-sizing: border-box;
            transition: background 0.15s, color 0.15s;
        }

        #sr-picker .sr-back:hover {
            background: #131921; color: #ffffff;
            border-color: #131921;
        }

        #sr-picker .sr-cancel {
            display: block; width: 100%;
            padding: 10px 12px; margin-top: 6px;
            background: #131921; color: #ffffff;
            border: none; border-radius: 6px;
            cursor: pointer; font-size: 13px; font-weight: bold;
            box-sizing: border-box;
            transition: background 0.15s;
        }

        #sr-picker .sr-cancel:hover { background: #000000; }

        .sr-hide { display: none !important; }

        .sr-hint {
            font-size: 11px; color: #999999;
            margin-top: 5px; font-style: italic;
        }

        #sr-badge {
            position: fixed; bottom: 15px; right: 15px;
            background: #131921; color: #FF9900;
            padding: 8px 16px; border-radius: 20px;
            font-size: 12px; font-weight: bold;
            z-index: 99997;
            box-shadow: 0 2px 10px rgba(0,0,0,0.4);
            font-family: Arial, sans-serif; cursor: pointer;
            border: 1.5px solid #FF9900;
            transition: background 0.15s, color 0.15s;
        }

        #sr-badge:hover {
            background: #FF9900; color: #131921;
        }

        .sr-confirm-overlay {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.65); z-index: 100001;
            display: flex; align-items: center; justify-content: center;
        }

        .sr-confirm-box {
            background: #ffffff; border-radius: 10px; padding: 28px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.35);
            min-width: 340px; font-family: Arial;
            text-align: center; border-top: 4px solid #FF9900;
        }

        .sr-confirm-box h4 {
            margin: 0 0 8px; color: #131921; font-size: 16px;
        }

        .sr-confirm-box p {
            margin: 0 0 18px; font-size: 13px; color: #555555;
        }

        .sr-confirm-btns {
            display: flex; gap: 10px; justify-content: center;
        }

        .sr-confirm-btns button {
            padding: 9px 26px; border: none; border-radius: 6px;
            font-size: 13px; font-weight: bold; cursor: pointer;
            transition: background 0.15s;
        }

        .sr-confirm-yes { background: #cc0000; color: #fff; }
        .sr-confirm-yes:hover { background: #990000; }

        .sr-confirm-no {
            background: #131921; color: #FF9900;
            border: 1.5px solid #FF9900;
        }

        .sr-confirm-no:hover {
            background: #FF9900; color: #131921;
        }

        #sr-debug-panel {
            position: fixed; bottom: 55px; right: 15px;
            background: #131921; color: #FF9900;
            padding: 10px 14px; border-radius: 8px;
            font-size: 11px; z-index: 99997;
            font-family: monospace; max-width: 420px;
            max-height: 200px; overflow-y: auto;
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
            display: none; white-space: pre-wrap;
            word-break: break-all;
            border: 1px solid #FF9900;
        }

        .sr-toast {
            position: fixed; bottom: 60px; right: 15px;
            background: #131921; color: #FF9900;
            padding: 10px 20px; border-radius: 8px;
            font-size: 13px; z-index: 100002;
            box-shadow: 0 4px 14px rgba(0,0,0,0.35);
            font-family: Arial; border: 1px solid #FF9900;
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
        el.querySelector('.sr-confirm-yes').onclick = () => {
            el.remove(); onConfirm();
        };
        el.querySelector('.sr-confirm-no').onclick = () => el.remove();
    }

    // ═══════════════════════════════════════════════
    // STEP 1 — MAIN CATEGORY PICKER
    // ═══════════════════════════════════════════════

    function renderCategoryStep() {
        let html = `
            <div class="sr-header">
                <h3>📋 Expected Response</h3>
                <div class="sr-step-label">
                    Step 1 — Select a Response Category
                </div>
            </div>
            <div class="sr-body">
                <input type="text" class="sr-search"
                    placeholder="🔍 Search categories..." />`;

        Object.keys(RESPONSE_MAP).forEach(cat => {
            html += `
                <div class="sr-opt-row"
                    data-search="${escapeHtml(cat.toLowerCase())}">
                    <button class="sr-opt sr-cat-opt"
                        data-cat="${encodeURIComponent(cat)}">
                        📁 ${escapeHtml(cat)}
                    </button>
                </div>`;
        });

        html += `
            <div class="sr-opt-row" data-search="hva related pills">
                <button class="sr-opt sr-opt-hva sr-hva-pills-btn">
                    💊 HVA Related Pills
                </button>
            </div>
            <div class="sr-opt-row" data-search="custom response">
                <button class="sr-opt sr-opt-custom-cat sr-custom-cat-opt">
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

        // FIX #1 — decodeURIComponent when reading data-cat
        picker.querySelectorAll('.sr-cat-opt').forEach(btn => {
            btn.addEventListener('click', function () {
                renderResponseStep(decodeURIComponent(this.dataset.cat));
            });
        });

        const hvaBtn = picker.querySelector('.sr-hva-pills-btn');
        if (hvaBtn) hvaBtn.addEventListener('click', () => renderHVAListStep());

        const customBtn = picker.querySelector('.sr-custom-cat-opt');
        if (customBtn) customBtn.addEventListener('click', () =>
            renderCustomResponseStep()
        );

        const cancelBtn = picker.querySelector('.sr-cancel');
        if (cancelBtn) cancelBtn.addEventListener('click', hidePicker);

        setTimeout(() => { if (searchBox) searchBox.focus(); }, 100);
    }

    // ═══════════════════════════════════════════════
    // STEP 2 — HVA LIST PICKER
    // FIX #1 — encodeURIComponent on data-hva
    // ═══════════════════════════════════════════════

    function renderHVAListStep() {
        const hvaNames = Object.keys(HVA_PILLS_MAP);

        let html = `
            <div class="sr-header">
                <h3>💊 HVA Related Pills</h3>
                <div class="sr-step-label">
                    Step 2 — Select an HVA
                </div>
            </div>
            <div class="sr-body">
                <div class="sr-category-badge-hva">
                    💊 HVA Related Pills
                </div><br/>
                <input type="text" class="sr-search"
                    placeholder="🔍 Search HVAs..." />`;

        hvaNames.forEach(hva => {
            html += `
                <div class="sr-opt-row"
                    data-search="${escapeHtml(hva.toLowerCase())}">
                    <button class="sr-opt sr-opt-hva-name sr-hva-name-btn"
                        data-hva="${encodeURIComponent(hva)}">
                        🏷️ ${escapeHtml(hva)}
                    </button>
                </div>`;
        });

        html += `
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

        // FIX #1 — decodeURIComponent when reading data-hva
        picker.querySelectorAll('.sr-hva-name-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                renderHVAHeadingsStep(decodeURIComponent(this.dataset.hva));
            });
        });

        const backBtn = picker.querySelector('.sr-back');
        const cancelBtn = picker.querySelector('.sr-cancel');
        if (backBtn) backBtn.addEventListener('click', renderCategoryStep);
        if (cancelBtn) cancelBtn.addEventListener('click', hidePicker);

        setTimeout(() => { if (searchBox) searchBox.focus(); }, 100);
    }

    // ═══════════════════════════════════════════════
    // STEP 3 — HVA HEADINGS PICKER
    // FIX #3 — empty state guard added
    // FIX #6 — redundant br removed after hva name badge
    // ═══════════════════════════════════════════════

    function renderHVAHeadingsStep(hvaName) {
        const headings = HVA_PILLS_MAP[hvaName] || {};
        const headingKeys = Object.keys(headings);

        // FIX #3 — guard against empty HVA
        if (headingKeys.length === 0) {
            showToast('⚠️ No headings found for this HVA!');
            renderHVAListStep();
            return;
        }

        let html = `
            <div class="sr-header">
                <h3>💊 HVA Related Pills</h3>
                <div class="sr-step-label">
                    Step 3 — Select a Heading
                </div>
            </div>
            <div class="sr-body">
                <div class="sr-category-badge-hva">
                    💊 HVA Related Pills
                </div>
                <div class="sr-hva-name-badge">
                    🏷️ ${escapeHtml(hvaName)}
                </div>
                <input type="text" class="sr-search"
                    placeholder="🔍 Search headings..." />`;

        headingKeys.forEach(heading => {
            html += `
                <div class="sr-opt-row"
                    data-search="${escapeHtml(heading.toLowerCase())}">
                    <button class="sr-opt sr-opt-pill sr-pill-opt"
                        data-val="${encodeURIComponent(heading)}">
                        📌 ${escapeHtml(heading)}
                    </button>
                </div>`;
        });

        html += `
            <button class="sr-back">⬅ Back to HVA List</button>
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

        picker.querySelectorAll('.sr-pill-opt').forEach(btn => {
            btn.addEventListener('click', function () {
                const heading = decodeURIComponent(this.dataset.val);
                const response = headings[heading];
                if (!response) {
                    showToast('⚠️ No response found for this heading!');
                    return;
                }
                const textarea = findExpectedResponseField();
                hidePicker();
                setTimeout(() => {
                    if (textarea) {
                        smartFill(textarea, response);
                        showToast('✅ Expected Response filled!');
                    } else {
                        alert('❌ Could not find Expected Response textarea!');
                    }
                }, 400);
            });
        });

        const backBtn = picker.querySelector('.sr-back');
        const cancelBtn = picker.querySelector('.sr-cancel');
        if (backBtn) backBtn.addEventListener('click', renderHVAListStep);
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
                <div class="sr-step-label">
                    Step 2 — Select a Response
                </div>
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
            html += `
                <div class="sr-custom-divider">⭐ Custom Responses</div>`;
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
                    e.preventDefault(); addCustomResponse();
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
                    Step 2 — Write or Select a Custom Response
                </div>
            </div>
            <div class="sr-body">
                <div class="sr-category-badge-custom">
                    ✏️ Custom Response
                </div><br/>
                <div class="sr-custom-label">
                    ✍️ Type Your Custom Response
                </div>
                <textarea class="sr-custom-input" id="sr-new-custom-input"
                    placeholder="Type the expected response you want to fill in...">
                </textarea>
                <div class="sr-hint">
                    Tip: Ctrl+Enter to fill directly without saving
                </div>
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
                    e.preventDefault(); fillNow();
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
                        smartFill(textarea, val);
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
            e.preventDefault(); showPicker();
        }
        if (e.key === 'Escape') hidePicker();
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            debugPanel.style.display =
                debugPanel.style.display === 'none' ? 'block' : 'none';
        }
    });

    // FIX #4 — clean debug log message
    debugLog('SR Filler v3.3 loaded');

})();
