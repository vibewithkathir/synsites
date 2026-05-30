import './style.css';
import './payment.css';
import { loadClients, saveClient, getNextMonth15Date, initGlobalProfileMenu, loadTheme, fetchClientFromConvex, DEFAULT_CLIENTS } from './db.js';

/* ╔══════════════════════════════════════════════════════════╗
   ║           RAZORPAY CONFIGURATION                          ║
   ║  Step 1: Go to https://razorpay.com → Sign Up (free)     ║
   ║  Step 2: Dashboard → Settings → API Keys → Generate Key  ║
   ║  Step 3: Replace the key below with your Key ID          ║
   ║  Test key format:  rzp_test_XXXXXXXXXXXXXXXX             ║
   ║  Live key format:  rzp_live_XXXXXXXXXXXXXXXX             ║
   ╚══════════════════════════════════════════════════════════╝ */
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_Svc7POJLumrDus';
const CONVEX_SITE_URL = import.meta.env.VITE_CONVEX_SITE_URL || 'https://polite-dove-27.convex.site';

const CONFIG = {
    companyName: 'Synsite',
    companyLogo: '',
    currency: 'INR',
    gstRate: 0.18,
    supportPhone: '+91 98765 43210',
    theme: '#7c3aed',
};

/* ── Helpers ─────────────────────────────────────────────── */
function getInvoiceStatus(clientId, invoiceRef, defaultStatus) {
    const paidList = localStorage.getItem(`client_paid_${clientId}`);
    if (paidList) {
        const parsed = JSON.parse(paidList);
        if (parsed.includes(invoiceRef)) return 'paid';
    }
    return defaultStatus;
}

function setInvoicePaid(clientId, invoiceRef) {
    const paidListStr = localStorage.getItem(`client_paid_${clientId}`) || '[]';
    const parsed = JSON.parse(paidListStr);
    if (!parsed.includes(invoiceRef)) {
        parsed.push(invoiceRef);
    }
    localStorage.setItem(`client_paid_${clientId}`, JSON.stringify(parsed));
}

// Load static & dynamic client registry
const CLIENTS = loadClients();

function fmt(n) {
    return '₹' + new Intl.NumberFormat('en-IN').format(n);
}
function withGST(amount) {
    return Math.round(amount * (1 + CONFIG.gstRate));
}
function gstOf(amount) {
    return Math.round(amount * CONFIG.gstRate);
}

