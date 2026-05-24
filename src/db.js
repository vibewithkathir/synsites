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
}
