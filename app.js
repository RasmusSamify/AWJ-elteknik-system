// ==========================================
// KONFIGURATION
// ==========================================

const CONFIG = {
    supabase: {
        url: 'https://wohafzptvjtymnsexaxo.supabase.co', // Lägg till din Supabase URL
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaGFmenB0dmp0eW1uc2V4YXhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NTQwODMsImV4cCI6MjA5MDEzMDA4M30.crgqtpx6_kVM1oLNklo1JSw9kUZ6HVI52-JHjNKcVkA' // Lägg till din Supabase Anon Key
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
const savedAssessmentsView = document.getElementById('savedAssessmentsView');

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
    savedAssessmentsView.classList.toggle('hidden', viewName !== 'saved-assessments');
    adminView.classList.toggle('hidden', viewName !== 'admin');
window.addEventListener('message', (event) => {
    if (event.data.type === 'AWJ_WIDGET_NAVIGATE') {
        // Navigera till rätt vy
        switchView(event.data.view);
        
        // Om det finns prefill-data (t.ex. från ROT-kalkyl)
        if (event.data.prefill) {
            // Fyll i formulär med prefill-data
            if (event.data.prefill.rotLaborCost) {
                // Du kan lägga ROT-värden i en global variabel om du vill visa dem
                console.log('ROT labor:', event.data.prefill.rotLaborCost);
                console.log('ROT material:', event.data.prefill.rotMaterialCost);
                
                // Exempel: Du kan fylla i workDescription automatiskt
                const workDesc = document.getElementById('workDescription');
                if (workDesc) {
                    workDesc.value = `Projekt med ROT-avdrag:\nArbetskostnad: ${event.data.prefill.rotLaborCost} kr\nMaterialkostnad: ${event.data.prefill.rotMaterialCost} kr`;
                }
            }
            
            if (event.data.prefill.checklistType) {
                // Sätt checklist-typ i workDescription
                const workDesc = document.getElementById('workDescription');
                if (workDesc && !workDesc.value) {
                    workDesc.value = `Projekt: ${event.data.prefill.checklistType}`;
                }
            }
        }
    }
});
    const currentViewElement = {
        'dashboard': dashboardView,
        'loading': loadingView,
        'report': reportView,
        'chat': chatView,
        'saved-assessments': savedAssessmentsView,
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
    let consecutiveEmptyLines = 0;
    
    paragraphs.forEach(paragraph => {
        const trimmed = paragraph.trim();
        
        // Skip excessive empty lines (max 1 empty line between sections)
        if (!trimmed) {
            consecutiveEmptyLines++;
            if (consecutiveEmptyLines <= 1) {
                reportContent.appendChild(document.createElement('br'));
            }
            return;
        }
        
        consecutiveEmptyLines = 0;

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

// Document list elements
const documentsList = document.getElementById('documentsList');
const docSearchInput = document.getElementById('docSearchInput');
const docCategoryFilter = document.getElementById('docCategoryFilter');
const refreshDocsBtn = document.getElementById('refreshDocsBtn');
const docCount = document.getElementById('docCount');
const performanceWarning = document.getElementById('performanceWarning');
const warningDocCount = document.getElementById('warningDocCount');

let pdfFiles = [];
let processedCount = 0;
let allDocuments = [];
let filteredDocuments = [];

// Load documents when admin view is opened
async function loadDocuments() {
    try {
        const { data, error } = await supabaseClient
            .from('knowledge_base')
            .select('id, category, title, content, created_at, created_by, active')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allDocuments = data || [];
        filteredDocuments = allDocuments;
        docCount.textContent = allDocuments.length;
        
        // Show performance warning if 50+ documents
        if (allDocuments.length >= 50) {
            warningDocCount.textContent = allDocuments.length;
            performanceWarning.style.display = 'block';
        } else {
            performanceWarning.style.display = 'none';
        }
        
        renderDocuments();
    } catch (error) {
        console.error('Error loading documents:', error);
        documentsList.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #ef4444;">
                ⚠️ Kunde inte ladda dokument: ${error.message}
            </div>
        `;
    }
}

function renderDocuments() {
    if (filteredDocuments.length === 0) {
        documentsList.innerHTML = `
            <div style="padding: 3rem; text-align: center; color: var(--color-text-muted);">
                ${allDocuments.length === 0 ? '📭 Inga dokument i kunskapsbasen än' : '🔍 Inga dokument matchar din sökning'}
            </div>
        `;
        return;
    }

    documentsList.innerHTML = filteredDocuments.map(doc => {
        const createdDate = new Date(doc.created_at).toLocaleDateString('sv-SE');
        const preview = doc.content.substring(0, 150).replace(/\n/g, ' ') + '...';
        
        return `
            <div style="padding: 1.5rem; border-bottom: 1px solid var(--color-border); background: white; transition: background 0.2s;" 
                 onmouseover="this.style.background='var(--color-bg)'" 
                 onmouseout="this.style.background='white'">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
                            <h3 style="font-weight: 600; color: var(--color-primary); margin: 0;">${doc.title}</h3>
                            <span style="padding: 0.25rem 0.75rem; background: rgba(249, 115, 22, 0.1); color: var(--color-accent); border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                                ${doc.category}
                            </span>
                            ${!doc.active ? '<span style="padding: 0.25rem 0.75rem; background: rgba(156, 163, 175, 0.2); color: #9ca3af; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">Inaktiv</span>' : ''}
                        </div>
                        <p style="font-size: 0.875rem; color: var(--color-text-muted); margin: 0; line-height: 1.5;">${preview}</p>
                        <p style="font-size: 0.75rem; color: var(--color-text-light); margin-top: 0.5rem; margin-bottom: 0;">
                            Skapad: ${createdDate}
                        </p>
                    </div>
                    <div style="display: flex; gap: 0.5rem; margin-left: 1rem;">
                        <button onclick="viewDocument('${doc.id}')" style="padding: 0.5rem 0.75rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 6px; color: var(--color-text); cursor: pointer; font-size: 0.875rem; white-space: nowrap;">
                            👁️ Visa
                        </button>
                        <button onclick="toggleDocumentActive('${doc.id}', ${doc.active})" style="padding: 0.5rem 0.75rem; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 6px; color: var(--color-text); cursor: pointer; font-size: 0.875rem; white-space: nowrap;">
                            ${doc.active ? '🔕 Inaktivera' : '✅ Aktivera'}
                        </button>
                        <button onclick="deleteDocument('${doc.id}', '${doc.title.replace(/'/g, "\\'")}')" style="padding: 0.5rem 0.75rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; color: #ef4444; cursor: pointer; font-size: 0.875rem;">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function viewDocument(docId) {
    try {
        const { data, error } = await supabaseClient
            .from('knowledge_base')
            .select('*')
            .eq('id', docId)
            .single();

        if (error) throw error;

        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 2rem;';
        modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

        modal.innerHTML = `
            <div style="background: white; border-radius: 12px; max-width: 800px; width: 100%; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;" onclick="event.stopPropagation()">
                <div style="padding: 2rem; border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">${data.title}</h2>
                        <div style="display: flex; gap: 0.5rem;">
                            <span style="padding: 0.25rem 0.75rem; background: rgba(249, 115, 22, 0.1); color: var(--color-accent); border-radius: 12px; font-size: 0.875rem; font-weight: 600;">
                                ${data.category}
                            </span>
                            <span style="padding: 0.25rem 0.75rem; background: var(--color-bg); border-radius: 12px; font-size: 0.875rem; color: var(--color-text-muted);">
                                ${new Date(data.created_at).toLocaleDateString('sv-SE')}
                            </span>
                        </div>
                    </div>
                    <button onclick="this.closest('[style*=fixed]').remove()" style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 6px; padding: 0.5rem; cursor: pointer; font-size: 1.25rem; line-height: 1;">
                        ✕
                    </button>
                </div>
                <div style="padding: 2rem; overflow-y: auto; flex: 1;">
                    <div style="white-space: pre-wrap; line-height: 1.8; color: var(--color-text);">${data.content}</div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    } catch (error) {
        alert('Kunde inte ladda dokument: ' + error.message);
    }
}

async function toggleDocumentActive(docId, currentActive) {
    if (!confirm(`Vill du ${currentActive ? 'inaktivera' : 'aktivera'} detta dokument?`)) return;

    try {
        const { error } = await supabaseClient
            .from('knowledge_base')
            .update({ active: !currentActive })
            .eq('id', docId);

        if (error) throw error;

        await loadDocuments();
    } catch (error) {
        alert('Kunde inte uppdatera dokument: ' + error.message);
    }
}

async function deleteDocument(docId, title) {
    if (!confirm(`Är du säker på att du vill radera:\n\n"${title}"\n\nDetta går inte att ångra!`)) return;

    try {
        const { error } = await supabaseClient
            .from('knowledge_base')
            .delete()
            .eq('id', docId);

        if (error) throw error;

        await loadDocuments();
        alert('✅ Dokumentet har raderats');
    } catch (error) {
        alert('Kunde inte radera dokument: ' + error.message);
    }
}

function filterDocuments() {
    const searchTerm = docSearchInput.value.toLowerCase();
    const category = docCategoryFilter.value;

    filteredDocuments = allDocuments.filter(doc => {
        const matchesSearch = !searchTerm || 
            doc.title.toLowerCase().includes(searchTerm) || 
            doc.content.toLowerCase().includes(searchTerm);
        
        const matchesCategory = !category || doc.category === category;

        return matchesSearch && matchesCategory;
    });

    renderDocuments();
}

// Event listeners for document list
docSearchInput.addEventListener('input', filterDocuments);
docCategoryFilter.addEventListener('change', filterDocuments);
refreshDocsBtn.addEventListener('click', loadDocuments);

// Load documents when switching to admin view
const originalSwitchView = switchView;
switchView = function(viewName) {
    originalSwitchView(viewName);
    if (viewName === 'admin') {
        loadDocuments();
    } else if (viewName === 'saved-assessments') {
        loadSavedAssessments();
    }
};

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
            <div id="pdf-thinking-${index}" style="display: none; margin-top: 1rem; padding: 1rem; background: rgba(249, 115, 22, 0.05); border-radius: 6px; border-left: 3px solid var(--color-accent);">
                <div class="ai-thinking">
                    <span class="ai-thinking-icon">🤖</span>
                    <span id="pdf-thinking-text-${index}">AI tänker...</span>
                </div>
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
        const thinkingEl = document.getElementById(`pdf-thinking-${i}`);
        const thinkingText = document.getElementById(`pdf-thinking-text-${i}`);
        
        try {
            // Update status - Reading PDF
            statusEl.textContent = 'Läser PDF...';
            statusEl.style.background = 'rgba(249, 115, 22, 0.2)';
            statusEl.style.color = 'var(--color-accent)';
            progressEl.style.display = 'block';
            if (progressBar) progressBar.style.width = '20%';

            // Extract PDF text
            const { text } = await extractTextFromPDF(file);
            
            if (progressBar) progressBar.style.width = '40%';
            
            // Show AI thinking animation
            thinkingEl.style.display = 'block';
            thinkingText.textContent = '🧠 AI analyserar dokumentet...';
            statusEl.textContent = 'AI processar...';

            await new Promise(resolve => setTimeout(resolve, 500)); // Short delay for visual effect
            
            // Get user inputs
            const userCategory = document.getElementById(`pdf-category-${i}`).value;
            const userTitle = document.getElementById(`pdf-title-${i}`).value.trim();

            if (progressBar) progressBar.style.width = '60%';
            thinkingText.textContent = '✍️ AI formaterar till Markdown...';

            // Call Edge Function
            const { data, error } = await supabaseClient.functions.invoke('process-pdf', {
                body: {
                    pdfText: text,
                    userTitle: userTitle || null,
                    userCategory: userCategory || null
                }
            });

            if (error) throw error;

            if (progressBar) progressBar.style.width = '90%';
            thinkingText.textContent = '💾 Sparar i kunskapsbas...';

            await new Promise(resolve => setTimeout(resolve, 300)); // Short delay

            if (progressBar) progressBar.style.width = '100%';
            thinkingEl.style.display = 'none';
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
            if (thinkingEl) thinkingEl.style.display = 'none';
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
        
        // Refresh document list
        await loadDocuments();
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
// SAVED ASSESSMENTS
// ==========================================

const assessmentsList = document.getElementById('assessmentsList');
const assessmentSearchInput = document.getElementById('assessmentSearchInput');
const assessmentSortSelect = document.getElementById('assessmentSortSelect');
const refreshAssessmentsBtn = document.getElementById('refreshAssessmentsBtn');
const assessmentCount = document.getElementById('assessmentCount');

let allAssessments = [];
let filteredAssessments = [];

// Load saved assessments
async function loadSavedAssessments() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        const { data, error } = await supabaseClient
            .from('assessments')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        allAssessments = data || [];
        filteredAssessments = allAssessments;
        assessmentCount.textContent = allAssessments.length;
        
        renderAssessments();
    } catch (error) {
        console.error('Error loading assessments:', error);
        assessmentsList.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #ef4444;">
                ⚠️ Kunde inte ladda riskbedömningar: ${error.message}
            </div>
        `;
    }
}

// Render assessments
function renderAssessments() {
    if (filteredAssessments.length === 0) {
        assessmentsList.innerHTML = `
            <div style="padding: 3rem; text-align: center; color: var(--color-text-muted);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
                <div style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem;">Inga riskbedömningar än</div>
                <div style="font-size: 0.875rem;">Skapa din första riskbedömning under "Riskbedömning"</div>
            </div>
        `;
        return;
    }

    assessmentsList.innerHTML = filteredAssessments.map(assessment => {
        const date = new Date(assessment.created_at).toLocaleDateString('sv-SE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div style="background: white; border: 1px solid var(--color-border); border-radius: 8px; padding: 1.5rem; cursor: pointer; transition: all 0.2s;" 
                 onclick="viewAssessment('${assessment.id}')"
                 onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; this.style.borderColor='var(--color-accent)'"
                 onmouseout="this.style.boxShadow=''; this.style.borderColor='var(--color-border)'">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
                    <div style="flex: 1;">
                        <h3 style="font-weight: 700; color: var(--color-primary); margin-bottom: 0.25rem;">
                            ${assessment.project_name}
                        </h3>
                        <div style="font-size: 0.875rem; color: var(--color-text-muted);">
                            📍 ${assessment.location}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.75rem; color: var(--color-text-muted);">
                            ${date}
                        </div>
                    </div>
                </div>
                <div style="font-size: 0.875rem; color: var(--color-text); line-height: 1.5; margin-bottom: 0.75rem;">
                    ${assessment.work_description.substring(0, 150)}${assessment.work_description.length > 150 ? '...' : ''}
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <button onclick="event.stopPropagation(); viewAssessment('${assessment.id}')" 
                            style="padding: 0.5rem 1rem; background: var(--color-accent); color: white; border: none; border-radius: 6px; font-size: 0.875rem; cursor: pointer; transition: all 0.2s;"
                            onmouseover="this.style.background='var(--color-accent-hover)'"
                            onmouseout="this.style.background='var(--color-accent)'">
                        👁️ Visa
                    </button>
                    <button onclick="event.stopPropagation(); printAssessment('${assessment.id}')" 
                            style="padding: 0.5rem 1rem; background: transparent; color: var(--color-accent); border: 1px solid var(--color-accent); border-radius: 6px; font-size: 0.875rem; cursor: pointer; transition: all 0.2s;"
                            onmouseover="this.style.background='rgba(249, 115, 22, 0.1)'"
                            onmouseout="this.style.background='transparent'">
                        🖨️ Skriv ut
                    </button>
                    <button onclick="event.stopPropagation(); deleteAssessment('${assessment.id}')" 
                            style="padding: 0.5rem 1rem; background: transparent; color: #ef4444; border: 1px solid #ef4444; border-radius: 6px; font-size: 0.875rem; cursor: pointer; transition: all 0.2s;"
                            onmouseover="this.style.background='rgba(239, 68, 68, 0.1)'"
                            onmouseout="this.style.background='transparent'">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Search and filter
function filterAssessments() {
    const searchTerm = assessmentSearchInput.value.toLowerCase();
    const sortBy = assessmentSortSelect.value;

    // Filter
    filteredAssessments = allAssessments.filter(assessment => {
        const matchesSearch = 
            assessment.project_name.toLowerCase().includes(searchTerm) ||
            assessment.location.toLowerCase().includes(searchTerm) ||
            assessment.work_description.toLowerCase().includes(searchTerm);
        
        return matchesSearch;
    });

    // Sort
    if (sortBy === 'newest') {
        filteredAssessments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'oldest') {
        filteredAssessments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortBy === 'project') {
        filteredAssessments.sort((a, b) => a.project_name.localeCompare(b.project_name));
    }

    renderAssessments();
}

// View assessment
async function viewAssessment(id) {
    try {
        const { data, error } = await supabaseClient
            .from('assessments')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Load into report view
        state.formData = {
            projectName: data.project_name,
            location: data.location,
            workDescription: data.work_description,
            specificHazards: data.specific_hazards
        };
        state.generatedReport = data.generated_report;

        renderReport();
        switchView('report');
    } catch (error) {
        console.error('Error viewing assessment:', error);
        alert('Kunde inte ladda riskbedömning');
    }
}

// Print assessment
async function printAssessment(id) {
    await viewAssessment(id);
    setTimeout(() => window.print(), 500);
}

// Delete assessment
async function deleteAssessment(id) {
    if (!confirm('Är du säker på att du vill radera denna riskbedömning?')) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('assessments')
            .delete()
            .eq('id', id);

        if (error) throw error;

        await loadSavedAssessments();
    } catch (error) {
        console.error('Error deleting assessment:', error);
        alert('Kunde inte radera riskbedömning');
    }
}

// Event listeners
assessmentSearchInput.addEventListener('input', filterAssessments);
assessmentSortSelect.addEventListener('change', filterAssessments);
refreshAssessmentsBtn.addEventListener('click', loadSavedAssessments);

// ==========================================
// INITIALIZATION
// ==========================================

checkAuth();
