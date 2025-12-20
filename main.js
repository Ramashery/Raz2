// --- CONFIGURATION & STATE ---
let siteData = null;
const mainContentEl = document.querySelector('main');
let observers = {
    floating: null,
    animateOnce: null,
    animateAlways: null
};

// --- DATA LOADING (REPLACES FIREBASE) ---
async function loadData() {
    if (siteData) return siteData;
    try {
        const response = await fetch('/data.json');
        if (!response.ok) throw new Error('Failed to load data');
        siteData = await response.json();
        return siteData;
    } catch (error) {
        console.error("Error loading site data:", error);
        return null;
    }
}

// --- ANIMATION OBSERVERS ---
function setupObservers() {
    // Disconnect existing to avoid duplicates
    if (observers.floating) observers.floating.disconnect();
    if (observers.animateOnce) observers.animateOnce.disconnect();
    if (observers.animateAlways) observers.animateAlways.disconnect();

    // 1. Floating Effect (Parallax-like opacity)
    observers.floating = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const target = entry.target;
            const isAboveViewport = entry.boundingClientRect.top < 0 && !entry.isIntersecting;
            if (entry.isIntersecting) {
                target.classList.add('is-visible');
                target.classList.remove('is-above');
            } else {
                target.classList.remove('is-visible');
                if (isAboveViewport) target.classList.add('is-above');
                else target.classList.remove('is-above');
            }
        });
    }, { threshold: 0, rootMargin: "-50px 0px -50px 0px" });

    // 2. Animate Once (Scroll reveal)
    observers.animateOnce = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    // 3. Animate Always (Re-triggers on scroll)
    observers.animateAlways = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            } else {
                entry.target.classList.remove('is-visible');
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    
    document.querySelectorAll('.floating-item').forEach(el => observers.floating.observe(el));
    document.querySelectorAll('.animate-on-scroll').forEach(el => observers.animateOnce.observe(el));
    document.querySelectorAll('.animate-always').forEach(el => observers.animateAlways.observe(el));
}

