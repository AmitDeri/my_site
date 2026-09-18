(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(pointer: fine)').matches;
  const catOf = (id) => CATEGORIES.find((c) => c.id === id);

  $('#year').textContent = new Date().getFullYear();

  // ---------------------------------------------------------------- hero: live event network
  (function net() {
    const c = $('#net'); const g = c.getContext('2d');
    let w, h, nodes = [], packets = [], mouse = { x: -999, y: -999 };
    const colors = ['#5eead4', '#a78bfa', '#f472b6', '#60a5fa'];
    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = c.offsetWidth; h = c.offsetHeight; c.width = w * dpr; c.height = h * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(90, (w * h) / 16000));
      nodes = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25, r: 1 + Math.random() * 1.6 }));
    }
    resize(); addEventListener('resize', resize);
    c.parentElement.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    c.parentElement.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    let visible = true;
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(c);
    const D = 130;
    function frame() {
      requestAnimationFrame(frame);
      if (!visible) return;
      g.clearRect(0, 0, w, h);
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1; if (n.y < 0 || n.y > h) n.vy *= -1;
        const dx = n.x - mouse.x, dy = n.y - mouse.y, d = Math.hypot(dx, dy);
        if (d < 120) { n.x += (dx / d) * 0.6; n.y += (dy / d) * 0.6; }
      }
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < D) {
          g.strokeStyle = `rgba(148,163,184,${0.14 * (1 - d / D)})`; g.lineWidth = 1;
          g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
          if (!REDUCED && Math.random() < 0.0009 && packets.length < 40) packets.push({ a, b, t: 0, c: colors[(Math.random() * colors.length) | 0] });
        }
      }
      for (const n of nodes) { g.fillStyle = 'rgba(203,213,225,.55)'; g.beginPath(); g.arc(n.x, n.y, n.r, 0, 7); g.fill(); }
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i]; p.t += 0.018;
        if (p.t >= 1) { packets.splice(i, 1); continue; }
        const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
        g.fillStyle = p.c; g.shadowColor = p.c; g.shadowBlur = 10; g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); g.shadowBlur = 0;
      }
    }
    frame();
  })();

  // ---------------------------------------------------------------- typed roles
  (function typed() {
    const words = ['event-driven pipelines on GCP.', 'SwiftUI apps with real-time sync.', 'REST APIs that tame messy data.', 'CI/CD that fails safely.', 'AI systems with deterministic cores.', 'tools that find security holes.'];
    const el = $('.typed-word');
    if (REDUCED) { el.textContent = words[0]; return; }
    let wi = 0, ci = 0, del = false;
    (function tick() {
      const w = words[wi];
      el.textContent = w.slice(0, ci);
      if (!del && ci === w.length) { del = true; return setTimeout(tick, 1800); }
      if (del && ci === 0) { del = false; wi = (wi + 1) % words.length; }
      ci += del ? -1 : 1;
      setTimeout(tick, del ? 28 : 55);
    })();
  })();

  // ---------------------------------------------------------------- scroll progress, nav, reveal, counters
  const progress = $('.progress'), nav = $('#nav');
  addEventListener('scroll', () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    nav.classList.toggle('scrolled', scrollY > 30);
  }, { passive: true });

  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    $$('[data-count]', e.target).forEach(countUp);
    io.unobserve(e.target);
  }), { threshold: 0.12 });
  function observeReveal(root = document) { $$('.reveal:not(.in)', root).forEach((el) => io.observe(el)); }
  function countUp(el) {
    const to = +el.dataset.count, t0 = performance.now(), D = REDUCED ? 1 : 1100;
    (function f(t) { const k = Math.min(1, (t - t0) / D); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0);
  }

  const sectionIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) $$('.nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => sectionIO.observe(s));

  // ---------------------------------------------------------------- cursor glow, magnetic buttons, spotlight, tilt
  if (FINE && !REDUCED) {
    const glow = $('.glow');
    addEventListener('pointermove', (e) => { glow.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; glow.style.opacity = 1; }, { passive: true });
    document.addEventListener('pointerleave', () => (glow.style.opacity = 0));
    document.addEventListener('pointermove', (e) => {
      const m = e.target.closest && e.target.closest('.magnetic');
      $$('.magnetic.pull').forEach((b) => { if (b !== m) { b.classList.remove('pull'); b.style.transform = ''; } });
      if (!m) return;
      const r = m.getBoundingClientRect();
      m.classList.add('pull');
      m.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
    });
    const tilt = $('#tilt');
    tilt.addEventListener('pointermove', (e) => {
      const r = tilt.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = `perspective(900px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg)`;
    });
    tilt.addEventListener('pointerleave', () => (tilt.style.transform = ''));
  }
  document.addEventListener('pointermove', (e) => {
    const card = e.target.closest && e.target.closest('.skill, .project, .card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', e.clientX - r.left + 'px'); card.style.setProperty('--my', e.clientY - r.top + 'px');
  }, { passive: true });

  // ---------------------------------------------------------------- skills grid + filters
  const grid = $('.skill-grid'), filters = $('.filters');
  let activeCat = 'all';
  filters.innerHTML = [`<button class="on" data-cat="all">All <small>${SKILLS.length}</small></button>`]
    .concat(CATEGORIES.map((c) => `<button data-cat="${c.id}" style="--c:${c.color}">${c.name} <small>${SKILLS.filter((s) => s.cat === c.id).length}</small></button>`)).join('');
  function renderSkills() {
    grid.innerHTML = CATEGORIES.filter((c) => activeCat === 'all' || c.id === activeCat).map((c) => `
      <div class="skill-group reveal" style="--c:${c.color}">
        <h3><i></i>${c.name}</h3>
        <div class="skill-list">${SKILLS.filter((s) => s.cat === c.id).map((s) => `
          <button class="skill" data-skill="${s.id}">
            <span class="s-name">${esc(s.name)}</span>
            <span class="s-meta"><span class="lvl lvl-${s.level}">${LEVELS[s.level].label}</span>${s.demo ? '<span class="live-pill">live</span>' : ''}</span>
            <span class="s-where">${esc(s.where)}</span>
          </button>`).join('')}</div>
      </div>`).join('');
    observeReveal(grid);
  }
  filters.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', filters).forEach((x) => x.classList.toggle('on', x === b));
    activeCat = b.dataset.cat; renderSkills();
  });
  renderSkills();

  // ---------------------------------------------------------------- modal
  const modal = $('#skill-modal');
  let modalCleanup = null;
  function openSkill(id, push = true) {
    const s = SKILLS.find((x) => x.id === id); if (!s) return;
    const c = catOf(s.cat);
    modal.style.setProperty('--c', c.color);
    $('.m-cat', modal).textContent = c.name;
    $('#m-title').textContent = s.name;
    $('.m-level', modal).innerHTML = `<span class="lvl lvl-${s.level}">${LEVELS[s.level].label}</span>`;
    $('.m-where', modal).textContent = s.where;
    $('.m-depth', modal).textContent = s.depth;
    $('.m-can ul', modal).innerHTML = s.can.map((x) => `<li>${esc(x)}</li>`).join('');
    const rel = SKILLS.filter((x) => x.id !== s.id && ((s.demo && x.demo === s.demo) || x.cat === s.cat)).slice(0, 6);
    $('.m-related', modal).innerHTML = rel.length ? `<h4>Related</h4>${rel.map((x) => `<button class="chip" data-skill="${x.id}">${esc(x.name)}</button>`).join('')}` : '';
    if (!modal.open) { modal.showModal(); document.body.classList.add('locked'); }
    mountDemo(s.demo, s.demo ? DEMOS[s.demo].title : '');
    modal.querySelector('.modal-inner').scrollTop = 0;
    if (push) history.replaceState(null, '', '#skill=' + id);
  }
  function openDemo(demoId) {
    // Opens the modal on the first skill that owns this demo.
    const s = SKILLS.find((x) => x.demo === demoId);
    if (s) openSkill(s.id);
  }
  function mountDemo(demoId, title) {
    if (modalCleanup) { modalCleanup(); modalCleanup = null; }
    const sec = $('.m-demo', modal), body = $('.m-demo-body', modal);
    body.innerHTML = '';
    sec.hidden = !demoId;
    if (!demoId) return;
    $('.m-demo-head h3', modal).textContent = title;
    body.className = 'm-demo-body demo demo-' + demoId;
    modalCleanup = DEMOS[demoId].mount(body); // dialog is already open, so canvases measure correctly
  }
  function closeModal() {
    if (modalCleanup) { modalCleanup(); modalCleanup = null; }
    if (modal.open) modal.close();
  }
  modal.addEventListener('close', () => {
    if (modalCleanup) { modalCleanup(); modalCleanup = null; }
    document.body.classList.remove('locked');
    if (location.hash.startsWith('#skill=')) history.replaceState(null, '', location.pathname + location.search);
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.closest('[data-close]')) return closeModal();
    const chip = e.target.closest('[data-skill]'); if (chip) openSkill(chip.dataset.skill);
  });
  document.addEventListener('click', (e) => {
    if (modal.contains(e.target)) return;
    const sk = e.target.closest('[data-skill]'); if (sk) return openSkill(sk.dataset.skill);
    const dm = e.target.closest('[data-demo]'); if (dm) return openDemo(dm.dataset.demo);
  });

  // ---------------------------------------------------------------- live lab (inline demos)
  const LAB = [
    { d: 'pubsub', t: 'Pub/Sub streaming', p: 'The shape of the analytics pipeline I moved from batch ETL to real-time. Switch modes to see the latency difference.' },
    { d: 'llm', t: 'Multi-LLM verification', p: 'The cross-model protocol that checks AI output before it reaches production.' },
    { d: 'hybrid', t: 'LLM + deterministic core', p: 'LLMs only extract. Schema validation rejects bad output, and code computes every number.' },
    { d: 'iac', t: 'IaC scanner', p: 'My Go + Rego security tool, ported to JS. Edit the Terraform and watch it rescan.' },
    { d: 'pollution', t: 'Prototype pollution', p: 'From an innocent-looking merge() to every user being admin, and the fix.' },
    { d: 'firebase', t: 'Realtime QA app', p: 'SwiftUI ⇄ Android through Firebase listeners, with optimistic writes.' },
    { d: 'motion', t: 'Motion detection', p: 'My OpenCV pipeline idea running frame-by-frame in JS. Try your webcam.' },
  ];
  const tabs = $('.lab-tabs'), stage = $('.lab-demo');
  tabs.innerHTML = LAB.map((x, i) => `<button role="tab" data-i="${i}" class="${i ? '' : 'on'}"><span>${String(i + 1).padStart(2, '0')}</span>${x.t}</button>`).join('');
  let labCleanup = null, labIdx = 0, labVisible = false;
  function mountLab(i) {
    labIdx = i;
    if (labCleanup) { labCleanup(); labCleanup = null; }
    $$('button', tabs).forEach((b, k) => b.classList.toggle('on', k === i));
    $('.lab-head h3').textContent = DEMOS[LAB[i].d].title;
    $('.lab-head p').textContent = LAB[i].p;
    stage.className = 'lab-demo demo demo-' + LAB[i].d;
    stage.innerHTML = '';
    if (labVisible) labCleanup = DEMOS[LAB[i].d].mount(stage);
  }
  tabs.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) mountLab(+b.dataset.i); });
  // Only run the lab demo while it's on screen.
  new IntersectionObserver(([e]) => {
    labVisible = e.isIntersecting;
    if (labVisible && !labCleanup) mountLab(labIdx);
    else if (!labVisible && labCleanup) { labCleanup(); labCleanup = null; }
  }, { rootMargin: '100px' }).observe($('.lab'));
  mountLab(0);

  // ---------------------------------------------------------------- project card accents
  $$('.project').forEach((p) => p.style.setProperty('--c', p.dataset.accent));

  // ---------------------------------------------------------------- terminal
  const term = $('#terminal'), out = $('.term-out'), input = $('.term-in');
  const hist = []; let hi = 0;
  const print = (html, cls = '') => { out.insertAdjacentHTML('beforeend', `<div class="${cls}">${html}</div>`); out.scrollTop = out.scrollHeight; };
  const COMMANDS = {
    help: () => print(`available commands:
  <b>whoami</b>        who is this
  <b>skills</b> [cat]  list skills (cats: ${CATEGORIES.map((c) => c.id).join(', ')})
  <b>skill</b> &lt;id&gt;    open a skill, e.g. <i>skill pubsub</i>
  <b>demo</b> &lt;id&gt;     open a live demo: ${Object.keys(DEMOS).filter((d) => d !== 'terminal').join(', ')}
  <b>experience</b>    work history
  <b>projects</b>      security & side projects
  <b>contact</b>       ways to reach me
  <b>cv</b>            download the CV
  <b>goto</b> &lt;section&gt; scroll to about|skills|lab|experience|projects|contact
  <b>clear</b>         clear the screen`),
    whoami: () => print('Amit Deri · Full-Stack, Mobile & Cloud Developer · B.Sc. CS\nosApps · GCP Pub/Sub · SwiftUI · Multi-LLM verification · security research'),
    skills: (cat) => {
      const list = SKILLS.filter((s) => !cat || s.cat === cat);
      if (!list.length) return print(`no category "${esc(cat)}"`, 'err');
      CATEGORIES.filter((c) => !cat || c.id === cat).forEach((c) => print(`<span style="color:${c.color}">■ ${c.name}</span>\n` + SKILLS.filter((s) => s.cat === c.id).map((s) => `  ${s.id.padEnd(15)} ${esc(s.name)}${s.demo ? '  <span class="ok">[live]</span>' : ''}`).join('\n')));
    },
    skill: (id) => { if (!SKILLS.find((s) => s.id === id)) return print(`unknown skill "${esc(id || '')}". try: skills`, 'err'); closeTerm(); openSkill(id); },
    demo: (id) => { if (!DEMOS[id] || id === 'terminal') return print(`unknown demo "${esc(id || '')}". try: help`, 'err'); closeTerm(); openDemo(id); },
    experience: () => print('2025–now  Full-Stack & Mobile Developer @ osApps\n2019–20   Computer Technician @ Dr. PC\n2018–19   IT & Customer Support @ Bank Leumi'),
    projects: () => print('iac-scanner      Go + Rego IaC risk detection      → demo iac\nproto-pollution  XSS/RCE via Express/EJS            → demo pollution\nctf              picoCTF, TryHackMe                 → demo ctf\nvideo-analysis   OpenCV + Tesseract + fuzzy match   → demo motion'),
    contact: () => print('email     <a href="mailto:amit.derri@gmail.com">amit.derri@gmail.com</a>\nlinkedin  <a href="https://www.linkedin.com/in/amit-deri-910a41157/" target="_blank" rel="noopener">amit-deri</a>\ngithub    <a href="https://github.com/AmitDeri" target="_blank" rel="noopener">AmitDeri</a>'),
    cv: () => { const a = document.createElement('a'); a.href = 'AmitDeri_CV.pdf'; a.download = ''; a.click(); print('downloading AmitDeri_CV.pdf…', 'ok'); },
    goto: (s) => { const el = document.getElementById(s); if (!el) return print('no such section', 'err'); closeTerm(); el.scrollIntoView({ behavior: 'smooth' }); },
    ls: () => print('about.txt  skills/  lab/  experience.log  projects/  AmitDeri_CV.pdf'),
    'cat': (f) => f === 'about.txt' ? COMMANDS.whoami() : print(`cat: ${esc(f || '')}: try "cat about.txt"`, 'err'),
    sudo: () => print('amit is not in the sudoers file. This incident will be reported. 🙂', 'err'),
    clear: () => (out.innerHTML = ''),
    exit: () => closeTerm(),
  };
  function openTerm() {
    term.hidden = false; requestAnimationFrame(() => term.classList.add('open'));
    if (!out.children.length) { print('Welcome to amit@portfolio. Type <b>help</b> to get started.', 'ok'); }
    setTimeout(() => input.focus(), 50);
  }
  function closeTerm() { term.classList.remove('open'); setTimeout(() => (term.hidden = true), 200); }
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const raw = input.value.trim(); input.value = '';
      print(`<span class="prompt">amit@portfolio:~$</span> ${esc(raw)}`);
      if (!raw) return;
      hist.push(raw); hi = hist.length;
      const [cmd, ...args] = raw.split(/\s+/);
      (COMMANDS[cmd.toLowerCase()] || (() => print(`command not found: ${esc(cmd)}. type <b>help</b>`, 'err')))(...args);
    } else if (e.key === 'ArrowUp') { if (hi > 0) input.value = hist[--hi]; e.preventDefault(); }
    else if (e.key === 'ArrowDown') { input.value = hi < hist.length - 1 ? hist[++hi] : ((hi = hist.length), ''); e.preventDefault(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const parts = input.value.split(/\s+/);
      const pool = parts.length > 1 ? (parts[0] === 'skill' ? SKILLS.map((s) => s.id) : parts[0] === 'demo' ? Object.keys(DEMOS) : []) : Object.keys(COMMANDS);
      const m = pool.filter((x) => x.startsWith(parts[parts.length - 1]));
      if (m.length === 1) { parts[parts.length - 1] = m[0]; input.value = parts.join(' ') + ' '; } else if (m.length) print(m.join('  '));
    } else if (e.key === 'Escape') closeTerm();
  });
  $$('[data-terminal]').forEach((b) => b.addEventListener('click', openTerm));
  $('[data-term-close]').addEventListener('click', closeTerm);
  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (e.key === '`' && !typing) { e.preventDefault(); term.hidden ? openTerm() : closeTerm(); }
  });

  window.Portfolio = { openSkill, openDemo, openTerminal: () => { closeModal(); openTerm(); } };

  // ---------------------------------------------------------------- init
  observeReveal();
  const m = location.hash.match(/^#skill=([\w-]+)/);
  if (m) openSkill(m[1], false);
})();
