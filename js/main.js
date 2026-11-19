(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const catOf = (id) => CATEGORIES.find((c) => c.id === id);

  $('#year').textContent = new Date().getFullYear();

  // ---------------------------------------------------------------- nav, reveal
  const nav = $('#nav');
  addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', scrollY > 30);
  }, { passive: true });

  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    io.unobserve(e.target);
  }), { threshold: 0.12 });
  function observeReveal(root = document) { $$('.reveal:not(.in)', root).forEach((el) => io.observe(el)); }

  const sectionIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) $$('.nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => sectionIO.observe(s));

  // ---------------------------------------------------------------- skills grid + filters
  const grid = $('.skill-grid');
  const inCat = (id) => SKILLS.filter((s) => s.cat === id);
  grid.innerHTML = CATEGORIES.map((c) => {
    const list = inCat(c.id);
    return `
      <button class="cat-card reveal" data-cat="${c.id}">
        <span class="cat-name">${esc(c.name)}</span>
        <span class="cat-preview">${list.slice(0, 3).map((s) => esc(s.name)).join(', ')}${list.length > 3 ? '…' : ''}</span>
        <span class="cat-more">${list.length} skills <i aria-hidden="true">→</i></span>
      </button>`;
  }).join('');

  // ---------------------------------------------------------------- skill group popup
  const catModal = $('#cat-modal');
  function openCat(id) {
    const c = catOf(id); if (!c) return;
    const list = inCat(id);
    $('#c-title').textContent = c.name;
    $('.c-count', catModal).textContent = `${list.length} skills · select one for the details`;
    $('.cat-list', catModal).innerHTML = list.map((s, i) => `
      <li style="--i:${i}"><button data-skill="${s.id}">
        <span class="cl-name">${esc(s.name)}</span>
        <span class="cl-where">${esc(s.where)}</span>
        <i aria-hidden="true">→</i>
      </button></li>`).join('');
    catModal.showModal(); document.body.classList.add('locked');
    catModal.querySelector('.modal-inner').scrollTop = 0;
  }
  catModal.addEventListener('close', () => { if (!modal.open) document.body.classList.remove('locked'); });
  catModal.addEventListener('click', (e) => {
    if (e.target === catModal || e.target.closest('[data-close]')) return catModal.close();
    const sk = e.target.closest('[data-skill]'); if (sk) openSkill(sk.dataset.skill);
  });

  // ---------------------------------------------------------------- modal
  const modal = $('#skill-modal');
  let modalCleanup = null;
  function openSkill(id, push = true) {
    const s = SKILLS.find((x) => x.id === id); if (!s) return;
    if (catModal.open) catModal.close();
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
    if (modal.contains(e.target) || catModal.contains(e.target)) return;
    const cc = e.target.closest('.cat-card'); if (cc) return openCat(cc.dataset.cat);
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
  tabs.innerHTML = LAB.map((x, i) => `<button role="tab" data-i="${i}" class="${i ? '' : 'on'}">${x.t}</button>`).join('');
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
    term.classList.remove('min');
    term.hidden = false; requestAnimationFrame(() => term.classList.add('open'));
    if (!out.children.length) { print('Welcome to amit@portfolio. Type <b>help</b> to get started.', 'ok'); }
    setTimeout(() => input.focus(), 50);
  }
  function closeTerm() {
    term.classList.remove('open');
    setTimeout(() => { term.hidden = true; term.classList.remove('min', 'max'); }, 200);
  }
  // macOS-style window controls: yellow docks the window down to its title bar, green expands it.
  function minTerm() { term.classList.remove('max'); term.classList.add('min'); input.blur(); }
  function maxTerm() { term.classList.remove('min'); term.classList.toggle('max'); input.focus(); }
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
  $('[data-term-min]').addEventListener('click', minTerm);
  $('[data-term-max]').addEventListener('click', maxTerm);
  // Click a docked title bar to bring it back; double-click the bar to zoom, like macOS.
  $('.term-bar').addEventListener('click', (e) => { if (term.classList.contains('min') && !e.target.closest('.tl')) openTerm(), input.focus(); });
  $('.term-bar').addEventListener('dblclick', (e) => { if (!e.target.closest('.tl') && !term.classList.contains('min')) maxTerm(); });
  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (e.key === '`' && !typing) { e.preventDefault(); term.hidden || term.classList.contains('min') ? openTerm() : closeTerm(); }
  });

  window.Portfolio = { openSkill, openDemo, openTerminal: () => { closeModal(); openTerm(); } };

  // ---------------------------------------------------------------- init
  observeReveal();
  const m = location.hash.match(/^#skill=([\w-]+)/);
  if (m) openSkill(m[1], false);
})();
