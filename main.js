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
const initialSiteData = {
    home: { h1: "", subtitle: "", lang: "en", seoTitle: "Digital Craft", metaDescription: "Professional websites for small businesses" },
    services: [], portfolio: [], blog: [], contact: []
};

const mainContentEl = document.querySelector('main');
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
                if (isAboveViewport) {
                    target.classList.add('is-above');
                } else {
                    target.classList.remove('is-above');
                }
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
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    animateAlwaysObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            } else {
                entry.target.classList.remove('is-visible');
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    
    document.querySelectorAll('.floating-item').forEach(el => floatingObserver.observe(el));
    document.querySelectorAll('.animate-on-scroll').forEach(el => animateOnceObserver.observe(el));
    document.querySelectorAll('.animate-always').forEach(el => animateAlwaysObserver.observe(el));
}

// --- SEO & DATA FUNCTIONS ---
function renderSeoTags(data) { 
    document.querySelectorAll('meta[name="description"], meta[property^="og:"], script[type="application/ld+json"], link[rel="canonical"]').forEach(el => el.remove()); 
    document.title = data.seoTitle || "Digital Craft"; 
    document.documentElement.lang = data.lang || 'en'; 
    const createMeta = (attr, key, value) => { if (value) { const meta = document.createElement('meta'); meta.setAttribute(attr, key); meta.content = value; document.head.appendChild(meta); } }; 
    createMeta('name', 'description', data.metaDescription); 
    createMeta('property', 'og:title', data.ogTitle || data.seoTitle); 
    createMeta('property', 'og:description', data.ogDescription || data.metaDescription); 
    const ogImage = data.ogImage || data.media?.find(url => !/youtube|vimeo/.test(url)) || ''; 
    if (ogImage) createMeta('property', 'og:image', ogImage); 
    
    const canonical = document.createElement('link'); 
    canonical.rel = 'canonical'; 
    const canonicalBaseUrl = 'https://digital-craft-tbilisi.site'; 
    let cleanPath = window.location.pathname; 
    if (cleanPath.includes('seo-optimization-tbilisi')) { if (!cleanPath.endsWith('/')) cleanPath += '/'; } 
    else { if (cleanPath.length > 1 && cleanPath.endsWith('/')) { cleanPath = cleanPath.slice(0, -1); } } 
    canonical.href = canonicalBaseUrl + cleanPath; 
    document.head.appendChild(canonical); 
    
    let schemaData = data.schemaJsonLd; 
    if (typeof schemaData === 'string' && schemaData.trim()) { try { schemaData = JSON.parse(schemaData); } catch (e) { schemaData = null; } } 
    if (schemaData && typeof schemaData === 'object' && Object.keys(schemaData).length > 0) { 
        const script = document.createElement('script'); script.type = 'application/ld+json'; script.textContent = JSON.stringify(schemaData); document.head.appendChild(script); 
    } 
}

async function loadData() { 
    const freshSiteData = {}; 
    try { 
        const collections = ['services', 'portfolio', 'blog', 'contact']; 
        const dataPromises = [ db.collection('home').doc('content').get(), ...collections.map(col => db.collection(col).get()) ]; 
        const [homeDoc, ...snapshots] = await Promise.all(dataPromises); 
        freshSiteData.home = homeDoc.exists ? homeDoc.data() : {}; 
        collections.forEach((col, index) => { freshSiteData[col] = snapshots[index].docs.map(doc => ({ id: doc.id, collection_name: col, ...doc.data() })); }); 
        return freshSiteData; 
    } catch (error) { return JSON.parse(JSON.stringify(initialSiteData)); } 
}

