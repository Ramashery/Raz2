// --- CONFIGURATION & STATE ---
let siteData = null;
const mainContentEl = document.querySelector('main');

// --- 1. ПЕРВООЧЕРЕДНАЯ ЗАДАЧА: МЕНЮ ---
function initCore() {
    const toggle = document.querySelector('.menu-toggle');
    const overlay = document.querySelector('.nav-overlay');
    
    if (toggle && overlay) {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            document.body.classList.toggle('nav-is-open');
            toggle.classList.toggle('is-active');
            overlay.classList.toggle('is-active');
        });
    }

    // Слушаем клики по ссылкам для SPA
    document.body.addEventListener('click', handleNavigation);
    window.addEventListener('popstate', () => router(true));
}

// --- 2. ЗАГРУЗКА ДАННЫХ ---
async function loadData() {
    try {
        const response = await fetch('/data.json');
        if (!response.ok) throw new Error('data.json not found');
        siteData = await response.json();
        return siteData;
    } catch (error) {
        console.warn("API Error: Работу в режиме статики (без data.json).", error);
        return null; 
    }
}

// --- 3. РОУТЕР (Управление контентом) ---
async function router(isPopState = false) {
    if (!siteData) await loadData();

    // Если данных всё еще нет, просто выходим (пользователь видит статический HTML)
    if (!siteData) {
        setupObservers(); // Включаем анимации для того, что уже есть
        return;
    }

    const path = window.location.pathname;
    const detailRegex = /^\/(?:([a-z]{2})\/)?(services|portfolio|blog|contact)\/([a-zA-Z0-9-]+)\/?$/;
    const match = path.match(detailRegex);

    if (match) {
        const [, lang, collection, slug] = match;
        renderDetailPage(collection, slug, lang || 'en');
    } else {
        // Если мы на главной, проверяем, нужно ли рендерить секции
        if (!document.querySelector('#services .item-card')) {
            renderHomePage();
        }
    }
    
    setupObservers();
}

// Остальные функции (renderHomePage, renderDetailPage, setupObservers) 
// возьмите из предыдущего main.js. Главное — обновите начало (init и router).

// --- ЗАПУСК ---
document.addEventListener('DOMContentLoaded', () => {
    renderMenu(); 
    initCore();   // Меню включится мгновенно
    router();     // Данные подтянутся позже
});

// Скопируйте сюда функции: handleNavigation, renderMenu, setupObservers, renderHomePage, 
// renderDetailPage, createCardHTML, renderSection, formatContent, initSliders, 
// applyCustomBackground, updateMetaTags, renderRelatedPosts ИЗ ПРЕДЫДУЩЕГО main.js
