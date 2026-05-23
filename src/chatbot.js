/* ═══════════════════════════════════════════════════════
   SYNSITE — Customer Support Chatbot
   ═══════════════════════════════════════════════════════ */

const BOT_NAME = 'SynBot';
const BOT_AVATAR = '✦';

/* ── Knowledge Base ──────────────────────────────────── */
const KB = [
    {
        patterns: ['hi', 'hello', 'hey', 'good morning', 'good evening', 'howdy', 'sup', 'helo'],
        reply: `Hey there! 👋 Welcome to <strong>Synsite</strong>! I'm SynBot, your digital assistant.<br><br>How can I help you today? You can ask me about our services, pricing, demo, or anything else!`,
        chips: ['Our Services', 'Pricing Plans', 'Free Demo', 'How it works'],
    },
    {
        patterns: ['service', 'offer', 'what do you do', 'what can you build', 'build', 'develop', 'what do synsite'],
        reply: `We offer a full suite of web solutions 🚀<br><br>
<strong>💻 Custom Development</strong> — Tailor-made websites from scratch<br>
<strong>🛍️ E-Commerce</strong> — High-converting online stores<br>
<strong>🎨 UI/UX Design</strong> — Beautiful, intuitive interfaces<br>
<strong>🚀 Landing Pages</strong> — Conversion-focused campaign pages<br>
<strong>🔄 Website Redesign</strong> — Modernize your existing site<br>
<strong>🛡️ Maintenance</strong> — Ongoing support & security<br><br>
Which service are you most interested in?`,
        chips: ['Pricing Plans', 'Free Demo', 'Timeline', 'Contact Us'],
    },
    {
        patterns: ['price', 'pricing', 'cost', 'how much', 'charge', 'fee', 'rate', 'plan', 'package', 'rupee', '₹'],
        reply: `Our pricing is transparent and competitive 💳<br><br>
<strong>🌱 Starter</strong> — ₹10,000 · Business website, up to 5 pages<br>
<strong>⚡ Growth</strong> — ₹45,000 · Advanced site + contact forms + SEO<br>
<strong>🏆 Pro</strong> — ₹75,000 · E-commerce or complex web app<br>
<strong>🔒 Maintenance</strong> — ₹3,500/mo · Updates, backups & support<br><br>
All plans include a <strong>free SynPreview™ demo</strong> before you commit. No hidden fees!`,
        chips: ['View Pricing Page', 'Free Demo', 'What\'s included?', 'Payment options'],
    },
    {
        patterns: ['demo', 'synpreview', 'preview', 'free', 'sample', 'try', 'trial', 'see it'],
        reply: `Our <strong>SynPreview™</strong> is 100% free and zero-commitment! 🎉<br><br>
Here's how it works:<br>
1️⃣ Fill out our quick form (3 min)<br>
2️⃣ We reach out within 48 hours<br>
3️⃣ We build a custom homepage demo in <strong>3–5 business days</strong><br>
4️⃣ You review it — no pressure, no cost!<br><br>
Ready to get yours?`,
        chips: ['Get My Free Demo', 'How long does it take?', 'What info do you need?'],
    },
    {
        patterns: ['how long', 'timeline', 'time', 'duration', 'days', 'weeks', 'delivery', 'deadline', 'when'],
        reply: `Great question! Here's a typical timeline ⏱️<br><br>
<strong>SynPreview™ Demo</strong> → 3–5 business days<br>
<strong>Starter Website</strong> → 2–3 weeks<br>
<strong>Growth Website</strong> → 3–5 weeks<br>
<strong>Pro / E-Commerce</strong> → 5–8 weeks<br><br>
We prioritize quality but also respect your deadlines. Rush delivery is available — just let us know!`,
        chips: ['Get Free Demo', 'Pricing Plans', 'Contact Us'],
    },
    {
        patterns: ['process', 'how it works', 'steps', 'workflow', 'procedure', 'how do i start', 'get started', 'begin', 'start'],
        reply: `Getting your website is super simple! 🛤️<br><br>
<strong>01 — Fill the Form</strong><br>Tell us your vision, goals, and brand. 3 minutes, that's all.<br><br>
<strong>02 — We Connect</strong><br>Our team reaches out within 48 hours to align on your project.<br><br>
<strong>03 — SynPreview™</strong><br>We build your free custom demo — no commitment needed!<br><br>
<strong>04 — Launch & Scale</strong><br>After your approval, we build and deploy the full site.`,
        chips: ['Get Free Demo', 'Pricing', 'Timeline'],
    },
    {
        patterns: ['payment', 'pay', 'razorpay', 'upi', 'card', 'bank', 'transfer', 'invoice', 'gst'],
        reply: `Payments are secure and flexible 🔒<br><br>
We accept:<br>
💳 Credit / Debit Cards<br>
📱 UPI (GPay, PhonePe, Paytm)<br>
🏦 Net Banking / Bank Transfer<br>
🌐 International Cards<br><br>
All payments are processed via <strong>Razorpay</strong>. GST invoice included with every payment!`,
        chips: ['View Pricing Page', 'Get Demo First', 'Contact Us'],
    },
    {
        patterns: ['contact', 'reach', 'email', 'call', 'phone', 'whatsapp', 'talk to human', 'speak to', 'support'],
        reply: `Want to talk to a real human? We got you! 🤝<br><br>
📧 <strong>Email:</strong> hello@synsite.com<br>
💬 <strong>WhatsApp:</strong> Chat with us anytime<br>
📱 <strong>Social:</strong> @synsite on Instagram & LinkedIn<br><br>
Or simply fill out our <strong>free demo form</strong> — our team will reach out within 48 hours!`,
        chips: ['Get Free Demo', 'Pricing Plans'],
    },
    {
        patterns: ['seo', 'search engine', 'google rank', 'optimize', 'traffic', 'rank'],
        reply: `Great question — SEO is baked into every site we build 📈<br><br>
Every Synsite project includes:<br>
✅ Structured data & schema markup<br>
✅ Fast load times (<2s target)<br>
✅ Mobile-first, responsive design<br>
✅ Meta tags, Open Graph, & sitemap<br>
✅ Core Web Vitals optimization<br><br>
We build sites that Google <em>loves</em>.`,
        chips: ['Our Services', 'Get Demo', 'Pricing'],
    },
    {
        patterns: ['mobile', 'responsive', 'phone', 'tablet', 'device'],
        reply: `Absolutely — all our websites are <strong>100% responsive</strong> 📱<br><br>
Every design is tested across:<br>
📱 Smartphones (iOS & Android)<br>
💻 Tablets & iPads<br>
🖥️ Desktops & large screens<br><br>
We follow a mobile-first approach because over 60% of web traffic comes from mobile devices!`,
        chips: ['Our Services', 'Free Demo', 'Pricing'],
    },
    {
        patterns: ['synsites', 'who made', 'company', 'about', 'team', 'founder', 'who are you'],
        reply: `Synsite is a premium web agency <strong>powered by Synsites</strong> 🌐<br><br>
Synsites is a technology ecosystem built to help businesses grow digitally. Synsite is its flagship web design & development brand — bringing cutting-edge tech and stunning design to businesses of all sizes.<br><br>
We're a passionate team of designers, developers, and strategists who genuinely care about your results.`,
        chips: ['Our Services', 'Get Free Demo', 'Pricing'],
    },
    {
        patterns: ['bye', 'goodbye', 'thanks', 'thank you', 'ok', 'okay', 'got it', 'great', 'awesome', 'perfect'],
        reply: `You're welcome! 😊 It was great chatting with you.<br><br>
Whenever you're ready, we're here to bring your vision to life. Have a wonderful day! 🚀<br><br>
— <em>The Synsite Team</em>`,
        chips: ['Get Free Demo', 'View Pricing'],
    },
];