// --- RENDER FUNCTIONS ---
function formatContentHtml(content) { 
    if (!content) return ''; 
    let processedContent = content.replace(/\r\n/g, '\n'); 
    const blocks = processedContent.split(/\n{2,}/); 
    return blocks.map(block => { 
        const trimmedBlock = block.trim(); if (!trimmedBlock) return ''; 
        const youtubeRegex = /^https?:\/\/(?:www\.|m\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch?v=|watch\?.*&v=|shorts\/))([a-zA-Z0-9_-]{11}).*$/; 
        const imageRegex = /^https?:\/\/[^<>"']+\.(?:jpg|jpeg|png|gif|webp|svg)\s*$/i; 
        const youtubeMatch = trimmedBlock.match(youtubeRegex); 
        const imageMatch = trimmedBlock.match(imageRegex); 
        if (/^<(p|div|h[1-6]|ul|ol|li|blockquote|hr|table|pre)/i.test(trimmedBlock)) { return trimmedBlock; } 
        else if (youtubeMatch && youtubeMatch[1]) { return `<div class="embedded-video" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; margin: 1.5em 0; border-radius: 4px; border: 1px solid var(--color-border);"><iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" src="https://www.youtube.com/embed/${youtubeMatch[1]}" frameborder="0" allowfullscreen></iframe></div>`; } 
        else if (imageMatch) { return `<p style="margin: 1.5em 0;"><img src="${trimmedBlock}" style="max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 4px; border: 1px solid var(--color-border);" /></p>`; } 
        else { return `<p>${trimmedBlock.replace(/\n/g, '<br>')}</p>`; } 
    }).join(''); 
}

function renderSection(key, title, items) { 
    const section = document.getElementById(key); if (!section) return; 
    const itemsFromDb = items || siteData[key] || []; 
    const langOrder = ['en', 'ka', 'ua', 'ru']; 
    const langNames = { en: 'English', ka: 'Georgian', ua: 'Ukrainian', ru: 'Russian' }; 
    const itemsByLang = {}; itemsFromDb.forEach(item => { if (!itemsByLang[item.lang]) itemsByLang[item.lang] = []; itemsByLang[item.lang].push(item); }); 
    
    const desktopGridsHTML = langOrder.map(lang => { 
        const langItems = itemsByLang[lang]; if (!langItems) return ''; 
        const slides = []; for (let i = 0; i < langItems.length; i += 3) slides.push(langItems.slice(i, i + 3)); 
        const slidesHTML = slides.map((slideItems, index) => { 
            const cardsHTML = slideItems.map(item => `<a href="/en/${key}/${item.urlSlug}/" class="item-card"><div class="item-card__image" style="background-image: url('${(item.media || []).find(url => !/youtube|vimeo/.test(url)) || ''}')"></div><div class="item-card__content"><h3>${item.title}</h3><div class="card-subtitle">${item.subtitle}</div><p>${item.description}</p></div></a>`).join(''); 
            return `<div class="desktop-grid-slide ${index === 0 ? 'active' : ''}">${cardsHTML}</div>`; 
        }).join(''); 
        const dotsHTML = slides.length > 1 ? slides.map((_, index) => `<span class="desktop-slider-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>`).join('') : ''; 
        return `<div class="desktop-language-group"><h4 class="desktop-lang-title">${langNames[lang]}</h4><div class="desktop-carousel-container">${slidesHTML}</div>${slides.length > 1 ? `<div class="desktop-slider-nav">${dotsHTML}</div>` : ''}</div>`; 
    }).join(''); 
    
    const mobileSlidersHTML = langOrder.map(lang => { 
        const langItems = itemsByLang[lang]; if (!langItems) return ''; 
        const slidesHTML = langItems.map((item, index) => `<div class="item-card ${index === 0 ? 'active' : ''}"><div class="item-card__image" style="background-image: url('${(item.media || []).find(url => !/youtube|vimeo/.test(url)) || ''}')"></div><div class="item-card__content"><h3>${item.title}</h3><div class="card-subtitle">${item.subtitle}</div><p>${item.description}</p></div></div>`).join(''); 
        const dotsHTML = langItems.length > 1 ? langItems.map((_, index) => `<span class="slider-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>`).join('') : ''; 
        return `<div class="language-slider-block"><div class="cross-fade-slider">${slidesHTML}</div><div class="slider-nav">${dotsHTML}</div></div>`; 
    }).join(''); 
    
    section.innerHTML = `<div class="animated-container"><h2>${title}</h2></div><div class="desktop-grid-wrapper">${desktopGridsHTML}</div><div class="mobile-sliders-container">${mobileSlidersHTML}</div>`; 
}

