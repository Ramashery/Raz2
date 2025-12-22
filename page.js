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
let floatingObserver, animateOnceObserver;

// --- 1. Вспомогательные функции (Контент и SEO) ---

function formatContentHtml(content) {
    if (!content) return '';
    let processedContent = content.replace(/\r\n/g, '\n');
    const blocks = processedContent.split(/\n{2,}/);
    return blocks.map(block => {
        const trimmedBlock = block.trim();
        if (!trimmedBlock) return '';
        // Обработка YouTube ссылок
        const youtubeRegex = /^https?:\/\/(?:www\.|m\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch?v=|watch\?.*&v=|shorts\/))([a-zA-Z0-9_-]{11}).*$/;
        const youtubeMatch = trimmedBlock.match(youtubeRegex);
        
        if (youtubeMatch && youtubeMatch[1]) {
            return `<div class="embedded-video" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin: 1.5em 0; border-radius: 4px; border: 1px solid var(--color-border);">
                <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" src="https://www.youtube.com/embed/${youtubeMatch[1]}" frameborder="0" allowfullscreen></iframe>
            </div>`;
        }
        return `<p>${trimmedBlock.replace(/\n/g, '<br>')}</p>`;
    }).join('');
}

function updateSeo(item) {
    if (!item) return;
    document.title = item.seoTitle || item.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = item.metaDescription || "";
}

// --- 2. Функции рендеринга ---

function renderMenu() {
    const menuEl = document.querySelector('.nav-menu');
    if (!menuEl) return;
    const menuItems = [
        { label: 'Home', href: '/' },
        { label: 'Services', href: '/#services' },
        { label: 'Portfolio', href: '/#portfolio' },
        { label: 'Blog', href: '/#blog' },
        { label: 'Contact', href: '/#contact' }
    ];
    menuEl.innerHTML = menuItems.map(item => `<li><a href="${item.href}">${item.label}</a></li>`).join('');
}

function renderDetailPage(collection, slug, lang) {
    const mainContentEl = document.querySelector('main');
    const item = siteData[collection]?.find(d => d.urlSlug === slug && d.lang === lang);

    if (!item) {
        mainContentEl.innerHTML = `<section class="detail-page-header"><h1>404 - Not Found</h1><p>Page not found.</p><a href="/">Go back home</a></section>`;
        return;
    }

    updateSeo(item);
    applyCustomBackground(item);

    const formattedContent = formatContentHtml(item.mainContent);

    mainContentEl.innerHTML = `
        <section>
            <div class="detail-page-header">
                <h1 class="animate-always">${item.h1 || item.title}</h1>
                ${item.price ? `<div class="detail-price animate-on-scroll">${item.price}</div>` : ''}
            </div>
            <div class="detail-content floating-item">
                ${formattedContent}
            </div>
        </section>
        <section id="related-posts"></section>
    `;

    renderRelatedPosts(collection, slug, lang);
}

function renderRelatedPosts(currentCollection, currentSlug, currentLang) {
    const relatedContainer = document.getElementById('related-posts');
    if (!relatedContainer) return;

    // Собираем похожие записи из услуг и блога
    const pool = [
        ...(siteData.services || []).map(i => ({ ...i, col: 'services' })),
        ...(siteData.blog || []).map(i => ({ ...i, col: 'blog' }))
    ];

    const relatedItems = pool
        .filter(item => item.lang === currentLang && !(item.col === currentCollection && item.urlSlug === currentSlug))
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

    if (relatedItems.length === 0) return;

    const itemsHTML = relatedItems.map(item => `
        <a href="/${item.lang}/${item.col}/${item.urlSlug}" class="item-card animate-on-scroll">
            <div class="item-card__image" style="background-image: url('${item.media?.[0] || ''}')"></div>
            <div class="item-card__content">
                <h3>${item.title}</h3>
                <div class="card-subtitle">${item.subtitle}</div>
                <p>${item.description}</p>
            </div>
        </a>
    `).join('');

    relatedContainer.innerHTML = `
        <h2 class="animated-container">You Might Also Like</h2>
        <div class="item-grid">${itemsHTML}</div>
    `;
}

function applyCustomBackground(item) {
    const iframe = document.getElementById('custom-background-iframe');
    if (!iframe) return;
    const customCode = item?.backgroundHtml || siteData.home?.backgroundHtml || '';
    if (customCode.trim() !== "") {
        iframe.style.display = 'block';
        iframe.srcdoc = customCode;
        setTimeout(() => iframe.classList.add('is-visible'), 100);
    }
}

// --- 3. Анимации ---

function setupObservers() {
    const observerOptions = { threshold: 0.1 };
    
    animateOnceObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-always, .animate-on-scroll, .floating-item').forEach(el => {
        animateOnceObserver.observe(el);
    });
}

// --- 4. Инициализация ---

async function initPage() {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();

    // Загрузка всех данных (нужно для меню и похожих записей)
    const collections = ['services', 'portfolio', 'blog', 'contact'];
    const homeDoc = await db.collection('home').doc('content').get();
    siteData.home = homeDoc.data();
    
    for (const col of collections) {
        const snap = await db.collection(col).get();
        siteData[col] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    renderMenu();

    // Парсим URL
    // Путь обычно: /en/services/slug или /services/slug
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    
    let lang = 'en';
    let collection = '';
    let slug = '';

    if (pathParts.length === 3) {
        [lang, collection, slug] = pathParts;
    } else if (pathParts.length === 2) {
        [collection, slug] = pathParts;
    }

    if (collection && slug) {
        renderDetailPage(collection, slug, lang);
    }

    // Обработчик меню
    const menuToggle = document.querySelector('.menu-toggle');
    const navOverlay = document.querySelector('.nav-overlay');
    if (menuToggle) {
        menuToggle.onclick = () => {
            document.body.classList.toggle('nav-is-open');
            menuToggle.classList.toggle('is-active');
            navOverlay.classList.toggle('is-active');
        };
    }

    setupObservers();
    
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
}

window.addEventListener('DOMContentLoaded', initPage);
