(function () {
  'use strict';
  const root = document.documentElement;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const meta = document.querySelector('meta[name="theme-color"]');

  // ---------------------------------------------------------------- theme toggle
  function apply(t) {
    root.dataset.theme = t;
    if (meta) meta.content = t === 'light' ? '#f3f4f7' : '#07080c';
    try { localStorage.setItem('theme', t); } catch (e) {}
    dispatchEvent(new Event('themechange'));
  }
  apply(root.dataset.theme || 'dark');
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    // Crossfade the whole page instead of an abrupt brightness jump.
    if (document.startViewTransition && !REDUCED) document.startViewTransition(() => apply(next));
    else apply(next);
  });

  // ---------------------------------------------------------------- sliding nav lens
  const ul = document.querySelector('.nav ul');
  const lens = document.querySelector('.nav-lens');
  if (!ul || !lens) return;
  let target = null;
  function place(a, instant) {
    if (!a) { lens.classList.remove('on'); return; }
    if (instant) lens.style.transition = 'none';
    lens.style.width = a.offsetWidth + 'px';
    lens.style.transform = `translateX(${a.offsetLeft}px)`;
    lens.classList.add('on');
    if (instant) { lens.offsetWidth; lens.style.transition = ''; }
  }
  const active = () => ul.querySelector('a.active');
  // Follow the hovered link, then return to the section you're in.
  ul.addEventListener('pointerover', (e) => { const a = e.target.closest('a'); if (a) { target = a; place(a, !lens.classList.contains('on')); } });
  ul.addEventListener('pointerleave', () => { target = null; place(active()); });
  // main.js toggles .active on scroll; watch for it.
  // Observe the links only: the lens changes its own class, which would loop.
  const mo = new MutationObserver(() => { if (!target) place(active(), !lens.classList.contains('on')); });
  ul.querySelectorAll('a').forEach((a) => mo.observe(a, { attributes: true, attributeFilter: ['class'] }));
  addEventListener('resize', () => place(target || active(), true));
})();