function renderHomePage() {
    const home = siteData.home || {};
    mainContentEl.innerHTML = `
        <section id="hero" class="hero">
            <h1 class="animate-always">${home.h1 || 'Web Development & SEO in Tbilisi'}</h1>
            <div class="hero-subtitle-container animate-always">
                <p>${home.subtitle || ''}</p>
                <ul class="hero-contact-list">
                    <li><a href="https://wa.me/79119396075" target="_blank" rel="noopener noreferrer">WhatsApp</a></li>
                    <li><a href="https://t.me/ramashery" target="_blank" rel="noopener noreferrer">Telegram</a></li>
                    <li><a href="tel:+995591102653">+995 591 102 653</a></li>
                </ul>
            </div>
        </section>
        <section id="services"></section><section id="portfolio"></section><section id="blog"></section><section id="contact"></section>`;
    
    renderSeoTags(home);
    applyCustomBackground(home);
    ['services', 'portfolio', 'blog', 'contact'].forEach(key => renderSection(key, `Our ${key.charAt(0).toUpperCase() + key.slice(1)}`, siteData[key]));
    initMobileSliders();
    initDesktopCarousels();

    const footer = document.getElementById('site-footer');
    if (footer) { footer.style.display = 'block'; footer.innerHTML = `© ${new Date().getFullYear()} Digital Craft.`; footer.onclick = () => { window.location.href = '/admin.html'; }; }
}

function renderDetailPage(collection, slug, lang) {
    const item = siteData[collection]?.find(d => d.urlSlug === slug && d.lang === lang);
    if (!item) { mainContentEl.innerHTML = `<section><h1>404 - Not Found</h1><a href="/">Go back home</a></section>`; return; }
    renderSeoTags(item);
    applyCustomBackground(item);
    const formattedContent = formatContentHtml(item.mainContent);
    mainContentEl.innerHTML = `<section><div class="detail-page-header"><h1 class="animate-always">${item.h1 || ''}</h1>${item.price ? `<div class="detail-price">${item.price}</div>` : ''}</div><div class="detail-content">${formattedContent}</div></section>`;
    renderRelatedPosts(collection, slug, lang);
    document.getElementById('site-footer').style.display = 'none';
}

function renderRelatedPosts(currentCollection, currentSlug, currentLang) { 
    const pool = [ ...(siteData.services || []), ...(siteData.blog || []) ]; 
    const relatedItems = pool.filter(item => item.lang === currentLang && !(item.collection_name === currentCollection && item.urlSlug === currentSlug)).sort(() => 0.5 - Math.random()).slice(0, 3); 
    if (relatedItems.length === 0) return; 
    const itemsHTML = relatedItems.map(item => `<a href="/en/${item.collection_name}/${item.urlSlug}/" class="item-card"><div class="item-card__image" style="background-image: url('${(item.media || []).find(url => !/youtube|vimeo/.test(url)) || ''}')"></div><div class="item-card__content"><h3>${item.title}</h3><div class="card-subtitle">${item.subtitle}</div><p>${item.description}</p></div></a>`).join(''); 
    const relatedSection = document.createElement('section'); relatedSection.id = 'related-posts'; relatedSection.innerHTML = `<h2 class="animated-container">You Might Also Like</h2><div class="item-grid">${itemsHTML}</div>`; 
    mainContentEl.appendChild(relatedSection); 
}

function renderMenu() { 
    const menuEl = document.querySelector('.nav-menu'); if (!menuEl) return; 
    const menuItems = [{ label: 'Home', href: '/' }, { label: 'Services', href: '/#services' }, { label: 'Portfolio', href: '/#portfolio' }, { label: 'Blog', href: '/#blog' }, { label: 'Contact', href: '/#contact' }]; 
    menuEl.innerHTML = menuItems.map(item => `<li><a href="${item.href}">${item.label}</a></li>`).join(''); 
}

function applyCustomBackground(item = null) {
    const iframe = document.getElementById('custom-background-iframe'); if (!iframe) return;
    const customCode = item?.backgroundHtml || siteData.home?.backgroundHtml || '';
    if (customCode && customCode.trim() !== "") {
        if (iframe.srcdoc === customCode && iframe.style.display === 'block') return;
        iframe.classList.remove('is-visible');
        iframe.onload = () => { iframe.classList.add('is-visible'); iframe.onload = null; };
        iframe.style.display = 'block'; iframe.srcdoc = customCode;
    } else { iframe.classList.remove('is-visible'); }
}