const FALLBACK = [
    `Hmm, I'm not sure about that one! 🤔 But our team definitely can help. Want to:<br><br>📝 <strong>Fill our demo form</strong> — we'll get back to you within 48 hours<br>📧 <strong>Email us</strong> at hello@synsite.com<br>💬 <strong>WhatsApp us</strong> for a quick chat`,
    `That's a great question but it's a bit outside my knowledge! 😅 Our human team would love to help — try reaching out via our <strong>free demo form</strong> or email at <strong>hello@synsite.com</strong>!`,
    `I'm still learning! For detailed answers, our team at <strong>hello@synsite.com</strong> can help you within 48 hours. Or scroll up and hit <strong>"Get Free Demo"</strong> to start your journey! 🚀`,
];

/* ── Quick Chip Actions ───────────────────────────────── */
const CHIP_ACTIONS = {
    'Our Services': () => triggerQuery('what services do you offer'),
    'Pricing Plans': () => triggerQuery('what is the pricing'),
    'Free Demo': () => triggerQuery('tell me about the free demo'),
    'How it works': () => triggerQuery('how does the process work'),
    'Get My Free Demo': () => { window.location.href = '#demo'; closeChat(); },
    'View Pricing Page': () => { window.location.href = '/payment.html'; },
    'Get Demo First': () => triggerQuery('tell me about the free demo'),
    'Get Free Demo': () => { window.location.href = '#demo'; closeChat(); },
    'View Pricing': () => { window.location.href = '/payment.html'; },
    'Timeline': () => triggerQuery('how long does it take'),
    'Contact Us': () => triggerQuery('how do I contact you'),
    'What\'s included?': () => triggerQuery('what services do you offer'),
    'Payment options': () => triggerQuery('what payment methods do you accept'),
    'How long does it take?': () => triggerQuery('how long does it take'),
    'What info do you need?': () => triggerQuery('how does the process work'),
    'Pricing': () => triggerQuery('what is the pricing'),
    'Get Demo': () => triggerQuery('tell me about the free demo'),
};

