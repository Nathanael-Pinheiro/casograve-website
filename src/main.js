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
