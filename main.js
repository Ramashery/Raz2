// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyAT4dDEIDUtzP60ibjahO06P75Q6h95ZN4",
    authDomain: "razrabotka-b61bc.firebaseapp.com",
    projectId: "razrabotka-b61bc",
    storageBucket: "razrabotka-b61bc.firebasestorage.app",
    messagingSenderId: "394402564794",
    appId: "1:394402564794:web:f610ffb03e655c600c5083"
};

// --- GLOBAL STATE ---
let db;
let siteData = {};
const defaultLang = 'en';
let floatingObserver, animateOnceObserver, animateAlwaysObserver;

// --- ANIMATION & OBSERVERS ---
function setupObservers() {
    if (floatingObserver) floatingObserver.disconnect();
    if (animateOnceObserver) animateOnceObserver.disconnect();
    if (animateAlwaysObserver) animateAlwaysObserver.disconnect();

    floatingObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const target = entry.target;
            const isAbove = entry.boundingClientRect.top < 0 && !entry.isIntersecting;
            if (entry.isIntersecting) {
                target.classList.add('is-visible');
                target.classList.remove('is-above');
            } else {
                target.classList.remove('is-visible');
                if (isAbove) target.classList.add('is-above');
            }
        });
    }, { threshold: 0, rootMargin: "-50px 0px" });

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
            entry.target.classList.toggle('is-visible', entry.isIntersecting);
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.floating-item').forEach(el => floatingObserver.observe(el));
    document.querySelectorAll('.animate-on-scroll').forEach(el => animateOnceObserver.observe(el));
    document.querySelectorAll('.animate-always').forEach(el => animateAlwaysObserver.observe(el));
}

// --- SEO & FORMATTING ---
function renderSeoTags(data) {
    document.querySelectorAll('meta[name="description"], meta[property^="og:"], script[type="application/ld+json"], link[rel="canonical"]').forEach(el => el.remove());
    document.title = data.seoTitle || "Digital Craft";
    document.documentElement.lang = data.lang || 'en';

    const createMeta = (attr, key, val) => {
        if (!val) return;
        const m = document.createElement('meta');
        m.setAttribute(attr, key);
        m.content = val;
        document.head.appendChild(m);
    };

    createMeta('name', 'description', data.metaDescription);
    createMeta('property', 'og:title', data.ogTitle || data.seoTitle);
    createMeta('property', 'og:description', data.ogDescription || data.metaDescription);
    
    if (data.schemaJsonLd) {
        const s = document.createElement('script');
        s.type = 'application/ld+json';
        s.textContent = JSON.stringify(data.schemaJsonLd);
        document.head.appendChild(s);
    }
}

