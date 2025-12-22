// --- FIREBASE CONFIGURATION ---
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

const mainContentEl = document.querySelector('main');
let floatingObserver, animateOnceObserver, animateAlwaysObserver;

// --- 1. ANIMATION & OBSERVER LOGIC ---
function setupObservers() {
    if (floatingObserver) floatingObserver.disconnect();
    if (animateOnceObserver) animateOnceObserver.disconnect();
    if (animateAlwaysObserver) animateAlwaysObserver.disconnect();

    floatingObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const target = entry.target;
            if (entry.isIntersecting) {
                target.classList.add('is-visible');
                target.classList.remove('is-above');
            } else {
                target.classList.remove('is-visible');
                if (entry.boundingClientRect.top < 0) target.classList.add('is-above');
            }
        });
    }, { threshold: 0, rootMargin: "-50px 0px -50px 0px" });

    animateOnceObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    animateAlwaysObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('is-visible');
            else entry.target.classList.remove('is-visible');
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.floating-item').forEach(el => floatingObserver.observe(el));
    document.querySelectorAll('.animate-on-scroll').forEach(el => animateOnceObserver.observe(el));
    document.querySelectorAll('.animate-always').forEach(el => animateAlwaysObserver.observe(el));
}

// --- 2. DATA LOADING ---
async function loadData() {
    const freshSiteData = {};
    try {
        const collections = ['services', 'portfolio', 'blog', 'contact'];
        const dataPromises = [
            db.collection('home').doc('content').get(),
            ...collections.map(col => db.collection(col).get())
        ];
        const [homeDoc, ...snapshots] = await Promise.all(dataPromises);
        
        freshSiteData.home = homeDoc.exists ? homeDoc.data() : {};
        collections.forEach((col, index) => {
            freshSiteData[col] = snapshots[index].docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
        return freshSiteData;
    } catch (error) {
        console.error("Error loading data:", error);
        return {};
    }
}

// --- 3. RENDERING FUNCTIONS ---
function renderMenu() {
    const menuEl = document.querySelector('.nav-menu');
    if (!menuEl) return;
    const menuItems = [
        { label: 'Home', href: '/' },
        { label: 'Services', href: '#services' },
        { label: 'Portfolio', href: '#portfolio' },
        { label: 'Blog', href: '#blog' },
        { label: 'Contact', href: '#contact' }
    ];
    menuEl.innerHTML = menuItems.map(item => `<li><a href="${item.href}">${item.label}</a></li>`).join('');
}

function renderSection(key, title, items) {
    const section = document.getElementById(key);
    if (!section) return;

    const itemsFromDb = items || [];
    const langOrder = ['en', 'ka', 'ua', 'ru'];
    const langNames = { en: 'English', ka: 'Georgian', ua: 'Ukrainian', ru: 'Russian' };
    const itemsByLang = {};

    itemsFromDb.forEach(item => {
        if (!itemsByLang[item.lang]) itemsByLang[item.lang] = [];
        itemsByLang[item.lang].push(item);
    });

    const desktopGridsHTML = langOrder.map(lang => {
        const langItems = itemsByLang[lang];
        if (!langItems || langItems.length === 0) return '';
        
        const slides = [];
        for (let i = 0; i < langItems.length; i += 3) slides.push(langItems.slice(i, i + 3));

        const slidesHTML = slides.map((slideItems, index) => {
            const cardsHTML = slideItems.map(item => {
                const langPrefix = item.lang ? `/${item.lang}` : '';
                let itemUrl = `${langPrefix}/${key}/${item.urlSlug}`;
                if (item.urlSlug === 'seo-optimization-tbilisi') itemUrl += '/';
                return `<a href="${itemUrl}" class="item-card">
                    <div class="item-card__image" style="background-image: url('${(item.media || []).find(url => !/youtube|vimeo/.test(url)) || ''}')"></div>
                    <div class="item-card__content">
                        <h3>${item.title}</h3>
                        <div class="card-subtitle">${item.subtitle}</div>
                        <p>${item.description}</p>
                    </div>
                </a>`;
            }).join('');
            return `<div class="desktop-grid-slide ${index === 0 ? 'active' : ''}">${cardsHTML}</div>`;
        }).join('');

        const dotsHTML = slides.length > 1 ? slides.map((_, index) => `<span class="desktop-slider-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>`).join('') : '';
        return `<div class="desktop-language-group"><h4 class="desktop-lang-title">${langNames[lang]}</h4><div class="desktop-carousel-container">${slidesHTML}</div>${slides.length > 1 ? `<div class="desktop-slider-nav">${dotsHTML}</div>` : ''}</div>`;
    }).join('');

    const mobileSlidersHTML = langOrder.map(lang => {
        const langItems = itemsByLang[lang];
        if (!langItems || langItems.length === 0) return '';
        const slidesHTML = langItems.map((item, index) => {
            const langPrefix = item.lang ? `/${item.lang}` : '';
            return `<a href="${langPrefix}/${key}/${item.urlSlug}" class="item-card ${index === 0 ? 'active' : ''}">
                <div class="item-card__image" style="background-image: url('${(item.media || []).find(url => !/youtube|vimeo/.test(url)) || ''}')"></div>
                <div class="item-card__content"><h3>${item.title}</h3><div class="card-subtitle">${item.subtitle}</div><p>${item.description}</p></div>
            </a>`;
        }).join('');
        const dotsHTML = langItems.length > 1 ? langItems.map((_, index) => `<span class="slider-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>`).join('') : '';
        return `<div class="language-slider-block"><div class="cross-fade-slider">${slidesHTML}</div><div class="slider-nav">${dotsHTML}</div></div>`;
    }).join('');

    section.innerHTML = `<div class="animated-container"><h2>${title}</h2></div><div class="desktop-grid-wrapper">${desktopGridsHTML}</div><div class="mobile-sliders-container">${mobileSlidersHTML}</div>`;
}

function applyCustomBackground(item = null) {
    const iframe = document.getElementById('custom-background-iframe');
    if (!iframe) return;
    const customCode = item?.backgroundHtml || siteData.home?.backgroundHtml || '';
    if (customCode.trim() !== "") {
        iframe.style.display = 'block';
        iframe.srcdoc = customCode;
        setTimeout(() => iframe.classList.add('is-visible'), 100);
    }
}

// --- 4. SLIDERS INITIALIZATION ---
function initDesktopCarousels() {
    document.querySelectorAll('.desktop-carousel-container').forEach(carousel => {
        const slides = carousel.querySelectorAll('.desktop-grid-slide');
        const nav = carousel.nextElementSibling;
        if (!nav || !nav.matches('.desktop-slider-nav')) return;
        const dots = nav.querySelectorAll('.desktop-slider-dot');
        let currentIndex = 0;
        function goToSlide(index) {
            currentIndex = (index + slides.length) % slides.length;
            slides.forEach((s, i) => s.classList.toggle('active', i === currentIndex));
            dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
        }
        nav.onclick = (e) => { if (e.target.matches('.desktop-slider-dot')) goToSlide(parseInt(e.target.dataset.index)); };
        setInterval(() => goToSlide(currentIndex + 1), 7000);
    });
}

function initMobileSliders() {
    document.querySelectorAll('.language-slider-block').forEach(sliderBlock => {
        const slider = sliderBlock.querySelector('.cross-fade-slider');
        const slides = slider.querySelectorAll('.item-card');
        const nav = sliderBlock.querySelector('.slider-nav');
        const dots = nav.querySelectorAll('.slider-dot');
        let currentIndex = 0;
        function goToSlide(index) {
            currentIndex = (index + slides.length) % slides.length;
            slides.forEach((s, i) => s.classList.toggle('active', i === currentIndex));
            dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
        }
        nav.onclick = (e) => { if (e.target.matches('.slider-dot')) goToSlide(parseInt(e.target.dataset.index)); };
        setInterval(() => goToSlide(currentIndex + 1), 5000);
    });
}

// --- 5. APP INITIALIZATION ---
async function initHome() {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    
    // Загрузка данных
    siteData = await loadData();
    
    // Рендер
    renderMenu();
    ['services', 'portfolio', 'blog', 'contact'].forEach(key => {
        renderSection(key, `Our ${key.charAt(0).toUpperCase() + key.slice(1)}`, siteData[key]);
    });
    
    applyCustomBackground(siteData.home);
    
    // Анимации и Слайдеры
    setupObservers();
    initDesktopCarousels();
    initMobileSliders();

    // Кнопка меню
    const menuToggle = document.querySelector('.menu-toggle');
    const navOverlay = document.querySelector('.nav-overlay');
    if (menuToggle) {
        menuToggle.onclick = () => {
            document.body.classList.toggle('nav-is-open');
            menuToggle.classList.toggle('is-active');
            navOverlay.classList.toggle('is-active');
        };
    }

    // Убираем лоадер
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
    
    // Копирайт в футер
    const footer = document.getElementById('site-footer');
    if (footer) footer.innerHTML = `© ${new Date().getFullYear()} Digital Craft.`;
}

window.addEventListener('DOMContentLoaded', initHome);
