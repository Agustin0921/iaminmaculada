// scroll-animations.js
// ===== SISTEMA DE ANIMACIONES AL SCROLL =====

class ScrollAnimations {
    constructor() {
        this.observer = null;
        this.animatedElements = new Set();
        this.init();
    }

    init() {
        // Configurar el Intersection Observer
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateElement(entry.target);
                }
            });
        }, options);

        // Esperar a que la página cargue completamente
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupAnimations());
        } else {
            this.setupAnimations();
        }

        // También observar elementos que se agreguen dinámicamente
        this.setupMutationObserver();
    }

    setupAnimations() {
        console.log("🎬 Configurando animaciones al scroll...");

        // Animaciones para el Hero Section
        this.setupHeroAnimations();

        // Animaciones para secciones con clase scroll-animate
        document.querySelectorAll('.scroll-animate').forEach(el => {
            this.observer.observe(el);
            this.animatedElements.add(el);
        });

        // Animaciones específicas
        this.setupSpecificAnimations();

        // Iniciar animaciones que están en viewport al cargar
        this.checkInitialViewport();
    }

    setupHeroAnimations() {
        const heroTitle = document.querySelector('.hero-title');
        const heroSubtitle = document.querySelector('.hero-subtitle');
        const heroInfoItems = document.querySelectorAll('.info-item');
        const heroButtons = document.querySelectorAll('.hero .btn');

        if (heroTitle) heroTitle.classList.add('hero-animate');
        if (heroSubtitle) heroSubtitle.classList.add('hero-animate', 'hero-delay-1');
        
        heroInfoItems.forEach((item, index) => {
            item.classList.add('hero-animate', `hero-delay-${index + 2}`);
        });

        heroButtons.forEach((btn, index) => {
            btn.classList.add('hero-animate', `hero-delay-${heroInfoItems.length + 2 + index}`);
        });
    }

    setupSpecificAnimations() {
        // Animaciones para features
        document.querySelectorAll('.feature-card').forEach((card, index) => {
            card.classList.add('scroll-animate', 'animate-scale', `delay-${index % 6}`);
            this.observer.observe(card);
        });

        // Animaciones para timeline
        document.querySelectorAll('.timeline-item').forEach((item, index) => {
            item.classList.add('scroll-animate', 'animate-slide-left', `delay-${index % 4}`);
            this.observer.observe(item);
        });

        // Animaciones para countdown
        document.querySelectorAll('.countdown-unit').forEach((unit, index) => {
            unit.classList.add('countdown-animate', `countdown-delay-${index + 1}`);
        });

        // Animaciones para stats
        document.querySelectorAll('.stat-badge').forEach((stat, index) => {
            stat.classList.add('scroll-animate', 'stat-animate', `delay-${index}`);
            this.observer.observe(stat);
        });

        // Animaciones para forms
        const formCard = document.querySelector('.form-card');
        if (formCard) {
            formCard.classList.add('scroll-animate', 'form-animate', 'delay-1');
            this.observer.observe(formCard);
        }

        // Animaciones para gallery
        document.querySelectorAll('.gallery-item').forEach((item, index) => {
            item.classList.add('scroll-animate', 'gallery-animate', `delay-${index % 4}`);
            this.observer.observe(item);
        });

        // Animaciones para cards IAM
        document.querySelectorAll('.iam-card').forEach((card, index) => {
            card.classList.add('scroll-animate', 'card-animate', `delay-${index}`);
            this.observer.observe(card);
        });

        // Animaciones para timeline dots IAM
        document.querySelectorAll('.iam-event-dot').forEach((dot, index) => {
            dot.classList.add('timeline-dot-animate');
            this.observer.observe(dot);
        });

        // Animaciones para íconos
        document.querySelectorAll('.feature-icon, .iam-card-header i').forEach((icon, index) => {
            icon.classList.add('icon-animate');
            this.observer.observe(icon);
        });

        // Animaciones para botones
        document.querySelectorAll('.btn').forEach((btn, index) => {
            if (!btn.classList.contains('hero-animate')) {
                btn.classList.add('btn-animate', `delay-${index % 4}`);
                this.observer.observe(btn);
            }
        });

        // Animación para progress bar
        const progressBar = document.getElementById('spotsProgressBar');
        if (progressBar) {
            progressBar.classList.add('progress-animate');
            this.observer.observe(progressBar);
            
            // Establecer el ancho final cuando se muestre
            const filledPercentage = (parseInt(document.getElementById('applicantCount')?.textContent || 0) / 100) * 100;
            progressBar.style.setProperty('--progress-width', `${filledPercentage}%`);
        }
    }

    animateElement(element) {
        if (element.classList.contains('show')) return;

        // Agregar clase show para activar animación
        element.classList.add('show');

        // Para elementos con números, animar contadores
        if (element.classList.contains('counter-animate')) {
            this.animateCounter(element);
        }

        // Para timeline dots
        if (element.classList.contains('timeline-dot-animate')) {
            setTimeout(() => element.classList.add('show'), 300);
        }

        // Para progress bars
        if (element.classList.contains('progress-animate')) {
            setTimeout(() => element.classList.add('show'), 200);
        }

        // Para wave effect
        if (element.classList.contains('wave-animate')) {
            setTimeout(() => {
                element.classList.add('show');
                // Remover el pseudo-elemento después de la animación
                setTimeout(() => {
                    element.style.overflow = 'visible';
                }, 1500);
            }, 100);
        }

        // Remover del observer después de animar
        this.observer.unobserve(element);
    }

    animateCounter(element) {
        const target = parseInt(element.textContent.replace(/\D/g, ''));
        if (isNaN(target)) return;

        let current = 0;
        const increment = target / 50;
        const duration = 1500;
        const stepTime = duration / 50;

        const counter = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = target.toLocaleString();
                clearInterval(counter);
            } else {
                element.textContent = Math.floor(current).toLocaleString();
            }
        }, stepTime);
    }

    setupMutationObserver() {
        // Observar cambios en el DOM para animar elementos nuevos
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        if (node.classList && node.classList.contains('scroll-animate')) {
                            this.observer.observe(node);
                        }
                        // También observar hijos del nodo agregado
                        node.querySelectorAll?.('.scroll-animate').forEach(child => {
                            this.observer.observe(child);
                        });
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    checkInitialViewport() {
        // Verificar elementos que ya están en el viewport al cargar
        const elements = document.querySelectorAll('.scroll-animate, .hero-animate, .countdown-animate');
        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const isInViewport = rect.top <= window.innerHeight && rect.bottom >= 0;
            
            if (isInViewport && !el.classList.contains('show')) {
                this.animateElement(el);
            }
        });
    }

    // Método para forzar animación de un elemento específico
    forceAnimate(selector) {
        document.querySelectorAll(selector).forEach(el => {
            this.animateElement(el);
        });
    }

    // Método para reiniciar animaciones
    resetAnimations() {
        this.animatedElements.forEach(el => {
            el.classList.remove('show');
            this.observer.observe(el);
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.scrollAnimations = new ScrollAnimations();
    
    // Agregar evento para reiniciar animaciones si es necesario
    window.addEventListener('resize', () => {
        // Pequeño delay para que termine el resize
        setTimeout(() => window.scrollAnimations?.checkInitialViewport(), 100);
    });
});

// Exportar para uso global
window.ScrollAnimations = ScrollAnimations;