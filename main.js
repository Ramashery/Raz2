// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAT4dDEIDUtzP60ibjahO06P75Q6h95ZN4",
  authDomain: "razrabotka-b61bc.firebaseapp.com",
  projectId: "razrabotka-b61bc",
  storageBucket: "razrabotka-b61bc.firebasestorage.app",
  messagingSenderId: "394402564794",
  appId: "1:394402564794:web:f610ffb03e655c600c5083"
};

let db;
let siteData = {};
const initialSiteData = {
    home: { h1: "Web Development", subtitle: "", lang: "en" },
    services: [], portfolio: [], blog: [], contact: []
};
const langNames = { en: 'English', ka: 'Georgian', ua: 'Ukrainian', ru: 'Russian' };
const langOrder = ['en', 'ka', 'ua', 'ru'];

const mainContentEl = document.querySelector('main');

// --- 2. INITIALIZATION ---
async function initApp() { 
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore(); 
    
    initStaticEventListeners(); 
    
    const isStaticPage = document.body.dataset.staticPage === 'true'; 
    if (isStaticPage) { 
        hydrateStaticPage();
    } else { 
        try { 
            siteData = await loadData(); 
            renderMenu(); 
            routeAndRender(); 
            mainContentEl.classList.remove('loading'); 
            const loader = document.getElementById('loader'); 
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => loader.style.display = 'none', 500);
            }
        } catch (error) { 
            console.error("Critical Load Error:", error); 
        } 
    } 
}

// --- 3. DATA LOADING ---
async function loadData() {
    const freshSiteData = {};
    try {
        const collections = ['services', 'portfolio', 'blog', 'contact'];
        const dataPromises = [
            db.collection('home').doc('content').get(),
            ...collections.map(col => db.collection(col).get())
        ];
        const [homeDoc, ...snapshots] = await Promise.all(dataPromises);
        
        freshSiteData.home = homeDoc.exists ? homeDoc.data() : initialSiteData.home;
        collections.forEach((col, index) => {
            freshSiteData[col] = snapshots[index].docs.map(doc => ({ 
                id: doc.id, 
                collection_name: col,
                ...doc.data() 
            }));
        });
        return freshSiteData;
    } catch (error) {
        console.error("Firebase connection failed:", error);
        return initialSiteData;
    }
}

// --- 4. RENDERING HOME PAGE ---
function renderHomePage() {
    const home = siteData.home || {};
    
    mainContentEl.innerHTML = `
        <section id="hero" class="hero">
            <h1 class="animate-always">${home.h1 || 'Web Development & SEO'}</h1>
            <div class="hero-subtitle-container animate-always">
                <div>${home.subtitle || ''}</div>
                <ul class="hero-contact-list">
                    <li><a href="https://wa.me/79119396075" target="_blank">WhatsApp</a></li>
                    <li><a href="https://t.me/ramashery" target="_blank">Telegram</a></li>
                    <li><a href="tel:+995591102653">+995 591 102 653</a></li>
                </ul>
            </div>
        </section>
        <section id="services"></section>
        <section id="portfolio"></section>
        <section id="blog"></section>
        <section id="contact"></section>
    `;

    renderSeoTags(home);
    applyCustomBackground(home);
    
    ['services', 'portfolio', 'blog', 'contact'].forEach(key => {
        renderSection(key, `Our ${key.charAt(0).toUpperCase() + key.slice(1)}`, siteData[key]);
    });

    initDesktopCarousels();
    initMobileSliders();
}

