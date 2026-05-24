import { ConvexClient } from "convex/browser";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
let convexClient = null;

if (CONVEX_URL) {
    try {
        convexClient = new ConvexClient(CONVEX_URL);
        console.log("Convex client initialized successfully.");
    } catch (e) {
        console.error("Failed to initialize Convex client:", e);
    }
}

export function getNextMonth15Date() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(15);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

export const DEFAULT_CLIENTS = {
    'SYN-000': {
        password: 'synsites-000',
        name: 'Kathir M',
        company: 'Synsites LLC',
        email: 'kathir@synsites.com',
        phone: '+91 98765 43210',
        description: 'Initial setup & integration of Synsite branding and structure.',
        invoices: [
            { ref: 'INV-2026-0001', description: 'Demo Site Setup Dues', amount: 50, gst: false, status: 'due', dueDate: getNextMonth15Date() },
        ],
    },
    'SYN-001': {
        password: 'synsites-001',
        name: 'Rahul Mehta',
        company: 'NexGen Ventures',
        email: 'rahul@nexgen.com',
        phone: '+91 98765 43210',
        description: 'Full custom business site development under NexGen branding.',
        invoices: [
            { ref: 'INV-2026-0042', description: 'Website Development — Balance Payment', amount: 5000, gst: false, status: 'due', dueDate: getNextMonth15Date() },
        ],
    },
};

const DYNAMIC_CLIENTS_KEY = 'synsite_dynamic_clients';

export function loadClients() {
    const stored = localStorage.getItem(DYNAMIC_CLIENTS_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            const merged = {};
            // Start with defaults
            Object.keys(DEFAULT_CLIENTS).forEach(id => {
                merged[id] = JSON.parse(JSON.stringify(DEFAULT_CLIENTS[id]));
            });
            // Overwrite/add dynamic ones
            Object.keys(parsed).forEach(id => {
                merged[id] = parsed[id];
            });
            return merged;
        } catch (e) {
            console.error('Failed to parse dynamic clients:', e);
        }
    }
    
    // Fallback: return cloned defaults
    const clonedDefaults = {};
    Object.keys(DEFAULT_CLIENTS).forEach(id => {
        clonedDefaults[id] = JSON.parse(JSON.stringify(DEFAULT_CLIENTS[id]));
    });
    return clonedDefaults;
}

export function saveClient(id, clientData) {
    let stored = {};
    const raw = localStorage.getItem(DYNAMIC_CLIENTS_KEY);
    if (raw) {
        try {
            stored = JSON.parse(raw);
        } catch (e) {
            console.error(e);
        }
    }
    stored[id] = clientData;
    localStorage.setItem(DYNAMIC_CLIENTS_KEY, JSON.stringify(stored));

    if (convexClient) {
        convexClient.mutation("clients:save", {
            clientId: id,
            password: clientData.password || "",
            name: clientData.name || "",
            company: clientData.company || "",
            email: clientData.email || "",
            phone: clientData.phone || "",
            description: clientData.description || "",
            invoices: clientData.invoices || [],
        }).then(() => {
            console.log("Client successfully saved to Convex:", id);
        }).catch(err => {
            console.error("Failed to save client to Convex:", err);
        });
    }
}

export async function syncConvex() {
    if (!convexClient) return;
    try {
        const list = await convexClient.query("clients:list");
        if (list.length === 0) {
            const defaultsArray = Object.keys(DEFAULT_CLIENTS).map(id => ({
                clientId: id,
                ...DEFAULT_CLIENTS[id]
            }));
            await convexClient.mutation("clients:seed", { clients: defaultsArray });
            console.log("Seeded default clients to Convex.");
        }

        const freshClients = await convexClient.query("clients:list");
        if (freshClients && freshClients.length > 0) {
            const cache = {};
            freshClients.forEach(c => {
                const { _id, _creationTime, ...clientData } = c;
                cache[c.clientId] = clientData;
                if (clientData.password) {
                    localStorage.setItem(`client_pass_${c.clientId}`, clientData.password);
                }
            });
            localStorage.setItem(DYNAMIC_CLIENTS_KEY, JSON.stringify(cache));
            console.log("Synced local cache with Convex database.");
            
            const activeId = localStorage.getItem('synsite_active_client_id');
            if (activeId) {
                initGlobalProfileMenu(true);
            }
        }
    } catch (e) {
        console.error("Convex sync failed:", e);
    }
}
export function loadTheme() {
    const theme = localStorage.getItem('synsite_theme');
    if (theme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
}

export function toggleGlobalTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('synsite_theme', isLight ? 'light' : 'dark');
}

