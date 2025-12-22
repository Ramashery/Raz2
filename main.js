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
let mainContentEl;
let floatingObserver, animateOnceObserver, animateAlwaysObserver;

// --- ANIMATION & OBSERVER LOGIC ---
function setupObservers() {
    if (floatingObserver) floatingObserver.disconnect();
    if (animateOnceObserver) animateOnceObserver.disconnect();
    if (animateAlwaysObserver) animateAlwaysObserver.disconnect();

    floatingObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const target = entry.target;
            const isAboveViewport = entry.boundingClientRect.top < 0 && !entry.isIntersecting;
            if (entry.isIntersecting) {
                target.classList.add('is-visible');
                target.classList.remove('is-above');
            } else {
                target.classList.remove('is-visible');
                if (isAboveViewport) target.classList.add('is-above');
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

// --- SEO TAGS (RESTORED FULL LOGIC) ---
function renderSeoTags(data) { 
    document.querySelectorAll('meta[name="description"], meta[property^="og:"], script[type="application/ld+json"], link[rel="canonical"]').forEach(el => el.remove()); 
    document.title = data.seoTitle || "Digital Craft"; 
    document.documentElement.lang = data.lang || 'en'; 
    const createMeta = (attr, key, value) => { 
        if (value) { 
            const meta = document.createElement('meta'); 
            meta.setAttribute(attr, key); 
            meta.content = value; 
            document.head.appendChild(meta); 
        } 
    }; 
    createMeta('name', 'description', data.metaDescription); 
    createMeta('property', 'og:title', data.ogTitle || data.seoTitle); 
    createMeta('property', 'og:description', data.ogDescription || data.metaDescription); 
    const ogImage = data.ogImage || data.media?.find(url => !/youtube|vimeo/.test(url)) || ''; 
    if (ogImage) createMeta('property', 'og:image', ogImage); 
    
    const canonical = document.createElement('link'); 
    canonical.rel = 'canonical'; 
    canonical.href = 'https://digital-craft-tbilisi.site' + window.location.pathname;
    document.head.appendChild(canonical); 

    if (data.schemaJsonLd) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = typeof data.schemaJsonLd === 'string' ? data.schemaJsonLd : JSON.stringify(data.schemaJsonLd);
        document.head.appendChild(script);
    }
}

// --- CUSTOM BACKGROUND (RESTORED) ---
function applyCustomBackground(item = null) {
    const iframe = document.getElementById('custom-background-iframe');
    if (!iframe) return;
    const customCode = item?.backgroundHtml || siteData.home?.backgroundHtml || '';
    if (customCode && customCode.trim() !== "") {
        if (iframe.srcdoc === customCode && iframe.style.display === 'block') return;
        iframe.classList.remove('is-visible');
        iframe.onload = () => { iframe.classList.add('is-visible'); iframe.onload = null; };
        iframe.style.display = 'block';
        iframe.srcdoc = customCode;
    } else {
        iframe.classList.remove('is-visible');
        setTimeout(() => { iframe.style.display = 'none'; }, 500);
    }
}

// --- CONTENT FORMATTING (RESTORED IMAGE & VIDEO) ---
function formatContentHtml(content) { 
    if (!content) return ''; 
    return content.replace(/\r\n/g, '\n').split(/\n{2,}/).map(block => { 
        const trimmed = block.trim(); 
        if (!trimmed) return ''; 
        const ytMatch = trimmed.match(/^?.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
        const imgMatch = trimmed.match(/^https?:\/\/[^<>"']+\.(?:jpg|jpeg|png|gif|webp|svg)\s*$/i);
        if (ytMatch && ytMatch[1]) { 
            return `<div class="embedded-video" style="position:relative;padding-bottom:56.25%;height:0;margin:1.5em 0;"><iframe style="position:absolute;top:0;left:0;width:100%;height:100%;" src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen></iframe></div>`; 
        } else if (imgMatch) {
            return `<p><img src="${trimmed}" style="max-width:100%; border-radius:4px; border:1px solid var(--color-border);"></p>`;
        } else if (trimmed.startsWith('<')) {
            return trimmed;
        } else {
            return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
        }
    }).join(''); 
}

// --- RENDER SECTION (RESTORED ORIGINAL SLIDER LOGIC) ---
function renderSection(key, title) {
    const section = document.getElementById(key);
    if (!section) return;
    const items = siteData[key] || [];
    const langOrder = ['en', 'ka', 'ua', 'ru'];
    const langNames = { en: 'English', ka: 'Georgian', ua: 'Ukrainian', ru: 'Russian' };
    const itemsByLang = {};
    items.forEach(item => { if (!itemsByLang[item.lang]) itemsByLang[item.lang] = []; itemsByLang[item.lang].push(item); });

    const desktopHTML = langOrder.map(lang => {
        const langItems = itemsByLang[lang];
        if (!langItems || langItems.length === 0) return '';
        const slides = [];
        for (let i = 0; i < langItems.length; i += 3) slides.push(langItems.slice(i, i + 3));
        const slidesHTML = slides.map((slideItems, idx) => `
            <div class="desktop-grid-slide ${idx === 0 ? 'active' : ''}">
                ${slideItems.map(item => {
                    const langPrefix = item.lang ? `/${item.lang}` : '';
                    let url = `${langPrefix}/${key}/${item.urlSlug}`;
                    if (item.urlSlug === 'seo-optimization-tbilisi') url += '/';
                    return `<a href="${url}" class="item-card"><div class="item-card__image" style="background-image: url('${(item.media || [])[0] || ''}')"></div><div class="item-card__content"><h3>${item.title}</h3><div class="card-subtitle">${item.subtitle || ''}</div><p>${item.description || ''}</p></div></a>`;
                }).join('')}
            </div>
        `).join('');
        const dots = slides.length > 1 ? `<div class="desktop-slider-nav">${slides.map((_, i) => `<span class="desktop-slider-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}</div>` : '';
        return `<div class="desktop-language-group"><h4 class="desktop-lang-title">${langNames[lang]}</h4><div class="desktop-carousel-container">${slidesHTML}</div>${dots}</div>`;
    }).join('');

    const mobileHTML = langOrder.map(lang => {
        const langItems = itemsByLang[lang];
        if (!langItems || langItems.length === 0) return '';
        const slidesHTML = langItems.map((item, idx) => `
            <a href="/${item.lang}/${key}/${item.urlSlug}" class="item-card ${idx === 0 ? 'active' : ''}"><div class="item-card__image" style="background-image: url('${(item.media || [])[0] || ''}')"></div><div class="item-card__content"><h3>${item.title}</h3><p>${item.description}</p></div></a>
        `).join('');
        const dots = langItems.length > 1 ? `<div class="slider-nav">${langItems.map((_, i) => `<span class="slider-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('')}</div>` : '';
        return `<div class="language-slider-block"><div class="cross-fade-slider">${slidesHTML}</div>${dots}</div>`;
    }).join('');

    section.innerHTML = `<div class="animated-container"><h2>${title}</h2></div><div class="desktop-grid-wrapper">${desktopHTML}</div><div class="mobile-sliders-container">${mobileHTML}</div>`;
}

// --- RELATED POSTS (RESTORED) ---
function renderRelatedPosts(currentCollection, currentSlug, currentLang) { 
    if (!siteData.services || !siteData.blog) return; 
    const pool = [ ...siteData.services.map(i => ({ ...i, collection: 'services' })), ...siteData.blog.map(i => ({ ...i, collection: 'blog' })) ]; 
    const relatedItems = pool.filter(item => item.lang === currentLang && !(item.collection === currentCollection && item.urlSlug === currentSlug)).sort(() => 0.5 - Math.random()).slice(0, 3); 
    if (relatedItems.length === 0) return; 
    const itemsHTML = relatedItems.map(item => `<a href="/${item.lang}/${item.collection}/${item.urlSlug}" class="item-card"><div class="item-card__image" style="background-image: url('${(item.media || [])[0] || ''}')"></div><div class="item-card__content"><h3>${item.title}</h3><p>${item.description}</p></div></a>`).join(''); 
    const relatedSection = document.createElement('section'); 
    relatedSection.id = 'related-posts'; 
    relatedSection.innerHTML = `<h2 class="animated-container">You Might Also Like</h2><div class="item-grid">${itemsHTML}</div>`; 
    mainContentEl.appendChild(relatedSection); 
}

// --- SLIDER INITIALIZATION (RESTORED) ---
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
        const slider = block.querySelector('.cross-fade-slider');
        const slides = slider.querySelectorAll('.item-card');
        const dots = block.querySelectorAll('.slider-dot');
        dots.forEach(dot => {
            dot.onclick = () => {
                const idx = parseInt(dot.dataset.index);
                slides.forEach((s, i) => s.classList.toggle('active', i === idx));
                dots.forEach((d, i) => d.classList.toggle('active', i === idx));
            };
        });
    });
}

// --- ROUTING & RENDERING ---
function renderHomePage() {
    mainContentEl.innerHTML = `
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
    setupObservers();
}

function renderDetailPage(collection, slug, lang) {
    const item = siteData[collection]?.find(d => d.urlSlug === slug && d.lang === lang);
    if (!item) {
        mainContentEl.innerHTML = `<section><h1>404</h1><p>Not Found</p><a href="/">Back Home</a></section>`;
        return;
    }
    mainContentEl.innerHTML = `
        <section>
            <div class="detail-page-header"><h1 class="animate-always">${item.h1 || item.title}</h1>${item.price ? `<div class="detail-price">${item.price}</div>` : ''}</div>
            <div class="detail-content">${formatContentHtml(item.mainContent)}</div>
        </section>
    `;
    renderSeoTags(item);
    applyCustomBackground(item);
    renderRelatedPosts(collection, slug, lang);
    setupObservers();
}

function routeAndRender(isPopState = false) {
    if (typeof ym === 'function' && !isPopState) { ym(103413242, 'hit', window.location.href); }
    const path = window.location.pathname;
    const match = path.match(/^\/(?:([a-z]{2})\/)?(services|portfolio|blog|contact)\/([a-zA-Z0-9-]+)\/?$/);
    
    mainContentEl.classList.add('loading');
    if (match) {
        renderDetailPage(match[2], match[3], match[1] || 'en');
    } else {
        renderHomePage();
    }
    setTimeout(() => mainContentEl.classList.remove('loading'), 300);
}

// --- APP START ---
async function initApp() {
    mainContentEl = document.querySelector('main');
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();

    try {
        const collections = ['services', 'portfolio', 'blog', 'contact'];
        const dataPromises = [db.collection('home').doc('content').get(), ...collections.map(col => db.collection(col).get())];
        const [homeDoc, ...snapshots] = await Promise.all(dataPromises);
        siteData.home = homeDoc.exists ? homeDoc.data() : {};
        collections.forEach((col, i) => { siteData[col] = snapshots[i].docs.map(doc => ({ id: doc.id, ...doc.data() })); });

        // Menu
        const menu = document.querySelector('.nav-menu');
        if (menu) {
            const items = [{l:'Home', h:'/'}, {l:'Services', h:'/#services'}, {l:'Portfolio', h:'/#portfolio'}, {l:'Blog', h:'/#blog'}];
            menu.innerHTML = items.map(i => `<li><a href="${i.h}">${i.l}</a></li>`).join('');
        }

        routeAndRender();

        const loader = document.getElementById('loader');
        if (loader) { loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 500); }

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

        // Menu Toggle
        const btn = document.querySelector('.menu-toggle');
        const nav = document.querySelector('.nav-overlay');
        if (btn && nav) {
            btn.onclick = () => { btn.classList.toggle('is-active'); nav.classList.toggle('is-active'); document.body.classList.toggle('nav-is-open'); };
        }
    } catch (e) { console.error("Init error:", e); }
}

document.addEventListener('DOMContentLoaded', initApp);
