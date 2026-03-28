// ==========================================
// KONFIGURATION
// ==========================================

const CONFIG = {
    supabase: {
        url: '', // Lägg till din Supabase URL
        anonKey: '' // Lägg till din Supabase Anon Key
    }
};

// Initiera Supabase
const { createClient } = supabase;
const supabaseClient = createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);

// ==========================================
// STATE MANAGEMENT
// ==========================================

const state = {
    user: null,
    currentView: 'dashboard',
    formData: {
        projectName: '',
        location: '',
        workDescription: '',
        specificHazards: ''
    },
    generatedReport: '',
    chatMessages: [],
    knowledgeBase: []
};

// ==========================================
// DOM ELEMENTS
// ==========================================

const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const logoBtn = document.getElementById('logoBtn');

const dashboardView = document.getElementById('dashboardView');
const loadingView = document.getElementById('loadingView');
const loadingSubtitle = document.getElementById('loadingSubtitle');
const reportView = document.getElementById('reportView');
const chatView = document.getElementById('chatView');

const navBtns = document.querySelectorAll('.nav-btn');
const assessmentForm = document.getElementById('assessmentForm');
const generateBtn = document.getElementById('generateBtn');
const errorAlert = document.getElementById('errorAlert');
const errorMessage = document.getElementById('errorMessage');

const backBtn = document.getElementById('backBtn');
const printBtn = document.getElementById('printBtn');

const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chatMessages');
const chatSendBtn = document.getElementById('chatSendBtn');

// ==========================================
// SUPABASE AUTHENTICATION
// ==========================================

async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        state.user = session.user;
        await showMainApp();
    }
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    loginBtn.disabled = true;
    loginBtn.textContent = 'Loggar in...';

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        state.user = data.user;
        await showMainApp();

    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = error.message || 'Inloggningen misslyckades.';
        loginError.classList.remove('hidden');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Logga in säkert';
    }
});

logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    state.user = null;
    state.currentView = 'dashboard';
    state.chatMessages = [];
    
    mainApp.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    loginForm.reset();
});

async function showMainApp() {
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('full_name, role')
        .eq('id', state.user.id)
        .single();

    userName.textContent = profile?.full_name || state.user.email.split('@')[0];
    
    // Show admin button if user is admin
    if (profile?.role === 'admin') {
        adminNavBtn.classList.remove('hidden');
    }
    
    await loadKnowledgeBase();
    
    loginScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');
    mainApp.classList.add('animate-fade-in');

    initializeChat();
}

// ==========================================
// KNOWLEDGE BASE
// ==========================================

async function loadKnowledgeBase() {
    try {
        const { data, error } = await supabaseClient
            .from('knowledge_base')
            .select('id, category, title')
            .eq('active', true)
            .order('category', { ascending: true });

        if (error) throw error;

        state.knowledgeBase = data || [];
        console.log(`Loaded ${state.knowledgeBase.length} knowledge base entries`);
    } catch (error) {
        console.error('Error loading knowledge base:', error);
        state.knowledgeBase = [];
    }
}

// ==========================================
// NAVIGATION
// ==========================================

function switchView(viewName) {
    state.currentView = viewName;
    
    navBtns.forEach(btn => {
        if (btn.dataset.view === viewName || 
            (viewName === 'report' && btn.dataset.view === 'dashboard') ||
            (viewName === 'loading' && btn.dataset.view === 'dashboard')) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    dashboardView.classList.toggle('hidden', viewName !== 'dashboard');
    loadingView.classList.toggle('hidden', viewName !== 'loading');
    reportView.classList.toggle('hidden', viewName !== 'report');
    chatView.classList.toggle('hidden', viewName !== 'chat');
    adminView.classList.toggle('hidden', viewName !== 'admin');

    const currentViewElement = {
        'dashboard': dashboardView,
        'loading': loadingView,
        'report': reportView,
        'chat': chatView,
        'admin': adminView
    }[viewName];

    if (currentViewElement && !currentViewElement.classList.contains('hidden')) {
        currentViewElement.classList.add('animate-fade-in');
        setTimeout(() => currentViewElement.classList.remove('animate-fade-in'), 500);
    }
}

navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
});

logoBtn.addEventListener('click', () => switchView('dashboard'));
backBtn.addEventListener('click', () => switchView('dashboard'));
printBtn.addEventListener('click', () => window.print());

// ==========================================
// ERROR HANDLING
// ==========================================