export function initGlobalProfileMenu(forceRefresh = false) {
    // Load theme on start
    loadTheme();

    if (!forceRefresh && convexClient) {
        syncConvex();
    }

    if (forceRefresh) {
        const existing = document.getElementById('nav-profile-container');
        if (existing) existing.remove();
    }

    const navWrap = document.querySelector('.nav__wrap');
    if (!navWrap) return;
    
    // Check if profile container is already rendered
    if (document.getElementById('nav-profile-container')) return;

    const activeId = localStorage.getItem('synsite_active_client_id');
    if (!activeId) return;

    const clients = loadClients();
    const client = clients[activeId];
    if (!client) return;

    // Sync status with localStorage
    client.invoices.forEach(inv => {
        const paidList = localStorage.getItem(`client_paid_${activeId}`);
        if (paidList) {
            const parsed = JSON.parse(paidList);
            if (parsed.includes(inv.ref)) inv.status = 'paid';
        }
    });

    // Count outstanding dues
    const dueInvoices = client.invoices.filter(i => i.status === 'due');
    const hasDues = dueInvoices.length > 0;
    
    // Hide standard desktop CTA buttons in navbar if logged in
    document.querySelectorAll('.nav__wrap > .btn').forEach(btn => {
        btn.style.display = 'none';
    });

    // Inject styles if not present
    if (!document.getElementById('nav-profile-styles')) {
        const s = document.createElement('style');
        s.id = 'nav-profile-styles';
        s.textContent = `
            @keyframes badgePulse {
                0% { box-shadow: 0 0 0 0 rgba(255, 120, 0, 0.7); }
                70% { box-shadow: 0 0 0 8px rgba(255, 120, 0, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 120, 0, 0); }
            }
            .nav-badge-pulse {
                animation: badgePulse 2s infinite;
            }
            .due-notification-toast {
                position: fixed;
                bottom: 2rem;
                right: 2rem;
                width: 320px;
                background: rgba(13, 9, 32, 0.95);
                border: 1px solid rgba(255, 120, 0, 0.35);
                border-radius: var(--r-md, 12px);
                padding: 1.25rem;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 120, 0, 0.15);
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                z-index: 9999;
                color: #fff;
                display: flex;
                flex-direction: column;
                gap: 12px;
                animation: toast-slide-in 0.5s cubic-bezier(0.19, 1, 0.22, 1) forwards;
            }
            .due-notification-toast.dismissing {
                animation: toast-slide-out 0.4s cubic-bezier(0.19, 1, 0.22, 1) forwards;
            }
            body.light-theme .due-notification-toast {
                background: rgba(255, 255, 255, 0.98);
                border: 1px solid rgba(124, 58, 237, 0.25);
                box-shadow: 0 20px 40px rgba(124, 58, 237, 0.15);
                color: #0f172a;
            }
            body.light-theme .due-notification-toast .btn--ghost {
                border-color: rgba(124, 58, 237, 0.2) !important;
                color: #0f172a !important;
            }
            body.light-theme .due-notification-toast .btn--ghost:hover {
                background: rgba(124, 58, 237, 0.08) !important;
            }
            @keyframes toast-slide-in {
                from { transform: translateX(120%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes toast-slide-out {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(120%); opacity: 0; }
            }
        `;
        document.head.appendChild(s);
    }

    const profileDiv = document.createElement('div');
    profileDiv.id = 'nav-profile-container';
    profileDiv.style.cssText = `position: relative; display: flex; align-items: center; gap: 8px; z-index: 1000; margin-left: auto; margin-right: 0.5rem;`;
    
    const avatarLetter = client.name.charAt(0).toUpperCase();

    profileDiv.innerHTML = `
        <button id="nav-avatar-btn" style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, var(--c-purple-2), var(--c-cyan)); border: 2px solid rgba(245, 245, 220, 0.4); display: flex; align-items: center; justify-content: center; font-size: 1rem; color: #fff; font-weight: 700; cursor: pointer; position: relative; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)';" onmouseout="this.style.transform='scale(1)';">
            ${avatarLetter}
            ${hasDues ? `<span class="nav-badge-pulse" style="position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; border-radius: 50%; background: #ff7800; border: 2px solid #07040f;"></span>` : ''}
        </button>

        <!-- Dropdown Menu -->
        <div id="nav-profile-dropdown" class="glass" style="display: none; position: absolute; top: 50px; right: 0; width: 260px; padding: 1.25rem; border-radius: var(--r-md); border: 1px solid rgba(245, 245, 220, 0.2); box-shadow: 0 16px 48px rgba(0,0,0,0.6); animation: fade-in-up 0.25s ease;">
            <div style="margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px dashed rgba(255,255,255,0.1);">
                <div style="font-weight: 700; color: #fff; font-size: 0.92rem; text-align: left;">${client.name}</div>
                <div style="font-size: 0.75rem; color: var(--c-gray-3); margin-top: 2px; text-align: left;">ID: ${activeId}</div>
                ${hasDues ? `<div style="font-size: 0.75rem; color: #fca5a5; margin-top: 4px; font-weight: 600; text-align: left;">⚠️ Outstanding: ${dueInvoices.length} invoice(s)</div>` : `<div style="font-size: 0.75rem; color: #86efac; margin-top: 4px; text-align: left;">✓ Dues fully paid</div>`}
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <a href="/payment.html" class="btn btn--sm btn--primary" style="justify-content: center; width: 100%; font-family: inherit;">View Dues &amp; Pay 💳</a>
                
                <button id="theme-toggle-btn" class="btn btn--sm btn--ghost" style="justify-content: flex-start; width: 100%; gap: 8px; font-family: inherit; font-size: 0.85rem;">
                    🌓 Toggle Light/Dark
                </button>
                
                <button id="nav-profile-edit-btn" class="btn btn--sm btn--ghost" style="justify-content: flex-start; width: 100%; gap: 8px; font-family: inherit; font-size: 0.85rem;">
                    👤 Edit Profile Details
                </button>
                
                <button id="nav-password-change-btn" class="btn btn--sm btn--ghost" style="justify-content: flex-start; width: 100%; gap: 8px; font-family: inherit; font-size: 0.85rem;">
                    🔑 Change Password
                </button>
                
                <button id="nav-logout-btn" class="btn btn--sm btn--ghost" style="justify-content: flex-start; width: 100%; gap: 8px; color: #f87171; border-color: rgba(248,113,113,0.15); font-family: inherit; font-size: 0.85rem;">
                    🚪 Logout
                </button>
            </div>
        </div>
    `;

    // Insert before hamburger if it exists, otherwise append
    const hamburger = navWrap.querySelector('.nav__hamburger');
    if (hamburger) {
        navWrap.insertBefore(profileDiv, hamburger);
    } else {
        navWrap.appendChild(profileDiv);
    }

    // Toggle dropdown on click
    const avatarBtn = profileDiv.querySelector('#nav-avatar-btn');
    const dropdown = profileDiv.querySelector('#nav-profile-dropdown');
    avatarBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = dropdown.style.display === 'none';
        dropdown.style.display = isHidden ? 'block' : 'none';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        if (dropdown) dropdown.style.display = 'none';
    });

    // Theme toggle text synchronizer
    const themeBtn = profileDiv.querySelector('#theme-toggle-btn');
    const updateThemeBtnText = () => {
        if (!themeBtn) return;
        const isLight = document.body.classList.contains('light-theme');
        themeBtn.innerHTML = isLight ? '☀️ Light Mode' : '🌙 Dark Mode';
    };
    updateThemeBtnText();

    // Wire buttons inside dropdown
    // 1. Theme Toggle
    themeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleGlobalTheme();
        updateThemeBtnText();
    });

    // 2. Edit Profile
    profileDiv.querySelector('#nav-profile-edit-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = 'none';
        if (window.location.pathname.includes('payment.html')) {
            const fields = document.getElementById('profile-fields-container');
            if (fields) {
                fields.style.display = 'block';
                fields.scrollIntoView({ behavior: 'smooth', block: 'center' });
                const profileArrow = document.getElementById('profile-toggle-arrow');
                if (profileArrow) {
                    profileArrow.textContent = '▲';
                    profileArrow.style.transform = 'rotate(180deg)';
                }
            }
        } else {
            window.location.href = '/payment.html?action=edit-profile';
        }
    });

    // 3. Change Password
    profileDiv.querySelector('#nav-password-change-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = 'none';
        if (window.location.pathname.includes('payment.html')) {
            const pwForm = document.getElementById('pw-form-container');
            if (pwForm) {
                pwForm.style.display = 'block';
                pwForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            window.location.href = '/payment.html?action=change-password';
        }
    });

    // 4. Logout
    profileDiv.querySelector('#nav-logout-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.removeItem('synsite_active_client_id');
        window.location.href = '/payment.html';
    });

    // Slide-in alert toast notification on pages other than payment portal
    if (hasDues && !window.location.pathname.includes('payment.html')) {
        const notified = sessionStorage.getItem('synsite_due_notified');
        if (!notified) {
            setTimeout(() => {
                showOutstandingNotification(dueInvoices);
            }, 2000);
        }
    }
}

