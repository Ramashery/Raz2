// --- ИНИЦИАЛИЗАЦИЯ ПЕРЕМЕННЫХ ---
let floatingObserver, animateOnceObserver;

// --- АНИМАЦИИ (Intersection Observer) ---
function setupObservers() {
    // Анимация "всплытия" при скролле (один раз)
    animateOnceObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    // "Плавающая" анимация (постоянно)
    floatingObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            } else {
                entry.target.classList.remove('is-visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.animate-on-scroll').forEach(el => animateOnceObserver.observe(el));
    document.querySelectorAll('.animate-always, .floating-item').forEach(el => floatingObserver.observe(el));
}

// --- МОБИЛЬНОЕ МЕНЮ ---
function initMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const navOverlay = document.querySelector('.nav-overlay');
    
    if (menuToggle && navOverlay) {
        menuToggle.addEventListener('click', () => {
            document.body.classList.toggle('nav-is-open');
            menuToggle.classList.toggle('is-active');
            navOverlay.classList.toggle('is-active');
        });

        // Закрываем меню при клике на ссылку (для якорей на главной)
        navOverlay.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                document.body.classList.remove('nav-is-open');
                menuToggle.classList.remove('is-active');
                navOverlay.classList.remove('is-active');
            });
        });
    }
}

// --- СЛАЙДЕРЫ (Кросс-фейд для мобильных) ---
function initMobileSliders() {
    document.querySelectorAll('.language-slider-block').forEach(sliderBlock => {
        const slides = sliderBlock.querySelectorAll('.item-card');
        const dots = sliderBlock.querySelectorAll('.slider-dot');
        if (slides.length <= 1) return;

        let currentIndex = 0;

        function goToSlide(index) {
            currentIndex = (index + slides.length) % slides.length;
            slides.forEach((s, i) => s.classList.toggle('active', i === currentIndex));
            dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
        }

        sliderBlock.querySelector('.slider-nav').addEventListener('click', e => {
            if (e.target.matches('.slider-dot')) {
                goToSlide(parseInt(e.target.dataset.index));
            }
        });

        // Автопереключение каждые 5 секунд
        setInterval(() => goToSlide(currentIndex + 1), 5000);
    });
}

// --- УПРАВЛЕНИЕ ФОНОМ ---
function applyBackground() {
    const iframe = document.getElementById('custom-background-iframe');
    if (!iframe) return;
    
    // Здесь можно добавить логику смены фона через iframe
    // Например, просто делаем его видимым через задержку
    setTimeout(() => {
        iframe.style.display = 'block';
        iframe.classList.add('is-visible');
    }, 1000);
}

// --- ЗАПУСК ПРИ ЗАГРУЗКЕ ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Убираем лоадер
    const loader = document.getElementById('loader');
    if (loader) {
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        }, 300);
    }

    // 2. Запускаем компоненты
    setupObservers();
    initMenu();
    initMobileSliders();
    applyBackground();

    // 3. Плавный скролл для якорей
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});
