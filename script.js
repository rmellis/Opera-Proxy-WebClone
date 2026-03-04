(() => {
  "use strict";

  const PROXIES = [
    { url: "https://api.allorigins.win/get?url=", type: "json" },
    { url: "https://corsproxy.io/?", type: "raw" },
    { url: "https://api.codetabs.com/v1/proxy?quest=", type: "raw" }
  ];
  
  const HOMEPAGE = "about:speeddial";
  
  const DEFAULTS = {
    favorites: [
      { url: "https://en.uncyclopedia.co/", title: "Uncyclopedia", icon: "https://upload.wikimedia.org/wikipedia/commons/8/80/Wikipedia-logo-v2.svg" },
      { url: "https://www.bing.com/", title: "Bing", icon: "https://upload.wikimedia.org/wikipedia/commons/9/9c/Bing_Fluent_Logo.svg" },
      { url: "https://www.amazon.com", title: "Amazon", icon: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg" },
      { url: "https://kick.com/browse", title: "Kick", icon: "https://emoji.discadia.com/emojis/34d2e9b2-b9bd-4a49-95c0-0f22fb78fc36.PNG" },
      { url: "https://discord.com", title: "Discord", icon: "https://freelogopng.com/images/all_img/1691730813discord-icon-png.png" },
      { url: "https://www.reddit.com", title: "Reddit", icon: "https://www.redditstatic.com/desktop2x/img/favicon/favicon-96x96.png" },
      { url: "https://store.steampowered.com", title: "Steam", icon: "https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg" },
      { url: "https://github.com", title: "GitHub", icon: "https://upload.wikimedia.org/wikipedia/commons/c/c2/GitHub_Invertocat_Logo.svg" }
    ]
  };

  const $ = s => document.querySelector(s);
  const escape = s => (s||"").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  
  function getFavicon(url) {
    if (!url || url.startsWith("about:") || url.startsWith("data:")) return "";
    const fav = favorites.find(f => f.url === url);
    if (fav && fav.icon) return fav.icon;
    try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`; } catch { return ""; }
  }

  function normalizeUrl(input) {
    let s = String(input || "").trim();
    if (!s) return "about:blank";
    if (s === "about:speeddial") return s;
    if (s.startsWith("data:")) return s;
    if (/^https?:\/\//i.test(s)) return s;
    if (s.includes(".") && !s.includes(" ")) return "https://" + s;
    return `https://www.google.com/search?q=${encodeURIComponent(s)}`;
  }

  let tabs = [];
  let activeTabId = null;
  let favorites = [...DEFAULTS.favorites];
  let isLightMode = false;

  async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 8000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  }

  async function raceProxies(targetUrl) {
    const promises = PROXIES.map(async (proxy) => {
      try {
        const res = await fetchWithTimeout(proxy.url + encodeURIComponent(targetUrl));
        if (!res.ok) throw new Error("Status " + res.status);
        let text = "";
        if (proxy.type === "json") {
          const json = await res.json();
          text = json.contents;
        } else {
          text = await res.text();
        }
        if (!text || text.length < 50) throw new Error("Empty content");
        return text; 
      } catch (e) { throw e; }
    });
    return await Promise.any(promises);
  }

  function renderSpeedDial() {
    const view = $("#speed-dial-view");
    const now = new Date();
    const time = now.getHours() + ":" + String(now.getMinutes()).padStart(2, '0');

    const tilesHTML = favorites.map(f => {
      let imgStyle = "";
      if (f.title === "GitHub" && !isLightMode) imgStyle = "filter: invert(1);";
      return `
      <div class="dial-tile" onclick="window.navigateExtern('${f.url}')">
        <div class="dial-preview"><img src="${f.icon}" style="${imgStyle}"></div>
        <div class="dial-label">${f.title}</div>
      </div>`;
    }).join('');

    view.innerHTML = `
      <div class="internal-page">
        <div style="flex:1"></div>
        <div class="clock-widget">${time}</div>
        <div class="search-box" style="margin-bottom:40px;width:600px;background:var(--island-bg);padding:10px;border-radius:24px;display:flex;box-shadow:var(--shadow)">
           <input style="flex:1;background:transparent;border:none;color:inherit;padding:0 10px;font-size:16px;outline:none" placeholder="Search the web" onkeydown="if(event.key==='Enter') window.navigateExtern(this.value)">
        </div>
        <div class="speed-dial-grid">
          ${tilesHTML}
          <div class="dial-tile">
            <div class="dial-preview dial-add">+</div>
            <div class="dial-label">Add a site</div>
          </div>
        </div>
        <div style="flex:2"></div>
      </div>
    `;
  }

  window.navigateExtern = (url) => {
    const t = tabs.find(x => x.id === activeTabId);
    $("#urlbar-input").value = url;
    const normalized = normalizeUrl(url);
    t.historyStack.push(normalized);
    t.historyIdx++;
    navigate(t, normalized);
  };

  async function navigate(tab, url) {
    tab.loading = true;
    tab.url = url;
    updateUI();

    const speedDial = $("#speed-dial-view");
    
    // 1. SPEED DIAL (Transparent Mode)
    if (url === "about:speeddial") {
      speedDial.classList.remove("hidden");
      // Hide all frames
      document.querySelectorAll('.web-frame').forEach(f => f.style.display = 'none');
      renderSpeedDial();
      tab.loading = false;
      updateUI();
      return;
    }

    // 2. REAL SITE (Opaque Mode)
    speedDial.classList.add("hidden");
    
    // Find existing frame or create
    let frame = $(`#frame-${tab.id}`);
    if(!frame) {
       frame = document.createElement("iframe");
       frame.className = "web-frame";
       frame.id = "frame-" + tab.id;
       $("#web-content").appendChild(frame);
    }
    
    // FORCE DISPLAY & WHITE BACKGROUND
    frame.style.display = "block";
    frame.style.background = "#fff"; 

    if (url.startsWith("data:")) {
       frame.src = url;
       finishLoad(tab, "Data");
       return;
    }

    try {
       let content = await raceProxies(url);
       const base = new URL(url).origin;
       if (!content.toLowerCase().includes("<base")) {
         if (content.toLowerCase().includes("<head")) content = content.replace(/<head[^>]*>/i, `$&<base href="${url}">`);
         else content = `<base href="${url}">` + content;
       }
       
       // Inject white background style if missing to prevent transparency
       if (!content.includes("background-color")) {
         content = `<style>body { background-color: white; }</style>` + content;
       }

       frame.srcdoc = content;
       frame.sandbox = "allow-forms allow-scripts allow-popups allow-same-origin allow-modals";
       
       const m = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
       const title = m ? m[1].trim() : new URL(url).hostname;
       finishLoad(tab, title);

    } catch (e) {
       // On error, still show white frame with message
       frame.srcdoc = `<div style="padding:20px;font-family:sans-serif"><h2>Error loading page</h2><p>${e.message}</p></div>`;
       finishLoad(tab, "Error");
    }
  }

  function finishLoad(tab, title) {
    tab.loading = false;
    tab.title = title;
    updateUI();
  }

  function createTab(url = HOMEPAGE) {
    const id = "t-" + Math.random().toString(36).substr(2, 9);
    const tab = { id, url, title: "Speed Dial", loading: false, historyStack: [], historyIdx: -1 };
    tabs.push(tab);
    activateTab(id);
    
    tab.historyStack.push(url);
    tab.historyIdx = 0;
    navigate(tab, url);
  }

  function activateTab(id) {
    activeTabId = id;
    tabs.forEach(t => {
      const f = $(`#frame-${t.id}`);
      if (t.id === id) {
          if (t.url === HOMEPAGE) {
            if(f) f.style.display = 'none';
            $("#speed-dial-view").classList.remove("hidden");
            renderSpeedDial(); 
          } else {
            if(f) f.style.display = 'block';
            $("#speed-dial-view").classList.add("hidden");
          }
      } else {
          if(f) f.style.display = 'none';
      }
    });
    updateUI();
  }

  function closeTab(id) {
    if (tabs.length === 1) { navigate(tabs[0], HOMEPAGE); return; }
    const idx = tabs.findIndex(t => t.id === id);
    const f = $(`#frame-${id}`);
    if(f) f.remove();
    tabs.splice(idx, 1);
    if (activeTabId === id) activateTab(tabs[Math.max(0, idx - 1)].id);
    else updateUI();
  }

  function updateUI() {
    const container = $("#tabs-container");
    container.innerHTML = "";
    
    tabs.forEach(t => {
      const el = document.createElement("div");
      el.className = `tab ${t.id === activeTabId ? 'active' : ''} ${t.loading ? 'loading' : ''}`;
      
      let favSrc = getFavicon(t.url);
      if(t.url === "about:speeddial") favSrc = ""; 

      const imgHtml = favSrc ? `<img class="tab-favicon" src="${favSrc}">` : '';

      el.innerHTML = `
        <div class="tab-icon-area">
          <div class="tab-spinner"></div>
          ${imgHtml}
        </div>
        <span class="tab-title">${escape(t.title)}</span>
        <button class="tab-close" onclick="window.closeTab('${t.id}')">×</button>
      `;
      el.onclick = (e) => { if(!e.target.classList.contains("tab-close")) activateTab(t.id); };
      container.appendChild(el);
    });
    
    const t = tabs.find(x => x.id === activeTabId);
    if (t) {
      $("#urlbar-input").value = t.url === "about:speeddial" ? "" : t.url;
      $("#urlbar-wrapper").classList.toggle("loading", t.loading);
      $("#back-btn").disabled = t.historyIdx <= 0;
      $("#forward-btn").disabled = t.historyIdx >= t.historyStack.length - 1;
    }
  }

  window.closeTab = (id) => { event.stopPropagation(); closeTab(id); };

  $("#new-tab-btn").onclick = $("#menu-new-tab").onclick = () => {
      $("#menu-popup").classList.remove("show");
      createTab(); 
  };
  
  $("#urlbar-input").onkeydown = (e) => {
    if (e.key === "Enter") {
       window.navigateExtern(e.target.value);
    }
  };
  $("#reload-btn").onclick = () => { const t = tabs.find(x => x.id === activeTabId); navigate(t, t.url); };
  $("#back-btn").onclick = () => {
    const t = tabs.find(x => x.id === activeTabId);
    if(t.historyIdx > 0) { t.historyIdx--; navigate(t, t.historyStack[t.historyIdx]); }
  };
  $("#forward-btn").onclick = () => {
    const t = tabs.find(x => x.id === activeTabId);
    if(t.historyIdx < t.historyStack.length-1) { t.historyIdx++; navigate(t, t.historyStack[t.historyIdx]); }
  };
  $("#home-btn").onclick = () => { 
     const t = tabs.find(x => x.id === activeTabId); 
     navigate(t, HOMEPAGE); 
  };

  $("#opera-menu-btn").onclick = (e) => { 
    e.stopPropagation(); 
    $("#menu-popup").classList.toggle("show"); 
  };

  document.addEventListener("click", (e) => {
    if (!$("#opera-menu-btn").contains(e.target) && !$("#menu-popup").contains(e.target)) {
       $("#menu-popup").classList.remove("show");
    }
  });

  $("#menu-theme-toggle").onclick = () => {
      isLightMode = !isLightMode;
      document.body.classList.toggle("light-mode", isLightMode);
      $("#theme-label").textContent = isLightMode ? "Switch to Dark Mode" : "Switch to Light Mode";
      renderSpeedDial();
  };

  createTab(HOMEPAGE);

})();