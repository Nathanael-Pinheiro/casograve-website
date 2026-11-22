// maxresdefault → hqdefault → branded background. Detect Google's tiny placeholders too.
for (const img of document.querySelectorAll('img[data-hq]')) {
  let remaining = [img.dataset.max, img.dataset.hq].filter(Boolean);
  const fallback = () => {
    const next = remaining.shift();
    if (next) img.src = next;
    else img.hidden = true;
  };
  const check = () => { if (img.naturalWidth < 160) fallback(); };
  img.addEventListener('error', fallback);
  img.addEventListener('load', check);
  if (img.complete) check();
}

const menu = document.querySelector('.mobile-nav');
const summary = menu?.querySelector('summary');
menu?.addEventListener('click', (event) => {
  const anchor = event.target.closest('a');
  if (!anchor) return;
  menu.open = false;
  if (anchor.hash) {
    const target = document.getElementById(anchor.hash.slice(1));
    if (target) {
      target.tabIndex = -1;
      target.focus({preventScroll:true});
    }
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu?.open) {
    menu.open = false;
    summary.focus();
  }
});
document.addEventListener('click', (event) => {
  if (menu?.open && !menu.contains(event.target)) menu.open = false;
});
matchMedia('(min-width: 870px)').addEventListener('change', (event) => {
  if (event.matches && menu) menu.open = false;
});

if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver((entries) => {
    for (const {target, isIntersecting} of entries) {
      if (!isIntersecting) continue;
      observer.unobserve(target);
      if (target.matches(':focus-within') || matchMedia('(prefers-reduced-motion: reduce)').matches) continue;
      target.animate([{opacity:.78, transform:'translateY(8px)'},{opacity:1, transform:'translateY(0)'}], {
        duration:340, easing:'ease-out',
      });
    }
  }, {threshold:.15});
  for (const target of document.querySelectorAll('.section-head, .project-copy, .about-copy')) observer.observe(target);
}

// Native dialog keeps the page inert and provides modal focus behavior.
function initWelcomeModal() {
  const dialog = document.getElementById('welcome-modal');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const storageKey = 'casograve:welcome:v1:closed';
  try {
    if (sessionStorage.getItem(storageKey) === '1') return;
  } catch { /* Storage can be unavailable in private or restricted browsers. */ }

  const root = document.documentElement;
  const previousFocus = document.activeElement;
  const overflow = root.style.overflow;
  const gutter = root.style.scrollbarGutter;
  let locked = false;
  const restore = () => {
    if (!locked) return;
    locked = false;
    root.style.overflow = overflow;
    root.style.scrollbarGutter = gutter;
    if (previousFocus?.isConnected && previousFocus !== document.body) {
      previousFocus.focus({preventScroll:true});
    }
  };
  const remember = () => {
    try { sessionStorage.setItem(storageKey, '1'); } catch { /* Keep the page usable. */ }
  };
  const close = () => {
    remember();
    dialog.close();
    restore();
  };
  dialog.addEventListener('click', (event) => {
    if (event.target.closest('[data-welcome-close]')) {
      // Let anchors follow their native target=_blank behavior after closing.
      close();
    } else if (event.target === dialog) {
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right ||
          event.clientY < box.top || event.clientY > box.bottom) close();
    }
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener('close', () => { remember(); restore(); });
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('a[href], button:not([disabled])')];
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  try {
    root.style.scrollbarGutter = 'stable';
    root.style.overflow = 'hidden';
    locked = true;
    dialog.showModal();
  } catch {
    // An unsupported/failed modal must never leave the landing page locked.
    restore();
  }
}
initWelcomeModal();
