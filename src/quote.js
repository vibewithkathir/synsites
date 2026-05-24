import './style.css';
import './quote.css';
import { loadClients, saveClient, getNextMonth15Date, initGlobalProfileMenu, loadTheme } from './db.js';

document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    initGlobalProfileMenu();

    /* ─── Scroll Progress Bar ─────────────────────────── */
    const progressBar = document.getElementById('scroll-progress');
    if (progressBar) {
        const update = () => {
            const pct = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
            progressBar.style.width = Math.min(pct, 100) + '%';
        };
        window.addEventListener('scroll', update, { passive: true });
        update();
    }

    /* ─── Custom Cursor ───────────────────────────────── */
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    if (dot && ring) {
        let mx = -100, my = -100, rx = -100, ry = -100;
        document.addEventListener('mousemove', (e) => {
            mx = e.clientX; my = e.clientY;
            dot.style.left = mx + 'px';
            dot.style.top = my + 'px';
        });
        const animRing = () => {
            rx += (mx - rx) * 0.12;
            ry += (my - ry) * 0.12;
            ring.style.left = rx + 'px';
            ring.style.top = ry + 'px';
            requestAnimationFrame(animRing);
        };
        animRing();
        document.querySelectorAll('a, button, label, .ptype-card__inner, .budget-card__inner').forEach(el => {
            el.addEventListener('mouseenter', () => {
                ring.style.width = '52px';
                ring.style.height = '52px';
                ring.style.borderColor = 'rgba(34,211,238,0.7)';
            });
            el.addEventListener('mouseleave', () => {
                ring.style.width = '36px';
                ring.style.height = '36px';
                ring.style.borderColor = 'rgba(139, 92, 246, 0.6)';
            });
        });
    }

    /* ─── Navbar scroll ───────────────────────────────── */
    const nav = document.getElementById('nav');
    if (nav) {
        const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 50);
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ─── Scroll Reveal ───────────────────────────────── */
    const revealEls = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const delay = parseInt(el.dataset.revealDelay || '0', 10);
            setTimeout(() => el.classList.add('is-visible'), delay);
            io.unobserve(el);
        });
    }, { threshold: 0.08 });
    revealEls.forEach(el => io.observe(el));

    /* ─── Style Chips ─────────────────────────────────── */
    document.querySelectorAll('.style-chips').forEach(group => {
        group.querySelectorAll('.style-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                chip.classList.toggle('active');
            });
        });
    });

    /* ─── Multi-step form logic ───────────────────────── */
    let currentStep = 1;
    const totalSteps = 4;

    // Captured data
    const quoteData = {
        projectTypes: [],
        projectName: '',
        industry: '',
        pages: '',
        timeline: '',
        designStyle: '',
        vision: '',
        budget: '',
        addOns: [],
        name: '',
        company: '',
        email: '',
        phone: '',
        howHeard: ''
    };

    function goToStep(next, direction = 'forward') {
        const currentEl = document.getElementById(`step-${currentStep}`);
        const nextEl = document.getElementById(`step-${next}`);
        if (!nextEl) return;

        currentEl.classList.remove('active');
        nextEl.classList.remove('step-back');
        if (direction === 'back') nextEl.classList.add('step-back');
        nextEl.classList.add('active');

        currentStep = next;
        updateStepsBar(currentStep);

        // Scroll to top of card
        document.querySelector('.quote-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function updateStepsBar(active) {
        document.querySelectorAll('.step-item').forEach(item => {
            const s = parseInt(item.dataset.step);
            item.classList.remove('active', 'done');
            if (s === active) item.classList.add('active');
            if (s < active) item.classList.add('done');
        });

        // Animate connector lines
        document.querySelectorAll('.step-item__line').forEach((line, i) => {
            if (i < active - 1) {
                line.style.setProperty('--line-done', '1');
                line.querySelector ? null : null;
                // Force after pseudo-element via inline hack
                line.style.background = `linear-gradient(90deg, var(--c-purple-2), var(--c-cyan))`;
            } else {
                line.style.background = '';
            }
        });
    }

    /* Step 1 → 2 */
    document.getElementById('next-1')?.addEventListener('click', () => {
        const checked = document.querySelectorAll('input[name="ptype"]:checked');
        quoteData.projectTypes = Array.from(checked).map(c => c.value);
        if (quoteData.projectTypes.length === 0) {
            shakeFormCard();
            showToast('Please select at least one project type.');
            return;
        }
        goToStep(2);
    });

    /* Step 2 → 1 */
    document.getElementById('back-2')?.addEventListener('click', () => goToStep(1, 'back'));

    /* Step 2 → 3 */
    document.getElementById('next-2')?.addEventListener('click', () => {
        quoteData.projectName = document.getElementById('q-project-name')?.value.trim();
        quoteData.industry = document.getElementById('q-industry')?.value.trim();
        quoteData.pages = document.getElementById('q-pages')?.value;
        quoteData.timeline = document.getElementById('q-timeline')?.value;
        quoteData.vision = document.getElementById('q-vision')?.value.trim();
        const activeStyle = document.querySelector('#step-2 .style-chip.active');
        quoteData.designStyle = activeStyle?.dataset.style || 'Not specified';
        goToStep(3);
    });

    /* Step 3 → 2 */
    document.getElementById('back-3')?.addEventListener('click', () => goToStep(2, 'back'));

    /* Step 3 → 4 */
    document.getElementById('next-3')?.addEventListener('click', () => {
        const budgetChecked = document.querySelector('input[name="budget"]:checked');
        if (!budgetChecked) {
            shakeFormCard();
            showToast('Please select a budget range.');
            return;
        }
        quoteData.budget = budgetChecked.closest('.budget-card').querySelector('.budget-card__price')?.textContent || budgetChecked.value;
        quoteData.addOns = Array.from(document.querySelectorAll('#step-3 .style-chip.active')).map(c => c.textContent.trim());

        // Build summary
        buildSummary();
        goToStep(4);
    });

    /* Step 4 → 3 */
    document.getElementById('back-4')?.addEventListener('click', () => goToStep(3, 'back'));

    /* Submit */
    document.getElementById('submit-quote')?.addEventListener('click', (e) => {
        e.preventDefault();

        // Gather contact fields
        quoteData.name = document.getElementById('q-name')?.value.trim();
        quoteData.company = document.getElementById('q-company')?.value.trim();
        quoteData.email = document.getElementById('q-email')?.value.trim();
        quoteData.phone = document.getElementById('q-phone')?.value.trim();
        quoteData.howHeard = document.getElementById('q-hear')?.value;

        // Validate required
        const required = [
            { id: 'q-name', val: quoteData.name },
            { id: 'q-company', val: quoteData.company },
            { id: 'q-email', val: quoteData.email },
        ];
        let valid = true;
        required.forEach(({ id, val }) => {
            const el = document.getElementById(id);
            el.classList.remove('error');
            if (!val) { el.classList.add('error'); valid = false; }
        });
        if (!valid) {
            shakeFormCard();
            showToast('Please fill in all required fields.');
            return;
        }
        if (!quoteData.email.includes('@')) {
            document.getElementById('q-email').classList.add('error');
            showToast('Please enter a valid email address.');
            return;
        }

        // Dynamic client account registration
        const clients = loadClients();
        let nextIndex = 2;
        while (clients[`SYN-` + String(nextIndex).padStart(3, '0')]) {
            nextIndex++;
        }
        const newId = `SYN-` + String(nextIndex).padStart(3, '0');
        const newPass = `synsites-` + String(nextIndex).padStart(3, '0');

        const budgetVal = (quoteData.budget || '').toLowerCase();
        let amount = 10000;
        if (budgetVal.includes('50k') || budgetVal.includes('growth')) amount = 50000;
        else if (budgetVal.includes('1.5l') || budgetVal.includes('premium')) amount = 150000;
        else if (budgetVal.includes('5l') || budgetVal.includes('enterprise')) amount = 500000;

        const newClient = {
            password: newPass,
            name: quoteData.name,
            company: quoteData.company,
            email: quoteData.email,
            phone: quoteData.phone || '',
            description: quoteData.vision || `Request for ${quoteData.projectTypes.map(v => v.replace(/-/g, ' ')).join(', ')} project.`,
            invoices: [
                {
                    ref: `INV-${newId.replace('SYN-', '')}-01`,
                    description: `${quoteData.projectTypes.map(v => v.charAt(0).toUpperCase() + v.slice(1).replace(/-/g, ' ')).join(', ')} — Setup Payment`,
                    amount: amount,
                    gst: false,
                    status: 'due',
                    dueDate: getNextMonth15Date()
                }
            ]
        };

        saveClient(newId, newClient);

        // Simulate submit
        const btn = document.getElementById('submit-quote');
        btn.textContent = 'Submitting…';
        btn.disabled = true;

        // Particle burst
        fireParticles(btn);

        setTimeout(() => {
            const idEl = document.getElementById('new-client-id');
            const passEl = document.getElementById('new-client-pass');
            if (idEl) idEl.textContent = newId;
            if (passEl) passEl.textContent = newPass;

            document.getElementById(`step-${currentStep}`).classList.remove('active');
            document.getElementById('step-success').classList.add('active');
            updateStepsBar(5); // past all steps
        }, 1600);
    });

    /* ─── Build Summary ───────────────────────────────── */
    function buildSummary() {
        const body = document.getElementById('summary-body');
        if (!body) return;
        const items = [
            { label: 'Project Type', val: quoteData.projectTypes.map(v => v.replace(/-/g, ' ')).join(', ') || '—' },
            { label: 'Brand', val: quoteData.projectName || '—' },
            { label: 'Budget', val: quoteData.budget || '—' },
            { label: 'Timeline', val: quoteData.timeline || '—' },
            { label: 'Design Style', val: quoteData.designStyle || '—' },
            { label: 'Add-ons', val: quoteData.addOns.join(', ') || 'None' },
        ];
        body.innerHTML = items.map(i => `
      <div class="summary-item">
        <span class="summary-item__label">${i.label}</span>
        <span class="summary-item__val">${i.val}</span>
      </div>`).join('');
    }

    /* ─── Helpers ──────────────────────────────────────── */
    function shakeFormCard() {
        const card = document.querySelector('.quote-card');
        card.style.animation = 'none';
        void card.offsetWidth;
        card.style.animation = 'shake 0.4s var(--ease)';
        setTimeout(() => { card.style.animation = ''; }, 500);
    }

    function showToast(msg) {
        const existing = document.getElementById('quote-toast');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.id = 'quote-toast';
        toast.textContent = msg;
        toast.style.cssText = `
      position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%) translateY(20px);
      background: rgba(248,113,113,0.15); border: 1px solid rgba(248,113,113,0.4);
      color: #fca5a5; padding: 12px 24px; border-radius: 100px;
      font-size: 0.9rem; font-weight: 600; z-index: 9999;
      backdrop-filter: blur(12px);
      animation: toast-in 0.4s var(--ease) forwards;
    `;
        document.body.appendChild(toast);
        if (!document.getElementById('toast-style')) {
            const s = document.createElement('style');
            s.id = 'toast-style';
            s.textContent = `
        @keyframes toast-in { to { transform: translateX(-50%) translateY(0); opacity: 1; } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
      `;
            document.head.appendChild(s);
        }
        setTimeout(() => toast.remove(), 3000);
    }

    function fireParticles(btn) {
        const rect = btn.getBoundingClientRect();
        const colors = ['#8b5cf6', '#22d3ee', '#a78bfa', '#7c3aed', '#ffffff'];
        for (let i = 0; i < 20; i++) {
            const p = document.createElement('span');
            const size = 4 + Math.random() * 8;
            p.style.cssText = `
        position:fixed; left:${rect.left + rect.width / 2}px; top:${rect.top + rect.height / 2}px;
        width:${size}px; height:${size}px; border-radius:50%;
        background:${colors[i % colors.length]}; pointer-events:none; z-index:9999;
        transform:translate(-50%,-50%);
        animation: particle-burst 0.9s ease-out forwards;
        --dx:${(Math.random() - 0.5) * 200}px; --dy:${(Math.random() - 0.5) * 200}px;
      `;
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 1000);
        }
    }

    /* ─── Tilt on project type cards ─────────────────── */
    document.querySelectorAll('.ptype-card__inner, .budget-card__inner').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.transform = `translateY(-3px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg)`;
        });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });

});