// --- FORMATTING (Syncs with Python logic) ---
function formatContent(content) {
    if (!content) return '';
    const cleanContent = content.replace(/\r\n/g, '\n');
    const blocks = cleanContent.split(/\n{2,}/); // Split by double newlines

    return blocks.map(block => {
        const trimmed = block.trim();
        if (!trimmed) return '';

        // Check for HTML tags
        if (/^<(p|div|h[1-6]|ul|ol|li|blockquote|hr|table|pre)/i.test(trimmed)) {
            return trimmed;
        }
        
        // YouTube
        const ytMatch = trimmed.match(/^https?:\/\/(?:www\.|m\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.*&v=|shorts\/))([a-zA-Z0-9_-]{11}).*$/);
        if (ytMatch && ytMatch[1]) {
            return `<div class="embedded-video" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; background: #000; margin: 1.5em 0; border-radius: 4px; border: 1px solid var(--color-border);"><iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" src="https://www.youtube.com/embed/${ytMatch[1]}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
        }

        // Image URL
        const imgMatch = trimmed.match(/^https?:\/\/[^<>"']+\.(?:jpg|jpeg|png|gif|webp|svg)\s*$/i);
        if (imgMatch) {
            return `<p style="margin: 1.5em 0;"><img src="${trimmed}" alt="Embedded content" style="max-width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 4px; border: 1px solid var(--color-border);" /></p>`;
        }

        // Paragraph
        return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('');
}

// --- RENDERING SECTIONS (For SPA Navigation) ---
function renderSection(key, title, items) {
    const section = document.getElementById(key);
    if (!section) return;

    // Сортировка и группировка по языкам
    const langOrder = ['en', 'ka', 'ua', 'ru'];
    const langNames = { en: 'English', ka: 'Georgian', ua: 'Ukrainian', ru: 'Russian' };
    const itemsByLang = {};
    
    items.forEach(item => {
        const l = item.lang || 'en';
        if (!itemsByLang[l]) itemsByLang[l] = [];
        itemsByLang[l].push(item);
    });

    // 1. Desktop Layout
    const desktopHTML = langOrder.map(lang => {
        const langItems = itemsByLang[lang];
        if (!langItems || langItems.length === 0) return '';

        // Разбиваем на слайды по 3 элемента
        const slides = [];
        for (let i = 0; i < langItems.length; i += 3) {
            slides.push(langItems.slice(i, i + 3));
        }

        const slidesHTML = slides.map((slideItems, idx) => {
            const cards = slideItems.map(item => createCardHTML(item, key)).join('');
            return `<div class="desktop-grid-slide ${idx === 0 ? 'active' : ''}">${cards}</div>`;
        }).join('');

        const dots = slides.length > 1 ? slides.map((_, i) => `<span class="desktop-slider-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('') : '';

        return `
            <div class="desktop-language-group">
                <h4 class="desktop-lang-title">${langNames[lang]}</h4>
                <div class="desktop-carousel-container">${slidesHTML}</div>
                ${slides.length > 1 ? `<div class="desktop-slider-nav">${dots}</div>` : ''}
            </div>`;
    }).join('');

    // 2. Mobile Layout
    const mobileHTML = langOrder.map(lang => {
        const langItems = itemsByLang[lang];
        if (!langItems || langItems.length === 0) return '';

        const slides = langItems.map((item, idx) => createCardHTML(item, key, idx === 0)).join('');
        const dots = langItems.length > 1 ? langItems.map((_, i) => `<span class="slider-dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('') : '';

        return `
            <div class="language-slider-block">
                <div class="cross-fade-slider">${slides}</div>
                <div class="slider-nav">${dots}</div>
            </div>`;
    }).join('');

    section.innerHTML = `<div class="animated-container"><h2>${title}</h2></div><div class="desktop-grid-wrapper">${desktopHTML}</div><div class="mobile-sliders-container">${mobileHTML}</div>`;
}

function createCardHTML(item, collection, isActive = false) {
    const langPrefix = item.lang && item.lang !== 'en' ? `/${item.lang}` : '';
    let itemUrl = `${langPrefix}/${collection}/${item.urlSlug}/`; // Trailing slash for SEO consistency
    
    // Fix for specific known slug if needed, otherwise standard
    const image = (item.media && item.media.find(url => !url.includes('youtube') && !url.includes('vimeo'))) || '';
    
    return `
        <a href="${itemUrl}" class="item-card ${isActive ? 'active' : ''} animate-on-scroll">
            <div class="item-card__image" style="background-image: url('${image}')"></div>
            <div class="item-card__content">
                <h3>${item.title}</h3>
                <div class="card-subtitle">${item.subtitle}</div>
                <p>${item.description}</p>
            </div>
        </a>
    `;
}

// --- PAGE RENDERERS ---
function renderHomePage() {
    // If we navigated here via SPA, HTML might be missing
    if (!document.getElementById('hero')) {
        mainContentEl.innerHTML = `
            <section id="hero" class="hero">
                <h1 class="animate-always">Web Development & SEO in Tbilisi</h1>
                <div class="hero-subtitle-container animate-always">
                    <p>We create high-performance websites for Georgian businesses that attract clients and boost revenue. Modern design, cutting-edge technology, and measurable results.</p>
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
    }
    
    applyCustomBackground(siteData.home);
    updateMetaTags(siteData.home);

    ['services', 'portfolio', 'blog', 'contact'].forEach(key => {
        renderSection(key, `Our ${key.charAt(0).toUpperCase() + key.slice(1)}`, siteData[key] || []);
    });

    initSliders(); // Re-init interactive elements
    
    const footer = document.getElementById('site-footer');
    if (footer) {
        footer.style.display = 'block';
        footer.innerHTML = `© ${new Date().getFullYear()} Digital Craft. All rights reserved.`;
        footer.onclick = () => { window.location.href = '/admin.html'; };
    }
}

function renderDetailPage(collection, slug, lang) {
    const item = siteData[collection]?.find(d => d.urlSlug === slug && d.lang === lang);
    
    if (!item) {
        mainContentEl.innerHTML = `<section class="detail-page-header"><h1>404 - Not Found</h1><p>The page you were looking for does not exist.</p><a href="/">Go back home</a></section>`;
        return;
    }

    applyCustomBackground(item);
    updateMetaTags(item);

    mainContentEl.innerHTML = `
        <section>
            <div class="detail-page-header">
                <h1 class="animate-always">${item.h1 || item.title}</h1>
                ${item.price ? `<div class="detail-price animate-on-scroll">${item.price}</div>` : ''}
            </div>
            <div class="detail-content floating-item">
                ${formatContent(item.mainContent)}
            </div>
        </section>
    `;

    renderRelatedPosts(collection, slug, lang);
    document.getElementById('site-footer').style.display = 'none';
}

function renderRelatedPosts(currentCol, currentSlug, currentLang) {
    if (!siteData.services || !siteData.blog) return;
    
    const pool = [
        ...siteData.services.map(i => ({ ...i, collection: 'services' })),
        ...siteData.blog.map(i => ({ ...i, collection: 'blog' }))
    ];

    const related = pool
        .filter(item => item.lang === currentLang && item.urlSlug !== currentSlug)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

    if (related.length === 0) return;

    const cards = related.map(item => createCardHTML(item, item.collection)).join('');
    
    const section = document.createElement('section');
    section.id = 'related-posts';
    section.innerHTML = `<h2 class="animate-on-scroll">You Might Also Like</h2><div class="item-grid">${cards}</div>`;
    mainContentEl.appendChild(section);
}

function updateMetaTags(data) {
    if (!data) return;
    document.title = data.seoTitle || "Digital Craft";
    // In a real SPA, updating meta tags is tricky for SEO crawlers without SSR,
    // but for user experience (tab title) it works.
    // Since we use Python for SSG, crawlers see the correct tags from the HTML files.
}

function applyCustomBackground(item) {
    const iframe = document.getElementById('custom-background-iframe');
    if (!iframe) return;

    const customCode = item?.backgroundHtml || '';

    if (customCode && customCode.trim() !== "") {
        if (iframe.srcdoc === customCode && iframe.style.display === 'block') return;
        
        iframe.classList.remove('is-visible');
        iframe.onload = () => {
            iframe.classList.add('is-visible');
            iframe.onload = null;
        };
        iframe.style.display = 'block';
        iframe.srcdoc = customCode;
    } else {
        iframe.classList.remove('is-visible');
        // Optional: delay hiding display none to allow fade out
        setTimeout(() => { if (!iframe.classList.contains('is-visible')) iframe.style.display = 'none'; }, 800);
    }
}

// --- INTERACTIVE ELEMENTS (SLIDERS) ---
function initSliders() {
    // 1. Desktop
    document.querySelectorAll('.desktop-carousel-container').forEach(carousel => {
        const slides = carousel.querySelectorAll('.desktop-grid-slide');
        const nav = carousel.nextElementSibling;
        if (!nav || !nav.matches('.desktop-slider-nav') || slides.length <= 1) return;
        
        const dots = nav.querySelectorAll('.desktop-slider-dot');
        let index = 0;
        let timer;

        const setSlide = (i) => {
            index = (i + slides.length) % slides.length;
            slides.forEach((s, idx) => s.classList.toggle('active', idx === index));
            dots.forEach((d, idx) => d.classList.toggle('active', idx === index));
        };

        const play = () => { clearInterval(timer); timer = setInterval(() => setSlide(index + 1), 7000); };
        
        nav.addEventListener('click', e => {
            if (e.target.matches('.desktop-slider-dot')) {
                setSlide(parseInt(e.target.dataset.index));
                play();
            }
        });
        
        play();
    });

    // 2. Mobile
    document.querySelectorAll('.language-slider-block').forEach(block => {
        const slides = block.querySelectorAll('.item-card');
        const nav = block.querySelector('.slider-nav');
        if (!nav || slides.length <= 1) return;

        const dots = nav.querySelectorAll('.slider-dot');
        let index = 0;
        let timer;
        let startX = 0;

        const setSlide = (i) => {
            index = (i + slides.length) % slides.length;
            slides.forEach((s, idx) => s.classList.toggle('active', idx === index));
            dots.forEach((d, idx) => d.classList.toggle('active', idx === index));
        };

        const play = () => { clearInterval(timer); timer = setInterval(() => setSlide(index + 1), 5000); };

        nav.addEventListener('click', e => {
            if (e.target.matches('.slider-dot')) {
                setSlide(parseInt(e.target.dataset.index));
                play();
            }
        });

        const slider = block.querySelector('.cross-fade-slider');
        slider.addEventListener('touchstart', e => { startX = e.changedTouches[0].screenX; clearInterval(timer); }, {passive: true});
        slider.addEventListener('touchend', e => {
            const diff = e.changedTouches[0].screenX - startX;
            if (Math.abs(diff) > 40) setSlide(index + (diff > 0 ? -1 : 1));
            play();
        }, {passive: true});

        play();
    });
}

function renderMenu() {
    const menuEl = document.querySelector('.nav-menu');
    if (!menuEl) return;
    const items = [
        { l: 'Home', h: '/' }, { l: 'Services', h: '/#services' },
        { l: 'Portfolio', h: '/#portfolio' }, { l: 'Blog', h: '/#blog' },
        { l: 'Contact', h: '/#contact' }
    ];
    menuEl.innerHTML = items.map(i => `<li><a href="${i.h}">${i.l}</a></li>`).join('');
}

// --- ROUTER ---
async function router(isPopState = false) {
    if (!siteData) await loadData();

    const path = window.location.pathname;
    
    // Track Analytics
    if (typeof ym === 'function' && !isPopState) {
        ym(103413242, 'hit', window.location.href);
    }

    const detailRegex = /^\/(?:([a-z]{2})\/)?(services|portfolio|blog|contact)\/([a-zA-Z0-9-]+)\/?$/;
    const match = path.match(detailRegex);

    // Scroll to top if not hash nav
    if (!window.location.hash) window.scrollTo({ top: 0, behavior: 'smooth' });

    if (match) {
        const [, lang, collection, slug] = match;
        renderDetailPage(collection, slug, lang || 'en');
    } else {
        renderHomePage();
    }
    
    setupObservers();
}

function handleNavigation(e) {
    const link = e.target.closest('a');
    if (!link || link.target === '_blank' || link.host !== window.location.host) return;

    const url = new URL(link.href);
    
    // Close mobile menu
    document.body.classList.remove('nav-is-open');
    document.querySelector('.menu-toggle')?.classList.remove('is-active');
    document.querySelector('.nav-overlay')?.classList.remove('is-active');

    // Hash navigation on same page
    if (url.pathname === window.location.pathname && url.hash) {
        const target = document.querySelector(url.hash);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
            history.pushState(null, '', url.href);
        }
        return;
    }

    e.preventDefault();
    
    // Page Transition
    mainContentEl.style.transition = 'opacity 0.3s ease';
    mainContentEl.style.opacity = '0';
    
    setTimeout(async () => {
        history.pushState(null, '', url.href);
        await router();
        mainContentEl.style.opacity = '1';
        
        // Handle hash after page load
        if (url.hash) {
            setTimeout(() => {
                document.querySelector(url.hash)?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, 300);
}

// --- INITIALIZATION ---
async function init() {
    renderMenu();
    
    // Menu Toggle
    const toggle = document.querySelector('.menu-toggle');
    const overlay = document.querySelector('.nav-overlay');
    if (toggle) {
        toggle.addEventListener('click', () => {
            document.body.classList.toggle('nav-is-open');
            toggle.classList.toggle('is-active');
            overlay.classList.toggle('is-active');
        });
    }

    // Handle Links
    document.body.addEventListener('click', handleNavigation);
    window.addEventListener('popstate', () => router(true));

    // Load data silently in background for future navigation
    loadData().then(() => {
        // Hydration: Just init interactive parts since HTML is there
        initSliders();
        
        // Apply background if needed (if static HTML didn't handle it)
        const path = window.location.pathname;
        if (path === '/' || path === '/index.html') {
            if(siteData && siteData.home) applyCustomBackground(siteData.home);
            
            // Re-render sections if they are empty (fallback)
            // But usually Python fills them. If not, this helps.
            if (!document.querySelector('#services .item-card') && siteData) {
                ['services', 'portfolio', 'blog', 'contact'].forEach(key => {
                    renderSection(key, `Our ${key.charAt(0).toUpperCase() + key.slice(1)}`, siteData[key] || []);
                });
            }
        }
    });

    // Start Animations
    setupObservers();
    
    const footer = document.getElementById('site-footer');
    if (footer && (window.location.pathname === '/' || window.location.pathname === '/index.html')) {
        footer.style.display = 'block';
        footer.innerHTML = `© ${new Date().getFullYear()} Digital Craft. All rights reserved.`;
        footer.onclick = () => { window.location.href = '/admin.html'; };
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);