function showError(message) {
    errorMessage.textContent = message;
    errorAlert.classList.remove('hidden');
    errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideError() {
    errorAlert.classList.add('hidden');
}

// ==========================================
// RISK ASSESSMENT GENERATION
// ==========================================

assessmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    state.formData = {
        projectName: document.getElementById('projectName').value,
        location: document.getElementById('location').value,
        workDescription: document.getElementById('workDescription').value,
        specificHazards: document.getElementById('specificHazards').value
    };

    generateBtn.disabled = true;
    switchView('loading');

    try {
        loadingSubtitle.textContent = 'Söker i kunskapsbasen och genererar riskbedömning...';

        // Call Supabase Edge Function
        const { data, error } = await supabaseClient.functions.invoke('generate-assessment', {
            body: {
                projectName: state.formData.projectName,
                location: state.formData.location,
                workDescription: state.formData.workDescription,
                specificHazards: state.formData.specificHazards
            }
        });

        if (error) throw error;
        if (!data?.report) throw new Error('Inget svar från AI.');

        state.generatedReport = data.report;

        renderReport();
        switchView('report');

    } catch (error) {
        console.error('Assessment error:', error);
        showError(error.message || 'Ett fel uppstod vid generering av riskbedömningen.');
        switchView('dashboard');
    } finally {
        generateBtn.disabled = false;
    }
});

// ==========================================
// REPORT RENDERING
// ==========================================

function renderReport() {
    document.getElementById('reportDate').textContent = new Date().toLocaleDateString('sv-SE');
    document.getElementById('reportAuthor').textContent = userName.textContent;
    document.getElementById('reportProject').textContent = state.formData.projectName;
    document.getElementById('reportLocation').textContent = state.formData.location;
    document.getElementById('reportDescription').textContent = state.formData.workDescription;

    const reportContent = document.getElementById('reportContent');
    reportContent.innerHTML = '';

    const paragraphs = state.generatedReport.split('\n');
    
    paragraphs.forEach(paragraph => {
        const trimmed = paragraph.trim();
        if (!trimmed) {
            reportContent.appendChild(document.createElement('br'));
            return;
        }

        const isHeading = trimmed === trimmed.toUpperCase() && trimmed.length > 3;
        
        if (isHeading) {
            const h2 = document.createElement('h2');
            h2.textContent = trimmed;
            reportContent.appendChild(h2);
        } else if (trimmed.includes('**')) {
            const p = document.createElement('p');
            const parts = trimmed.split('**');
            parts.forEach((part, i) => {
                if (i % 2 === 1) {
                    const strong = document.createElement('strong');
                    strong.textContent = part;
                    p.appendChild(strong);
                } else {
                    p.appendChild(document.createTextNode(part));
                }
            });
            reportContent.appendChild(p);
        } else {
            const p = document.createElement('p');
            p.textContent = trimmed;
            reportContent.appendChild(p);
        }
    });
}

// ==========================================
// CHAT FUNCTIONALITY
// ==========================================

function initializeChat() {
    state.chatMessages = [
        { 
            role: 'ai', 
            content: 'Hej! Jag är din interna AWJ-assistent med tillgång till företagets kunskapsbas. Hur kan jag hjälpa dig?' 
        }
    ];
    renderChatMessages();
}

