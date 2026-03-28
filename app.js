// ==========================================
// KONFIGURATION
// ==========================================

const CONFIG = {
    supabase: {
        url: '', // https://awjelteknik.netlify.app/
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
        .select('full_name')
        .eq('id', state.user.id)
        .single();

    userName.textContent = profile?.full_name || state.user.email.split('@')[0];
    
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

    const currentViewElement = {
        'dashboard': dashboardView,
        'loading': loadingView,
        'report': reportView,
        'chat': chatView
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
// INITIALIZATION
// ==========================================

checkAuth();
