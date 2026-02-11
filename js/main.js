/* ==========================================================================
   ALLOPROPRETE - Main JavaScript
   ========================================================================== */

(function() {
    'use strict';

    /* ===== MSCLKID CAPTURE (Microsoft Ads) ===== */
    (function captureMsclkid() {
        var params = new URLSearchParams(window.location.search);
        var msclkid = params.get('msclkid');
        if (msclkid) {
            var expires = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toUTCString();
            document.cookie = 'msclkid=' + encodeURIComponent(msclkid) + ';expires=' + expires + ';path=/;SameSite=Lax';
        }
    })();

    function getMsclkid() {
        var match = document.cookie.match('(^|;)\\s*msclkid=([^;]+)');
        return match ? decodeURIComponent(match[2]) : '';
    }

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

    /* ===== HEADER & NAVIGATION ===== */
    const header = document.querySelector('.header');
    const navToggle = document.querySelector('.header__toggle');
    const nav = document.querySelector('.header__nav');
    const dropdownTriggers = document.querySelectorAll('.header__dropdown-trigger');

    // Header scroll effect
    function handleScroll() {
        if (window.scrollY > 50) {
            header?.classList.add('header--scrolled');
        } else {
            header?.classList.remove('header--scrolled');
        }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // Mobile menu toggle
    navToggle?.addEventListener('click', function() {
        this.classList.toggle('header__toggle--active');
        nav?.classList.toggle('header__nav--open');
        document.body.style.overflow = nav?.classList.contains('header__nav--open') ? 'hidden' : '';

        trackEvent('menu_toggle', {
            action: nav?.classList.contains('header__nav--open') ? 'open' : 'close'
        });
    });

    // Mobile dropdown toggles
    dropdownTriggers.forEach(trigger => {
        trigger.addEventListener('click', function(e) {
            if (window.innerWidth <= 1024) {
                e.preventDefault();
                this.closest('.header__dropdown')?.classList.toggle('header__dropdown--open');
            }
        });
    });

    // Close mobile menu when any nav link (except dropdown triggers) is clicked
    nav?.querySelectorAll('a:not(.header__dropdown-trigger)').forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth <= 1024 && nav?.classList.contains('header__nav--open')) {
                nav.classList.remove('header__nav--open');
                navToggle?.classList.remove('header__toggle--active');
                document.body.style.overflow = '';
            }
        });
    });

    // Close menu on resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 1024) {
            nav?.classList.remove('header__nav--open');
            navToggle?.classList.remove('header__toggle--active');
            document.body.style.overflow = '';
            document.querySelectorAll('.header__dropdown--open').forEach(d => {
                d.classList.remove('header__dropdown--open');
            });
        }
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
    });

    /* ===== FAQ ACCORDION ===== */
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-item__question');

        question?.addEventListener('click', function() {
            const isOpen = item.classList.contains('faq-item--open');

            // Close all other items
            faqItems.forEach(other => {
                if (other !== item) {
                    other.classList.remove('faq-item--open');
                }
            });

            // Toggle current item
            item.classList.toggle('faq-item--open');

            trackEvent('faq_interaction', {
                question: question.textContent.trim().substring(0, 50),
                action: isOpen ? 'close' : 'open'
            });
        });
    });

    /* ===== FORM HANDLING ===== */
    const forms = document.querySelectorAll('.form[data-form-id]');

    forms.forEach(form => {
        const formId = form.dataset.formId;
        let formStarted = false;

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

        // Inject msclkid hidden field
        var msclkidField = document.createElement('input');
        msclkidField.type = 'hidden';
        msclkidField.name = 'msclkid';
        msclkidField.value = getMsclkid();
        form.appendChild(msclkidField);

        // Form submission
        form.addEventListener('submit', function(e) {
            // Validate form before allowing native submit
            if (!validateForm(form)) {
                e.preventDefault();
                return;
            }

            // Update msclkid value at submit time (in case cookie was set after page load)
            msclkidField.value = getMsclkid();

            // Collect form data for tracking
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Track conversion
            trackEvent('conversion_form_submit', {
                form_id: formId,
                prestation_type: data.prestation || '',
                ville: data.ville || '',
                page: window.location.pathname
            });

            // Let the form submit natively to Netlify Forms
        });
    });

    function validateForm(form) {
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');

        // Clear previous errors
        form.querySelectorAll('.form__error').forEach(error => {
            error.remove();
        });
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
        // French phone number validation (accepts various formats)
        const cleaned = phone.replace(/[\s\.\-]/g, '');
        return /^(?:(?:\+|00)33|0)[1-9](?:[0-9]{8})$/.test(cleaned);
    }

    function showFormSuccess(form) {
        const wrapper = form.closest('.devis-form-wrapper, .contact-form-card') || form.parentNode;

        wrapper.innerHTML = `
            <div class="form-success">
                <div class="form-success__icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <h3 class="form-success__title">Demande envoyée !</h3>
                <p class="form-success__text">Nous avons bien reçu votre demande de devis. Notre équipe vous contactera dans les 24 heures.</p>
            </div>
        `;

        // Scroll to success message
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

                target.scrollIntoView({ behavior: 'smooth', block: 'start' });

                trackEvent('anchor_click', {
                    target: targetId,
                    page: window.location.pathname
                });
            }
        });
    });

    /* ===== PAGE VIEW TRACKING ===== */
    trackEvent('page_view', {
        page_path: window.location.pathname,
        page_title: document.title,
        page_location: window.location.href
    });

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

    /* ===== ANIMATION ON SCROLL (optional enhancement) ===== */
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.card, .service-card, .testimonial').forEach(el => {
        observer.observe(el);
    });

})();