function renderChatMessages() {
    chatMessages.innerHTML = '';

    state.chatMessages.forEach((msg, index) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${msg.role}`;

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'chat-message-bubble';

        if (msg.role === 'ai' && index === 0) {
            const label = document.createElement('div');
            label.className = 'chat-ai-label';
            label.textContent = 'AWJ AI';
            bubbleDiv.appendChild(label);
        }

        const lines = msg.content.split('\n');
        lines.forEach(line => {
            if (line.includes('**')) {
                const p = document.createElement('p');
                const parts = line.split('**');
                parts.forEach((part, i) => {
                    if (i % 2 === 1) {
                        const strong = document.createElement('strong');
                        strong.textContent = part;
                        p.appendChild(strong);
                    } else {
                        p.appendChild(document.createTextNode(part));
                    }
                });
                bubbleDiv.appendChild(p);
            } else if (line.trim()) {
                const p = document.createElement('p');
                p.textContent = line;
                bubbleDiv.appendChild(p);
            }
        });

        messageDiv.appendChild(bubbleDiv);
        chatMessages.appendChild(messageDiv);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showChatLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chat-loading';
    loadingDiv.id = 'chatLoadingIndicator';
    loadingDiv.innerHTML = `
        <div class="chat-loading-bubble">
            <div class="chat-loading-dot"></div>
            <div class="chat-loading-dot"></div>
            <div class="chat-loading-dot"></div>
        </div>
    `;
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideChatLoading() {
    const loadingIndicator = document.getElementById('chatLoadingIndicator');
    if (loadingIndicator) loadingIndicator.remove();
}

chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const message = chatInput.value.trim();
    if (!message) return;

    state.chatMessages.push({ role: 'user', content: message });
    chatInput.value = '';
    renderChatMessages();

    showChatLoading();
    chatInput.disabled = true;
    chatSendBtn.disabled = true;

    try {
        // Prepare conversation history (exclude initial welcome message)
        const conversationHistory = state.chatMessages.slice(1, -1);

        // Call Supabase Edge Function
        const { data, error } = await supabaseClient.functions.invoke('chat', {
            body: {
                message: message,
                conversationHistory: conversationHistory
            }
        });

        if (error) throw error;
        if (!data?.response) throw new Error('Inget svar från AI.');

        state.chatMessages.push({ role: 'ai', content: data.response });
        
    } catch (error) {
        console.error('Chat error:', error);
        state.chatMessages.push({ 
            role: 'ai', 
            content: 'Ursäkta, något gick fel. Försök igen.' 
        });
    } finally {
        hideChatLoading();
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        renderChatMessages();
        chatInput.focus();
    }
});

chatInput.addEventListener('input', () => {
    chatSendBtn.disabled = !chatInput.value.trim();
});

// ==========================================
// ADMIN - PDF UPLOAD TO KNOWLEDGE BASE
// ==========================================

// PDF.js setup
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const adminView = document.getElementById('adminView');
const adminNavBtn = document.getElementById('adminNavBtn');
const pdfDropZone = document.getElementById('pdfDropZone');
const pdfFileInput = document.getElementById('pdfFileInput');
const pdfFileList = document.getElementById('pdfFileList');
const pdfActionButtons = document.getElementById('pdfActionButtons');
const processPdfsBtn = document.getElementById('processPdfsBtn');
const clearPdfsBtn = document.getElementById('clearPdfsBtn');
const pdfResults = document.getElementById('pdfResults');
const pdfResultsList = document.getElementById('pdfResultsList');

let pdfFiles = [];
let processedCount = 0;

// Drag & Drop handlers
pdfDropZone.addEventListener('click', () => pdfFileInput.click());

pdfDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    pdfDropZone.style.borderColor = 'var(--color-accent)';
    pdfDropZone.style.background = 'rgba(249, 115, 22, 0.05)';
});

pdfDropZone.addEventListener('dragleave', () => {
    pdfDropZone.style.borderColor = 'var(--color-border)';
    pdfDropZone.style.background = 'var(--color-bg)';
});

pdfDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    pdfDropZone.style.borderColor = 'var(--color-border)';
    pdfDropZone.style.background = 'var(--color-bg)';
    handlePdfFiles(e.dataTransfer.files);
});

pdfFileInput.addEventListener('change', (e) => {
    handlePdfFiles(e.target.files);
});

function handlePdfFiles(files) {
    const newPdfFiles = Array.from(files).filter(f => f.type === 'application/pdf');
    pdfFiles = [...pdfFiles, ...newPdfFiles];
    renderPdfFileList();
    pdfFileList.style.display = 'block';
    pdfActionButtons.style.display = 'block';
}

function renderPdfFileList() {
    pdfFileList.innerHTML = pdfFiles.map((file, index) => `
        <div style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem;" id="pdf-item-${index}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <div style="font-weight: 600; color: var(--color-accent);">${file.name}</div>
                <div style="padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem; background: rgba(156, 163, 175, 0.2); color: #9ca3af;" id="pdf-status-${index}">
                    Väntar
                </div>
            </div>
            <div style="display: grid; gap: 1rem;">
                <div>
                    <label style="display: block; font-size: 0.875rem; margin-bottom: 0.5rem; color: var(--color-text-muted);">Kategori (tom = AI väljer)</label>
                    <select id="pdf-category-${index}" class="form-input">
                        <option value="">🤖 Låt AI välja</option>
                        <option value="Säkerhet">Säkerhet</option>
                        <option value="Procedur">Procedur</option>
                        <option value="Regelverk">Regelverk</option>
                        <option value="Teknik">Teknik</option>
                        <option value="Övrigt">Övrigt</option>
                    </select>
                </div>
                <div>
                    <label style="display: block; font-size: 0.875rem; margin-bottom: 0.5rem; color: var(--color-text-muted);">Titel (tom = AI skapar)</label>
                    <input type="text" id="pdf-title-${index}" class="form-input" placeholder="T.ex. 'AFS 2012:3 Arbetsmiljöverkets föreskrifter'">
                </div>
            </div>
            <div style="width: 100%; height: 4px; background: rgba(255, 255, 255, 0.1); border-radius: 2px; margin-top: 1rem; display: none;" id="pdf-progress-${index}">
                <div style="height: 100%; background: var(--color-accent); width: 0%; transition: width 0.3s;"></div>
            </div>
        </div>
    `).join('');
}

async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    
    let fullText = '';
    const totalPages = pdf.numPages;
    
    for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
    }
    
    return { text: fullText, pages: totalPages };
}

processPdfsBtn.addEventListener('click', async () => {
    processPdfsBtn.disabled = true;
    processPdfsBtn.textContent = '⏳ Processar med AI...';
    processedCount = 0;
    pdfResults.style.display = 'none';
    const results = [];

    for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        const statusEl = document.getElementById(`pdf-status-${i}`);
        const progressEl = document.getElementById(`pdf-progress-${i}`);
        const progressBar = progressEl?.querySelector('div');
        
        try {
            // Update status
            statusEl.textContent = 'Läser PDF...';
            statusEl.style.background = 'rgba(249, 115, 22, 0.2)';
            statusEl.style.color = 'var(--color-accent)';
            progressEl.style.display = 'block';
            if (progressBar) progressBar.style.width = '20%';

            // Extract PDF text
            const { text } = await extractTextFromPDF(file);
            
            if (progressBar) progressBar.style.width = '40%';
            statusEl.textContent = 'AI formaterar...';

            // Get user inputs
            const userCategory = document.getElementById(`pdf-category-${i}`).value;
            const userTitle = document.getElementById(`pdf-title-${i}`).value.trim();

            if (progressBar) progressBar.style.width = '60%';
            statusEl.textContent = 'Lägger till i kunskapsbas...';

            // Call Edge Function
            const { data, error } = await supabaseClient.functions.invoke('process-pdf', {
                body: {
                    pdfText: text,
                    userTitle: userTitle || null,
                    userCategory: userCategory || null
                }
            });

            if (error) throw error;

            if (progressBar) progressBar.style.width = '100%';
            statusEl.textContent = 'Klar ✓';
            statusEl.style.background = 'rgba(34, 197, 94, 0.2)';
            statusEl.style.color = '#22c55e';

            results.push({
                filename: file.name,
                title: data.data.title,
                category: data.data.category
            });

            processedCount++;

        } catch (error) {
            console.error('Error processing', file.name, error);
            statusEl.textContent = 'Fel: ' + error.message;
            statusEl.style.background = 'rgba(239, 68, 68, 0.2)';
            statusEl.style.color = '#ef4444';
        }
    }

    // Show results
    if (results.length > 0) {
        pdfResultsList.innerHTML = results.map(r => `
            <div style="padding: 0.75rem; background: white; border-radius: 6px; margin-bottom: 0.5rem;">
                <div style="font-weight: 600; color: var(--color-primary);">${r.title}</div>
                <div style="font-size: 0.875rem; color: var(--color-text-muted); margin-top: 0.25rem;">
                    Kategori: ${r.category} • Från: ${r.filename}
                </div>
            </div>
        `).join('');
        pdfResults.style.display = 'block';
    }
    
    processPdfsBtn.textContent = `✅ ${processedCount} dokument tillagda!`;
    setTimeout(() => {
        processPdfsBtn.textContent = '🤖 Processa & Lägg till i kunskapsbas';
        processPdfsBtn.disabled = false;
    }, 3000);
});

clearPdfsBtn.addEventListener('click', () => {
    if (confirm('Vill du radera alla valda filer?')) {
        pdfFiles = [];
        pdfFileList.innerHTML = '';
        pdfFileList.style.display = 'none';
        pdfActionButtons.style.display = 'none';
        pdfResults.style.display = 'none';
        pdfFileInput.value = '';
    }
});

// ==========================================
// INITIALIZATION
// ==========================================

checkAuth();