// --- NAVIGATION & ROUTING ---
function initDesktopCarousels() { document.querySelectorAll('.desktop-carousel-container').forEach(carousel => { const slides = carousel.querySelectorAll('.desktop-grid-slide'); const nav = carousel.nextElementSibling; if (!nav || !nav.matches('.desktop-slider-nav')) return; const dots = nav.querySelectorAll('.desktop-slider-dot'); if (slides.length <= 1) return; dots.forEach(dot => { dot.onclick = () => { const idx = parseInt(dot.dataset.index); slides.forEach((s, i) => s.classList.toggle('active', i === idx)); dots.forEach((d, i) => d.classList.toggle('active', i === idx)); }; }); }); }
function initMobileSliders() { document.querySelectorAll('.language-slider-block').forEach(sliderBlock => { const slider = sliderBlock.querySelector('.cross-fade-slider'); const slides = slider.querySelectorAll('.item-card'); const nav = sliderBlock.querySelector('.slider-nav'); const dots = nav.querySelectorAll('.slider-dot'); if (slides.length <= 1) return; dots.forEach(dot => { dot.onclick = () => { const idx = parseInt(dot.dataset.index); slides.forEach((s, i) => s.classList.toggle('active', i === idx)); dots.forEach((d, i) => d.classList.toggle('active', i === idx)); }; }); }); }

function routeAndRender(isPopState = false) { 
    if (typeof ym === 'function' && !isPopState) { ym(103413242, 'hit', window.location.href); } 
    const path = window.location.pathname; 
    const detailPageRegex = /^\/(?:([a-z]{2})\/)?(services|portfolio|blog|contact)\/([a-zA-Z0-9-]+)\/?$/; 
    const match = path.match(detailPageRegex); 
    if (match) { renderDetailPage(match[2], match[3], match[1] || 'en'); } 
    else { renderHomePage(); } 
    document.querySelectorAll('.detail-content > *, .detail-price, #related-posts .item-card, .animated-container, .item-card').forEach(el => el.classList.add('animate-on-scroll')); 
    setupObservers(); 
    document.documentElement.style.setProperty('--main-visibility', 'visible'); 
}

function handleNavigation(e) { 
    const link = e.target.closest('a'); 
    if (!link || link.target === '_blank' || link.protocol !== window.location.protocol || link.host !== window.location.host || e.metaKey || e.ctrlKey || e.shiftKey) return; 
    e.preventDefault(); 
    const targetUrl = new URL(link.href); 
    const isMenuOpen = document.body.classList.contains('nav-is-open');
    if (isMenuOpen) { document.body.classList.remove('nav-is-open'); document.querySelector('.menu-toggle').classList.remove('is-active'); document.querySelector('.nav-overlay').classList.remove('is-active'); }
    
    mainContentEl.classList.add('is-transitioning'); 
    setTimeout(() => { 
        window.history.pushState({}, '', targetUrl.href); 
        routeAndRender(); 
        window.scrollTo(0, 0); 
        mainContentEl.classList.remove('is-transitioning'); 
        if (targetUrl.hash) { const el = document.getElementById(targetUrl.hash.substring(1)); if (el) el.scrollIntoView({ behavior: 'smooth' }); }
    }, 300); 
}

function initStaticEventListeners() { 
    document.body.addEventListener('click', handleNavigation); 
    window.addEventListener('popstate', () => routeAndRender(true)); 
    const menuToggle = document.querySelector('.menu-toggle'); 
    const navOverlay = document.querySelector('.nav-overlay'); 
    if (menuToggle && navOverlay) { menuToggle.addEventListener('click', () => { document.body.classList.toggle('nav-is-open'); menuToggle.classList.toggle('is-active'); navOverlay.classList.toggle('is-active'); }); } 
}

async function initApp() { 
    firebase.initializeApp(firebaseConfig); 
    db = firebase.firestore(); 
    initStaticEventListeners(); 
    const isStaticPage = document.body.dataset.staticPage === 'true'; 
    if (isStaticPage) { 
        const loader = document.getElementById('loader'); if (loader) loader.classList.add('hidden'); 
        renderMenu(); 
        siteData = await loadData();
        setupObservers(); 
    } else { 
        siteData = await loadData(); 
        renderMenu(); 
        routeAndRender(); 
        mainContentEl.classList.remove('loading'); 
        const loader = document.getElementById('loader'); if (loader) loader.style.display = 'none'; 
    } 
}

window.addEventListener('DOMContentLoaded', initApp);