/* ── State ───────────────────────────────────────────── */
let isOpen = false;
let isTyping = false;
let messageCount = 0;
let unreadCount = 0;

/* ── DOM refs ────────────────────────────────────────── */
let chatWindow, messagesEl, inputEl, sendBtn, badge, toggleBtn;

/* ── Init ─────────────────────────────────────────────── */
export function initChatbot() {
    injectHTML();
    cacheDOMRefs();
    attachListeners();
    // Greet after 3 seconds silently (show badge)
    setTimeout(() => showUnread(1), 3000);
}

function injectHTML() {
    const el = document.createElement('div');
    el.id = 'chatbot-root';
    el.innerHTML = `
    <!-- Toggle Button -->
    <button id="cb-toggle" aria-label="Open chat" title="Chat with SynBot">
      <span class="cb-toggle__icon cb-toggle__icon--chat">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
      <span class="cb-toggle__icon cb-toggle__icon--close" hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </span>
      <span id="cb-badge" class="cb-badge" hidden>0</span>
    </button>

    <!-- Chat Window -->
    <div id="cb-window" class="cb-window" aria-hidden="true">
      <!-- Header -->
      <div class="cb-header">
        <div class="cb-header__avatar">${BOT_AVATAR}</div>
        <div class="cb-header__info">
          <div class="cb-header__name">${BOT_NAME} <span class="cb-header__tag">AI</span></div>
          <div class="cb-header__status"><span class="cb-status-dot"></span> Online · Usually replies instantly</div>
        </div>
        <button class="cb-header__close" aria-label="Close chat" id="cb-close-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <!-- Messages -->
      <div id="cb-messages" class="cb-messages" role="log" aria-live="polite"></div>

      <!-- Input -->
      <div class="cb-input-row">
        <input id="cb-input" type="text" placeholder="Ask me anything…" autocomplete="off" maxlength="300" />
        <button id="cb-send" class="cb-send-btn" aria-label="Send message">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="cb-footer-note">Powered by <strong>Synsite</strong> · Not financial/legal advice</div>
    </div>
  `;
    document.body.appendChild(el);
}

function cacheDOMRefs() {
    chatWindow = document.getElementById('cb-window');
    messagesEl = document.getElementById('cb-messages');
    inputEl = document.getElementById('cb-input');
    sendBtn = document.getElementById('cb-send');
    badge = document.getElementById('cb-badge');
    toggleBtn = document.getElementById('cb-toggle');
}

function attachListeners() {
    toggleBtn.addEventListener('click', toggleChat);
    document.getElementById('cb-close-btn').addEventListener('click', closeChat);
    sendBtn.addEventListener('click', handleSend);
    inputEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    inputEl.addEventListener('input', () => {
        sendBtn.disabled = !inputEl.value.trim();
    });
}

/* ── Chat open/close ─────────────────────────────────── */
function toggleChat() {
    isOpen ? closeChat() : openChat();
}

function openChat() {
    isOpen = true;
    chatWindow.classList.add('cb-window--open');
    chatWindow.setAttribute('aria-hidden', 'false');
    toggleBtn.querySelector('.cb-toggle__icon--chat').hidden = true;
    toggleBtn.querySelector('.cb-toggle__icon--close').hidden = false;
    toggleBtn.classList.add('cb-toggle--active');
    clearUnread();
    inputEl.focus();
    if (messageCount === 0) {
        setTimeout(() => botGreet(), 300);
    }
}

