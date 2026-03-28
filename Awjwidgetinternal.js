// ═══════════════════════════════════════════════════════════════
// AWJ ELTEKNIK AB - INTERN WIDGET
// Verktygslåda för fältet och kontoret
// ═══════════════════════════════════════════════════════════════

(function () {
  if (document.getElementById('awj-widget-container')) return;

  // ═══════════════════════════════════════════════════════════════
  //  ⚙️  KONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  
  const supabaseClient = window.supabaseClient;
  
  if (!supabaseClient) {
    console.error('⚠️ AWJ Widget: Supabase client not found!');
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  //  🎨 CSS STYLES
  // ═══════════════════════════════════════════════════════════════
  var style = document.createElement('style');
  style.textContent = `
    #awj-widget-container * { 
      font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif !important; 
      box-sizing: border-box; 
    }

    #awj-launcher {
      position: fixed; bottom: 24px; right: 24px;
      width: 64px; height: 64px; border-radius: 50%;
      background: #fff; border: 2px solid #e5e5e5; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 9999;
    }
    #awj-launcher:hover { 
      transform: translateY(-3px); 
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      border-color: #000;
    }
    #awj-launcher.open .awj-chat { display: none; }
    #awj-launcher.open .awj-close { display: block !important; }

    #awj-widget {
      position: fixed; bottom: 100px; right: 24px;
      width: 400px; height: 640px; border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
      background: #fff; display: flex; flex-direction: column; overflow: hidden;
      transform: scale(0.92) translateY(16px); opacity: 0; pointer-events: none;
      transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); z-index: 9998;
    }
    #awj-widget.visible { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }
    
    @media (min-width: 768px) {
      #awj-widget { width: 500px; }
    }
    
    @media (max-width: 580px) {
      #awj-widget { width: calc(100vw - 16px); right: 8px; }
    }

    .awj-header { 
      background: #fff; padding: 18px 20px; display: flex; align-items: center; 
      justify-content: space-between; flex-shrink: 0; border-bottom: 1px solid #f0f0f0;
    }
    .awj-header-left { display: flex; align-items: center; }
    .awj-back { 
      background: #f8f8f8; border: 1px solid #e5e5e5; cursor: pointer; 
      width: 32px; height: 32px; border-radius: 50%; display: none; 
      align-items: center; justify-content: center; color: #1a1a1a; 
      font-size: 18px; transition: all 0.2s; flex-shrink: 0; margin-right: 12px; font-weight: 600;
    }
    .awj-back.show { display: flex; }
    .awj-back:hover { background: #000; color: #fff; border-color: #000; }
    .awj-logo { display: flex; align-items: center; gap: 10px; }
    .awj-logo-text { 
      font-size: 16px; font-weight: 800; color: #000; 
      letter-spacing: -0.02em;
    }
    .awj-divider { width: 1px; height: 28px; background: #e5e5e5; margin: 0 14px; }
    .awj-header-sub { display: flex; flex-direction: column; }
    .awj-title { 
      font-size: 10px; font-weight: 700; color: #666; 
      letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 3px;
    }
    .awj-status { display: flex; align-items: center; gap: 5px; }
    .awj-dot { 
      width: 6px; height: 6px; border-radius: 50%; background: #10b981;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .awj-status-text { 
      font-size: 9px; font-weight: 600; color: #10b981; 
      letter-spacing: 0.08em; text-transform: uppercase;
    }

    .awj-progress { height: 3px; background: #f0f0f0; flex-shrink: 0; }
    .awj-progress-fill { height: 100%; background: #000; transition: width 0.4s ease; }

    .awj-content { flex: 1; overflow: hidden; position: relative; }
    .awj-screen { 
      position: absolute; top: 0; right: 0; bottom: 0; left: 0; 
      overflow-y: auto; -webkit-overflow-scrolling: touch; background: #fafafa; 
      display: none; flex-direction: column;
    }
    .awj-screen.active { display: flex; }
    .awj-screen.slide-in { animation: slideIn 0.3s ease; }
    .awj-screen.slide-back { animation: slideBack 0.25s ease; }
    @keyframes slideIn { from { opacity: 0; transform: translateX(30px); } }
    @keyframes slideBack { from { opacity: 0; transform: translateX(-30px); } }

    .home-body { padding: 20px; }
    .home-greeting { 
      font-size: 13.5px; font-weight: 500; color: #1a1a1a; line-height: 1.65; 
      margin-bottom: 18px; background: #fff; border-radius: 14px; 
      padding: 16px 18px; border: 1px solid #e5e5e5;
    }
    .home-greeting strong { font-weight: 700; }
    .home-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .home-card { 
      background: #fff; border: 1.5px solid #e5e5e5; border-radius: 14px; 
      padding: 18px 16px; display: flex; flex-direction: column; align-items: center; 
      gap: 10px; cursor: pointer; text-align: center; 
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      min-height: 44px;
    }
    .home-card:hover { 
      border-color: #000; transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.08);
    }
    .card-icon-wrap { 
      width: 46px; height: 46px; border-radius: 14px; background: #fafafa; 
      display: flex; align-items: center; justify-content: center;
      border: 1px solid #e5e5e5; flex-shrink: 0;
    }
    .card-icon { font-size: 24px; }
    .card-label { font-size: 13px; font-weight: 700; color: #000; }
    .card-sub { font-size: 11.5px; color: #666; font-weight: 500; }

    .inner-body { padding: 20px; flex: 1; }
    .inner-title { font-size: 15px; font-weight: 800; color: #000; margin-bottom: 6px; }
    .inner-sub { font-size: 12.5px; color: #666; margin-bottom: 18px; line-height: 1.5; }

    .awj-input-wrap { position: relative; margin-bottom: 16px; }
    .awj-input-wrap svg { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); }
    .awj-input { 
      width: 100%; padding: 14px 18px 14px 46px; border: 1.5px solid #e5e5e5; 
      border-radius: 14px; font-size: 13.5px; color: #000; background: #fff; 
      outline: none; transition: all 0.2s;
    }
    .awj-input:focus { border-color: #000; box-shadow: 0 0 0 3px rgba(0,0,0,0.05); }
    .awj-input::placeholder { color: #999; }

    .awj-btn { 
      display: block; width: 100%; padding: 15px; border: none; border-radius: 14px; 
      font-size: 14px; font-weight: 800; cursor: pointer; text-align: center; 
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      min-height: 44px;
    }
    .awj-btn:hover { transform: translateY(-2px); }
    .awj-btn-primary { background: #000; color: #fff; }
    .awj-btn-primary:hover { background: #1a1a1a; box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
    .awj-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .awj-footer { 
      padding: 12px 16px; border-top: 1px solid #e5e5e5; 
      display: flex; align-items: center; justify-content: center; background: #fff;
    }
    .awj-footer-text { 
      font-size: 11px; color: #666; 
      display: flex; align-items: center; gap: 6px; font-weight: 600;
    }
    .awj-pdot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }

    /* ROT Calculator */
    .rot-field { 
      background: #fff; border: 1.5px solid #e5e5e5; border-radius: 14px; 
      padding: 16px 18px; margin-bottom: 14px; transition: all 0.2s;
    }
    .rot-field:focus-within { border-color: #000; box-shadow: 0 0 0 3px rgba(0,0,0,0.05); }
    .rot-field-label { 
      font-size: 11.5px; font-weight: 700; color: #1a1a1a; 
      margin-bottom: 10px; display: flex; justify-content: space-between;
    }
    .rot-field-label span { color: #666; }
    .rot-slider { 
      width: 100%; height: 6px; background: #e5e5e5; 
      border-radius: 3px; outline: none; -webkit-appearance: none;
    }
    .rot-slider::-webkit-slider-thumb { 
      -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; 
      background: #000; cursor: pointer; border: 3px solid #fff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .rot-slider::-moz-range-thumb { 
      width: 22px; height: 22px; border-radius: 50%; background: #000; 
      border: 3px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .rot-result-box { 
      background: #000; border-radius: 16px; padding: 20px; 
      margin: 18px 0; text-align: center;
    }
    .rot-result-label { 
      font-size: 11.5px; color: rgba(255,255,255,0.6); 
      margin-bottom: 10px; font-weight: 700; text-transform: uppercase;
    }
    .rot-result-amount { font-size: 36px; font-weight: 800; color: #fff; }
    .rot-result-sub { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 8px; }
    .rot-breakdown { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
    .rot-stat { background: #fff; border-radius: 12px; padding: 14px 16px; border: 1px solid #e5e5e5; }
    .rot-stat-label { font-size: 10.5px; color: #666; font-weight: 700; text-transform: uppercase; }
    .rot-stat-val { font-size: 18px; font-weight: 800; color: #000; margin-top: 5px; }

    /* Search Results */
    .search-result { 
      background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; 
      padding: 14px 16px; margin-bottom: 10px; cursor: pointer;
      transition: all 0.2s;
    }
    .search-result:hover { border-color: #000; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .search-result-title { font-size: 13px; font-weight: 700; color: #000; margin-bottom: 4px; }
    .search-result-category { 
      font-size: 10.5px; color: #666; background: #f0f0f0; 
      padding: 3px 8px; border-radius: 6px; display: inline-block; margin-bottom: 6px;
    }
    .search-result-preview { font-size: 11.5px; color: #1a1a1a; line-height: 1.5; }

    /* Contacts */
    .contact-card { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 16px; margin-bottom: 10px; }
    .contact-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .contact-av { 
      width: 42px; height: 42px; border-radius: 50%; background: #000; 
      display: flex; align-items: center; justify-content: center; 
      font-size: 16px; font-weight: 800; color: #fff;
    }
    .contact-name { font-size: 14px; font-weight: 800; color: #000; }
    .contact-role { font-size: 11px; color: #666; }
    .contact-links { display: flex; flex-direction: column; gap: 5px; }
    .contact-link { 
      display: flex; align-items: center; gap: 10px; font-size: 12.5px; 
      color: #1a1a1a; text-decoration: none; padding: 9px 10px; border-radius: 8px;
    }
    .contact-link:hover { background: #fafafa; }
    .contact-delete { 
      margin-left: auto; color: #ef4444; cursor: pointer; 
      padding: 4px 8px; border-radius: 6px;
    }
    .contact-delete:hover { background: rgba(239,68,68,0.1); }

    /* Stats */
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
    .stat-card { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 16px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: 800; color: #000; }
    .stat-label { font-size: 10.5px; color: #666; margin-top: 4px; text-transform: uppercase; font-weight: 700; }
    .stat-list { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 16px; }
    .stat-list-title { font-size: 11px; font-weight: 800; color: #666; text-transform: uppercase; margin-bottom: 10px; }
    .stat-list-item { 
      padding: 8px 0; border-top: 1px solid #f0f0f0; 
      font-size: 12px; color: #1a1a1a; display: flex; justify-content: space-between;
    }
    .stat-list-item:first-child { border-top: none; }

    /* Checklists */
    .checklist-section { margin-bottom: 20px; }
    .checklist-section-title { 
      font-size: 11.5px; font-weight: 800; color: #000; 
      margin-bottom: 10px; display: flex; align-items: center; gap: 8px;
    }
    .checklist-item { 
      background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; 
      padding: 12px 14px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px;
      cursor: pointer; transition: all 0.2s;
    }
    .checklist-item:hover { border-color: #000; }
    .checklist-item.checked { background: #f0f0f0; opacity: 0.6; }
    .checklist-checkbox { 
      width: 20px; height: 20px; border: 2px solid #e5e5e5; 
      border-radius: 6px; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .checklist-item.checked .checklist-checkbox { 
      background: #000; border-color: #000; color: #fff;
    }
    .checklist-text { font-size: 12.5px; color: #1a1a1a; flex: 1; }
    .chip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 18px; }
    .chip { 
      background: #fff; border: 1.5px solid #e5e5e5; border-radius: 14px; 
      padding: 14px 12px; text-align: center; cursor: pointer; 
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      min-height: 44px;
    }
    .chip:hover { border-color: #000; background: #fafafa; transform: translateY(-2px); }
    .chip-icon { font-size: 24px; margin-bottom: 8px; }
    .chip-label { font-size: 12px; font-weight: 700; color: #000; }
    .chip-sub { font-size: 10.5px; color: #666; margin-top: 3px; }
  `;
  document.head.appendChild(style);

  // ═══════════════════════════════════════════════════════════════
  //  💾 STATE
  // ═══════════════════════════════════════════════════════════════
  var state = {
    currentScreen: 'home',
    user: null,
    userName: '',
    latestProject: null,
    monthlyCount: 0,
    rotData: {
      laborCost: 15000,
      materialCost: 8000
    },
    searchResults: [],
    checklistProgress: {},
    currentChecklist: null
  };

  // ═══════════════════════════════════════════════════════════════
  //  📊 HARDCODED DATA
  // ═══════════════════════════════════════════════════════════════
  
  const CHECKLISTS = {
    laddbox: {
      name: 'Laddbox Installation',
      icon: '🔌',
      sections: [
        {
          title: 'Pre-Installation',
          items: [
            'Kontrollera säkringar (150A)',
            'Mät kabeldragning',
            'Verifiera parkeringsplatser',
            'Kontrollera elcentral',
            'Planera kabelvägar'
          ]
        },
        {
          title: 'Installation',
          items: [
            'Dra kabel från fördelning',
            'Montera laddboxar',
            'Inkoppling och testning',
            'Funktionstest alla enheter'
          ]
        },
        {
          title: 'Post-Installation',
          items: [
            'Dokumentation',
            'Attest',
            'Kundutbildning',
            'Uppföljning efter 1 vecka'
          ]
        }
      ]
    },
    smart_hem: {
      name: 'Smart Hem Installation',
      icon: '🏠',
      sections: [
        {
          title: 'Förberedelse',
          items: [
            'Kartlägg befintlig installation',
            'Planera WiFi-täckning',
            'Lista enheter som ska automatiseras',
            'Kontrollera kompatibilitet'
          ]
        },
        {
          title: 'Installation',
          items: [
            'Installera smarta switchar',
            'Konfigurera central hub',
            'Koppla upp enheter',
            'Testa alla automationer'
          ]
        },
        {
          title: 'Avslut',
          items: [
            'Kundutbildning i app',
            'Skapa rutiner & scener',
            'Dokumentation',
            'Support-info'
          ]
        }
      ]
    },
    belysning: {
      name: 'Belysning & Ljusdesign',
      icon: '💡',
      sections: [
        {
          title: 'Planering',
          items: [
            'Ljusplan & skiss',
            'Välj armaturer',
            'Beräkna effektbehov',
            'Kontrollera befintliga kretsar'
          ]
        },
        {
          title: 'Installation',
          items: [
            'Montera armaturer',
            'Dra nödvändig kabling',
            'Installera dimmer/switchar',
            'Testning & justering'
          ]
        },
        {
          title: 'Färdigställande',
          items: [
            'Slutjustering ljusnivåer',
            'Attest',
            'Genomgång med kund',
            'Städning'
          ]
        }
      ]
    },
    larm: {
      name: 'Larm & Säkerhet',
      icon: '🔒',
      sections: [
        {
          title: 'Före Installation',
          items: [
            'Säkerhetsanalys',
            'Placering av sensorer',
            'Central enhet & kommunikation',
            'Kontrollera öppningar'
          ]
        },
        {
          title: 'Installation',
          items: [
            'Montera dörr/fönstersensorer',
            'Installera rörelsedektorer',
            'Koppling larmcentral',
            'Konfiguration & test'
          ]
        },
        {
          title: 'Ibruktagning',
          items: [
            'Utbildning larmfunktioner',
            'Testa alla zoner',
            'App-konfiguration',
            'Kontakt larmcentral (om aktuellt)'
          ]
        }
      ]
    },
    allmant: {
      name: 'Allmän Elinstallation',
      icon: '⚡',
      sections: [
        {
          title: 'Förberedelse',
          items: [
            'Besiktning befintlig installation',
            'Riskbedömning',
            'Material & verktyg klart',
            'Informera kund om arbetsgång'
          ]
        },
        {
          title: 'Utförande',
          items: [
            'Spänningslöst arbete',
            'Installation enligt plan',
            'Kontinuerlig dokumentation',
            'Säkerhetsrutiner följs'
          ]
        },
        {
          title: 'Avslut',
          items: [
            'Funktionskontroll',
            'Elinstallationsprotokoll',
            'Attest',
            'Städning & uppföljning'
          ]
        }
      ]
    }
  };

  const TEAM_CONTACTS = [
    { name: 'Kenny', role: 'Elektriker & Ägare', phone: '0735779302', initial: 'K' },
    { name: 'Robert', role: 'Elektriker', phone: '0709446968', initial: 'R' }
  ];

  const COMPANY_CONTACTS = [
    { name: 'AWJ Kontor', email: 'info@awjelteknik.se', icon: '🏢', address: 'Blackensvägen 14, 125 32 Älvsjö' }
  ];

  // ═══════════════════════════════════════════════════════════════
  //  ⚙️ HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  
  function formatNumber(num) {
    return new Intl.NumberFormat('sv-SE').format(num);
  }

  function goToScreen(screenName, slideBack) {
    var screens = document.querySelectorAll('.awj-screen');
    screens.forEach(function(s) {
      s.classList.remove('active', 'slide-in', 'slide-back');
    });
    
    var targetScreen = document.querySelector('[data-screen="' + screenName + '"]');
    if (targetScreen) {
      targetScreen.classList.add('active');
      targetScreen.classList.add(slideBack ? 'slide-back' : 'slide-in');
      state.currentScreen = screenName;
      
      var backBtn = document.querySelector('.awj-back');
      if (screenName === 'home') {
        backBtn.classList.remove('show');
      } else {
        backBtn.classList.add('show');
      }
    }
  }

  function navigateToIntranet(view, prefill) {
    // Close widget
    document.getElementById('awj-widget').classList.remove('visible');
    document.getElementById('awj-launcher').classList.remove('open');
    
    // Send message to parent (intranet)
    window.postMessage({
      type: 'AWJ_WIDGET_NAVIGATE',
      view: view,
      prefill: prefill || null
    }, '*');
  }

  // ═══════════════════════════════════════════════════════════════
  //  🏠 HOME SCREEN
  // ═══════════════════════════════════════════════════════════════
  
  async function loadHomeData() {
    try {
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError) throw userError;
      
      state.user = user;
      
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      
      if (!profileError && profile) {
        state.userName = profile.full_name || 'där';
      }
      
      const { data: latest, error: latestError } = await supabaseClient
        .from('assessments')
        .select('project_name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!latestError && latest && latest.length > 0) {
        state.latestProject = latest[0].project_name;
      }
      
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count, error: countError } = await supabaseClient
        .from('assessments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());
      
      if (!countError) {
        state.monthlyCount = count || 0;
      }
      
      renderHomeGreeting();
      
    } catch (error) {
      console.error('Error loading home data:', error);
      document.getElementById('home-greeting').innerHTML = '👋 Hej! Vad kan jag hjälpa dig med?';
    }
  }

  function renderHomeGreeting() {
    const greeting = document.getElementById('home-greeting');
    
    let html = `👋 Välkommen <strong>${state.userName}</strong>!<br>`;
    
    if (state.latestProject) {
      html += `Senaste projekt: <strong>${state.latestProject}</strong><br>`;
    }
    
    if (state.monthlyCount > 0) {
      html += `<strong>${state.monthlyCount}</strong> riskbedömningar denna månad`;
    } else {
      html += 'Vad behöver du hjälp med idag?';
    }
    
    greeting.innerHTML = html;
  }

  // ═══════════════════════════════════════════════════════════════
  //  💰 ROT CALCULATOR
  // ═══════════════════════════════════════════════════════════════
  
  function renderROTScreen() {
    const screen = document.getElementById('rot-screen');
    screen.innerHTML = `
      <div class="inner-body">
        <div class="inner-title">💰 ROT-avdragskalkylator</div>
        <div class="inner-sub">Räkna direkt med kunden - spara för senare</div>

        <div class="rot-field">
          <div class="rot-field-label">
            Arbetskostnad (kr)
            <span id="rot-labor-val">${formatNumber(state.rotData.laborCost)} kr</span>
          </div>
          <input type="range" class="rot-slider" id="rot-labor" min="5000" max="100000" step="1000" value="${state.rotData.laborCost}">
        </div>

        <div class="rot-field">
          <div class="rot-field-label">
            Materialkostnad (kr)
            <span id="rot-material-val">${formatNumber(state.rotData.materialCost)} kr</span>
          </div>
          <input type="range" class="rot-slider" id="rot-material" min="0" max="50000" step="1000" value="${state.rotData.materialCost}">
        </div>

        <div class="rot-result-box">
          <div class="rot-result-label">Ditt ROT-avdrag (30%)</div>
          <div class="rot-result-amount" id="rot-saving">4 500 kr</div>
          <div class="rot-result-sub">Du betalar bara <span id="rot-pay">18 500 kr</span></div>
        </div>

        <div class="rot-breakdown">
          <div class="rot-stat">
            <div class="rot-stat-label">Totalkostnad</div>
            <div class="rot-stat-val" id="rot-total">23 000 kr</div>
          </div>
          <div class="rot-stat">
            <div class="rot-stat-label">Efter ROT</div>
            <div class="rot-stat-val" id="rot-final">18 500 kr</div>
          </div>
        </div>

        <button class="awj-btn awj-btn-primary" id="save-rot-btn" style="margin-bottom: 10px;">💾 Spara Kalkyl</button>
        <button class="awj-btn awj-btn-primary" id="create-assessment-rot-btn">📋 Skapa Riskbedömning med ROT</button>
      </div>
    `;
    
    calculateROT();
    
    document.getElementById('rot-labor').addEventListener('input', calculateROT);
    document.getElementById('rot-material').addEventListener('input', calculateROT);
    document.getElementById('save-rot-btn').addEventListener('click', saveROTCalculation);
    document.getElementById('create-assessment-rot-btn').addEventListener('click', createAssessmentWithROT);
  }

  function calculateROT() {
    const laborInput = document.getElementById('rot-labor');
    const materialInput = document.getElementById('rot-material');
    
    if (!laborInput || !materialInput) return;
    
    const labor = parseInt(laborInput.value);
    const material = parseInt(materialInput.value);
    const total = labor + material;
    const saving = Math.round(labor * 0.3);
    const finalPrice = total - saving;

    state.rotData.laborCost = labor;
    state.rotData.materialCost = material;

    document.getElementById('rot-labor-val').textContent = formatNumber(labor) + ' kr';
    document.getElementById('rot-material-val').textContent = formatNumber(material) + ' kr';
    document.getElementById('rot-saving').textContent = formatNumber(saving) + ' kr';
    document.getElementById('rot-pay').textContent = formatNumber(finalPrice) + ' kr';
    document.getElementById('rot-total').textContent = formatNumber(total) + ' kr';
    document.getElementById('rot-final').textContent = formatNumber(finalPrice) + ' kr';
  }

  async function saveROTCalculation() {
    const projectName = prompt('Projekt/Kund namn:');
    if (!projectName) return;
    
    try {
      const labor = state.rotData.laborCost;
      const material = state.rotData.materialCost;
      const total = labor + material;
      const saving = Math.round(labor * 0.3);
      const finalPrice = total - saving;
      
      const { error } = await supabaseClient
        .from('rot_calculations')
        .insert({
          user_id: state.user.id,
          project_name: projectName,
          labor_cost: labor,
          material_cost: material,
          rot_saving: saving,
          total_cost: total,
          final_price: finalPrice
        });
      
      if (error) throw error;
      
      alert('✓ ROT-kalkyl sparad!');
      
    } catch (error) {
      console.error('Error saving ROT:', error);
      alert('⚠️ Kunde inte spara kalkyl');
    }
  }

  function createAssessmentWithROT() {
    navigateToIntranet('dashboard', {
      rotLaborCost: state.rotData.laborCost,
      rotMaterialCost: state.rotData.materialCost
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  🔍 SEARCH
  // ═══════════════════════════════════════════════════════════════
  
  function renderSearchScreen() {
    const screen = document.getElementById('search-screen');
    screen.innerHTML = `
      <div class="inner-body">
        <div class="inner-title">🔍 Sök i kunskapsbas</div>
        <div class="inner-sub">Hitta dokument, regelverk och guider</div>

        <div class="awj-input-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input type="text" class="awj-input" id="search-input" placeholder="Sök efter dokument, regelverk...">
        </div>

        <div id="search-results"></div>
      </div>
    `;
    
    document.getElementById('search-input').addEventListener('input', performSearch);
  }

  async function performSearch(e) {
    const query = e.target.value.trim();
    const resultsDiv = document.getElementById('search-results');
    
    if (query.length < 2) {
      resultsDiv.innerHTML = '';
      return;
    }
    
    try {
      const { data, error } = await supabaseClient
        .from('knowledge_base')
        .select('*')
        .eq('active', true)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(10);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        resultsDiv.innerHTML = '<div style="text-align: center; padding: 40px 20px; color: #666; font-size: 13px;">Inga resultat hittades</div>';
        return;
      }
      
      let html = '<div style="margin-top: 16px;">';
      html += `<div style="font-size: 11px; color: #666; margin-bottom: 12px; font-weight: 700;">RESULTAT (${data.length})</div>`;
      
      data.forEach(doc => {
        const preview = doc.content.substring(0, 100) + '...';
        html += `
          <div class="search-result" data-doc-id="${doc.id}">
            <div class="search-result-title">📄 ${doc.title}</div>
            <div class="search-result-category">${doc.category || 'Allmänt'}</div>
            <div class="search-result-preview">${preview}</div>
          </div>
        `;
      });
      
      html += '</div>';
      resultsDiv.innerHTML = html;
      
      document.querySelectorAll('.search-result').forEach(el => {
        el.addEventListener('click', function() {
          const docId = this.getAttribute('data-doc-id');
          const doc = data.find(d => d.id === docId);
          showDocumentModal(doc);
        });
      });
      
    } catch (error) {
      console.error('Search error:', error);
      resultsDiv.innerHTML = '<div style="text-align: center; padding: 40px 20px; color: #ef4444; font-size: 13px;">⚠️ Kunde inte söka</div>';
    }
  }

  function showDocumentModal(doc) {
    alert(`📄 ${doc.title}\n\n${doc.content.substring(0, 500)}...\n\n[Visa hela dokumentet i intranätet för fullständig vy]`);
  }

  // ═══════════════════════════════════════════════════════════════
  //  ✅ CHECKLISTS
  // ═══════════════════════════════════════════════════════════════
  
  function renderChecklistsScreen() {
    const screen = document.getElementById('checklists-screen');
    screen.innerHTML = `
      <div class="inner-body">
        <div class="inner-title">✅ Checklistor</div>
        <div class="inner-sub">Välj typ av projekt</div>

        <div class="chip-grid">
          <div class="chip" data-checklist="laddbox">
            <div class="chip-icon">🔌</div>
            <div class="chip-label">Laddbox</div>
            <div class="chip-sub">Installation</div>
          </div>

          <div class="chip" data-checklist="smart_hem">
            <div class="chip-icon">🏠</div>
            <div class="chip-label">Smart Hem</div>
            <div class="chip-sub">Automation</div>
          </div>

          <div class="chip" data-checklist="belysning">
            <div class="chip-icon">💡</div>
            <div class="chip-label">Belysning</div>
            <div class="chip-sub">Ljusdesign</div>
          </div>

          <div class="chip" data-checklist="larm">
            <div class="chip-icon">🔒</div>
            <div class="chip-label">Larm</div>
            <div class="chip-sub">Säkerhet</div>
          </div>

          <div class="chip" data-checklist="allmant">
            <div class="chip-icon">⚡</div>
            <div class="chip-label">Allmänt El</div>
            <div class="chip-sub">Installation</div>
          </div>

          <div class="chip" data-checklist="custom">
            <div class="chip-icon">➕</div>
            <div class="chip-label">Skapa Egen</div>
            <div class="chip-sub">Custom</div>
          </div>
        </div>

        <div id="custom-checklists-container"></div>
      </div>
    `;
    
    document.querySelectorAll('.chip[data-checklist]').forEach(chip => {
      chip.addEventListener('click', function() {
        const checklistId = this.getAttribute('data-checklist');
        if (checklistId === 'custom') {
          createCustomChecklist();
        } else {
          viewChecklist(checklistId);
        }
      });
    });
    
    loadCustomChecklists();
  }

  async function loadCustomChecklists() {
    try {
      const { data, error } = await supabaseClient
        .from('custom_checklists')
        .select('*')
        .eq('user_id', state.user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const container = document.getElementById('custom-checklists-container');
        let html = '<div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e5e5;">';
        html += '<div style="font-size: 11px; font-weight: 800; color: #666; text-transform: uppercase; margin-bottom: 12px;">EGNA CHECKLISTOR</div>';
        html += '<div class="chip-grid">';
        
        data.forEach(list => {
          html += `
            <div class="chip" data-custom-id="${list.id}">
              <div class="chip-icon">${list.icon || '📋'}</div>
              <div class="chip-label">${list.name}</div>
              <div class="chip-sub">Custom</div>
            </div>
          `;
        });
        
        html += '</div></div>';
        container.innerHTML = html;
        
        document.querySelectorAll('.chip[data-custom-id]').forEach(chip => {
          chip.addEventListener('click', function() {
            const customId = this.getAttribute('data-custom-id');
            alert('Custom checklist - implement if needed: ' + customId);
          });
        });
      }
    } catch (error) {
      console.error('Error loading custom checklists:', error);
    }
  }

  function createCustomChecklist() {
    const name = prompt('Namn på checklist:');
    if (!name) return;
    
    const itemsText = prompt('Lista punkter (en per rad):');
    if (!itemsText) return;
    
    const items = itemsText.split('\n').filter(i => i.trim());
    
    if (items.length === 0) {
      alert('⚠️ Du måste ange minst en punkt');
      return;
    }
    
    supabaseClient
      .from('custom_checklists')
      .insert({
        user_id: state.user.id,
        name: name,
        items: JSON.stringify([{ title: 'Allmänt', items: items }])
      })
      .then(({ error }) => {
        if (error) {
          console.error('Error creating checklist:', error);
          alert('⚠️ Kunde inte skapa checklist');
        } else {
          alert('✓ Checklist skapad!');
          loadCustomChecklists();
        }
      });
  }

  function viewChecklist(checklistId) {
    state.currentChecklist = checklistId;
    const checklist = CHECKLISTS[checklistId];
    
    if (!checklist) return;
    
    const screen = document.getElementById('checklist-view-screen');
    const savedProgress = JSON.parse(localStorage.getItem(`checklist_${checklistId}`) || '{}');
    
    let html = `
      <div class="inner-body">
        <div class="inner-title">${checklist.icon} ${checklist.name}</div>
        <div class="inner-sub">Bocka av när klart</div>
    `;
    
    checklist.sections.forEach((section, sIdx) => {
      const checkedCount = section.items.filter((_, iIdx) => savedProgress[`${sIdx}-${iIdx}`]).length;
      const total = section.items.length;
      
      html += `
        <div class="checklist-section">
          <div class="checklist-section-title">
            ${section.title === 'Pre-Installation' ? '✓' : section.title === 'Installation' ? '⚙️' : '📋'} ${section.title} (${checkedCount}/${total})
          </div>
      `;
      
      section.items.forEach((item, iIdx) => {
        const key = `${sIdx}-${iIdx}`;
        const checked = savedProgress[key] || false;
        
        html += `
          <div class="checklist-item ${checked ? 'checked' : ''}" data-key="${key}">
            <div class="checklist-checkbox">${checked ? '✓' : ''}</div>
            <div class="checklist-text">${item}</div>
          </div>
        `;
      });
      
      html += '</div>';
    });
    
    html += `
        <button class="awj-btn awj-btn-primary" id="reset-checklist-btn" style="margin-top: 10px;">🔄 Återställ Alla</button>
        <button class="awj-btn awj-btn-primary" id="create-from-checklist-btn">📋 Skapa Riskbedömning</button>
      </div>
    `;
    
    screen.innerHTML = html;
    
    document.querySelectorAll('.checklist-item').forEach(item => {
      item.addEventListener('click', function() {
        const key = this.getAttribute('data-key');
        toggleChecklistItem(checklistId, key, this);
      });
    });
    
    document.getElementById('reset-checklist-btn').addEventListener('click', function() {
      if (confirm('Återställa hela checklistan?')) {
        localStorage.removeItem(`checklist_${checklistId}`);
        viewChecklist(checklistId);
      }
    });
    
    document.getElementById('create-from-checklist-btn').addEventListener('click', function() {
      navigateToIntranet('dashboard', {
        checklistType: checklist.name
      });
    });
    
    goToScreen('checklist-view');
  }

  function toggleChecklistItem(checklistId, key, element) {
    const savedProgress = JSON.parse(localStorage.getItem(`checklist_${checklistId}`) || '{}');
    savedProgress[key] = !savedProgress[key];
    localStorage.setItem(`checklist_${checklistId}`, JSON.stringify(savedProgress));
    
    if (savedProgress[key]) {
      element.classList.add('checked');
      element.querySelector('.checklist-checkbox').textContent = '✓';
    } else {
      element.classList.remove('checked');
      element.querySelector('.checklist-checkbox').textContent = '';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  📊 STATS
  // ═══════════════════════════════════════════════════════════════
  
  async function renderStatsScreen() {
    const screen = document.getElementById('stats-screen');
    screen.innerHTML = `
      <div class="inner-body">
        <div class="inner-title">📊 Din Statistik</div>
        <div class="inner-sub">Översikt över ditt arbete</div>
        <div id="stats-content">Laddar statistik...</div>
      </div>
    `;
    
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { count: thisMonth } = await supabaseClient
        .from('assessments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', state.user.id)
        .gte('created_at', startOfMonth.toISOString());
      
      const { count: total } = await supabaseClient
        .from('assessments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', state.user.id);
      
      const { data: recent } = await supabaseClient
        .from('assessments')
        .select('project_name, created_at, work_description')
        .eq('user_id', state.user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      const { data: all } = await supabaseClient
        .from('assessments')
        .select('work_description')
        .eq('user_id', state.user.id);
      
      const keywords = {};
      if (all) {
        all.forEach(a => {
          const desc = (a.work_description || '').toLowerCase();
          if (desc.includes('laddbox')) keywords['🔌 Laddbox'] = (keywords['🔌 Laddbox'] || 0) + 1;
          if (desc.includes('smart hem') || desc.includes('smarta')) keywords['🏠 Smart Hem'] = (keywords['🏠 Smart Hem'] || 0) + 1;
          if (desc.includes('belysning') || desc.includes('ljus')) keywords['💡 Belysning'] = (keywords['💡 Belysning'] || 0) + 1;
          if (desc.includes('larm')) keywords['🔒 Larm'] = (keywords['🔒 Larm'] || 0) + 1;
        });
      }
      
      const sorted = Object.entries(keywords).sort((a, b) => b[1] - a[1]).slice(0, 3);
      const totalKeywords = Object.values(keywords).reduce((sum, val) => sum + val, 0);
      
      let html = `
        <div style="margin-bottom: 16px;">
          <div style="font-size: 11px; font-weight: 800; color: #666; text-transform: uppercase; margin-bottom: 12px;">DENNA MÅNAD</div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${thisMonth || 0}</div>
              <div class="stat-label">Riskbedömningar</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${thisMonth || 0}</div>
              <div class="stat-label">Projekt</div>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <div style="font-size: 11px; font-weight: 800; color: #666; text-transform: uppercase; margin-bottom: 12px;">TOTALT</div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${total || 0}</div>
              <div class="stat-label">Riskbedömningar</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${total || 0}</div>
              <div class="stat-label">Projekt</div>
            </div>
          </div>
        </div>
      `;
      
      if (sorted.length > 0) {
        html += `
          <div style="margin-bottom: 16px;">
            <div class="stat-list">
              <div class="stat-list-title">Vanligaste projekt</div>
        `;
        
        sorted.forEach(([name, count]) => {
          const percent = totalKeywords > 0 ? Math.round((count / totalKeywords) * 100) : 0;
          html += `<div class="stat-list-item"><span>${name}</span><span>${percent}%</span></div>`;
        });
        
        html += `</div></div>`;
      }
      
      if (recent && recent.length > 0) {
        html += `
          <div>
            <div class="stat-list">
              <div class="stat-list-title">Senaste 5 projekt</div>
        `;
        
        recent.forEach(r => {
          const date = new Date(r.created_at);
          const formatted = `${date.getDate()} ${['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'][date.getMonth()]}`;
          html += `<div class="stat-list-item"><span>${r.project_name}</span><span>${formatted}</span></div>`;
        });
        
        html += `</div></div>`;
      }
      
      document.getElementById('stats-content').innerHTML = html;
      
    } catch (error) {
      console.error('Error loading stats:', error);
      document.getElementById('stats-content').innerHTML = '<div style="text-align: center; padding: 40px 20px; color: #ef4444;">⚠️ Kunde inte ladda statistik</div>';
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  📞 CONTACTS
  // ═══════════════════════════════════════════════════════════════
  
  async function renderContactsScreen() {
    const screen = document.getElementById('contacts-screen');
    screen.innerHTML = `
      <div class="inner-body">
        <div class="inner-title">📞 Snabbkontakter</div>
        <div class="inner-sub">Team, kontor och externa</div>
        <div id="contacts-content">Laddar kontakter...</div>
      </div>
    `;
    
    let html = '';
    
    html += '<div style="font-size: 11px; font-weight: 800; color: #666; text-transform: uppercase; margin-bottom: 12px;">TEAMET</div>';
    
    TEAM_CONTACTS.forEach(contact => {
      html += `
        <div class="contact-card">
          <div class="contact-head">
            <div class="contact-av">${contact.initial}</div>
            <div>
              <div class="contact-name">${contact.name}</div>
              <div class="contact-role">${contact.role}</div>
            </div>
          </div>
          <div class="contact-links">
            <a href="tel:${contact.phone}" class="contact-link">
              📞 ${contact.phone}
            </a>
          </div>
        </div>
      `;
    });
    
    html += '<div style="font-size: 11px; font-weight: 800; color: #666; text-transform: uppercase; margin: 20px 0 12px;">KONTOR</div>';
    
    COMPANY_CONTACTS.forEach(contact => {
      html += `
        <div class="contact-card">
          <div class="contact-head">
            <div class="contact-av">${contact.icon}</div>
            <div>
              <div class="contact-name">${contact.name}</div>
              <div class="contact-role">${contact.address}</div>
            </div>
          </div>
          <div class="contact-links">
            <a href="mailto:${contact.email}" class="contact-link">
              📧 ${contact.email}
            </a>
          </div>
        </div>
      `;
    });
    
    html += '<div style="font-size: 11px; font-weight: 800; color: #666; text-transform: uppercase; margin: 20px 0 12px;">EGNA KONTAKTER</div>';
    html += '<div id="custom-contacts-list"></div>';
    html += '<button class="awj-btn awj-btn-primary" id="add-contact-btn" style="margin-top: 10px;">➕ Lägg till kontakt</button>';
    
    document.getElementById('contacts-content').innerHTML = html;
    
    loadCustomContacts();
    
    document.getElementById('add-contact-btn').addEventListener('click', addCustomContact);
  }

  async function loadCustomContacts() {
    try {
      const { data, error } = await supabaseClient
        .from('quick_contacts')
        .select('*')
        .eq('user_id', state.user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const container = document.getElementById('custom-contacts-list');
      
      if (!data || data.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">Inga egna kontakter ännu</div>';
        return;
      }
      
      let html = '';
      data.forEach(contact => {
        html += `
          <div class="contact-card">
            <div class="contact-head">
              <div class="contact-av">⚡</div>
              <div style="flex: 1;">
                <div class="contact-name">${contact.name}</div>
                ${contact.notes ? `<div class="contact-role">${contact.notes}</div>` : ''}
              </div>
              <div class="contact-delete" data-contact-id="${contact.id}">🗑️</div>
            </div>
            <div class="contact-links">
              ${contact.phone ? `<a href="tel:${contact.phone}" class="contact-link">📞 ${contact.phone}</a>` : ''}
              ${contact.email ? `<a href="mailto:${contact.email}" class="contact-link">📧 ${contact.email}</a>` : ''}
            </div>
          </div>
        `;
      });
      
      container.innerHTML = html;
      
      document.querySelectorAll('.contact-delete').forEach(btn => {
        btn.addEventListener('click', function() {
          const id = this.getAttribute('data-contact-id');
          deleteCustomContact(id);
        });
      });
      
    } catch (error) {
      console.error('Error loading custom contacts:', error);
    }
  }

  async function addCustomContact() {
    const name = prompt('Namn:');
    if (!name) return;
    
    const phone = prompt('Telefon (valfritt):');
    const email = prompt('Email (valfritt):');
    const notes = prompt('Anteckningar (valfritt):');
    
    try {
      const { error } = await supabaseClient
        .from('quick_contacts')
        .insert({
          user_id: state.user.id,
          name: name,
          phone: phone || null,
          email: email || null,
          notes: notes || null
        });
      
      if (error) throw error;
      
      loadCustomContacts();
      
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('⚠️ Kunde inte lägga till kontakt');
    }
  }

  async function deleteCustomContact(id) {
    if (!confirm('Ta bort denna kontakt?')) return;
    
    try {
      const { error } = await supabaseClient
        .from('quick_contacts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      loadCustomContacts();
      
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('⚠️ Kunde inte ta bort kontakt');
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  🏗️ HTML STRUCTURE
  // ═══════════════════════════════════════════════════════════════
  
  var container = document.createElement('div');
  container.id = 'awj-widget-container';
  container.innerHTML = `
    <div id="awj-launcher">
      <svg class="awj-chat" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <svg class="awj-close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display: none;">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </div>

    <div id="awj-widget">
      <div class="awj-header">
        <div class="awj-header-left">
          <div class="awj-back">←</div>
          <div class="awj-logo">
            <div class="awj-logo-text">AWJ</div>
          </div>
          <div class="awj-divider"></div>
          <div class="awj-header-sub">
            <div class="awj-title">ELTEKNIK AB</div>
            <div class="awj-status">
              <div class="awj-dot"></div>
              <div class="awj-status-text">ONLINE NU</div>
            </div>
          </div>
        </div>
      </div>

      <div class="awj-progress">
        <div class="awj-progress-fill" style="width: 0%"></div>
      </div>

      <div class="awj-content">
        <div class="awj-screen active" data-screen="home">
          <div class="home-body">
            <div class="home-greeting" id="home-greeting">
              👋 Laddar...
            </div>

            <div class="home-grid">
              <div class="home-card" data-action="new-assessment">
                <div class="card-icon-wrap"><div class="card-icon">📋</div></div>
                <div>
                  <div class="card-label">Ny Riskbed.</div>
                  <div class="card-sub">Skapa ny</div>
                </div>
              </div>

              <div class="home-card" data-action="saved-assessments">
                <div class="card-icon-wrap"><div class="card-icon">📚</div></div>
                <div>
                  <div class="card-label">Mina Bedömn.</div>
                  <div class="card-sub">Visa sparade</div>
                </div>
              </div>

              <div class="home-card" data-action="rot">
                <div class="card-icon-wrap"><div class="card-icon">💰</div></div>
                <div>
                  <div class="card-label">ROT-kalkyl</div>
                  <div class="card-sub">Räkna avdrag</div>
                </div>
              </div>

              <div class="home-card" data-action="chat">
                <div class="card-icon-wrap"><div class="card-icon">💬</div></div>
                <div>
                  <div class="card-label">AI Chat</div>
                  <div class="card-sub">Fråga AI</div>
                </div>
              </div>

              <div class="home-card" data-action="search">
                <div class="card-icon-wrap"><div class="card-icon">🔍</div></div>
                <div>
                  <div class="card-label">Sök Kunskap</div>
                  <div class="card-sub">Hitta dokument</div>
                </div>
              </div>

              <div class="home-card" data-action="checklists">
                <div class="card-icon-wrap"><div class="card-icon">✅</div></div>
                <div>
                  <div class="card-label">Checklistor</div>
                  <div class="card-sub">Projektmallar</div>
                </div>
              </div>

              <div class="home-card" data-action="stats">
                <div class="card-icon-wrap"><div class="card-icon">📊</div></div>
                <div>
                  <div class="card-label">Statistik</div>
                  <div class="card-sub">Din översikt</div>
                </div>
              </div>

              <div class="home-card" data-action="contacts">
                <div class="card-icon-wrap"><div class="card-icon">📞</div></div>
                <div>
                  <div class="card-label">Kontakter</div>
                  <div class="card-sub">Snabbval</div>
                </div>
              </div>
            </div>
          </div>

          <div class="awj-footer">
            <div class="awj-footer-text">
              <div class="awj-pdot"></div>
              AWJ Verktygslåda
            </div>
          </div>
        </div>

        <div class="awj-screen" data-screen="rot" id="rot-screen"></div>
        <div class="awj-screen" data-screen="search" id="search-screen"></div>
        <div class="awj-screen" data-screen="checklists" id="checklists-screen"></div>
        <div class="awj-screen" data-screen="checklist-view" id="checklist-view-screen"></div>
        <div class="awj-screen" data-screen="stats" id="stats-screen"></div>
        <div class="awj-screen" data-screen="contacts" id="contacts-screen"></div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  // ═══════════════════════════════════════════════════════════════
  //  🎬 EVENT LISTENERS & INITIALIZATION
  // ═══════════════════════════════════════════════════════════════
  
  document.getElementById('awj-launcher').addEventListener('click', function() {
    var widget = document.getElementById('awj-widget');
    var launcher = document.getElementById('awj-launcher');
    
    if (widget.classList.contains('visible')) {
      widget.classList.remove('visible');
      launcher.classList.remove('open');
    } else {
      widget.classList.add('visible');
      launcher.classList.add('open');
    }
  });

  document.querySelector('.awj-back').addEventListener('click', function() {
    if (state.currentScreen === 'checklist-view') {
      goToScreen('checklists', true);
    } else {
      goToScreen('home', true);
    }
  });

  document.querySelectorAll('.home-card').forEach(function(card) {
    card.addEventListener('click', function() {
      var action = this.getAttribute('data-action');
      
      switch(action) {
        case 'new-assessment':
          navigateToIntranet('dashboard');
          break;
        case 'saved-assessments':
          navigateToIntranet('saved-assessments');
          break;
        case 'rot':
          renderROTScreen();
          goToScreen('rot');
          break;
        case 'chat':
          navigateToIntranet('chat');
          break;
        case 'search':
          renderSearchScreen();
          goToScreen('search');
          break;
        case 'checklists':
          renderChecklistsScreen();
          goToScreen('checklists');
          break;
        case 'stats':
          renderStatsScreen();
          goToScreen('stats');
          break;
        case 'contacts':
          renderContactsScreen();
          goToScreen('contacts');
          break;
      }
    });
  });

  loadHomeData();

  console.log('✓ AWJ Intern Widget loaded!');

})();