// --- 5. RENDERING SECTIONS (SLIDERS) ---
function renderSection(key, title, items) {
    const section = document.getElementById(key);
    if (!section || !items || items.length === 0) return;

    const itemsByLang = {};
    items.forEach(i => { if(!itemsByLang[i.lang]) itemsByLang[i.lang] = []; itemsByLang[i.lang].push(i); });

    const desktopHTML = langOrder.map(lang => {
        const langItems = itemsByLang[lang];
        if (!langItems) return '';
        const slides = [];
        for (let i = 0; i < langItems.length; i += 3) slides.push(langItems.slice(i, i + 3));

        const slidesHTML = slides.map((slide, idx) => `
            <div class="desktop-grid-slide ${idx === 0 ? 'active' : ''}">
                ${slide.map(item => `
                    <a href="/en/${key}/${item.urlSlug}/" class="item-card">
                        <div class="item-card__image" style="background-image: url('${(item.media || [])[0] || ''}')"></div>
                        <div class="item-card__content">
                            <h3>${item.title}</h3>
                            <div class="card-subtitle">${item.subtitle}</div>
                            <p>${item.description}</p>
                        </div>
                    </a>
                `).join('')}
            </div>
        `).join('');

        const dots = slides.length > 1 ? `<div class="desktop-slider-nav">${slides.map((_, i) => `<span class="desktop-slider-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}</div>` : '';
        return `<div class="desktop-language-group">
                    <h4 class="desktop-lang-title">${langNames[lang] || lang}</h4>
                    <div class="desktop-carousel-container">${slidesHTML}</div>
                    ${dots}
                </div>`;
    }).join('');

    const mobileHTML = langOrder.map(lang => {
        const langItems = itemsByLang[lang];
        if (!langItems) return '';
        const slidesHTML = langItems.map((item, idx) => `
            <div class="item-card ${idx === 0 ? 'active' : ''}">
                <div class="item-card__image" style="background-image: url('${(item.media || [])[0] || ''}')"></div>
                <div class="item-card__content">
                    <h3>${item.title}</h3>
                    <div class="card-subtitle">${item.subtitle}</div>
                    <p>${item.description}</p>
                </div>
            </div>
        `).join('');
        const dots = langItems.length > 1 ? `<div class="slider-nav">${langItems.map((_, i) => `<span class="slider-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}</div>` : '';
        return `<div class="language-slider-block">
                    <div class="cross-fade-slider">${slidesHTML}</div>
                    <div class="slider-nav">${dots}</div>
                </div>`;
    }).join('');

    section.innerHTML = `<div class="animated-container"><h2>${title}</h2></div><div class="desktop-grid-wrapper">${desktopHTML}</div><div class="mobile-sliders-container">${mobileHTML}</div>`;
}

// --- 6. SLIDERS LOGIC ---
function initDesktopCarousels() {
    document.querySelectorAll('.desktop-carousel-container').forEach(c => {
        const slides = c.querySelectorAll('.desktop-grid-slide');
        const dots = c.parentElement.querySelectorAll('.desktop-slider-dot');
        dots.forEach(dot => dot.onclick = () => {
            const i = parseInt(dot.dataset.index);
            slides.forEach((s, idx) => s.classList.toggle('active', idx === i));
            dots.forEach((d, idx) => d.classList.toggle('active', idx === i));
        });
    });
}

function initMobileSliders() {
    document.querySelectorAll('.language-slider-block').forEach(b => {
        const slides = b.querySelectorAll('.item-card');
        const dots = b.querySelectorAll('.slider-dot');
        dots.forEach(dot => dot.onclick = () => {
            const i = parseInt(dot.dataset.index);
            slides.forEach((s, idx) => s.classList.toggle('active', idx === i));
            dots.forEach((d, idx) => d.classList.toggle('active', idx === i));
        });
    });
}