function showOutstandingNotification(dueInvoices) {
    if (document.getElementById('synsite-due-toast')) return;

    let totalDueAmt = 0;
    dueInvoices.forEach(inv => {
        const gst = inv.gst ? Math.round(inv.amount * 0.18) : 0;
        totalDueAmt += (inv.amount + gst);
    });
    const formattedAmt = '₹' + new Intl.NumberFormat('en-IN').format(totalDueAmt);

    const toast = document.createElement('div');
    toast.id = 'synsite-due-toast';
    toast.className = 'due-notification-toast';
    
    toast.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 10px;">
            <span style="font-size: 1.25rem; flex-shrink: 0; line-height: 1;">🔔</span>
            <div style="flex: 1; text-align: left;">
                <strong style="display: block; font-size: 0.9rem; font-weight: 700; color: inherit; margin-bottom: 2px;">Outstanding Dues</strong>
                <p style="font-size: 0.78rem; line-height: 1.4; color: inherit; opacity: 0.8; margin: 0;">
                    You have ${dueInvoices.length} invoice(s) pending payment totaling <strong style="color: #ff7800; font-weight: 700;">${formattedAmt}</strong>.
                </p>
            </div>
            <button id="toast-close-btn" style="background: none; border: none; cursor: pointer; padding: 2px; color: inherit; opacity: 0.6; line-height: 1; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">✕</button>
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;">
            <button id="toast-dismiss-btn" class="btn btn--sm btn--ghost" style="padding: 6px 12px; font-size: 0.75rem; border-color: rgba(255,255,255,0.15); height: auto; line-height: 1.2;">Later</button>
            <a href="/payment.html" class="btn btn--sm btn--primary" style="padding: 6px 12px; font-size: 0.75rem; text-decoration: none; justify-content: center; display: inline-flex; height: auto; line-height: 1.2;">Pay Now 💳</a>
        </div>
    `;

    document.body.appendChild(toast);

    const dismissToast = () => {
        toast.classList.add('dismissing');
        sessionStorage.setItem('synsite_due_notified', 'true');
        setTimeout(() => toast.remove(), 400);
    };

    toast.querySelector('#toast-close-btn')?.addEventListener('click', dismissToast);
    toast.querySelector('#toast-dismiss-btn')?.addEventListener('click', dismissToast);
}
