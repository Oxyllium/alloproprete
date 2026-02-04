/* ==========================================================================
   ALLOPROPRETE - Premium JavaScript
   Direction: Corporate Authority / Sophisticated Interactions
   ========================================================================== */

(function() {
    'use strict';

    /* ===== DATA LAYER INITIALIZATION (GTM Ready) ===== */
    window.dataLayer = window.dataLayer || [];

    function trackEvent(eventName, eventParams = {}) {
        window.dataLayer.push({
            event: eventName,
            ...eventParams
        });

        // Debug mode (remove in production)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('📊 Event:', eventName, eventParams);
        }
    }

    /* ===== UTILITY FUNCTIONS ===== */
    function throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    /* ===== HEADER & NAVIGATION PREMIUM ===== */
    const header = document.querySelector('.header');
    const navToggle = document.querySelector('.header__toggle');
    const nav = document.querySelector('.header__nav');
    const dropdownTriggers = document.querySelectorAll('.header__dropdown-trigger');

    let lastScrollY = 0;
    let headerHidden = false;

    // Premium header scroll effect with hide/show
    function handleHeaderScroll() {
        const currentScrollY = window.scrollY;

        // Add scrolled class
        if (currentScrollY > 50) {
            header?.classList.add('header--scrolled');
        } else {
            header?.classList.remove('header--scrolled');
        }

        // Hide/show header on scroll direction (only after 300px)
        if (currentScrollY > 300) {
            if (currentScrollY > lastScrollY && !headerHidden) {
                header?.classList.add('header--hidden');
                headerHidden = true;
            } else if (currentScrollY < lastScrollY && headerHidden) {
                header?.classList.remove('header--hidden');
                headerHidden = false;
            }
        } else {
            header?.classList.remove('header--hidden');
            headerHidden = false;
        }

        lastScrollY = currentScrollY;
    }

    window.addEventListener('scroll', throttle(handleHeaderScroll, 100), { passive: true });
    handleHeaderScroll();

    // Mobile menu toggle with animation
    navToggle?.addEventListener('click', function() {
        this.classList.toggle('header__toggle--active');
        nav?.classList.toggle('header__nav--open');

        if (nav?.classList.contains('header__nav--open')) {
            document.body.style.overflow = 'hidden';
            // Animate menu items
            animateMenuItems();
        } else {
            document.body.style.overflow = '';
        }

        trackEvent('menu_toggle', {
            action: nav?.classList.contains('header__nav--open') ? 'open' : 'close'
        });
    });

    function animateMenuItems() {
        const menuItems = nav?.querySelectorAll('.header__link, .header__dropdown');
        menuItems?.forEach((item, index) => {
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';

            setTimeout(() => {
                item.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, 100 + (index * 50));
        });
    }

    // Mobile dropdown toggles
    dropdownTriggers.forEach(trigger => {
        trigger.addEventListener('click', function(e) {
            if (window.innerWidth <= 1024) {
                e.preventDefault();
                this.closest('.header__dropdown')?.classList.toggle('header__dropdown--open');
            }
        });
    });

    // Close menu on resize
    window.addEventListener('resize', debounce(function() {
        if (window.innerWidth > 1024) {
            nav?.classList.remove('header__nav--open');
            navToggle?.classList.remove('header__toggle--active');
            document.body.style.overflow = '';
            document.querySelectorAll('.header__dropdown--open').forEach(d => {
                d.classList.remove('header__dropdown--open');
            });
        }
    }, 150));

    /* ===== PREMIUM SCROLL REVEAL ANIMATIONS ===== */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        rootMargin: '0px 0px -80px 0px',
        threshold: 0.1
    });

    // Observe all reveal elements
    document.querySelectorAll('.reveal').forEach(el => {
        revealObserver.observe(el);
    });

    // Stagger children animation observer
    const staggerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                staggerObserver.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1
    });

    document.querySelectorAll('.stagger-children').forEach(el => {
        staggerObserver.observe(el);
    });

    /* ===== ANIMATED COUNTERS ===== */
    function animateCounter(element, target, duration = 2000) {
        const start = 0;
        const startTime = performance.now();
        const suffix = element.dataset.suffix || '';
        const prefix = element.dataset.prefix || '';
        const decimals = parseInt(element.dataset.decimals) || 0;

        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = start + (target - start) * easeOut;

            element.textContent = prefix + current.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + suffix;

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        }

        requestAnimationFrame(updateCounter);
    }

    // Counter observer
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseFloat(entry.target.dataset.target) || 0;
                animateCounter(entry.target, target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.5
    });

    document.querySelectorAll('[data-counter]').forEach(el => {
        counterObserver.observe(el);
    });

    /* ===== STATS NUMBER ANIMATION ===== */
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumbers = entry.target.querySelectorAll('.stat__number, .hero-stat__number');

                statNumbers.forEach((num, index) => {
                    setTimeout(() => {
                        num.classList.add('animate');

                        // Extract number from text
                        const text = num.textContent;
                        const match = text.match(/[\d\s,\.]+/);

                        if (match) {
                            const numericValue = parseFloat(match[0].replace(/[\s,]/g, '').replace(',', '.'));
                            const prefix = text.substring(0, text.indexOf(match[0]));
                            const suffix = text.substring(text.indexOf(match[0]) + match[0].length);

                            if (!isNaN(numericValue)) {
                                animateStatNumber(num, numericValue, prefix, suffix);
                            }
                        }
                    }, index * 150);
                });

                statsObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.3
    });

    function animateStatNumber(element, target, prefix = '', suffix = '') {
        const duration = 2000;
        const startTime = performance.now();
        const isDecimal = target % 1 !== 0;

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = target * easeOut;

            let formattedNumber;
            if (isDecimal) {
                formattedNumber = current.toFixed(1).replace('.', ',');
            } else if (target >= 1000) {
                formattedNumber = Math.round(current).toLocaleString('fr-FR').replace(/\s/g, ' ');
            } else {
                formattedNumber = Math.round(current);
            }

            element.textContent = prefix + formattedNumber + suffix;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    document.querySelectorAll('.stats, .hero__stats, .stats-panel').forEach(el => {
        statsObserver.observe(el);
    });

    /* ===== SCROLL DEPTH TRACKING ===== */
    const scrollDepths = [25, 50, 75, 100];
    const trackedDepths = new Set();

    function trackScrollDepth() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = Math.round((scrollTop / docHeight) * 100);

        scrollDepths.forEach(depth => {
            if (scrollPercent >= depth && !trackedDepths.has(depth)) {
                trackedDepths.add(depth);
                trackEvent('scroll_depth', {
                    depth: depth,
                    page: window.location.pathname
                });
            }
        });
    }

    window.addEventListener('scroll', throttle(trackScrollDepth, 250), { passive: true });

    /* ===== PREMIUM PARALLAX EFFECTS ===== */
    const parallaxElements = document.querySelectorAll('[data-parallax]');

    function updateParallax() {
        const scrollY = window.scrollY;

        parallaxElements.forEach(el => {
            const speed = parseFloat(el.dataset.parallax) || 0.1;
            const rect = el.getBoundingClientRect();
            const centerY = rect.top + rect.height / 2;
            const viewportCenter = window.innerHeight / 2;
            const distance = centerY - viewportCenter;

            el.style.transform = `translateY(${distance * speed}px)`;
        });
    }

    if (parallaxElements.length > 0) {
        window.addEventListener('scroll', throttle(updateParallax, 16), { passive: true });
    }

    /* ===== MAGNETIC BUTTONS ===== */
    const magneticButtons = document.querySelectorAll('.btn--magnetic, .btn--primary');

    magneticButtons.forEach(button => {
        button.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            this.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
        });

        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translate(0, 0)';
        });
    });

    /* ===== CTA CLICK TRACKING ===== */
    document.addEventListener('click', function(e) {
        const cta = e.target.closest('[data-cta]');
        if (cta) {
            trackEvent('cta_click', {
                cta_name: cta.dataset.cta,
                cta_text: cta.textContent.trim(),
                page: window.location.pathname
            });
        }

        // Email click tracking
        const emailLink = e.target.closest('a[href^="mailto:"]');
        if (emailLink) {
            trackEvent('conversion_email_click', {
                email: emailLink.href.replace('mailto:', ''),
                page: window.location.pathname
            });
        }

        // Phone click tracking
        const phoneLink = e.target.closest('a[href^="tel:"]');
        if (phoneLink) {
            trackEvent('conversion_phone_click', {
                phone: phoneLink.href.replace('tel:', ''),
                page: window.location.pathname
            });
        }
    });

    /* ===== FAQ ACCORDION PREMIUM ===== */
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-item__question');
        const answer = item.querySelector('.faq-item__answer');

        // Set initial max-height for animation
        if (answer) {
            answer.style.maxHeight = item.classList.contains('faq-item--open')
                ? answer.scrollHeight + 'px'
                : '0';
        }

        question?.addEventListener('click', function() {
            const isOpen = item.classList.contains('faq-item--open');

            // Close all other items with animation
            faqItems.forEach(other => {
                if (other !== item && other.classList.contains('faq-item--open')) {
                    other.classList.remove('faq-item--open');
                    const otherAnswer = other.querySelector('.faq-item__answer');
                    if (otherAnswer) otherAnswer.style.maxHeight = '0';
                }
            });

            // Toggle current item
            item.classList.toggle('faq-item--open');

            if (answer) {
                answer.style.maxHeight = !isOpen ? answer.scrollHeight + 'px' : '0';
            }

            trackEvent('faq_interaction', {
                question: question.textContent.trim().substring(0, 50),
                action: isOpen ? 'close' : 'open'
            });
        });
    });

    /* ===== FORM HANDLING PREMIUM ===== */
    const forms = document.querySelectorAll('.form[data-form-id]');

    forms.forEach(form => {
        const formId = form.dataset.formId;
        let formStarted = false;

        // Floating labels animation
        form.querySelectorAll('.form__input, .form__textarea').forEach(field => {
            field.addEventListener('focus', function() {
                this.parentNode.classList.add('focused');
            });

            field.addEventListener('blur', function() {
                if (!this.value) {
                    this.parentNode.classList.remove('focused');
                }
            });

            // Check initial state
            if (field.value) {
                field.parentNode.classList.add('focused');
            }
        });

        // Track form start
        form.querySelectorAll('input, select, textarea').forEach(field => {
            field.addEventListener('focus', function() {
                if (!formStarted) {
                    formStarted = true;
                    trackEvent('form_start', {
                        form_id: formId,
                        first_field: this.name || this.id,
                        page: window.location.pathname
                    });
                }
            }, { once: true });
        });

        // Form submission
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            // Validate form
            if (!validateForm(form)) {
                // Shake animation on error
                form.classList.add('shake');
                setTimeout(() => form.classList.remove('shake'), 500);
                return;
            }

            // Add loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn?.textContent;
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="btn__spinner"></span>Envoi...';
            }

            // Collect form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Track conversion
            trackEvent('conversion_form_submit', {
                form_id: formId,
                prestation_type: data.prestation || '',
                ville: data.ville || '',
                page: window.location.pathname
            });

            // Simulate API call
            setTimeout(() => {
                showFormSuccess(form);
            }, 1500);

            console.log('Form data:', data);
        });
    });

    function validateForm(form) {
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');

        // Clear previous errors
        form.querySelectorAll('.form__error').forEach(error => error.remove());
        form.querySelectorAll('.form__input--error, .form__select--error, .form__textarea--error').forEach(field => {
            field.classList.remove('form__input--error', 'form__select--error', 'form__textarea--error');
        });

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                showFieldError(field, 'Ce champ est obligatoire');
            } else if (field.type === 'email' && !isValidEmail(field.value)) {
                isValid = false;
                showFieldError(field, 'Veuillez entrer une adresse email valide');
            } else if (field.type === 'tel' && !isValidPhone(field.value)) {
                isValid = false;
                showFieldError(field, 'Veuillez entrer un numéro de téléphone valide');
            }
        });

        return isValid;
    }

    function showFieldError(field, message) {
        const errorClass = field.tagName === 'SELECT' ? 'form__select--error' :
                          field.tagName === 'TEXTAREA' ? 'form__textarea--error' : 'form__input--error';
        field.classList.add(errorClass);

        const errorEl = document.createElement('span');
        errorEl.className = 'form__error';
        errorEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${message}`;

        field.parentNode.appendChild(errorEl);
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function isValidPhone(phone) {
        const cleaned = phone.replace(/[\s\.\-]/g, '');
        return /^(?:(?:\+|00)33|0)[1-9](?:[0-9]{8})$/.test(cleaned);
    }

    function showFormSuccess(form) {
        const wrapper = form.closest('.devis-form-wrapper, .contact-form-card') || form.parentNode;

        wrapper.innerHTML = `
            <div class="form-success">
                <div class="form-success__icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                </div>
                <h3 class="form-success__title">Demande envoyée avec succès</h3>
                <p class="form-success__text">Notre équipe vous contactera sous 24 heures pour discuter de votre projet.</p>
            </div>
        `;

        wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /* ===== SMOOTH SCROLL FOR ANCHOR LINKS ===== */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();

                // Close mobile menu if open
                nav?.classList.remove('header__nav--open');
                navToggle?.classList.remove('header__toggle--active');
                document.body.style.overflow = '';

                // Smooth scroll with offset for header
                const headerHeight = header?.offsetHeight || 0;
                const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                trackEvent('anchor_click', {
                    target: targetId,
                    page: window.location.pathname
                });
            }
        });
    });

    /* ===== CURSOR FOLLOWER (Optional - Premium Feature) ===== */
    const cursor = document.querySelector('.cursor');
    const cursorFollower = document.querySelector('.cursor-follower');

    if (cursor && cursorFollower) {
        let cursorX = 0, cursorY = 0;
        let followerX = 0, followerY = 0;

        document.addEventListener('mousemove', (e) => {
            cursorX = e.clientX;
            cursorY = e.clientY;
            cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
        });

        function animateFollower() {
            followerX = lerp(followerX, cursorX, 0.1);
            followerY = lerp(followerY, cursorY, 0.1);
            cursorFollower.style.transform = `translate(${followerX}px, ${followerY}px)`;
            requestAnimationFrame(animateFollower);
        }
        animateFollower();

        // Scale on hover
        document.querySelectorAll('a, button, .card').forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.classList.add('cursor--hover');
                cursorFollower.classList.add('cursor-follower--hover');
            });
            el.addEventListener('mouseleave', () => {
                cursor.classList.remove('cursor--hover');
                cursorFollower.classList.remove('cursor-follower--hover');
            });
        });
    }

    /* ===== TESTIMONIAL SLIDER (if exists) ===== */
    const testimonialSlider = document.querySelector('.testimonials-slider');

    if (testimonialSlider) {
        let currentSlide = 0;
        const slides = testimonialSlider.querySelectorAll('.testimonial-card');
        const totalSlides = slides.length;
        const prevBtn = document.querySelector('.testimonials__prev');
        const nextBtn = document.querySelector('.testimonials__next');
        const dotsContainer = document.querySelector('.testimonials__dots');

        // Create dots
        if (dotsContainer) {
            slides.forEach((_, index) => {
                const dot = document.createElement('button');
                dot.className = `testimonials__dot ${index === 0 ? 'testimonials__dot--active' : ''}`;
                dot.setAttribute('aria-label', `Go to testimonial ${index + 1}`);
                dot.addEventListener('click', () => goToSlide(index));
                dotsContainer.appendChild(dot);
            });
        }

        function updateSlider() {
            testimonialSlider.style.transform = `translateX(-${currentSlide * 100}%)`;

            // Update dots
            document.querySelectorAll('.testimonials__dot').forEach((dot, index) => {
                dot.classList.toggle('testimonials__dot--active', index === currentSlide);
            });
        }

        function goToSlide(index) {
            currentSlide = index;
            updateSlider();
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % totalSlides;
            updateSlider();
        }

        function prevSlide() {
            currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
            updateSlider();
        }

        prevBtn?.addEventListener('click', prevSlide);
        nextBtn?.addEventListener('click', nextSlide);

        // Auto-play
        let autoPlay = setInterval(nextSlide, 5000);

        testimonialSlider.addEventListener('mouseenter', () => clearInterval(autoPlay));
        testimonialSlider.addEventListener('mouseleave', () => {
            autoPlay = setInterval(nextSlide, 5000);
        });
    }

    /* ===== LAZY LOADING IMAGES ===== */
    const lazyImages = document.querySelectorAll('img[data-src]');

    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.add('loaded');
                    imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px'
        });

        lazyImages.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback
        lazyImages.forEach(img => {
            img.src = img.dataset.src;
        });
    }

    /* ===== PAGE LOAD ANIMATION ===== */
    window.addEventListener('load', () => {
        document.body.classList.add('loaded');

        // Animate hero elements
        const heroTitle = document.querySelector('.hero__title');
        const heroSubtitle = document.querySelector('.hero__subtitle');
        const heroCta = document.querySelector('.hero__cta');
        const heroStats = document.querySelector('.hero__stats');

        if (heroTitle) {
            setTimeout(() => heroTitle.classList.add('animate-in'), 100);
        }
        if (heroSubtitle) {
            setTimeout(() => heroSubtitle.classList.add('animate-in'), 300);
        }
        if (heroCta) {
            setTimeout(() => heroCta.classList.add('animate-in'), 500);
        }
        if (heroStats) {
            setTimeout(() => heroStats.classList.add('animate-in'), 700);
        }
    });

    /* ===== PAGE VIEW TRACKING ===== */
    trackEvent('page_view', {
        page_path: window.location.pathname,
        page_title: document.title,
        page_location: window.location.href
    });

    /* ===== ACCESSIBILITY ENHANCEMENTS ===== */
    // Keyboard navigation for dropdowns
    document.querySelectorAll('.header__dropdown').forEach(dropdown => {
        const trigger = dropdown.querySelector('.header__dropdown-trigger');
        const menu = dropdown.querySelector('.header__dropdown-content');
        const items = menu?.querySelectorAll('a');

        trigger?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                dropdown.classList.toggle('header__dropdown--open');
            }
        });

        items?.forEach((item, index) => {
            item.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    items[Math.min(index + 1, items.length - 1)]?.focus();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    items[Math.max(index - 1, 0)]?.focus();
                } else if (e.key === 'Escape') {
                    dropdown.classList.remove('header__dropdown--open');
                    trigger?.focus();
                }
            });
        });
    });

    // Reduce motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
        document.documentElement.style.setProperty('--duration-fast', '0');
        document.documentElement.style.setProperty('--duration-normal', '0');
        document.documentElement.style.setProperty('--duration-slow', '0');
    }

})();
