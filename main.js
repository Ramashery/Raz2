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
const langOrder = ['en', 'ka', 'ua', 'ru'];
const langNames = { en: 'English', ka: 'Georgian', ua: 'Ukrainian', ru: 'Russian' };

const mainContentEl = document.querySelector('main');

async function initApp() {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    
    try {
        siteData = await loadData();
        renderMenu();
        
        // Отрисовка главной
        renderHomePage();
        
        mainContentEl.classList.remove('loading');
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }
        
        initGlobalEvents();
    } catch (e) {
        console.error("Critical error:", e);
    }
}

async function loadData() {
    const fresh = {};
    const cols = ['services', 'portfolio', 'blog', 'contact'];
    const promises = [
        db.collection('home').doc('content').get(),
        ...cols.map(c => db.collection(c).get())
    ];
    const [homeDoc, ...snaps] = await Promise.all(promises);
    fresh.home = homeDoc.data() || {};
    cols.forEach((c, i) => {
        fresh[c] = snaps[i].docs.map(d => ({ id: d.id, collection_name: c, ...d.data() }));
    });
    return fresh;
}

function renderHomePage() {
    const home = siteData.home || {};
    
    // 1. Динамический HERO (ТОЧНАЯ ВЕРСТКА)
    const heroSection = document.getElementById('hero');
    heroSection.innerHTML = `
        <h1 class="animate-always is-visible">${home.h1 || 'Web Development'}</h1>
        <div class="hero-subtitle-container animate-always is-visible">
            <p>${home.subtitle || ''}</p>
            <ul class="hero-contact-list">
                <li><a href="https://wa.me/79119396075" target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
                <li><a href="https://t.me/ramashery" target="_blank" rel="noopener noreferrer">Telegram</a></li>
                <li><a href="tel:+995591102653">+995 591 102 653</a></li>
            </ul>
        </div>
    `;

    applyCustomBackground(home);

    // 2. Отрисовка разделов
    ['services', 'portfolio', 'blog', 'contact'].forEach(key => {
        renderSection(key, `Our ${key.charAt(0).toUpperCase() + key.slice(1)}`, siteData[key]);
    });

    // 3. Запуск логики
    initDesktopCarousels();
    initMobileSliders();
    setupObservers();
}

function renderSection(key, title, items) {
    const container = document.getElementById(key);
    if (!container || !items || items.length === 0) return;

    const itemsByLang = {};
    items.forEach(i => { if(!itemsByLang[i.lang]) itemsByLang[i.lang] = []; itemsByLang[i.lang].push(i); });

    // Сетка для десктопа (слайды по 3)
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

        const dots = slides.length > 1 ? `
            <div class="desktop-slider-nav">
                ${slides.map((_, i) => `<span class="desktop-slider-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}
            </div>` : '';

        return `
            <div class="desktop-language-group">
                <h4 class="desktop-lang-title">${langNames[lang]}</h4>
                <div class="desktop-carousel-container">${slidesHTML}</div>
                ${dots}
            </div>`;
    }).join('');

    // Слайдер для мобилы (Cross-fade)
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

        const dots = langItems.length > 1 ? `
            <div class="slider-nav">
                ${langItems.map((_, i) => `<span class="slider-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}
            </div>` : '';

        return `
            <div class="language-slider-block">
                <div class="cross-fade-slider">${slidesHTML}</div>
                ${dots}
            </div>`;
    }).join('');

    // Вставляем сгенерированный HTML
    container.innerHTML = `
        <div class="animated-container"><h2>${title}</h2></div>
        <div class="desktop-grid-wrapper">${desktopHTML}</div>
        <div class="mobile-sliders-container">${mobileHTML}</div>
    `;
}

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

function initDesktopCarousels() {
    document.querySelectorAll('.desktop-carousel-container').forEach(carousel => {
        const slides = carousel.querySelectorAll('.desktop-grid-slide');
        const dots = carousel.parentElement.querySelectorAll('.desktop-slider-dot');
        dots.forEach(dot => {
            dot.onclick = () => {
                const i = parseInt(dot.dataset.index);
                slides.forEach((s, idx) => s.classList.toggle('active', idx === i));
                dots.forEach((d, idx) => d.classList.toggle('active', idx === i));
            };
        });
    });
}

function initMobileSliders() {
    document.querySelectorAll('.language-slider-block').forEach(block => {
        const slides = block.querySelectorAll('.item-card');
        const dots = block.querySelectorAll('.slider-dot');
        dots.forEach(dot => {
            dot.onclick = () => {
                const i = parseInt(dot.dataset.index);
                slides.forEach((s, idx) => s.classList.toggle('active', idx === i));
                dots.forEach((d, idx) => d.classList.toggle('active', idx === i));
            };
        });
    });
}

function applyCustomBackground(item) {
    const iframe = document.getElementById('custom-background-iframe');
    if (iframe && item.backgroundHtml) {
        iframe.srcdoc = item.backgroundHtml;
        iframe.style.display = 'block';
        setTimeout(() => iframe.classList.add('is-visible'), 500);
    }
}

function renderMenu() {
    const el = document.querySelector('.nav-menu');
    const items = [
        {label: 'Home', href: '/'}, 
        {label: 'Services', href: '/#services'}, 
        {label: 'Portfolio', href: '/#portfolio'}, 
        {label: 'Blog', href: '/#blog'}
    ];
    if (el) el.innerHTML = items.map(i => `<li><a href="${i.href}">${i.label}</a></li>`).join('');
}

function initGlobalEvents() {
    const btn = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav-overlay');
    if (btn) {
        btn.onclick = () => {
            document.body.classList.toggle('nav-is-open');
            btn.classList.toggle('is-active');
            nav.classList.toggle('is-active');
        };
    }
    
    // Закрытие меню при клике на ссылки
    document.querySelectorAll('.nav-menu a').forEach(a => {
        a.onclick = () => {
            document.body.classList.remove('nav-is-open');
            btn.classList.remove('is-active');
            nav.classList.remove('is-active');
        };
    });
}

function setupObservers() {
    const obs = new IntersectionObserver(es => {
        es.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.animate-on-scroll, .animate-always, .animated-container, .item-card').forEach(el => obs.observe(el));
}

window.addEventListener('DOMContentLoaded', initApp);
