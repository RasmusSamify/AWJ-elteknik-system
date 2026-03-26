// ==========================================
// KONFIGURATION
// ==========================================

const CONFIG = {
    supabase: {
        url: '', // Lägg till din Supabase URL
        anonKey: '' // Lägg till din Supabase Anon Key
    },
    gemini: {
        apiKey: '' // Lägg till din Gemini API-nyckel
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
            .select('*')
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

function searchKnowledgeBase(query, limit = 5) {
    if (!state.knowledgeBase.length) return [];

    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(' ').filter(word => word.length > 3);

    const results = state.knowledgeBase.map(item => {
        let score = 0;
        const titleLower = item.title.toLowerCase();
        const contentLower = item.content.toLowerCase();
        const categoryLower = item.category.toLowerCase();

        if (titleLower.includes(queryLower)) score += 10;
        
        keywords.forEach(keyword => {
            if (categoryLower.includes(keyword)) score += 5;
            if (titleLower.includes(keyword)) score += 3;
            if (contentLower.includes(keyword)) score += 1;
        });

        return { ...item, score };
    });

    return results
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
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
        loadingSubtitle.textContent = 'Söker i kunskapsbasen...';
        
        const searchQuery = `${state.formData.workDescription} ${state.formData.specificHazards}`;
        const relevantKnowledge = searchKnowledgeBase(searchQuery, 5);

        let knowledgeContext = '';
        if (relevantKnowledge.length > 0) {
            knowledgeContext = '\n\nRELEVANT INFORMATION FRÅN KUNSKAPSBAS:\n';
            relevantKnowledge.forEach(item => {
                knowledgeContext += `\n[${item.category}] ${item.title}:\n${item.content}\n`;
            });
        }

        loadingSubtitle.textContent = 'Genererar riskbedömning...';

        const systemPrompt = `Du är en expert och AI-assistent för AWJ Elteknik AB. 
Din uppgift är att skapa professionella, trygga och lösningsorienterade riskbedömningar.

KONTEXT OM FÖRETAGET:
Företagsnamn: AWJ Elteknik AB
Vision: Att vara Stockholms modernaste elföretag.
Kvalitet: Auktoriserad Elinstallatör, anslutna till Installatörsföretagen (IN).
Tone of Voice: Professionell men personlig. Trygg och säkerhetsfokuserad.

INSTRUKTIONER:
Skriv en strukturerad riskbedömning med tydliga rubriker.
Om information från kunskapsbasen är relevant, använd den.
Format: Använd VERSALER för huvudrubriker.`;

        const userQuery = `Skapa riskbedömning för:
Projekt: ${state.formData.projectName}
Plats: ${state.formData.location}
Arbetsbeskrivning: ${state.formData.workDescription}
Risker: ${state.formData.specificHazards || 'Inga specifika'}
${knowledgeContext}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${CONFIG.gemini.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: userQuery }] }],
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                })
            }
        );

        if (!response.ok) throw new Error('AI-tjänsten svarar inte.');

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error('Inget svar från AI.');

        state.generatedReport = text;

        await supabaseClient.from('assessments').insert({
            user_id: state.user.id,
            project_name: state.formData.projectName,
            location: state.formData.location,
            work_description: state.formData.workDescription,
            specific_hazards: state.formData.specificHazards,
            generated_report: text
        });

        renderReport();
        switchView('report');

    } catch (error) {
        console.error('Assessment error:', error);
        showError(error.message || 'Ett fel uppstod.');
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
        const relevantKnowledge = searchKnowledgeBase(message, 3);

        let knowledgeContext = '';
        if (relevantKnowledge.length > 0) {
            knowledgeContext = '\n\nRELEVANT INFORMATION:\n';
            relevantKnowledge.forEach(item => {
                knowledgeContext += `\n[${item.category}] ${item.title}:\n${item.content}\n`;
            });
        }

        const systemPrompt = `Du är AWJ Eltekniks interna AI-assistent.
Du är professionell, hjälpsam och lösningsorienterad.
Du har tillgång till företagets kunskapsbas.
Svara kortfattat och tydligt.`;

        const formattedHistory = state.chatMessages.slice(1).map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        if (formattedHistory.length > 0) {
            formattedHistory[formattedHistory.length - 1].parts[0].text += knowledgeContext;
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${CONFIG.gemini.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: formattedHistory,
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                })
            }
        );

        if (!response.ok) throw new Error('AI svarar inte.');

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error('Inget svar.');

        state.chatMessages.push({ role: 'ai', content: text });

        await supabaseClient.from('chat_history').insert({
            user_id: state.user.id,
            message: message,
            response: text,
            knowledge_used: relevantKnowledge.length > 0
        });
        
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