function closeChat() {
    isOpen = false;
    chatWindow.classList.remove('cb-window--open');
    chatWindow.setAttribute('aria-hidden', 'true');
    toggleBtn.querySelector('.cb-toggle__icon--chat').hidden = false;
    toggleBtn.querySelector('.cb-toggle__icon--close').hidden = true;
    toggleBtn.classList.remove('cb-toggle--active');
}

/* ── Messaging ───────────────────────────────────────── */
function botGreet() {
    const greeting = KB[0]; // 'hi' entry
    addBotMessage(greeting.reply, greeting.chips);
}

function handleSend() {
    const text = inputEl.value.trim();
    if (!text || isTyping) return;
    inputEl.value = '';
    sendBtn.disabled = true;
    addUserMessage(text);
    processQuery(text);
}

function triggerQuery(text) {
    if (isTyping) return;
    addUserMessage(text);
    processQuery(text);
}

function processQuery(text) {
    const lower = text.toLowerCase();
    let matched = null;

    for (const entry of KB) {
        if (entry.patterns.some(p => lower.includes(p))) {
            matched = entry;
            break;
        }
    }

    const delay = 800 + Math.random() * 600;
    showTypingIndicator();

    setTimeout(() => {
        hideTypingIndicator();
        if (matched) {
            addBotMessage(matched.reply, matched.chips);
        } else {
            const fallback = FALLBACK[Math.floor(Math.random() * FALLBACK.length)];
            addBotMessage(fallback, ['Get Free Demo', 'Our Services', 'Pricing Plans', 'Contact Us']);
        }
    }, delay);
}

function addUserMessage(text) {
    messageCount++;
    const div = document.createElement('div');
    div.className = 'cb-msg cb-msg--user';
    div.innerHTML = `<div class="cb-bubble cb-bubble--user">${escapeHTML(text)}</div>`;
    messagesEl.appendChild(div);
    scrollToBottom();
    animateIn(div);
}

function addBotMessage(html, chips = []) {
    messageCount++;
    if (!isOpen) showUnread(1);

    const div = document.createElement('div');
    div.className = 'cb-msg cb-msg--bot';
    div.innerHTML = `
    <div class="cb-msg__avatar">${BOT_AVATAR}</div>
    <div class="cb-msg__body">
      <div class="cb-bubble cb-bubble--bot">${html}</div>
      ${chips.length ? `<div class="cb-chips">${chips.map(c =>
        `<button class="cb-chip" data-query="${escapeAttr(c)}">${c}</button>`
    ).join('')}</div>` : ''}
    </div>
  `;

    // Wire chip clicks
    div.querySelectorAll('.cb-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = CHIP_ACTIONS[btn.dataset.query];
            if (action) {
                action();
            } else {
                triggerQuery(btn.dataset.query);
            }
            // Disable all chips in this message after click
            div.querySelectorAll('.cb-chip').forEach(c => c.disabled = true);
        });
    });

    messagesEl.appendChild(div);
    scrollToBottom();
    animateIn(div);
}

/* ── Typing Indicator ────────────────────────────────── */
function showTypingIndicator() {
    isTyping = true;
    const div = document.createElement('div');
    div.className = 'cb-msg cb-msg--bot';
    div.id = 'cb-typing';
    div.innerHTML = `
    <div class="cb-msg__avatar">${BOT_AVATAR}</div>
    <div class="cb-msg__body">
      <div class="cb-bubble cb-bubble--bot cb-typing-bubble">
        <span class="cb-dot"></span><span class="cb-dot"></span><span class="cb-dot"></span>
      </div>
    </div>
  `;
    messagesEl.appendChild(div);
    scrollToBottom();
    animateIn(div);
}

function hideTypingIndicator() {
    isTyping = false;
    const el = document.getElementById('cb-typing');
    if (el) el.remove();
}

/* ── Helpers ─────────────────────────────────────────── */
function scrollToBottom() {
    requestAnimationFrame(() => {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    });
}

function animateIn(el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    requestAnimationFrame(() => {
        el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
    });
}

function showUnread(n) {
    unreadCount += n;
    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    badge.hidden = false;
}

function clearUnread() {
    unreadCount = 0;
    badge.hidden = true;
}

function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
    return str.replace(/"/g, '&quot;');
}