/* ══════════════════════════════════════════════════════════
   APP INIT
   ══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    initGlobalProfileMenu();

    const keyIsSet = RAZORPAY_KEY_ID && !RAZORPAY_KEY_ID.includes('PASTE_YOUR_KEY');
    if (!keyIsSet) showSetupBanner();

    /* ── Scroll Progress ─── */
    const progressBar = document.getElementById('scroll-progress');
    if (progressBar) {
        const upd = () => { progressBar.style.width = Math.min((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight || 1)) * 100, 100) + '%'; };
        window.addEventListener('scroll', upd, { passive: true }); upd();
    }

    /* ── Custom Cursor ─── */
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    if (dot && ring) {
        let mx = -100, my = -100, rx = -100, ry = -100;
        document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; dot.style.left = mx + 'px'; dot.style.top = my + 'px'; });
        const loop = () => { rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12; ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; requestAnimationFrame(loop); };
        loop();
    }

    /* ── Navbar ─── */
    const nav = document.getElementById('nav');
    if (nav) { const s = () => nav.classList.toggle('scrolled', window.scrollY > 50); window.addEventListener('scroll', s, { passive: true }); s(); }

    /* ── Reveal ─── */
    const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (!e.isIntersecting) return; const d = parseInt(e.target.dataset.revealDelay || '0'); setTimeout(() => e.target.classList.add('is-visible'), d); io.unobserve(e.target); });
    }, { threshold: 0.08 });
    document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

    // Auto-login session persistence check
    const savedClientId = localStorage.getItem('synsite_active_client_id');
    if (savedClientId) {
        const activeClients = loadClients();
        const client = activeClients[savedClientId];
        if (client) {
            currentClient = { ...client, id: savedClientId };
            if (currentClient.invoices) {
                currentClient.invoices.forEach(inv => {
                    inv.status = getInvoiceStatus(savedClientId, inv.ref, inv.status);
                });
            }
            setTimeout(() => {
                buildAccountView();
                goToStep('pstep-1');
                
                // Process actions from redirect query parameters
                const urlParams = new URLSearchParams(window.location.search);
                const action = urlParams.get('action');
                if (action === 'edit-profile') {
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
                } else if (action === 'change-password') {
                    const pwForm = document.getElementById('pw-form-container');
                    if (pwForm) {
                        pwForm.style.display = 'block';
                        pwForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }, 100);
        }
    }

    /* ══════════════════════════════════════════════════════
       STEPPER MANAGER
       ══════════════════════════════════════════════════════ */
    const STEP_MAP = { 'pstep-0': 0, 'pstep-1': 1, 'pstep-2': 2, 'pstep-success': 2 };
    function updateStepper(stepId) {
        const activeIdx = STEP_MAP[stepId] ?? 0;
        [0, 1, 2].forEach(i => {
            const dot = document.getElementById(`step-dot-${i}`);
            if (!dot) return;
            dot.classList.remove('active', 'done');
            if (i < activeIdx) dot.classList.add('done');
            else if (i === activeIdx) dot.classList.add('active');
        });
        // Animate lines
        document.querySelectorAll('.pay-stepper__line').forEach((line, i) => {
            line.classList.toggle('done', i < activeIdx);
        });
        // Hide stepper on success
        const stepper = document.getElementById('pay-stepper');
        if (stepper) stepper.style.opacity = stepId === 'pstep-success' ? '0' : '1';
    }

    /* ══════════════════════════════════════════════════════
       STEP MANAGER
       ══════════════════════════════════════════════════════ */
    function goToStep(id) {
        document.querySelectorAll('.pstep').forEach(s => s.classList.remove('active'));
        const target = document.getElementById(id);
        if (target) { target.classList.add('active'); target.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
        updateStepper(id);
    }


    /* ══════════════════════════════════════════════════════
       STEP 0 — CLIENT LOGIN
    ══════════════════════════════════════════════════════ */
    let currentClient = null;
    let selectedInvoice = null;

    const loginBtn = document.getElementById('login-btn');
    const clientIdInput = document.getElementById('client-id');
    const clientPassInput = document.getElementById('client-pass');
    const loginError = document.getElementById('login-error');
    const loginErrorMsg = document.getElementById('login-error-msg');

    /* Toggle password visibility */
    const togglePassBtn = document.getElementById('toggle-pass');
    togglePassBtn?.addEventListener('click', () => {
        const isPass = clientPassInput.type === 'password';
        clientPassInput.type = isPass ? 'text' : 'password';
        
        // Update eye icon SVG to show open or slashed eye
        if (isPass) {
            togglePassBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" id="eye-icon">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            `;
            togglePassBtn.title = "Hide password";
        } else {
            togglePassBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" id="eye-icon">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="1.5" />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.5" />
                </svg>
            `;
            togglePassBtn.title = "Show password";
        }
    });

    const resetLoginBtn = () => {
        if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Log In to My Account`;
        }
    };

    loginBtn?.addEventListener('click', async () => {
        const id = clientIdInput.value.trim().toUpperCase();
        const pass = clientPassInput.value.trim();

        loginError.hidden = true;
        clientIdInput.classList.remove('error');
        clientPassInput.classList.remove('error');

        if (!id) { clientIdInput.classList.add('error'); showLoginError('Please enter your Client ID.'); return; }
        if (!pass) { clientPassInput.classList.add('error'); showLoginError('Please enter your password.'); return; }

        loginBtn.textContent = 'Verifying…';
        loginBtn.disabled = true;

        // Try to fetch fresh client data from Convex
        let client = null;
        try {
            const dbClient = await fetchClientFromConvex(id);
            if (dbClient) {
                client = dbClient;
                
                // Update local storage cache
                const activeClients = loadClients();
                activeClients[id] = dbClient;
                localStorage.setItem('synsite_dynamic_clients', JSON.stringify(activeClients));
                if (dbClient.password) {
                    localStorage.setItem(`client_pass_${id}`, dbClient.password);
                }
            }
        } catch (e) {
            console.error("Error checking credentials from Convex:", e);
        }

        // Fallback to local storage registry or DEFAULT_CLIENTS
        if (!client) {
            const activeClients = loadClients();
            client = activeClients[id];
        }

        const storedPassword = client ? client.password : null;
        const defaultPassword = DEFAULT_CLIENTS[id] ? DEFAULT_CLIENTS[id].password : null;

        if (!client || (storedPassword !== pass && defaultPassword !== pass)) {
            clientIdInput.classList.add('error');
            clientPassInput.classList.add('error');
            showLoginError('Incorrect Client ID or password. Please try again.');
            shake(loginBtn);
            resetLoginBtn();
            return;
        }

        // Self-heal local cache if password matched default password but not stored cache password
        if (client && defaultPassword === pass && storedPassword !== pass) {
            client.password = defaultPassword;
            const activeClients = loadClients();
            if (activeClients[id]) {
                activeClients[id].password = defaultPassword;
                localStorage.setItem('synsite_dynamic_clients', JSON.stringify(activeClients));
            }
            localStorage.setItem(`client_pass_${id}`, defaultPassword);
        }

        /* ── Successful login ── */
        currentClient = { ...client, id };
        // Sync invoice status with localStorage
        if (currentClient.invoices) {
            currentClient.invoices.forEach(inv => {
                inv.status = getInvoiceStatus(id, inv.ref, inv.status);
            });
        }
        localStorage.setItem('synsite_active_client_id', id);
        loginBtn.textContent = 'Logging in…';
        loginBtn.disabled = true;

        setTimeout(() => {
            resetLoginBtn();
            buildAccountView();
            goToStep('pstep-1');
        }, 600);
    });

    /* Allow Enter key on login fields */
    [clientIdInput, clientPassInput].forEach(el => {
        el?.addEventListener('keydown', e => { if (e.key === 'Enter') loginBtn.click(); });
    });

    function showLoginError(msg) {
        loginErrorMsg.textContent = msg;
        loginError.hidden = false;
        loginError.style.animation = 'none';
        void loginError.offsetWidth;
        loginError.style.animation = 'fade-in-up 0.3s ease';
    }

    /* ══════════════════════════════════════════════════════
       STEP 1 — ACCOUNT / INVOICE LIST
    ══════════════════════════════════════════════════════ */
    function buildAccountView() {
        if (!currentClient) return;

        /* ── Inject or update the logged-in header bar at top of step-1 card ── */
        let loggedHeader = document.getElementById('client-logged-header');
        const pstep1 = document.getElementById('pstep-1');
        if (!loggedHeader && pstep1) {
            loggedHeader = document.createElement('div');
            loggedHeader.id = 'client-logged-header';
            loggedHeader.className = 'client-logged-header';
            pstep1.prepend(loggedHeader);
        }
        if (loggedHeader) {
            const cname = currentClient.name || 'Client';
            const cid = currentClient.id || '';
            loggedHeader.innerHTML = `
                <div class="client-logged-header__avatar">${cname.charAt(0).toUpperCase()}</div>
                <div class="client-logged-header__info">
                    <div class="client-logged-header__name">${cname}</div>
                    <div class="client-logged-header__id">${cid}</div>
                </div>
                <button class="btn btn--sm btn--ghost client-logged-header__logout" id="logout-btn">Logout</button>
            `;
            document.getElementById('logout-btn')?.addEventListener('click', () => {
                currentClient = null; selectedInvoice = null;
                clientIdInput.value = ''; clientPassInput.value = '';
                loginError.hidden = true;
                localStorage.removeItem('synsite_active_client_id');
                if (loggedHeader) loggedHeader.remove();
                goToStep('pstep-0');
            });
        }

        /* Welcome bar (guarded if welcome bar is commented out) */
        const clientNameEl = document.getElementById('client-name');
        if (clientNameEl) clientNameEl.textContent = currentClient.name || 'Client';
        const clientIdDispEl = document.getElementById('client-id-disp');
        if (clientIdDispEl) clientIdDispEl.textContent = currentClient.id;
        const clientAvatarEl = document.getElementById('client-avatar');
        if (clientAvatarEl) {
            const clientName = currentClient.name || 'Client';
            clientAvatarEl.textContent = clientName.charAt(0).toUpperCase();
        }

        /* Populate profile fields */
        const profileNameInput = document.getElementById('profile-name');
        const profileCompanyInput = document.getElementById('profile-company');
        const profileEmailInput = document.getElementById('profile-email');
        const profilePhoneInput = document.getElementById('profile-phone');
        const profileDescInput = document.getElementById('profile-desc');

        if (profileNameInput) profileNameInput.value = currentClient.name || '';
        if (profileCompanyInput) profileCompanyInput.value = currentClient.company || '';
        if (profileEmailInput) profileEmailInput.value = currentClient.email || '';
        if (profilePhoneInput) profilePhoneInput.value = currentClient.phone || '';
        if (profileDescInput) profileDescInput.value = currentClient.description || '';

        // Collapse profile container on reload/load
        const profileFields = document.getElementById('profile-fields-container');
        if (profileFields) profileFields.style.display = 'none';
        const profileArrow = document.getElementById('profile-toggle-arrow');
        if (profileArrow) profileArrow.textContent = '▼';

        /* Reset Change Password form state */
        const pwForm = document.getElementById('pw-form-container');
        if (pwForm) pwForm.style.display = 'none';
        const newPw = document.getElementById('new-pw');
        const newPwConfirm = document.getElementById('new-pw-confirm');
        if (newPw) newPw.value = '';
        if (newPwConfirm) newPwConfirm.value = '';
        const statusMsg = document.getElementById('pw-status-msg');
        if (statusMsg) { statusMsg.hidden = true; statusMsg.textContent = ''; }

        /* Invoice list */
        const list = document.getElementById('invoice-list');
        list.innerHTML = '';

        let totalDue = 0;
        let dueCount = 0;

        if (currentClient.invoices) {
            currentClient.invoices.forEach((inv, idx) => {
                const gst = inv.gst ? gstOf(inv.amount) : 0;
                const total = inv.amount + gst;
                if (inv.status !== 'paid') { totalDue += total; dueCount++; }

                const card = document.createElement('div');
                card.className = `invoice-item glass-card${inv.status === 'due' ? ' invoice-item--due' : ''}`;
                card.dataset.idx = idx;
                card.innerHTML = `
                    <div class="invoice-item__left">
                        <div class="invoice-item__ref">${inv.ref}</div>
                        <div class="invoice-item__desc">${inv.description}</div>
                        ${inv.dueDate ? `<div class="invoice-item__due-date" style="color: var(--c-purple-4); font-size: 0.78rem; font-weight: 600; margin-top: 4px;">📅 Due: ${inv.dueDate}</div>` : ''}
                        <div class="invoice-item__breakdown">
                            Base ${fmt(inv.amount)} ${inv.gst ? `+ GST ${fmt(gst)}` : '(No GST)'}
                        </div>
                    </div>
                    <div class="invoice-item__right">
                        <div class="invoice-item__total">${fmt(total)}</div>
                        <span class="invoice-status invoice-status--${inv.status}">${inv.status === 'due' ? 'Due' : 'Paid'}</span>
                        ${inv.status === 'due' ? `<button class="btn btn--sm btn--primary pay-this-btn" data-idx="${idx}">Pay Now</button>` : '<span class="paid-badge">✓ Paid</span>'}
                    </div>
                `;
                list.appendChild(card);
            });
        }

        // Show empty state if no due invoices
        const emptyState = document.getElementById('invoice-empty-state');
        if (emptyState) emptyState.hidden = dueCount > 0;
        const totalDueRow = document.getElementById('total-due-row');
        const proceedBtn = document.getElementById('proceed-to-pay-btn');
        if (totalDueRow) totalDueRow.style.display = dueCount > 0 ? '' : 'none';
        if (proceedBtn) proceedBtn.style.display = dueCount > 0 ? '' : 'none';


        /* Total */
        document.getElementById('total-due-amt').textContent = fmt(totalDue);

        /* Wire individual pay buttons */
        list.querySelectorAll('.pay-this-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                selectedInvoice = currentClient.invoices[idx];
                buildConfirmStep(selectedInvoice);
                goToStep('pstep-2');
            });
        });

        /* Pre-fill email/phone if available */
        const emailEl = document.getElementById('cust-email');
        const phoneEl = document.getElementById('cust-phone');
        if (emailEl) emailEl.value = currentClient.email || '';
        if (phoneEl) phoneEl.value = currentClient.phone || '';
    }

    /* Pay All button */
    document.getElementById('proceed-to-pay-btn')?.addEventListener('click', () => {
        if (!currentClient) return;
        /* Merge all due invoices into one payment */
        const dueInvoices = currentClient.invoices.filter(i => i.status === 'due');
        if (dueInvoices.length === 0) { showToast('No outstanding invoices!'); return; }

        const totalBase = dueInvoices.reduce((s, i) => s + i.amount, 0);
        const hasAnyGst = dueInvoices.some(i => i.gst);
        const combined = {
            ref: currentClient.id,
            description: `Full Payment — ${dueInvoices.length} invoice(s)`,
            amount: totalBase,
            gst: hasAnyGst,
            isCombined: true,
        };
        selectedInvoice = combined;
        buildConfirmStep(combined);
        goToStep('pstep-2');
    });

    /* Logout */
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        currentClient = null;
        selectedInvoice = null;
        clientIdInput.value = '';
        clientPassInput.value = '';
        loginError.hidden = true;
        localStorage.removeItem('synsite_active_client_id');
        goToStep('pstep-0');
    });

    /* ══════════════════════════════════════════════════════
       STEP 2 — CONFIRM & PAY
    ══════════════════════════════════════════════════════ */
    function buildConfirmStep(inv) {
        const base = inv.amount;
        const gst = inv.gst ? gstOf(base) : 0;
        const total = base + gst;

        document.getElementById('s2-inv-num').textContent = inv.ref;
        document.getElementById('s2-inv-desc').textContent = inv.description;
        document.getElementById('s2-total').textContent = fmt(total);

        document.getElementById('amt-base').textContent = fmt(base);
        document.getElementById('amt-gst').textContent = fmt(gst);
        document.getElementById('amt-total').textContent = fmt(total);

        const payLabel = document.getElementById('pay-btn-label');
        if (payLabel) payLabel.textContent = `Pay ${fmt(total)} Now`;
    }

    document.getElementById('back-to-1')?.addEventListener('click', () => goToStep('pstep-1'));

    /* Pay Now → Razorpay */
    document.getElementById('pay-now-btn')?.addEventListener('click', async () => {
        if (!selectedInvoice) return;

        const email = document.getElementById('cust-email')?.value.trim();
        const phone = document.getElementById('cust-phone')?.value.trim();

        if (!email || !email.includes('@')) { document.getElementById('cust-email').classList.add('error'); showToast('Please enter a valid email address.'); return; }
        if (!phone) { document.getElementById('cust-phone').classList.add('error'); showToast('Please enter your phone number.'); return; }

        const base = selectedInvoice.amount;
        const gst = selectedInvoice.gst ? gstOf(base) : 0;
        const total = base + gst;
        const paise = total * 100;

        const btn = document.getElementById('pay-now-btn');
        const payLabel = btn.querySelector('#pay-btn-label');
        btn.disabled = true;
        btn.classList.add('btn--loading');
        payLabel.textContent = 'Creating order…';

        const keyIsSet = RAZORPAY_KEY_ID && !RAZORPAY_KEY_ID.includes('PASTE_YOUR_KEY');
        if (!keyIsSet) {
            setTimeout(() => showKeyMissingAlert(total), 600);
            btn.disabled = false;
            btn.classList.remove('btn--loading');
            payLabel.textContent = `Pay ${fmt(total)} Now`;
            return;
        }

        if (typeof window.Razorpay === 'undefined') {
            showToast('Razorpay SDK failed to load. Check your internet connection.');
            btn.disabled = false;
            btn.classList.remove('btn--loading');
            payLabel.textContent = `Pay ${fmt(total)} Now`;
            return;
        }

        try {
            // Step 1: Create secure order on backend (Convex HTTP action)
            const siteUrl = CONVEX_SITE_URL || window.location.origin;
            const orderRes = await fetch(`${siteUrl}/api/create-order`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    amount: paise,
                    currency: CONFIG.currency,
                    receipt: selectedInvoice.ref
                })
            });

            if (!orderRes.ok) {
                const orderErr = await orderRes.json();
                throw new Error(orderErr.error || "Failed to create order on server");
            }

            const orderData = await orderRes.json();

            // Step 2: Open Razorpay modal with orderData.order_id
            btn.querySelector('#pay-btn-label').textContent = 'Opening Razorpay…';

            const options = {
                key: RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: orderData.currency,
                name: CONFIG.companyName,
                description: selectedInvoice.description,
                image: CONFIG.companyLogo || undefined,
                order_id: orderData.order_id,
                prefill: { name: currentClient?.name || '', email, contact: phone },
                notes: { client_id: currentClient?.id || '', invoice_ref: selectedInvoice.ref },
                theme: { color: CONFIG.theme },
                handler: async function (response) {
                    try {
                        btn.querySelector('#pay-btn-label').textContent = 'Verifying payment…';
                        btn.disabled = true;

                        // Step 3: Verify signature on backend
                        const verifyRes = await fetch(`${siteUrl}/api/verify-payment`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        if (!verifyRes.ok) {
                            const verifyErr = await verifyRes.json();
                            throw new Error(verifyErr.error || "Payment signature verification failed");
                        }

                        const verifyData = await verifyRes.json();
                        if (!verifyData.success) {
                            throw new Error("Payment signature verification failed");
                        }

                        markInvoicePaid();
                        showSuccessStep({
                            paymentId: response.razorpay_payment_id,
                            email, total, gst, base,
                            desc: selectedInvoice.description,
                            ref: selectedInvoice.ref,
                        });
                    } catch (verifyErr) {
                        console.error("Verification error:", verifyErr);
                        showToast(verifyErr.message || "Signature verification failed. Payment was not recorded.");
                    } finally {
                        btn.disabled = false;
                        btn.querySelector('#pay-btn-label').textContent = `Pay ${fmt(total)} Now`;
                    }
                },
                modal: {
                    ondismiss: () => {
                        btn.disabled = false;
                        btn.querySelector('#pay-btn-label').textContent = `Pay ${fmt(total)} Now`;
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            
            rzp.on('payment.failed', function (resp) {
                console.error("Payment failed:", resp.error);
                showToast(`Payment failed: ${resp.error.description || "Unknown error"}`);
            });

            rzp.open();

        } catch (err) {
            console.error("Checkout error:", err);
            showToast(err.message || "Failed to initiate payment. Please try again.");
            btn.disabled = false;
            btn.classList.remove('btn--loading');
            payLabel.textContent = `Pay ${fmt(total)} Now`;
        }
    });

    /* ══════════════════════════════════════════════════════
       STEP SUCCESS
    ══════════════════════════════════════════════════════ */
    let lastPaymentData = {};

    function markInvoicePaid() {
        if (!currentClient || !selectedInvoice) return;
        currentClient.invoices.forEach(inv => {
            if (selectedInvoice.isCombined || inv.ref === selectedInvoice.ref) {
                inv.status = 'paid';
                setInvoicePaid(currentClient.id, inv.ref);
            }
        });
        saveClient(currentClient.id, currentClient);
    }

    function showSuccessStep({ paymentId, email, total, gst, base, desc, ref }) {
        lastPaymentData = { paymentId, email, total, gst, base, desc, ref };
        const details = document.getElementById('success-details');
        details.innerHTML = `
            <div class="success-detail-row"><span>Payment ID</span><code>${paymentId || 'SIM-' + Date.now()}</code></div>
            <div class="success-detail-row"><span>Invoice Ref</span><span>${ref}</span></div>
            <div class="success-detail-row"><span>Description</span><span>${desc}</span></div>
            <div class="success-detail-row"><span>Amount Paid</span><strong>${fmt(total)}</strong></div>
            <div class="success-detail-row"><span>Email</span><span>${email}</span></div>
        `;
        goToStep('pstep-success');
        fireParticles();
    }

    /* Download Receipt */
    document.getElementById('dl-receipt-btn')?.addEventListener('click', () => {
        const { paymentId, email, total, gst, base, desc, ref } = lastPaymentData;
        const html = `<!DOCTYPE html><html><head><title>Receipt — Synsite</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#fff;color:#1a1a2e;max-width:640px;margin:40px auto;padding:0 20px}.header{display:flex;align-items:center;justify-content:space-between;padding:24px 0;border-bottom:3px solid #7c3aed}.logo{font-size:1.6rem;font-weight:900;color:#7c3aed}.dot{color:#22d3ee}.badge{background:#7c3aed;color:#fff;padding:6px 14px;border-radius:100px;font-size:0.75rem;font-weight:700}h2{font-size:1.2rem;margin:28px 0 16px;color:#0f172a}table{width:100%;border-collapse:collapse;margin-bottom:24px}td{padding:10px 14px;font-size:0.9rem;border-bottom:1px solid #f1f5f9}td:first-child{color:#64748b;width:40%}td:last-child{font-weight:600}.total td{background:#f8f4ff;font-weight:800;font-size:1rem;color:#7c3aed}.footer{text-align:center;padding:20px;font-size:0.78rem;color:#94a3b8;border-top:1px solid #e2e8f0;margin-top:20px}.stamp{display:inline-block;border:2px solid #22c55e;color:#16a34a;padding:4px 12px;border-radius:4px;font-size:0.7rem;font-weight:700;letter-spacing:0.1em;transform:rotate(-2deg)}</style>
</head><body>
<div class="header"><div class="logo">Synsite<span class="dot">.</span></div><div class="badge">TAX INVOICE</div></div>
<h2>Payment Details</h2>
<table>
<tr><td>Invoice Ref</td><td>${ref || '—'}</td></tr>
<tr><td>Description</td><td>${desc || '—'}</td></tr>
<tr><td>Client</td><td>${currentClient?.name || '—'} (${currentClient?.id || '—'})</td></tr>
<tr><td>Email</td><td>${email || '—'}</td></tr>
<tr><td>Payment ID</td><td style="font-family:monospace;font-size:0.85rem">${paymentId || '—'}</td></tr>
<tr><td>Date</td><td>${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</td></tr>
</table>
<h2>Amount Breakdown</h2>
<table>
<tr><td>Base Amount</td><td>${fmt(base)}</td></tr>
<tr><td>GST @ 18%</td><td>${fmt(gst)}</td></tr>
<tr class="total"><td>Total Paid</td><td>${fmt(total)} <span class="stamp">PAID ✓</span></td></tr>
</table>
<div class="footer"><p>Powered by Synsites · Synsite · support@synsite.com</p><p style="margin-top:4px">Computer-generated receipt. No signature required.</p></div>
</body></html>`;
        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
        setTimeout(() => w.print(), 500);
    });

    /* ══════════════════════════════════════════════════════
       UTILITIES
    ══════════════════════════════════════════════════════ */
    function shake(el) {
        el.style.animation = 'none'; void el.offsetWidth;
        el.style.animation = 'portal-shake 0.45s ease';
        if (!document.getElementById('shake-kf')) {
            const s = document.createElement('style'); s.id = 'shake-kf';
            s.textContent = `@keyframes portal-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}`;
            document.head.appendChild(s);
        }
    }

    function showToast(msg, type = 'error') {
        const t = document.createElement('div');
        t.textContent = (type === 'error' ? '⚠ ' : '✓ ') + msg;
        const bg = type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)';
        const border = type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)';
        const color = type === 'error' ? '#fca5a5' : '#86efac';
        t.style.cssText = `position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:${bg};border:1px solid ${border};color:${color};padding:12px 24px;border-radius:100px;font-size:0.88rem;font-weight:600;z-index:9999;backdrop-filter:blur(12px);white-space:nowrap;`;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3500);
    }

    function fireParticles() {
        const colors = ['#8b5cf6', '#22d3ee', '#a78bfa', '#7c3aed', '#ffffff', '#34d399'];
        for (let i = 0; i < 28; i++) {
            const p = document.createElement('span');
            const size = 4 + Math.random() * 10;
            p.style.cssText = `position:fixed;left:50%;top:40%;width:${size}px;height:${size}px;border-radius:50%;background:${colors[i % colors.length]};pointer-events:none;z-index:99999;transform:translate(-50%,-50%);animation:particle-burst 1.2s ease-out forwards;--dx:${(Math.random() - 0.5) * 320}px;--dy:${(Math.random() - 0.5) * 320}px;animation-delay:${Math.random() * 0.2}s;`;
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 1600);
        }
    }

    function showSetupBanner() {
        const b = document.createElement('div');
        b.innerHTML = `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;"><span style="font-size:1.3rem">⚙️</span><div><strong style="color:#fff;font-size:0.9rem">Razorpay Key Not Configured (Demo Mode)</strong><p style="color:rgba(255,255,255,0.6);font-size:0.78rem;margin:2px 0 0">Sign up at <a href="https://razorpay.com" target="_blank" style="color:#22d3ee;text-decoration:underline">razorpay.com</a>, get your Key ID, and paste it in <code style="background:rgba(255,255,255,0.1);padding:1px 6px;border-radius:4px">src/payment.js</code> line 12.</p></div><button onclick="this.closest('#setup-banner').remove()" style="margin-left:auto;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:#fff;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:0.78rem;">Dismiss</button></div>`;
        b.id = 'setup-banner';
        b.style.cssText = `position:fixed;bottom:0;left:0;right:0;background:rgba(124,58,237,0.9);backdrop-filter:blur(12px);padding:12px 24px;z-index:9990;border-top:1px solid rgba(139,92,246,0.5);`;
        document.body.appendChild(b);
    }

    function showKeyMissingAlert(total) {
        const m = document.createElement('div');
        m.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(12px);z-index:600;display:flex;align-items:center;justify-content:center;padding:1rem;`;
        m.innerHTML = `<div style="background:rgba(13,9,32,0.98);border:1px solid rgba(139,92,246,0.4);border-radius:24px;padding:2.5rem;max-width:480px;width:100%;text-align:center;box-shadow:0 40px 100px rgba(0,0,0,0.7);"><div style="font-size:2.5rem;margin-bottom:1rem">🔑</div><h2 style="font-family:'Outfit',sans-serif;font-size:1.4rem;color:#fff;margin-bottom:0.75rem;">Razorpay Key Needed</h2><p style="color:#94a3b8;font-size:0.88rem;line-height:1.7;margin-bottom:1.5rem;">To charge ${fmt(total)} securely, add your Razorpay Key ID to <code style="color:#a78bfa">src/payment.js</code> line 12.</p><div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;"><a href="https://razorpay.com/auth/#/signup" target="_blank" style="background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;padding:12px 24px;border-radius:100px;font-weight:700;font-size:0.9rem;text-decoration:none;">Open Razorpay →</a><button onclick="this.closest('div[style]').remove()" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#94a3b8;padding:12px 24px;border-radius:100px;font-weight:600;font-size:0.9rem;cursor:pointer;">Close</button></div></div>`;
        document.body.appendChild(m);
        m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    }

    /* ── Change Password UI Logic ─── */
    const togglePwBtn = document.getElementById('toggle-pw-form-btn');
    const pwContainer = document.getElementById('pw-form-container');
    const savePwBtn = document.getElementById('save-pw-btn');
    const cancelPwBtn = document.getElementById('cancel-pw-btn');
    const newPwInput = document.getElementById('new-pw');
    const newPwConfirmInput = document.getElementById('new-pw-confirm');
    const pwStatusMsg = document.getElementById('pw-status-msg');

    const showPwStatus = (msg, success = false) => {
        if (!pwStatusMsg) return;
        pwStatusMsg.textContent = msg;
        pwStatusMsg.style.color = success ? '#86efac' : '#fca5a5';
        pwStatusMsg.hidden = false;
        setTimeout(() => { pwStatusMsg.hidden = true; }, 3500);
    };

    togglePwBtn?.addEventListener('click', () => {
        if (!pwContainer) return;
        const isHidden = pwContainer.style.display === 'none';
        pwContainer.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            newPwInput?.focus();
        }
    });

    cancelPwBtn?.addEventListener('click', () => {
        if (pwContainer) pwContainer.style.display = 'none';
        if (newPwInput) newPwInput.value = '';
        if (newPwConfirmInput) newPwConfirmInput.value = '';
    });

    savePwBtn?.addEventListener('click', () => {
        if (!currentClient) return;
        const newPass = newPwInput?.value.trim();
        const newPassConfirm = newPwConfirmInput?.value.trim();

        if (!newPass) {
            showPwStatus('Please enter a new password.', false);
            return;
        }
        if (newPass.length < 4) {
            showPwStatus('Password must be at least 4 characters.', false);
            return;
        }
        if (newPass !== newPassConfirm) {
            showPwStatus('Passwords do not match.', false);
            return;
        }

        // Save password locally
        localStorage.setItem(`client_pass_${currentClient.id}`, newPass);
        currentClient.password = newPass;
        
        const activeClients = loadClients();
        if (activeClients[currentClient.id]) {
            activeClients[currentClient.id].password = newPass;
            saveClient(currentClient.id, activeClients[currentClient.id]);
        }

        showPwStatus('Password updated successfully! ✓', true);
        showToast('Password updated successfully.', 'success');
        
        // Refresh global navbar profile dropdown
        initGlobalProfileMenu(true);

        setTimeout(() => {
            if (pwContainer) pwContainer.style.display = 'none';
            if (newPwInput) newPwInput.value = '';
            if (newPwConfirmInput) newPwConfirmInput.value = '';
        }, 1000);
    });

    /* ── My Profile UI Logic ─── */
    const profileHeader = document.getElementById('profile-header');
    const profileFieldsContainer = document.getElementById('profile-fields-container');
    const profileArrow = document.getElementById('profile-toggle-arrow');
    const saveProfileBtn = document.getElementById('save-profile-btn');

    profileHeader?.addEventListener('click', () => {
        if (!profileFieldsContainer) return;
        const isHidden = profileFieldsContainer.style.display === 'none';
        profileFieldsContainer.style.display = isHidden ? 'block' : 'none';
        if (profileArrow) {
            profileArrow.textContent = isHidden ? '▲' : '▼';
            profileArrow.style.transform = isHidden ? 'rotate(180deg)' : '';
        }
    });

    saveProfileBtn?.addEventListener('click', () => {
        if (!currentClient) return;

        const newName = document.getElementById('profile-name')?.value.trim();
        const newCompany = document.getElementById('profile-company')?.value.trim();
        const newEmail = document.getElementById('profile-email')?.value.trim();
        const newPhone = document.getElementById('profile-phone')?.value.trim();
        const newDesc = document.getElementById('profile-desc')?.value.trim();

        if (!newName || !newCompany || !newEmail) {
            showToast('Name, Company and Email are required profile fields.', 'error');
            return;
        }

        // Update current client reference
        currentClient.name = newName;
        currentClient.company = newCompany;
        currentClient.email = newEmail;
        currentClient.phone = newPhone;
        currentClient.description = newDesc;

        // Save to dynamic clients registry
        const activeClients = loadClients();
        if (!activeClients[currentClient.id]) {
            activeClients[currentClient.id] = { invoices: [] };
        }
        activeClients[currentClient.id].name = newName;
        activeClients[currentClient.id].company = newCompany;
        activeClients[currentClient.id].email = newEmail;
        activeClients[currentClient.id].phone = newPhone;
        activeClients[currentClient.id].description = newDesc;
        // Make sure password stays sync'd
        const storedPassword = localStorage.getItem(`client_pass_${currentClient.id}`) || currentClient.password;
        activeClients[currentClient.id].password = storedPassword;

        saveClient(currentClient.id, activeClients[currentClient.id]);

        // Refresh welcome bar details (if exists)
        const welcomeName = document.getElementById('client-name');
        if (welcomeName) welcomeName.textContent = newName;
        const welcomeAvatar = document.getElementById('client-avatar');
        if (welcomeAvatar) welcomeAvatar.textContent = newName.charAt(0).toUpperCase();

        // Refresh global navbar profile dropdown
        initGlobalProfileMenu(true);

        showToast('Profile details updated successfully! ✓', 'success');

        setTimeout(() => {
            if (profileFieldsContainer) profileFieldsContainer.style.display = 'none';
            if (profileArrow) {
                profileArrow.textContent = '▼';
                profileArrow.style.transform = '';
            }
        }, 800);
    });

});