function formatContentHtml(content) {
    if (!content) return '';
    return content.split(/\n{2,}/).map(block => {
        const trimmed = block.trim();
        const ytMatch = trimmed.match(/^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
        if (ytMatch && ytMatch[1].length === 11) {
            return `<div class="embedded-video" style="position:relative;padding-bottom:56.25%;height:0;margin:1.5em 0;"><iframe style="position:absolute;top:0;left:0;width:100%;height:100%;" src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen></iframe></div>`;
        }
        if (trimmed.startsWith('<')) return trimmed;
        return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('');
}

// --- DATA LOADING ---
async function loadData() {
    try {
        const collections = ['services', 'portfolio', 'blog', 'contact'];
        const dataPromises = [
            db.collection('home').doc('content').get(),
            ...collections.map(col => db.collection(col).get())
        ];
        const [homeDoc, ...snapshots] = await Promise.all(dataPromises);
        const fresh = { home: homeDoc.exists ? homeDoc.data() : {} };
        collections.forEach((col, i) => {
            fresh[col] = snapshots[i].docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
        return fresh;
    } catch (e) {
        console.error("Data load error:", e);
        return null;
    }
}

// --- RENDER SECTIONS ---
function renderSection(key, title) {
    const section = document.getElementById(key);
    if (!section) return;
    const items = siteData[key] || [];
    const langOrder = ['en', 'ka', 'ua', 'ru'];
    const langNames = { en: 'English', ka: 'Georgian', ua: 'Ukrainian', ru: 'Russian' };

    // Desktop Grid Logic (3 items per slide)
    const desktopHTML = langOrder.map(lang => {
        const langItems = items.filter(i => i.lang === lang);
        if (!langItems.length) return '';
        const slides = [];
        for (let i = 0; i < langItems.length; i += 3) slides.push(langItems.slice(i, i + 3));

        const slidesHTML = slides.map((slide, idx) => `
            <div class="desktop-grid-slide ${idx === 0 ? 'active' : ''}">
                ${slide.map(item => `
                    <a href="/${item.lang}/${key}/${item.urlSlug}" class="item-card">
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

        const dots = slides.length > 1 ? `<div class="desktop-slider-nav">${slides.map((_, i) => `<span class="desktop-slider-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}</div>` : '';
        return `<div class="desktop-language-group"><h4>${langNames[lang]}</h4><div class="desktop-carousel-container">${slidesHTML}</div>${dots}</div>`;
    }).join('');

    // Mobile Slider Logic (1 item per slide)
    const mobileHTML = langOrder.map(lang => {
        const langItems = items.filter(i => i.lang === lang);
        if (!langItems.length) return '';
        const slidesHTML = langItems.map((item, idx) => `
            <a href="/${item.lang}/${key}/${item.urlSlug}" class="item-card ${idx === 0 ? 'active' : ''}">
                <div class="item-card__image" style="background-image: url('${(item.media || [])[0] || ''}')"></div>
                <div class="item-card__content"><h3>${item.title}</h3><p>${item.description}</p></div>
            </a>
        `).join('');
        const dots = langItems.length > 1 ? `<div class="slider-nav">${langItems.map((_, i) => `<span class="slider-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}</div>` : '';
        return `<div class="language-slider-block"><div class="cross-fade-slider">${slidesHTML}</div>${dots}</div>`;
    }).join('');

    section.innerHTML = `<div class="animated-container"><h2>${title}</h2></div><div class="desktop-grid-wrapper">${desktopHTML}</div><div class="mobile-sliders-container">${mobileHTML}</div>`;
}

// --- PAGE RENDERING ---
function renderHomePage() {
    const main = document.querySelector('main');
    main.innerHTML = `
        <section id="hero" class="hero">
            <h1 class="animate-always">Web Development & SEO in Tbilisi</h1>
            <div class="hero-subtitle-container animate-always">
                <p>${siteData.home?.subtitle || ''}</p>
                <ul class="hero-contact-list">
                    <li><a href="https://wa.me/79119396075" target="_blank">WhatsApp</a></li>
                    <li><a href="https://t.me/ramashery" target="_blank">Telegram</a></li>
                    <li><a href="tel:+995591102653">+995 591 102 653</a></li>
                </ul>
            </div>
        </section>
        <section id="services"></section><section id="portfolio"></section>
        <section id="blog"></section><section id="contact"></section>
    `;
    renderSeoTags(siteData.home);
    applyCustomBackground(siteData.home);
    ['services', 'portfolio', 'blog', 'contact'].forEach(k => renderSection(k, `Our ${k.charAt(0).toUpperCase() + k.slice(1)}`));
    initDesktopCarousels();
    initMobileSliders();
}

function renderDetailPage(collection, slug, lang) {
    const item = siteData[collection]?.find(d => d.urlSlug === slug && d.lang === lang);
    const main = document.querySelector('main');
    if (!item) {
        main.innerHTML = `<section><h1>404</h1><p>Not Found</p></section>`;
        return;
    }
    main.innerHTML = `
        <section>
            <div class="detail-page-header"><h1 class="animate-always">${item.h1 || item.title}</h1></div>
            <div class="detail-content">${formatContentHtml(item.mainContent)}</div>
        </section>
    `;
    renderSeoTags(item);
    applyCustomBackground(item);
}

// --- SLIDER INITIALIZATION ---
function initDesktopCarousels() {
    document.querySelectorAll('.desktop-carousel-container').forEach(container => {
        const slides = container.querySelectorAll('.desktop-grid-slide');
        const dots = container.parentElement.querySelectorAll('.desktop-slider-dot');
        if (slides.length < 2) return;
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
    document.querySelectorAll('.cross-fade-slider').forEach(slider => {
        const slides = slider.querySelectorAll('.item-card');
        const dots = slider.parentElement.querySelectorAll('.slider-dot');
        if (slides.length < 2) return;
        dots.forEach(dot => {
            dot.onclick = () => {
                const idx = parseInt(dot.dataset.index);
                slides.forEach((s, i) => s.classList.toggle('active', i === idx));
                dots.forEach((d, i) => d.classList.toggle('active', i === idx));
            };
        });
    });
}

function applyCustomBackground(item) {
    const iframe = document.getElementById('custom-background-iframe');
    if (!iframe) return;
    const code = item?.backgroundHtml || siteData.home?.backgroundHtml;
    if (code) {
        iframe.srcdoc = code;
        iframe.style.display = 'block';
        setTimeout(() => iframe.classList.add('is-visible'), 100);
    } else {
        iframe.classList.remove('is-visible');
        setTimeout(() => iframe.style.display = 'none', 800);
    }
}

// --- ROUTING & NAV ---
function routeAndRender() {
    const path = window.location.pathname;
    const match = path.match(/^\/(?:([a-z]{2})\/)?(services|portfolio|blog|contact)\/([a-zA-Z0-9-]+)\/?$/);
    const main = document.querySelector('main');
    
    main.classList.add('loading');
    if (match) {
        renderDetailPage(match[2], match[3], match[1] || 'en');
    } else {
        renderHomePage();
    }
    
    setTimeout(() => {
        main.classList.remove('loading');
        setupObservers();
    }, 400);
}

// --- APP START ---
async function initApp() {
    const main = document.querySelector('main');
    const loader = document.getElementById('loader');

    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();

    siteData = await loadData();
    
    // Menu
    const menu = document.querySelector('.nav-menu');
    if (menu) {
        const items = [{l:'Home', h:'/'}, {l:'Services', h:'/#services'}, {l:'Portfolio', h:'/#portfolio'}, {l:'Blog', h:'/#blog'}];
        menu.innerHTML = items.map(i => `<li><a href="${i.h}">${i.l}</a></li>`).join('');
    }

    routeAndRender();

    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }

    // SPA Navigation
    document.body.addEventListener('click', e => {
        const a = e.target.closest('a');
        if (a && a.host === window.location.host && !a.hash && !a.target) {
            e.preventDefault();
            window.history.pushState({}, '', a.href);
            routeAndRender();
            window.scrollTo(0, 0);
        }
    });

    window.onpopstate = routeAndRender;

    // Mobile Menu Toggle
    const btn = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav-overlay');
    if (btn && nav) {
        btn.onclick = () => {
            btn.classList.toggle('is-active');
            nav.classList.toggle('is-active');
            document.body.classList.toggle('nav-is-open');
        };
    }
}

document.addEventListener('DOMContentLoaded', initApp);
