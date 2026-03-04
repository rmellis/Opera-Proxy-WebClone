# Opera Browser Webapp Clone

A functional, browser-in-a-browser web application inspired by Opera. Built entirely with HTML, CSS, and Vanilla JavaScript, this project features a dynamic tab system, a Speed Dial homepage, and the ability to browse the real web using CORS-bypassing proxies.

## 📸 Screenshots
<img width="3291" height="844" alt="image" src="https://github.com/user-attachments/assets/596b9cf4-09f7-4098-901c-26b61d48fe21" />


---

## ✨ Features

### 🖥️ User Interface
* **Sleek Sidebar:** Includes quick-access shortcuts for workspaces, Messenger, WhatsApp, and settings.
* **Dynamic Tab Management:** Add, switch, and close tabs dynamically. Tabs automatically fetch and display the favicon of the loaded website.
* **Opera Menu:** A popup menu to open new tabs, access history/bookmarks (UI placeholders), and toggle themes.
* **Address Bar:** Features functional back/forward navigation buttons, a reload button, a home button, and a visual loading spinner.
* **Theming:** Fully functional Light Mode and Dark Mode toggle.

### ⚙️ Core Functionality
* **Real Web Browsing:** Uses an `iframe` sandbox combined with public proxies (`allorigins.win`, `corsproxy.io`, `codetabs.com`) to bypass CORS restrictions and load real websites.
* **URL Normalization:** The address bar automatically detects if an input is a URL (adding `https://`) or a search query (redirecting to Google Search).
* **Speed Dial (Homepage):** A customizable starting page (`about:speeddial`) that displays a live clock and shortcut tiles to favorite websites.
* **Per-Tab Navigation History:** Each tab maintains its own isolated history stack, allowing accurate use of the Back and Forward buttons.

---

## 🛠️ Technical Details

### The Proxy Racing System
Because modern web security (CORS, X-Frame-Options) prevents standard `iframe` embedding for most major websites, this application uses a custom `raceProxies` asynchronous function. It simultaneously pings three different public proxies when a user requests a URL. Whichever proxy successfully returns the website's HTML first is used to populate the `srcdoc` of the active tab's iframe.

### Technologies Used
* **HTML5:** Semantic structure and layout.
* **CSS3:** Custom CSS variables for theming, Flexbox/Grid for layout, and modern backdrop filters.
* **Vanilla JavaScript:** ES6 syntax, DOM manipulation, asynchronous `fetch` API, and state management for tabs.

---

## 🚀 Getting Started
Download and do whatever
