const firebaseConfig = {
    apiKey: "AIzaSyAT4dDEIDUtzP60ibjahO06P75Q6h95ZN4",
    authDomain: "razrabotka-b61bc.firebaseapp.com",
    projectId: "razrabotka-b61bc",
    storageBucket: "razrabotka-b61bc.firebasestorage.app",
    messagingSenderId: "394402564794",
    appId: "1:394402564794:web:f610ffb03e655c600c5083"
};

let db, siteData = {};
const mainContentEl = document.querySelector('main');
let floatingObserver, animateOnceObserver, animateAlwaysObserver;

// --- INITIALIZATION ---
async function initApp() {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    initStaticEventListeners();
    
    try {
        siteData = await loadData();
        renderMenu();
        renderHomePage();
        
        mainContentEl.classList.remove('loading');
        const loader = document.getElementById('loader');
        if (loader) { loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 500); }
    } catch (e) { console.error(e); }
}

async function loadData() {
    const fresh = {};
    const cols = ['services', 'portfolio', 'blog', 'contact'];
    const promises = [db.collection('home').doc('content').get(), ...cols.map(c => db.collection(c).get())];
    const [homeDoc, ...snaps] = await Promise.all(promises);
    fresh.home = homeDoc.data() || {};
    cols.forEach((c, i) => { fresh[c] = snaps[i].docs.map(d => ({id: d.id, collection_name: c, ...d.data()})); });
    return fresh;
}

// --- ВЕРНУЛ ОРИГИНАЛЬНУЮ ЛОГИКУ РЕНДЕРИНГА ---
function renderHomePage() {
    const home = siteData.home || {};
    // Вставляем структуру Hero и пустые секции
    mainContentEl.innerHTML = `
        <section id="hero" class="hero">
            <h1 class="animate-always is-visible">${home.h1 || 'Web Development'}</h1>
            <div class="hero-subtitle-container animate-always is-visible">
                <p>${home.subtitle || ''}</p>
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

    applyCustomBackground(home);
    ['services', 'portfolio', 'blog', 'contact'].forEach(key => renderSection(key, `Our ${key}`, siteData[key]));
    
    // ВАЖНО: Запуск оригинальных слайдеров
    initMobileSliders();
    initDesktopCarousels();
    setupObservers();
}

function renderSection(key, title, items) {
    const section = document.getElementById(key);
    if (!section || !items || items.length === 0) return;

    const langOrder = ['en', 'ka', 'ua', 'ru'];
    const langNames = { en: 'English', ka: 'Georgian', ua: 'Ukrainian', ru: 'Russian' };
    const itemsByLang = {};
    items.forEach(i => { if(!itemsByLang[i.lang]) itemsByLang[i.lang] = []; itemsByLang[i.lang].push(i); });

    const desktopHTML = langOrder.map(lang => {
        const langItems = itemsByLang[lang]; if (!langItems) return '';
        const slides = []; for (let i = 0; i < langItems.length; i += 3) slides.push(langItems.slice(i, i + 3));
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
        return `<div class="desktop-language-group"><h4 class="desktop-lang-title">${langNames[lang]}</h4><div class="desktop-carousel-container">${slidesHTML}</div>${dots}</div>`;
    }).join('');

    const mobileHTML = langOrder.map(lang => {
        const langItems = itemsByLang[lang]; if (!langItems) return '';
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
        return `<div class="language-slider-block"><div class="cross-fade-slider">${slidesHTML}</div><div class="slider-nav">${dots}</div></div>`;
    }).join('');

    section.innerHTML = `<div class="animated-container"><h2>${title}</h2></div><div class="desktop-grid-wrapper">${desktopHTML}</div><div class="mobile-sliders-container">${mobileHTML}</div>`;
}

// --- ВОССТАНОВЛЕННЫЕ ОРИГИНАЛЬНЫЕ ФУНКЦИИ СЛАЙДЕРОВ ---
function initDesktopCarousels() {
    document.querySelectorAll('.desktop-carousel-container').forEach(carousel => {
        const slides = carousel.querySelectorAll('.desktop-grid-slide');
        const nav = carousel.nextElementSibling;
        if (!nav || !nav.classList.contains('desktop-slider-nav')) return;
        const dots = nav.querySelectorAll('.desktop-slider-dot');
        dots.forEach(dot => {
            dot.onclick = () => {
                const idx = parseInt(dot.dataset.index);
                slides.forEach((s, i) => s.classList.toggle('active', i === idx));
                dots.forEach((d, i) => d.classList.toggle('active', i === idx));
            };
        });
    });
}

function initMobileSliders() {
    document.querySelectorAll('.language-slider-block').forEach(block => {
        const slides = block.querySelectorAll('.cross-fade-slider .item-card');
        const dots = block.querySelectorAll('.slider-nav .slider-dot');
        dots.forEach(dot => {
            dot.onclick = () => {
                const idx = parseInt(dot.dataset.index);
                slides.forEach((s, i) => s.classList.toggle('active', i === idx));
                dots.forEach((d, i) => d.classList.toggle('active', i === idx));
            };
        });
    });
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (ОРИГИНАЛЬНЫЕ) ---
function applyCustomBackground(item = null) {
    const iframe = document.getElementById('custom-background-iframe');
    const customCode = item?.backgroundHtml || siteData.home?.backgroundHtml || '';
    if (iframe && customCode.trim()) {
        iframe.srcdoc = customCode; iframe.style.display = 'block';
        setTimeout(() => iframe.classList.add('is-visible'), 500);
    }
}

function renderMenu() {
    const menuEl = document.querySelector('.nav-menu');
    const items = [{ label: 'Home', href: '/' }, { label: 'Services', href: '/#services' }, { label: 'Portfolio', href: '/#portfolio' }, { label: 'Blog', href: '/#blog' }];
    if (menuEl) menuEl.innerHTML = items.map(item => `<li><a href="${item.href}">${item.label}</a></li>`).join('');
}

function initStaticEventListeners() {
    const btn = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav-overlay');
    if (btn) btn.onclick = () => { document.body.classList.toggle('nav-is-open'); btn.classList.toggle('is-active'); nav.classList.toggle('is-active'); };
}

function setupObservers() {
    const obs = new IntersectionObserver(es => {
        es.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.animate-on-scroll, .animate-always, .animated-container, .item-card').forEach(el => obs.observe(el));
}

window.addEventListener('DOMContentLoaded', initApp);
