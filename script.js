document.documentElement.classList.add('js');

/* ==============================================================
   WEB99.IE EDITABLE CONFIG
   Change every launch placeholder here — nowhere else is needed.
   ============================================================== */
const WEB99_CONFIG = {
  whatsappNumber: '', // Digits only, including country code. Example: 353871234567
  yearTwoRenewal: '€___ per year', // Replace with the confirmed renewal figure.
  counterEnabled: false, // Set true only when you have a real number to show.
  businessesOnline: 0, // Real completed-customer count only. Never fabricate this.
  testimonialsEnabled: false, // Set true only when real testimonials exist.
  testimonials: [
    // { quote: 'Real customer quote.', name: 'Customer name', business: 'Business name, Dublin' }
  ]
};

const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function setupConfigContent() {
  $$('[data-renewal-price]').forEach(el => el.textContent = WEB99_CONFIG.yearTwoRenewal);
  $$('[data-current-year]').forEach(el => el.textContent = new Date().getFullYear());

  const whatsappHref = WEB99_CONFIG.whatsappNumber
    ? `https://wa.me/${WEB99_CONFIG.whatsappNumber}`
    : 'https://wa.me/';
  $$('.whatsapp-link').forEach(link => link.href = whatsappHref);

  const counterSection = document.querySelector('[data-counter-section]');
  if (counterSection && WEB99_CONFIG.counterEnabled && WEB99_CONFIG.businessesOnline > 0) {
    counterSection.hidden = false;
  }

  const testimonialSection = document.querySelector('[data-testimonials-section]');
  const grid = document.querySelector('[data-testimonials-grid]');
  if (testimonialSection && grid && WEB99_CONFIG.testimonialsEnabled && WEB99_CONFIG.testimonials.length) {
    grid.innerHTML = WEB99_CONFIG.testimonials.map(item => `
      <article class="testimonial-card">
        <blockquote>“${escapeHTML(item.quote)}”</blockquote>
        <cite><strong>${escapeHTML(item.name)}</strong><br>${escapeHTML(item.business)}</cite>
      </article>`).join('');
    testimonialSection.hidden = false;
  }
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function setupMenu() {
  const button = document.querySelector('[data-menu-button]');
  const menu = document.querySelector('[data-mobile-menu]');
  if (!button || !menu) return;
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!open));
    button.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
    button.innerHTML = open
      ? '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
      : '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>';
    menu.hidden = open;
    document.body.classList.toggle('menu-open', !open);
  });
  $$('.mobile-menu a').forEach(link => link.addEventListener('click', () => {
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  }));
}

function setupFAQs() {
  $$('.faq-question').forEach(button => {
    button.addEventListener('click', () => {
      const answer = button.closest('.faq-item').querySelector('.faq-answer');
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      answer.hidden = open;
    });
  });
}

function setupReveal() {
  const items = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach(item => item.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  items.forEach(item => observer.observe(item));
}

function setupCounter() {
  const section = document.querySelector('[data-counter-section]');
  const output = document.querySelector('[data-business-counter]');
  if (!section || !output || section.hidden) return;
  const target = WEB99_CONFIG.businessesOnline;
  const observer = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    observer.disconnect();
    const duration = 1100;
    const start = performance.now();
    const tick = now => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      output.textContent = Math.round(target * eased).toLocaleString('en-IE');
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { threshold: .5 });
  observer.observe(section);
}

function setupChatShell() {
  const form = document.querySelector('[data-chat-form]');
  const status = document.querySelector('[data-form-status]');
  if (!form || !status) return;
  form.addEventListener('submit', event => {
    event.preventDefault();
    status.textContent = 'The chat hand-off is ready to connect. No message was sent in this static build.';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupConfigContent();
  setupMenu();
  setupFAQs();
  setupReveal();
  setupCounter();
  setupChatShell();
});
