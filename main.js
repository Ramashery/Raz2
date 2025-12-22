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
const langOrder = ['en', 'ka', 'ua', 'ru'];
const langNames = { en: 'English', ka: 'Georgian', ua: 'Ukrainian', ru: 'Russian' };

const mainContentEl = document.querySelector('main');

// --- 2. INITIALIZATION ---
async function initApp() {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    db = firebase.firestore();
    
    // Инициализируем меню сразу
    initMenu();

    try {
        // Загружаем данные
        siteData = await loadData();
        
        // Рендерим меню (ссылки)
        renderMenuLinks();
        
        // Строим главную страницу
        renderHomePage();
        
        // Убираем лоадер
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

async function loadData() {
    const fresh = {};
    const collections = ['services', 'portfolio', 'blog', 'contact'];
    const dataPromises = [
        db.collection('home').doc('content').get(),
        ...collections.map(col => db.collection(col).get())
    ];
    
    const [homeDoc, ...snapshots] = await Promise.all(dataPromises);
    
    fresh.home = homeDoc.exists ? homeDoc.data() : {};
    collections.forEach((col, index) => {
        fresh[col] = snapshots[index].docs.map(doc => ({ 
            id: doc.id, 
            collection_name: col, 
            ...doc.data() 
        }));
    });
    return fresh;
}

// --- 3. RENDERING HOME PAGE ---
function renderHomePage() {
    const home = siteData.home || {};
    
    // Очищаем HERO и вставляем динамический контент
    const heroSection = document.getElementById('hero');
    if (heroSection) {
        heroSection.innerHTML = `
            <h1 class="animate-always is-visible">${home.h1 || 'Web Development & SEO'}</h1>
            <div class="hero-subtitle-container animate-always is-visible">
                <p>${home.subtitle || ''}</p>
                <ul class="hero-contact-list">
                    <li><a href="https://wa.me/79119396075" target="_blank">WhatsApp</a></li>
                    <li><a href="https://t.me/ramashery" target="_blank">Telegram</a></li>
                    <li><a href="tel:+995591102653">+995 591 102 653</a></li>
                </ul>
            </div>
        `;
    }

    // Применяем фон
    applyCustomBackground(home);

    // Рендерим разделы карточек
    ['services', 'portfolio', 'blog', 'contact'].forEach(key => {
        renderSection(key, `Our ${key.charAt(0).toUpperCase() + key.slice(1)}`, siteData[key]);
    });

    // Инициализируем слайдеры ПОСЛЕ того, как HTML добавлен в DOM
    initDesktopCarousels();
    initMobileSliders();
    setupObservers();
}

function renderSection(key, title, items) {
    const container = document.getElementById(key);
    if (!container) return;

    // ПРИНУДИТЕЛЬНАЯ ОЧИСТКА контейнера от старого мусора
    container.innerHTML = ''; 

    if (!items || items.length === 0) return;

    const itemsByLang = {};
    items.forEach(i => {
        const l = i.lang || 'en';
        if (!itemsByLang[l]) itemsByLang[l] = [];
        itemsByLang[l].push(i);
    });

    // Генерация десктопных каруселей (сетка по 3)
    const desktopHTML = langOrder.map(lang => {
        const langItems = itemsByLang[lang];
        if (!langItems) return '';
        
        const slides = [];
        for (let i = 0; i < langItems.length; i += 3) slides.push(langItems.slice(i, i + 3));

        const slidesHTML = slides.map((slideItems, idx) => `
            <div class="desktop-grid-slide ${idx === 0 ? 'active' : ''}">
                ${slideItems.map(item => `
                    <a href="/en/${key}/${item.urlSlug}/" class="item-card">
                        <div class="item-card__image" style="background-image: url('${(item.media || [])[0] || ''}')"></div>
                        <div class="item-card__content">
                            <h3>${item.title}</h3>
                            <div class="card-subtitle">${item.subtitle || ''}</div>
                            <p>${item.description || ''}</p>
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

    // Генерация мобильных слайдеров (Cross-fade)
    const mobileHTML = langOrder.map(lang => {
        const langItems = itemsByLang[lang];
        if (!langItems) return '';

        const slidesHTML = langItems.map((item, idx) => `
            <div class="item-card ${idx === 0 ? 'active' : ''}">
                <div class="item-card__image" style="background-image: url('${(item.media || [])[0] || ''}')"></div>
                <div class="item-card__content">
                    <h3>${item.title}</h3>
                    <div class="card-subtitle">${item.subtitle || ''}</div>
                    <p>${item.description || ''}</p>
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

    container.innerHTML = `
        <div class="animated-container"><h2>${title}</h2></div>
        <div class="desktop-grid-wrapper">${desktopHTML}</div>
        <div class="mobile-sliders-container">${mobileHTML}</div>
    `;
}

// --- 4. SLIDERS & INTERFACE LOGIC ---
function initDesktopCarousels() {
    document.querySelectorAll('.desktop-carousel-container').forEach(carousel => {
        const slides = carousel.querySelectorAll('.desktop-grid-slide');
        const nav = carousel.nextElementSibling;
        if (!nav || !nav.classList.contains('desktop-slider-nav')) return;
        const dots = nav.querySelectorAll('.desktop-slider-dot');

        dots.forEach(dot => {
            dot.onclick = () => {
                const targetIdx = parseInt(dot.dataset.index);
                slides.forEach((s, i) => s.classList.toggle('active', i === targetIdx));
                dots.forEach((d, i) => d.classList.toggle('active', i === targetIdx));
            };
        });
    });
}

function initMobileSliders() {
    document.querySelectorAll('.language-slider-block').forEach(block => {
        const slides = block.querySelectorAll('.item-card');
        const dots = block.querySelectorAll('.slider-dot');
        if (slides.length <= 1) return;

        dots.forEach(dot => {
            dot.onclick = () => {
                const targetIdx = parseInt(dot.dataset.index);
                slides.forEach((s, i) => s.classList.toggle('active', i === targetIdx));
                dots.forEach((d, i) => d.classList.toggle('active', i === targetIdx));
            };
        });
    });
}

function initMenu() {
    const btn = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav-overlay');
    if (btn && nav) {
        btn.onclick = () => {
            document.body.classList.toggle('nav-is-open');
            btn.classList.toggle('is-active');
            nav.classList.toggle('is-active');
        };
    }
}

function renderMenuLinks() {
    const el = document.querySelector('.nav-menu');
    const links = [
        { label: 'Home', href: '/' },
        { label: 'Services', href: '/#services' },
        { label: 'Portfolio', href: '/#portfolio' },
        { label: 'Blog', href: '/#blog' }
    ];
    if (el) el.innerHTML = links.map(l => `<li><a href="${l.href}">${l.label}</a></li>`).join('');
}

function applyCustomBackground(item) {
    const iframe = document.getElementById('custom-background-iframe');
    if (iframe && item.backgroundHtml) {
        iframe.srcdoc = item.backgroundHtml;
        iframe.style.display = 'block';
        setTimeout(() => iframe.classList.add('is-visible'), 500);
    }
}

function setupObservers() {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.animate-on-scroll, .animate-always, .animated-container, .item-card').forEach(el => obs.observe(el));
}

// Запуск
window.addEventListener('DOMContentLoaded', initApp);