// --- 7. DETAIL PAGE RENDERING ---
function formatContentHtml(content) {
    if (!content) return '';
    let processedContent = content.replace(/\r\n/g, '\n');
    const blocks = processedContent.split(/\n{2,}/);
    
    return blocks.map(block => {
        const trimmed = block.trim();
        if (!trimmed) return '';

        const youtubeRegex = /^https?:\/\/(?:www\.|m\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch?v=|watch\?.*&v=|shorts\/))([a-zA-Z0-9_-]{11}).*$/;
        const imageRegex = /^https?:\/\/[^<>"']+\.(?:jpg|jpeg|png|gif|webp|svg)\s*$/i;
        
        const youtubeMatch = trimmed.match(youtubeRegex);
        const imageMatch = trimmed.match(imageRegex);

        if (/^<(p|div|h[1-6]|ul|ol|li|blockquote|hr|table|pre)/i.test(trimmed)) {
            return trimmed;
        } else if (youtubeMatch && youtubeMatch[1]) {
            return `<div class="embedded-video" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: 1.5em 0; border-radius: 4px; border: 1px solid var(--color-border);"><iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" src="https://www.youtube.com/embed/${youtubeMatch[1]}" frameborder="0" allowfullscreen></iframe></div>`;
        } else if (imageMatch) {
            return `<p><img src="${trimmed}" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid var(--color-border);"></p>`;
        } else {
            return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
        }
    }).join('');
}

function renderDetailPage(collection, slug, lang) {
    const item = siteData[collection]?.find(d => d.urlSlug === slug && d.lang === lang);
    if (!item) {
        mainContentEl.innerHTML = `<section><h1>404 - Not Found</h1><a href="/">Go Home</a></section>`;
        return;
    }
    renderSeoTags(item);
    applyCustomBackground(item);
    
    mainContentEl.innerHTML = `
        <article>
            <div class="detail-page-header">
                <h1 class="animate-always is-visible">${item.h1 || item.title}</h1>
                ${item.price ? `<div class="detail-price">${item.price}</div>` : ''}
            </div>
            <div class="detail-content">${formatContentHtml(item.mainContent)}</div>
        </article>
    `;
    setupObservers();
}

// --- 8. UTILS & NAVIGATION ---
function applyCustomBackground(item = null) {
    const iframe = document.getElementById('custom-background-iframe');
    const code = item?.backgroundHtml || siteData.home?.backgroundHtml || '';
    if (iframe && code.trim()) {
        iframe.srcdoc = code; iframe.style.display = 'block';
        setTimeout(() => iframe.classList.add('is-visible'), 500);
    } else if (iframe) {
        iframe.style.display = 'none'; iframe.classList.remove('is-visible');
    }
}

function renderMenu() {
    const el = document.querySelector('.nav-menu');
    const items = [
        { label: 'Home', href: '/' }, { label: 'Services', href: '/#services' },
        { label: 'Portfolio', href: '/#portfolio' }, { label: 'Blog', href: '/#blog' }
    ];
    if (el) el.innerHTML = items.map(i => `<li><a href="${i.href}">${i.label}</a></li>`).join('');
}

function initStaticEventListeners() {
    const btn = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav-overlay');
    if (btn) btn.onclick = () => {
        document.body.classList.toggle('nav-is-open');
        btn.classList.toggle('is-active'); nav.classList.toggle('is-active');
    };
    document.body.addEventListener('click', e => {
        const a = e.target.closest('a');
        if (a && a.href.includes(window.location.origin) && !a.hash && !a.target) {
            e.preventDefault(); 
            window.history.pushState({}, '', a.href); 
            routeAndRender(); 
            window.scrollTo(0,0);
        }
    });
    window.onpopstate = () => routeAndRender();
}

function routeAndRender() {
    const path = window.location.pathname;
    const match = path.match(/^\/(?:([a-z]{2})\/)?(services|portfolio|blog|contact)\/([a-zA-Z0-9-]+)\/?$/);
    if (match) {
        renderDetailPage(match[2], match[3], match[1] || 'en');
    } else {
        renderHomePage();
    }
    setupObservers();
}

function setupObservers() {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.animate-on-scroll, .animate-always, .animated-container, .item-card').forEach(el => obs.observe(el));
}

function hydrateStaticPage() {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
    renderMenu();
    loadData().then(data => { siteData = data; routeAndRender(); });
}

function renderSeoTags(data) {
    document.title = data.seoTitle || "Digital Craft";
    const m = document.querySelector('meta[name="description"]');
    if (m) m.content = data.metaDescription || "";
}

window.addEventListener('DOMContentLoaded', initApp);
