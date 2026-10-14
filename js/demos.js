// Interactive skill demos. Each demo is mount(el) → cleanup().
// Everything runs client-side; simulated parts are labelled as such in the UI.
(function () {
  'use strict';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function scope() {
    const ids = [], raf = [], offs = [];
    let alive = true;
    return {
      get alive() { return alive; },
      timeout(f, ms) { const i = setTimeout(() => alive && f(), ms); ids.push(i); return i; },
      interval(f, ms) { const i = setInterval(() => alive && f(), ms); ids.push(i); return i; },
      loop(fn) {
        let last = performance.now();
        const tick = (t) => { if (!alive) return; const dt = Math.min(64, t - last); last = t; fn(dt, t); raf[0] = requestAnimationFrame(tick); };
        raf[0] = requestAnimationFrame(tick);
      },
      on(target, ev, fn, opts) { target.addEventListener(ev, fn, opts); offs.push(() => target.removeEventListener(ev, fn, opts)); },
      add(fn) { offs.push(fn); },
      dispose() { alive = false; ids.forEach((i) => { clearTimeout(i); clearInterval(i); }); raf.forEach(cancelAnimationFrame); offs.forEach((f) => f()); },
    };
  }

  function fitCanvas(c) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = c.getBoundingClientRect();
    c.width = Math.max(1, Math.round(r.width * dpr));
    c.height = Math.max(1, Math.round(r.height * dpr));
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { g, w: r.width, h: r.height };
  }

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  // ------------------------------------------------------------------ Pub/Sub
  function pubsub(el) {
    const s = scope();
    el.innerHTML = `
      <div class="demo-bar">
        <div class="seg" role="tablist">
          <button class="on" data-mode="stream">Streaming · Pub/Sub</button>
          <button data-mode="batch">Legacy batch ETL</button>
        </div>
        <button class="btn sm" data-burst>Burst 40 events</button>
      </div>
      <canvas class="demo-canvas" style="height:300px"></canvas>
      <div class="ps-stats">
        <div class="stat"><b data-k="pub">0</b><span>published</span></div>
        <div class="stat"><b data-k="bq">0</b><span>rows → BigQuery</span></div>
        <div class="stat"><b data-k="gcs">0</b><span>objects → GCS</span></div>
        <div class="stat"><b data-k="db">0</b><span>docs → Cloud DB</span></div>
        <div class="stat"><b data-k="lat">–</b><span>avg time to insight</span></div>
      </div>
      <p class="demo-note">Each dot is one user-session event. In streaming mode the topic fans every event out to all three sinks within moments. In batch mode events wait in a staging buffer until the next scheduled run.</p>`;
    const c = el.querySelector('canvas');
    let dim = fitCanvas(c);
    const ro = new ResizeObserver(() => { dim = fitCanvas(c); });
    ro.observe(c); s.add(() => ro.disconnect());

    const pubs = [{ n: 'iOS app', s: 'iOS', y: 0.2 }, { n: 'Android app', s: 'Android', y: 0.5 }, { n: 'Web', s: 'Web', y: 0.8 }];
    const sinks = [{ n: 'BigQuery', s: 'BQ', k: 'bq', y: 0.2, c: '#60a5fa' }, { n: 'GCS', s: 'GCS', k: 'gcs', y: 0.5, c: '#fbbf24' }, { n: 'Cloud DB', s: 'DB', k: 'db', y: 0.8, c: '#f472b6' }];
    let mode = 'stream';
    let clock = 0, nextSpawn = 0, batchTimer = 0;
    const BATCH_EVERY = 5000;
    const parts = [], buffer = [];
    const counts = { pub: 0, bq: 0, gcs: 0, db: 0 };
    let latSum = 0, latN = 0;
    const set = (k, v) => { el.querySelector(`[data-k="${k}"]`).textContent = v; };

    const narrow = () => dim.w < 520;
    const P = (fx, fy) => { const pad = narrow() ? 38 : 70; return { x: pad + fx * (dim.w - pad * 2), y: 20 + fy * (dim.h - 40) }; };
    const topicPos = () => P(0.5, 0.5);

    function spawn() {
      const i = Math.floor(Math.random() * 3);
      parts.push({ stage: 0, from: P(0, pubs[i].y), to: topicPos(), t: 0, born: clock, speed: 0.0011 + Math.random() * 0.0006, hue: i });
      counts.pub++;
    }
    function fanOut(p) {
      sinks.forEach((sk, j) => parts.push({ stage: 1, from: topicPos(), to: P(1, sk.y), t: 0, born: p.born, speed: 0.0014, sink: j }));
    }

    s.on(el.querySelector('.seg'), 'click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      el.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b));
      mode = b.dataset.mode; latSum = 0; latN = 0; batchTimer = 0; set('lat', '–');
      if (mode === 'stream') { buffer.splice(0).forEach(fanOut); }
    });
    s.on(el.querySelector('[data-burst]'), 'click', () => { for (let i = 0; i < 40; i++) s.timeout(spawn, i * 25); });

    const hues = ['#5eead4', '#a78bfa', '#60a5fa'];
    s.loop((dt) => {
      clock += dt;
      if (clock > nextSpawn) { spawn(); nextSpawn = clock + 180 + Math.random() * 260; }
      if (mode === 'batch') {
        batchTimer += dt;
        if (batchTimer > BATCH_EVERY) { batchTimer = 0; buffer.splice(0).forEach(fanOut); }
      }
      const { g, w, h } = dim;
      g.clearRect(0, 0, w, h);
      const tp = topicPos();
      // edges
      g.lineWidth = 1; g.strokeStyle = 'rgba(148,163,184,.18)';
      pubs.forEach((p) => { const a = P(0, p.y); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(tp.x, tp.y); g.stroke(); });
      sinks.forEach((p) => { const a = P(1, p.y); g.beginPath(); g.moveTo(tp.x, tp.y); g.lineTo(a.x, a.y); g.stroke(); });
      // particles
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.t += p.speed * dt;
        const e = p.t < 1 ? p.t : 1;
        const x = p.from.x + (p.to.x - p.from.x) * e, y = p.from.y + (p.to.y - p.from.y) * e;
        g.fillStyle = p.stage === 0 ? hues[p.hue] : sinks[p.sink].c;
        g.shadowColor = g.fillStyle; g.shadowBlur = 8;
        g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
        if (p.t >= 1) {
          parts.splice(i, 1);
          if (p.stage === 0) { if (mode === 'stream') fanOut(p); else buffer.push(p); }
          else {
            counts[sinks[p.sink].k]++;
            if (p.sink === 0) { latSum += clock - p.born; latN++; set('lat', (latSum / latN / 1000).toFixed(1) + 's'); }
          }
        }
      }
      // nodes
      const node = (pt, label, color, sub) => {
        g.font = '600 12px "Geist Mono", ui-monospace, monospace';
        const tw = Math.max(g.measureText(label).width, sub ? g.measureText(sub).width : 0) + 22;
        roundRect(g, pt.x - tw / 2, pt.y - 15 - (sub ? 7 : 0), tw, sub ? 44 : 30, 8);
        g.fillStyle = 'rgba(12,17,29,.92)'; g.fill(); g.strokeStyle = color; g.lineWidth = 1.2; g.stroke();
        g.fillStyle = '#e6ebf5'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(label, pt.x, pt.y - (sub ? 7 : 0));
        if (sub) { g.fillStyle = '#8b95a9'; g.font = '11px "Geist Mono", ui-monospace, monospace'; g.fillText(sub, pt.x, pt.y + 10); }
      };
      const nw = narrow();
      pubs.forEach((p, i) => node(P(0, p.y), nw ? p.s : p.n, hues[i]));
      sinks.forEach((p) => node(P(1, p.y), nw ? p.s : p.n, p.c));
      if (mode === 'stream') node(tp, nw ? 'topic' : 'topic: session-events', '#5eead4', nw ? 'fan-out' : 'Pub/Sub fan-out');
      else node(tp, nw ? `buffer [${buffer.length}]` : `staging buffer [${buffer.length}]`, '#f87171', `next run ${((BATCH_EVERY - batchTimer) / 1000).toFixed(1)}s`);
      ['pub', 'bq', 'gcs', 'db'].forEach((k) => set(k, counts[k]));
    });
    return () => s.dispose();
  }

  // ------------------------------------------------------------------ SQL / BigQuery
  function sql(el) {
    const s = scope();
    const r = rng(42);
    const platforms = ['ios', 'android', 'web'];
    const events = ['app_open', 'paywall_view', 'purchase', 'feature_used', 'session_end'];
    const rows = [];
    for (let i = 0; i < 1200; i++) {
      const p = platforms[r() < 0.45 ? 0 : r() < 0.75 ? 1 : 2];
      rows.push({
        user_id: 'u' + Math.floor(r() * 180), platform: p,
        event: events[Math.floor(Math.pow(r(), 1.6) * events.length)],
        duration_ms: Math.round(200 + r() * 9000 * (p === 'web' ? 0.6 : 1)),
        day: Math.floor(r() * 7),
      });
    }
    const Q = [
      {
        name: 'Events by platform',
        sql: `SELECT platform,
       COUNT(*)                 AS events,
       COUNT(DISTINCT user_id)  AS users,
       ROUND(AVG(duration_ms))  AS avg_ms
FROM   analytics.session_events
GROUP  BY platform
ORDER  BY events DESC;`,
        run() {
          const m = {};
          rows.forEach((x) => { const a = (m[x.platform] ||= { platform: x.platform, events: 0, users: new Set(), sum: 0 }); a.events++; a.users.add(x.user_id); a.sum += x.duration_ms; });
          return Object.values(m).map((a) => ({ platform: a.platform, events: a.events, users: a.users.size, avg_ms: Math.round(a.sum / a.events) })).sort((a, b) => b.events - a.events);
        }, bar: 'events',
      },
      {
        name: 'Paywall → purchase funnel',
        sql: `SELECT platform,
       COUNTIF(event = 'paywall_view') AS paywall_views,
       COUNTIF(event = 'purchase')     AS purchases,
       ROUND(SAFE_DIVIDE(COUNTIF(event = 'purchase'),
             COUNTIF(event = 'paywall_view')) * 100, 1) AS conv_pct
FROM   analytics.session_events
GROUP  BY platform
ORDER  BY conv_pct DESC;`,
        run() {
          const m = {};
          rows.forEach((x) => { const a = (m[x.platform] ||= { platform: x.platform, paywall_views: 0, purchases: 0 }); if (x.event === 'paywall_view') a.paywall_views++; if (x.event === 'purchase') a.purchases++; });
          return Object.values(m).map((a) => ({ ...a, conv_pct: a.paywall_views ? Math.round((a.purchases / a.paywall_views) * 1000) / 10 : null })).sort((a, b) => b.conv_pct - a.conv_pct);
        }, bar: 'conv_pct',
      },
      {
        name: 'DAU + 3-day moving avg (window)',
        sql: `WITH daily AS (
  SELECT day, COUNT(DISTINCT user_id) AS dau
  FROM   analytics.session_events
  GROUP  BY day
)
SELECT day, dau,
       ROUND(AVG(dau) OVER (ORDER BY day
             ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 1) AS dau_3d
FROM   daily
ORDER  BY day;`,
        run() {
          const m = {};
          rows.forEach((x) => (m[x.day] ||= new Set()).add(x.user_id));
          const d = Object.keys(m).map(Number).sort((a, b) => a - b).map((day) => ({ day: 'D' + (day + 1), dau: m[day].size }));
          d.forEach((x, i) => { const w = d.slice(Math.max(0, i - 2), i + 1); x.dau_3d = Math.round((w.reduce((a, b) => a + b.dau, 0) / w.length) * 10) / 10; });
          return d;
        }, bar: 'dau',
      },
    ];
    el.innerHTML = `
      <div class="demo-bar"><div class="seg">${Q.map((q, i) => `<button data-q="${i}" class="${i ? '' : 'on'}">${q.name}</button>`).join('')}</div></div>
      <div class="split">
        <pre class="code sql"></pre>
        <div><div class="tbl-wrap"></div><p class="demo-note meta"></p></div>
      </div>`;
    function show(i) {
      const q = Q[i];
      el.querySelector('.code').innerHTML = hlSQL(q.sql);
      const t0 = performance.now();
      const res = q.run();
      const ms = (performance.now() - t0).toFixed(2);
      const cols = Object.keys(res[0]);
      const max = Math.max(...res.map((x) => x[q.bar]));
      el.querySelector('.tbl-wrap').innerHTML = `<table class="tbl"><thead><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${res.map((row) => `<tr>${cols.map((c) => `<td>${c === q.bar ? `<span class="cellbar" style="--w:${(row[c] / max) * 100}%"></span>` : ''}${esc(row[c])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      el.querySelector('.meta').textContent = `${res.length} rows · scanned ${rows.length.toLocaleString()} generated session events in ${ms} ms (computed in your browser)`;
    }
    s.on(el.querySelector('.seg'), 'click', (e) => { const b = e.target.closest('button'); if (!b) return; el.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b)); show(+b.dataset.q); });
    show(0);
    return () => s.dispose();
  }

  function hlSQL(src) {
    return esc(src)
      .replace(/('[^']*')/g, '<span class="t-str">$1</span>')
      .replace(/\b(SELECT|FROM|GROUP|BY|ORDER|DESC|AS|WITH|OVER|ROWS|BETWEEN|PRECEDING|AND|CURRENT|ROW|WHERE|EXCEPT|PARTITION)\b/g, '<span class="t-kw">$1</span>')
      .replace(/\b(COUNT|COUNTIF|ROUND|AVG|SAFE_DIVIDE|DISTINCT|ROW_NUMBER)\b/g, '<span class="t-fn">$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="t-num">$1</span>');
  }

  // ------------------------------------------------------------------ Protobuf
  function protobuf(el) {
    const s = scope();
    el.innerHTML = `
      <div class="split">
        <div>
<pre class="code">message <span class="t-fn">SessionEvent</span> {
  <span class="t-kw">string</span> user_id     = <span class="t-num">1</span>;
  <span class="t-kw">int32</span>  duration_ms = <span class="t-num">2</span>;
  <span class="t-kw">string</span> event       = <span class="t-num">3</span>;
  <span class="t-kw">bool</span>   is_premium  = <span class="t-num">4</span>;
}</pre>
          <div class="form">
            <label><span class="f1">user_id</span><input data-f="user_id" value="u_4812"></label>
            <label><span class="f2">duration_ms</span><input data-f="duration_ms" type="number" min="0" value="1500"></label>
            <label><span class="f3">event</span><input data-f="event" value="paywall_view"></label>
            <label class="check"><input data-f="is_premium" type="checkbox" checked><span class="f4">is_premium</span></label>
          </div>
        </div>
        <div>
          <div class="label">Wire bytes (hex)</div>
          <div class="bytes"></div>
          <div class="label">Field breakdown</div>
          <div class="breakdown"></div>
          <div class="sizes"></div>
        </div>
      </div>`;
    const varint = (n) => { const out = []; n = Math.max(0, Math.min(2147483647, Math.floor(n) || 0)); while (n > 127) { out.push((n & 127) | 128); n = Math.floor(n / 128); } out.push(n); return out; };
    const enc = new TextEncoder();
    function render() {
      const v = {};
      el.querySelectorAll('[data-f]').forEach((i) => { v[i.dataset.f] = i.type === 'checkbox' ? i.checked : i.value; });
      const fields = [];
      const str = (no, name, val) => { if (!val) return; const b = [...enc.encode(val)]; fields.push({ no, name, tag: (no << 3) | 2, len: varint(b.length), body: b, note: `wire type 2 (length-delimited), ${b.length} bytes UTF-8` }); };
      str(1, 'user_id', v.user_id);
      const d = Number(v.duration_ms) || 0;
      if (d) fields.push({ no: 2, name: 'duration_ms', tag: (2 << 3) | 0, len: [], body: varint(d), note: `wire type 0 (varint), ${d} → ${varint(d).length} byte(s)` });
      str(3, 'event', v.event);
      if (v.is_premium) fields.push({ no: 4, name: 'is_premium', tag: (4 << 3) | 0, len: [], body: [1], note: 'wire type 0 (varint), true → 01' });
      const hx = (b) => b.toString(16).padStart(2, '0');
      el.querySelector('.bytes').innerHTML = fields.map((f) =>
        `<span class="f${f.no}"><i>${hx(f.tag)}</i>${f.len.map((b) => `<u>${hx(b)}</u>`).join('')}${f.body.map(hx).join(' ')}</span>`).join(' ') || '<span class="muted">(empty message = 0 bytes)</span>';
      el.querySelector('.breakdown').innerHTML = fields.map((f) =>
        `<div class="brow"><span class="f${f.no}">#${f.no} ${f.name}</span><span>tag <code>${hx(f.tag)}</code> = (${f.no} &lt;&lt; 3) | ${f.tag & 7}${f.len.length ? ` · len <code>${f.len.map(hx).join(' ')}</code>` : ''}</span><span class="muted">${f.note}</span></div>`).join('');
      const pb = fields.reduce((a, f) => a + 1 + f.len.length + f.body.length, 0);
      const json = enc.encode(JSON.stringify({ user_id: v.user_id, duration_ms: d, event: v.event, is_premium: !!v.is_premium })).length;
      el.querySelector('.sizes').innerHTML = `
        <div class="sizebar"><span>Protobuf</span><i style="--w:${(pb / json) * 100}%"></i><b>${pb} B</b></div>
        <div class="sizebar json"><span>JSON</span><i style="--w:100%"></i><b>${json} B</b></div>
        <p class="demo-note">${Math.round((1 - pb / json) * 100)}% smaller on the wire. Field names never travel; only the field numbers do.</p>`;
    }
    s.on(el, 'input', render);
    render();
    return () => s.dispose();
  }

  // ------------------------------------------------------------------ Firebase realtime QA app
  function firebase(el) {
    const s = scope();
    let server = [
      { id: 1, title: 'Crash on onboarding step 3', sev: 'high', status: 'open', by: 'QA' },
      { id: 2, title: 'Paywall button clipped on small screens', sev: 'low', status: 'fixing', by: 'Dev' },
    ];
    let nextId = 3;
    const devices = [
      { id: 'ios', name: 'iPhone · SwiftUI', who: 'QA', state: structuredClone(server), pending: new Set() },
      { id: 'android', name: 'Pixel · Android', who: 'Dev', state: structuredClone(server), pending: new Set() },
    ];
    el.innerHTML = `
      <div class="fb">
        ${devices.map((d) => `
          <div class="phone ${d.id}" data-dev="${d.id}">
            <div class="phone-notch"></div>
            <div class="phone-head"><b>QA Monitor</b><span>${d.name}</span></div>
            <ul class="bugs"></ul>
            <form class="bug-form"><input placeholder="Report a bug…" maxlength="48"><select><option>high</option><option selected>med</option><option>low</option></select><button class="btn sm">+</button></form>
          </div>`).join('<div class="cloud"><div class="cloud-core"><span>Firestore</span><small>realtime listeners</small></div><ol class="synclog"></ol></div>')}
      </div>
      <p class="demo-note">Add a bug or tap a status on either phone. The write shows up on that device immediately (optimistic), is confirmed by the backend, and is pushed to the other device through its listener. Network latency is simulated.</p>`;
    const log = (msg) => {
      const ol = el.querySelector('.synclog'); const li = document.createElement('li'); li.textContent = msg; ol.prepend(li);
      while (ol.children.length > 5) ol.lastChild.remove();
      el.querySelector('.cloud-core').classList.remove('pulse'); void el.offsetWidth; el.querySelector('.cloud-core').classList.add('pulse');
    };
    const next = { open: 'fixing', fixing: 'fixed', fixed: 'open' };
    function render() {
      devices.forEach((d) => {
        el.querySelector(`[data-dev="${d.id}"] .bugs`).innerHTML = d.state.map((b) => `
          <li class="${d.pending.has(b.id) ? 'pending' : ''}">
            <span class="sev ${b.sev}"></span><span class="bt">${esc(b.title)}<small>by ${b.by}</small></span>
            <button class="st ${b.status}" data-id="${b.id}">${b.status}</button>
          </li>`).join('');
      });
    }
    function write(dev, op) {
      op(dev.state); dev.pending.add(op.id); render();
      s.timeout(() => {
        op(server); log(`${dev.id} → write ${op.label}`);
        s.timeout(() => {
          devices.forEach((d) => { d.state = structuredClone(server); d.pending.delete(op.id); });
          log(`push → ${devices.map((d) => d.id).join(', ')}`);
          render();
        }, 280 + Math.random() * 250);
      }, 250 + Math.random() * 250);
    }
    devices.forEach((d) => {
      const root = el.querySelector(`[data-dev="${d.id}"]`);
      s.on(root.querySelector('form'), 'submit', (e) => {
        e.preventDefault();
        const inp = root.querySelector('input'); const title = inp.value.trim(); if (!title) return;
        const bug = { id: nextId++, title, sev: root.querySelector('select').value, status: 'open', by: d.who };
        const op = (st) => { if (!st.some((b) => b.id === bug.id)) st.unshift({ ...bug }); };
        op.id = bug.id; op.label = `bugs/${bug.id}`; inp.value = '';
        write(d, op);
      });
      s.on(root, 'click', (e) => {
        const b = e.target.closest('.st'); if (!b) return;
        const id = +b.dataset.id;
        const cur = d.state.find((x) => x.id === id).status;
        const op = (st) => { const x = st.find((y) => y.id === id); if (x) x.status = next[cur]; };
        op.id = id; op.label = `bugs/${id}.status=${next[cur]}`;
        write(d, op);
      });
    });
    render();
    return () => s.dispose();
  }

  // ------------------------------------------------------------------ Docker layer cache
  function docker(el) {
    const s = scope();
    const GOOD = [
      { l: 'FROM node:20-alpine', cost: 3, dep: 'base' },
      { l: 'WORKDIR /app', cost: 0.1 },
      { l: 'COPY package*.json ./', cost: 0.2, dep: 'deps' },
      { l: 'RUN npm ci', cost: 38 },
      { l: 'COPY . .', cost: 0.4, dep: 'src' },
      { l: 'RUN npm run build', cost: 12 },
      { l: 'CMD ["node", "dist/server.js"]', cost: 0 },
    ];
    const BAD = [GOOD[0], GOOD[1], { l: 'COPY . .', cost: 0.4, dep: 'src deps' }, GOOD[3], GOOD[5], GOOD[6]];
    let order = 'good', busy = false;
    el.innerHTML = `
      <div class="demo-bar">
        <div class="seg" data-order><button class="on" data-o="good">Cache-friendly order</button><button data-o="bad">Naive order</button></div>
      </div>
      <div class="demo-bar">
        <span class="muted">Change:</span>
        <button class="btn sm" data-ch="src">Edit source code</button>
        <button class="btn sm" data-ch="deps">Add a dependency</button>
        <button class="btn sm ghost" data-ch="none">Rebuild, no changes</button>
      </div>
      <div class="layers"></div>
      <div class="build-total"></div>`;
    const lines = () => (order === 'good' ? GOOD : BAD);
    function paint(states) {
      el.querySelector('.layers').innerHTML = lines().map((x, i) => `
        <div class="layer ${states ? states[i] || '' : ''}"><code>${esc(x.l)}</code><span class="lstate"></span><i class="lbar"></i></div>`).join('');
    }
    function build(change) {
      if (busy) return; busy = true;
      const L = lines();
      let inval = L.findIndex((x) => x.dep && change !== 'none' && x.dep.split(' ').includes(change));
      if (inval < 0) inval = Infinity;
      paint([]);
      const rows = el.querySelectorAll('.layer');
      let t = 0, i = 0;
      const step = () => {
        if (i >= L.length) { busy = false; el.querySelector('.build-total').innerHTML = `Build finished in <b>${t.toFixed(1)}s</b> ${t < 5 ? '⚡ mostly cache hits' : t > 40 ? '🐢 dependencies reinstalled' : ''}`; return; }
        const row = rows[i]; const rebuild = i >= inval;
        row.classList.add(rebuild ? 'run' : 'cached');
        row.querySelector('.lstate').textContent = rebuild ? `rebuilding… ${L[i].cost}s` : 'CACHED';
        const dur = rebuild ? Math.max(120, L[i].cost * 40) : 90;
        row.style.setProperty('--d', dur + 'ms');
        t += rebuild ? L[i].cost : 0;
        el.querySelector('.build-total').innerHTML = `Building… <b>${t.toFixed(1)}s</b>`;
        i++; s.timeout(step, dur);
      };
      step();
    }
    s.on(el.querySelector('[data-order]'), 'click', (e) => { const b = e.target.closest('button'); if (!b || busy) return; el.querySelectorAll('[data-order] button').forEach((x) => x.classList.toggle('on', x === b)); order = b.dataset.o; paint(); el.querySelector('.build-total').textContent = 'Pick a change to trigger a rebuild.'; });
    el.querySelectorAll('[data-ch]').forEach((b) => s.on(b, 'click', () => build(b.dataset.ch)));
    paint(); el.querySelector('.build-total').textContent = 'Pick a change to trigger a rebuild.';
    return () => s.dispose();
  }

  // ------------------------------------------------------------------ CI/CD pipeline
  function cicd(el) {
    const s = scope();
    const stages = [
      { n: 'checkout', logs: ['actions/checkout@v4', 'HEAD is now at 3f9c2e1 feat: stream session events'] },
      { n: 'install', logs: ['npm ci', 'added 412 packages in 9s'] },
      { n: 'lint', logs: ['eslint . --max-warnings 0', '✔ no problems'] },
      { n: 'test', logs: ['vitest run', '✓ ingest.normalize (14 tests)', '✓ analytics.stats (22 tests)'] },
      { n: 'docker build', logs: ['docker build -t api:3f9c2e1 .', 'writing image sha256:9d1e…  done'] },
      { n: 'push', logs: ['docker push registry/api:3f9c2e1', 'pushed 7 layers'] },
      { n: 'deploy', par: ['AWS EC2', 'GCP'], logs: ['deploy → aws ec2 (rolling)', 'deploy → gcp', 'health check 200 OK ✔'] },
    ];
    el.innerHTML = `
      <div class="demo-bar">
        <button class="btn sm" data-run>▶ Run workflow</button>
        <label class="check"><input type="checkbox" data-fail> Introduce a failing test</label>
        <button class="btn sm ghost" data-yaml>Show workflow YAML</button>
      </div>
      <div class="pipe">${stages.map((st, i) => `<div class="stage" data-i="${i}"><span class="dot"></span><b>${st.n}</b>${st.par ? `<small>${st.par.join(' + ')}</small>` : ''}</div>`).join('<i class="conn"></i>')}</div>
      <pre class="code log"></pre>
      <pre class="code yaml" hidden>${esc(`name: build-test-deploy
on:
  push:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm test            # a failure stops the pipeline here
      - run: docker build -t $IMAGE:\${{ github.sha }} .
      - run: docker push $IMAGE:\${{ github.sha }}

  deploy:
    needs: ci
    strategy:
      matrix: { target: [aws-ec2, gcp] }
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh \${{ matrix.target }}`)}</pre>`;
    const logEl = el.querySelector('.log');
    let running = false;
    const add = (t, cls = '') => { logEl.insertAdjacentHTML('beforeend', `<span class="${cls}">${esc(t)}</span>\n`); logEl.scrollTop = logEl.scrollHeight; };
    logEl.textContent = '$ waiting for push to main…';
    s.on(el.querySelector('[data-yaml]'), 'click', (e) => { const y = el.querySelector('.yaml'); y.hidden = !y.hidden; e.target.textContent = y.hidden ? 'Show workflow YAML' : 'Hide workflow YAML'; });
    s.on(el.querySelector('[data-run]'), 'click', () => {
      if (running) return; running = true;
      const fail = el.querySelector('[data-fail]').checked;
      logEl.textContent = '';
      el.querySelectorAll('.stage').forEach((x) => (x.className = 'stage'));
      let i = 0;
      const next = () => {
        if (i >= stages.length) { add('✔ workflow succeeded, deployed to AWS + GCP', 't-ok'); running = false; return; }
        const st = stages[i]; const node = el.querySelector(`.stage[data-i="${i}"]`);
        node.classList.add('active'); add(`▸ ${st.n}`, 't-kw');
        let j = 0;
        const logs = st.n === 'test' && fail ? ['vitest run', '✓ ingest.normalize (14 tests)', '✗ analytics.stats > weekly retention: expected 0.42, received 0.39', 'Tests: 1 failed, 35 passed'] : st.logs;
        const line = () => {
          if (j < logs.length) { add('  ' + logs[j], logs[j].startsWith('✗') ? 't-err' : ''); j++; s.timeout(line, 260); return; }
          node.classList.remove('active');
          if (st.n === 'test' && fail) {
            node.classList.add('failed');
            el.querySelectorAll('.stage').forEach((x, k) => k > i && x.classList.add('skipped'));
            add('✗ job failed: build, push and deploy skipped. Production untouched.', 't-err');
            running = false; return;
          }
          node.classList.add('done'); i++; s.timeout(next, 200);
        };
        line();
      };
      next();
    });
    return () => s.dispose();
  }

  // ------------------------------------------------------------------ Terminal launcher
  function terminal(el) {
    el.innerHTML = `
      <div class="term-promo">
        <pre class="code">amit@portfolio:~$ help
  whoami  skills  experience  projects  contact  cv  demo &lt;skill&gt;  clear
amit@portfolio:~$ <span class="caret">█</span></pre>
        <button class="btn" data-open>Open the site terminal</button>
        <p class="demo-note">Shortcut: press <kbd>\`</kbd> anywhere on the page.</p>
      </div>`;
    const b = el.querySelector('[data-open]');
    const f = () => window.Portfolio && window.Portfolio.openTerminal();
    b.addEventListener('click', f);
    return () => b.removeEventListener('click', f);
  }

  // ------------------------------------------------------------------ REST ingestion
  function rest(el) {
    const s = scope();
    const RAW = {
      appstore: {
        label: 'App Store Connect API',
        body: { data: [{ type: 'customerReviews', id: '8841207', attributes: { rating: 2, title: 'Keeps logging me out', body: 'Since the update I have to sign in every time.', reviewerNickname: 'dana_k', createdDate: '2026-09-14T08:12:00-07:00', territory: 'USA' } }] },
      },
      play: {
        label: 'Google Play Developer API',
        body: { reviews: [{ reviewId: 'gp:AOqpTOE', authorName: 'Yossi L.', comments: [{ userComment: { text: 'אפליקציה מעולה, אבל חסר מצב כהה', starRating: 4, reviewerLanguage: 'iw', lastModified: { seconds: '1757836800' } } }] }] },
      },
      sendgrid: {
        label: 'SendGrid Inbound Parse',
        body: { from: 'Maria Lopez <maria@example.com>', subject: 'Refund request', text: 'Me cobraron dos veces este mes.', headers: 'Date: Mon, 15 Sep 2026 10:03:11 +0000', charsets: '{"text":"UTF-8"}' },
      },
    };
    const normalizers = {
      appstore: (p) => p.data.map((r) => ({ id: `appstore:${r.id}`, source: 'app_store', rating: r.attributes.rating, text: `${r.attributes.title}. ${r.attributes.body}`, author: r.attributes.reviewerNickname, locale: r.attributes.territory, received_at: new Date(r.attributes.createdDate).toISOString() })),
      play: (p) => p.reviews.map((r) => { const c = r.comments[0].userComment; return { id: `play:${r.reviewId}`, source: 'google_play', rating: c.starRating, text: c.text, author: r.authorName, locale: c.reviewerLanguage, received_at: new Date(+c.lastModified.seconds * 1000).toISOString() }; }),
      sendgrid: (p) => [{ id: `email:${p.subject.toLowerCase().replace(/\W+/g, '-')}`, source: 'email', rating: null, text: p.text, author: p.from.replace(/\s*<.*>/, ''), locale: null, received_at: new Date(p.headers.replace('Date: ', '')).toISOString() }],
    };
    el.innerHTML = `
      <div class="demo-bar"><div class="seg">${Object.entries(RAW).map(([k, v], i) => `<button data-k="${k}" class="${i ? '' : 'on'}">${v.label}</button>`).join('')}</div></div>
      <div class="split">
        <div><div class="label">Raw payload (shape simplified)</div><pre class="code raw"></pre></div>
        <div><div class="label"><span class="method">POST</span> /v1/feedback/ingest → <span class="resp"></span></div><pre class="code norm"></pre></div>
      </div>
      <div class="demo-bar"><button class="btn sm" data-all>Ingest all three sources → unified feed</button></div>
      <p class="demo-note">Three providers, three shapes, one schema. Downstream analytics only ever see <code>{ id, source, rating, text, author, locale, received_at }</code>.</p>`;
    const json = (o) => esc(JSON.stringify(o, null, 2)).replace(/(&quot;[\w_]+&quot;):/g, '<span class="t-kw">$1</span>:').replace(/: (&quot;.*?&quot;)/g, ': <span class="t-str">$1</span>').replace(/: (\d+|null)/g, ': <span class="t-num">$1</span>');
    function show(k) {
      el.querySelector('.raw').innerHTML = json(RAW[k].body);
      el.querySelector('.norm').innerHTML = json(normalizers[k](RAW[k].body));
      el.querySelector('.resp').textContent = `202 Accepted · ${(8 + Math.random() * 14).toFixed(0)} ms`;
    }
    s.on(el.querySelector('.seg'), 'click', (e) => { const b = e.target.closest('button'); if (!b) return; el.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b)); show(b.dataset.k); });
    s.on(el.querySelector('[data-all]'), 'click', () => {
      const all = Object.keys(RAW).flatMap((k) => normalizers[k](RAW[k].body)).sort((a, b) => b.received_at.localeCompare(a.received_at));
      el.querySelector('.raw').innerHTML = '<span class="muted">// 3 sources merged</span>';
      el.querySelector('.norm').innerHTML = json(all);
      el.querySelector('.resp').textContent = `202 Accepted · ${all.length} items`;
    });
    show('appstore');
    return () => s.dispose();
  }

  // ------------------------------------------------------------------ Polyglot
  const CODE = {
    TypeScript: `type Event = { id: string; ts: number; payload: unknown };

export function latestById(events: Event[]): Event[] {
  const latest = new Map<string, Event>();
  for (const e of events) {
    const seen = latest.get(e.id);
    if (!seen || e.ts > seen.ts) latest.set(e.id, e);
  }
  return [...latest.values()];
}`,
    Python: `from dataclasses import dataclass
from typing import Any

@dataclass(frozen=True)
class Event:
    id: str
    ts: int
    payload: Any

def latest_by_id(events: list[Event]) -> list[Event]:
    latest: dict[str, Event] = {}
    for e in events:
        seen = latest.get(e.id)
        if seen is None or e.ts > seen.ts:
            latest[e.id] = e
    return list(latest.values())`,
    Go: `type Event struct {
	ID      string
	TS      int64
	Payload []byte
}

func LatestByID(events []Event) []Event {
	latest := make(map[string]Event, len(events))
	order := make([]string, 0, len(events))
	for _, e := range events {
		seen, ok := latest[e.ID]
		if !ok {
			order = append(order, e.ID)
		}
		if !ok || e.TS > seen.TS {
			latest[e.ID] = e
		}
	}
	out := make([]Event, 0, len(order))
	for _, id := range order {
		out = append(out, latest[id])
	}
	return out
}`,
    Java: `record Event(String id, long ts, byte[] payload) {}

static List<Event> latestById(List<Event> events) {
    Map<String, Event> latest = new LinkedHashMap<>();
    for (Event e : events) {
        latest.merge(e.id(), e, (a, b) -> b.ts() > a.ts() ? b : a);
    }
    return new ArrayList<>(latest.values());
}`,
    Swift: `struct Event { let id: String; let ts: Int; let payload: Data }

func latestById(_ events: [Event]) -> [Event] {
    var latest: [String: Event] = [:]
    var order: [String] = []
    for e in events {
        if let seen = latest[e.id] {
            if e.ts > seen.ts { latest[e.id] = e }
        } else {
            latest[e.id] = e
            order.append(e.id)
        }
    }
    return order.compactMap { latest[$0] }
}`,
    'C++': `struct Event { std::string id; int64_t ts; std::string payload; };

std::vector<Event> latestById(const std::vector<Event>& events) {
    std::unordered_map<std::string, size_t> index;
    std::vector<Event> out;
    for (const auto& e : events) {
        auto [it, inserted] = index.try_emplace(e.id, out.size());
        if (inserted) out.push_back(e);
        else if (e.ts > out[it->second].ts) out[it->second] = e;
    }
    return out;
}`,
    SQL: `-- BigQuery
SELECT * EXCEPT(rn)
FROM (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY id ORDER BY ts DESC) AS rn
  FROM analytics.session_events
)
WHERE rn = 1;`,
  };
  function polyglot(el) {
    const s = scope();
    const langs = Object.keys(CODE);
    el.innerHTML = `
      <p class="demo-note" style="margin-top:0">One real task from event pipelines, <b>deduplicate events by id and keep the latest</b>, written in each language I use.</p>
      <div class="demo-bar"><div class="seg wrap">${langs.map((l, i) => `<button data-l="${l}" class="${i ? '' : 'on'}">${l}</button>`).join('')}</div></div>
      <pre class="code poly"></pre>
      <div class="demo-bar"><button class="btn sm" data-run>▶ Run it (JS engine)</button><span class="muted run-out"></span></div>`;
    const kw = /\b(type|export|function|const|for|of|if|return|from|import|class|def|in|is|None|or|not|struct|func|make|range|var|let|else|record|static|new|auto|package)\b/g;
    const show = (l) => {
      el.querySelector('.poly').innerHTML = l === 'SQL' ? hlSQL(CODE[l]) : esc(CODE[l]).replace(/(\/\/.*|#.*)$/gm, '<span class="t-com">$1</span>').replace(kw, '<span class="t-kw">$1</span>');
    };
    s.on(el.querySelector('.seg'), 'click', (e) => { const b = e.target.closest('button'); if (!b) return; el.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b)); show(b.dataset.l); });
    s.on(el.querySelector('[data-run]'), 'click', () => {
      const input = [{ id: 'a', ts: 1 }, { id: 'b', ts: 5 }, { id: 'a', ts: 9 }, { id: 'c', ts: 2 }, { id: 'b', ts: 3 }];
      const latest = new Map();
      for (const e of input) { const seen = latest.get(e.id); if (!seen || e.ts > seen.ts) latest.set(e.id, e); }
      el.querySelector('.run-out').textContent = `in: ${input.map((e) => e.id + '@' + e.ts).join(' ')} → out: ${[...latest.values()].map((e) => e.id + '@' + e.ts).join(' ')}`;
    });
    show(langs[0]);
    return () => s.dispose();
  }

  // ------------------------------------------------------------------ Multi-LLM consensus
  function llm(el) {
    const s = scope();
    const CLAIMS = [
      {
        q: 'Google Pub/Sub delivers each message exactly once by default.',
        truth: 'False: delivery is at-least-once by default; exactly-once is an opt-in subscription setting.',
        a: [
          ['false', 'Default is at-least-once. Consumers must be idempotent unless exactly-once delivery is enabled on the subscription.'],
          ['false', 'At-least-once. Duplicates are possible, especially around ack deadlines.'],
          ['true', 'Pub/Sub provides exactly-once semantics for all subscriptions.'],
          ['false', 'Only when "exactly-once delivery" is enabled; the default is at-least-once.'],
        ],
      },
      {
        q: 'After deleting a Protobuf field, its field number can safely be reused.',
        truth: 'False: reuse breaks old readers; mark the number as reserved.',
        a: [
          ['false', 'Reusing the number lets old data decode into the wrong field. Use `reserved`.'],
          ['false', 'Unsafe. Reserve both the number and the name.'],
          ['false', 'Old binaries will misinterpret the new field. Reserve it.'],
          ['false', 'No. This is the classic compatibility trap; declare it reserved.'],
        ],
      },
      {
        q: 'Adding LIMIT 10 to a SELECT * in BigQuery reduces the bytes billed.',
        truth: 'Generally false: on-demand billing is by columns scanned. LIMIT alone does not cut bytes except in specific clustered-table cases.',
        a: [
          ['false', 'Bytes billed depend on columns read, not rows returned.'],
          ['true', 'LIMIT stops the scan early, so fewer bytes are processed.'],
          ['false', 'SELECT * scans all columns regardless of LIMIT.'],
          ['true', 'Yes, LIMIT reduces the amount of data processed.'],
        ],
      },
    ];
    const models = ['Model A', 'Model B', 'Model C', 'Model D'];
    el.innerHTML = `
      <div class="demo-bar"><div class="seg wrap">${CLAIMS.map((c, i) => `<button data-c="${i}" class="${i ? '' : 'on'}">Claim ${i + 1}</button>`).join('')}</div><button class="btn sm" data-verify>▶ Cross-verify</button></div>
      <blockquote class="claim"></blockquote>
      <div class="models">${models.map((m, i) => `<div class="model" data-m="${i}"><div class="mh"><b>${m}</b><span class="verdict"></span></div><p class="mt"></p></div>`).join('')}</div>
      <div class="consensus"><div class="meter"><i></i></div><div class="decision muted">Pick a claim and run cross-verification.</div></div>
      <p class="demo-note">Simulated responses showing the workflow. In production the ensemble is Claude (Sonnet/Opus), Gemini, ChatGPT and Grok. Unanimous findings are accepted, a single dissent is flagged for a human to verify against primary sources, and a split is rejected.</p>`;
    let cur = 0, runId = 0;
    const setClaim = (i) => {
      cur = i; runId++;
      el.querySelector('.claim').textContent = '“' + CLAIMS[i].q + '”';
      el.querySelectorAll('.model').forEach((m) => { m.className = 'model'; m.querySelector('.mt').textContent = ''; m.querySelector('.verdict').textContent = ''; });
      el.querySelector('.meter i').style.width = '0%';
      el.querySelector('.decision').className = 'decision muted';
      el.querySelector('.decision').textContent = 'Ready to cross-verify.';
    };
    s.on(el.querySelector('.seg'), 'click', (e) => { const b = e.target.closest('button'); if (!b) return; el.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b)); setClaim(+b.dataset.c); });
    s.on(el.querySelector('[data-verify]'), 'click', () => {
      setClaim(cur); const my = runId; const c = CLAIMS[cur];
      let done = 0;
      c.a.forEach(([v, txt], i) => {
        const m = el.querySelector(`[data-m="${i}"]`); m.classList.add('thinking');
        const out = m.querySelector('.mt'); let k = 0;
        const delay = 300 + i * 220 + Math.random() * 300;
        s.timeout(function type() {
          if (my !== runId) return;
          k += 2 + Math.floor(Math.random() * 3); out.textContent = txt.slice(0, k);
          if (k < txt.length) return s.timeout(type, 18);
          m.classList.remove('thinking'); m.classList.add(v);
          m.querySelector('.verdict').textContent = v.toUpperCase();
          if (++done === c.a.length) decide();
        }, delay);
      });
      function decide() {
        const tally = {}; c.a.forEach(([v]) => (tally[v] = (tally[v] || 0) + 1));
        const [top, n] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
        const pct = (n / c.a.length) * 100;
        el.querySelector('.meter i').style.width = pct + '%';
        const d = el.querySelector('.decision');
        if (pct === 100) { d.className = 'decision ok'; d.innerHTML = `<b>Accepted</b> · unanimous “${top}”. ${esc(c.truth)}`; }
        else if (pct >= 75) { d.className = 'decision warn'; d.innerHTML = `<b>Flagged</b> · ${n}/4 say “${top}”, one model dissents → human verifies against the official docs. Result: ${esc(c.truth)}`; }
        else { d.className = 'decision bad'; d.innerHTML = `<b>Rejected: no consensus</b> (${n}/4). Not shipped until verified from primary sources. Result: ${esc(c.truth)}`; }
        el.querySelectorAll('.model').forEach((m, i) => { if (c.a[i][0] !== top) m.classList.add('dissent'); });
      }
    });
    setClaim(0);
    return () => s.dispose();
  }

  // ------------------------------------------------------------------ Deterministic hybrid analytics
  function hybrid(el) {
    const s = scope();
    const REVIEWS = [
      { stars: 5, text: 'Love the new widgets, super smooth!' },
      { stars: 1, text: 'אחרי העדכון האפליקציה קורסת כל הזמן' },
      { stars: 4, text: 'Great app but the subscription is pricey' },
      { stars: 5, text: 'La app dejó de sincronizar mis datos 😡' },
      { stars: 2, text: 'Ads everywhere, hard to find settings' },
      { stars: 5, text: 'Exactly what I needed for work' },
    ];
    // What the LLM layer returns: extraction only, never numbers or decisions.
    const LLM = [
      { lang: 'en', translation: 'Love the new widgets, super smooth!', sentiment: 'positive', topics: ['widgets', 'performance'] },
      { lang: 'he', translation: 'Since the update the app crashes all the time', sentiment: 'negative', topics: ['stability'] },
      { lang: 'en', translation: 'Great app but the subscription is pricey', sentiment: 'mixed', topics: ['pricing'] },
      { lang: 'es', translation: 'The app stopped syncing my data', sentiment: 'Very Negative!!', topics: ['sync'] },
      { lang: 'en', translation: 'Ads everywhere, hard to find settings', sentiment: 'negative', topics: ['ads', 'navigation'] },
      { lang: 'en', translation: 'Exactly what I needed for work', sentiment: 'positive', topics: ['usefulness'] },
    ];
    const RETRY = { lang: 'es', translation: 'The app stopped syncing my data', sentiment: 'negative', topics: ['sync'] };
    el.innerHTML = `
      <div class="demo-bar"><button class="btn sm" data-run>▶ Run pipeline</button><span class="muted">LLM extracts → schema validates → code decides</span></div>
      <div class="hy">
        <div class="hy-col"><div class="label">1 · Raw reviews</div><ul class="hy-list raw"></ul></div>
        <div class="hy-col"><div class="label">2 · LLM layer <small>(extraction only)</small></div><ul class="hy-list llm"></ul></div>
        <div class="hy-col"><div class="label">3 · Deterministic core <small>(plain code)</small></div><div class="hy-out"></div></div>
      </div>
      <details class="code-details"><summary>The deterministic core</summary><pre class="code">${esc(`const SENTIMENTS = ['positive', 'negative', 'mixed', 'neutral'];

function validate(x) {                 // reject anything off-schema
  return SENTIMENTS.includes(x.sentiment)
      && typeof x.translation === 'string'
      && Array.isArray(x.topics);
}

function analyze(reviews, parsed) {    // all math lives here, not in the model
  const share = countBy(parsed, p => p.sentiment);
  const avgStars = mean(reviews.map(r => r.stars));
  const mismatches = reviews.filter((r, i) =>
    (r.stars >= 4 && parsed[i].sentiment === 'negative') ||
    (r.stars <= 2 && parsed[i].sentiment === 'positive'));
  return { share, avgStars, mismatches, topics: countBy(parsed.flatMap(p => p.topics)) };
}`)}</pre></details>`;
    const SENT = ['positive', 'negative', 'mixed', 'neutral'];
    const valid = (x) => SENT.includes(x.sentiment) && typeof x.translation === 'string' && Array.isArray(x.topics);
    el.querySelector('.raw').innerHTML = REVIEWS.map((r) => `<li><span class="stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span>${esc(r.text)}</li>`).join('');
    let running = false;
    s.on(el.querySelector('[data-run]'), 'click', () => {
      if (running) return; running = true;
      const ul = el.querySelector('.llm'); ul.innerHTML = ''; el.querySelector('.hy-out').innerHTML = '';
      const parsed = [];
      let i = 0;
      const step = () => {
        if (i >= LLM.length) return finish();
        const x = LLM[i];
        const li = document.createElement('li');
        li.innerHTML = `<code>${esc(JSON.stringify({ lang: x.lang, sentiment: x.sentiment, topics: x.topics }))}</code>`;
        ul.appendChild(li);
        if (!valid(x)) {
          li.classList.add('rejected');
          li.insertAdjacentHTML('beforeend', `<small class="t-err">✗ schema violation: sentiment "${esc(x.sentiment)}" → re-prompt</small>`);
          s.timeout(() => {
            const r = document.createElement('li'); r.className = 'retried';
            r.innerHTML = `<code>${esc(JSON.stringify({ lang: RETRY.lang, sentiment: RETRY.sentiment, topics: RETRY.topics }))}</code><small class="t-ok">✓ valid on retry</small>`;
            ul.appendChild(r); parsed.push(RETRY); i++; s.timeout(step, 280);
          }, 650);
          return;
        }
        parsed.push(x); i++; s.timeout(step, 280);
      };
      function finish() {
        const share = {}; parsed.forEach((p) => (share[p.sentiment] = (share[p.sentiment] || 0) + 1));
        const avg = REVIEWS.reduce((a, r) => a + r.stars, 0) / REVIEWS.length;
        const mism = REVIEWS.map((r, k) => ({ r, p: parsed[k] })).filter(({ r, p }) => (r.stars >= 4 && p.sentiment === 'negative') || (r.stars <= 2 && p.sentiment === 'positive'));
        const topics = {}; parsed.flatMap((p) => p.topics).forEach((t) => (topics[t] = (topics[t] || 0) + 1));
        const colors = { positive: '#34d399', negative: '#f87171', mixed: '#fbbf24', neutral: '#94a3b8' };
        el.querySelector('.hy-out').innerHTML = `
          <div class="kv"><span>avg rating</span><b>${avg.toFixed(2)} ★</b></div>
          <div class="share">${Object.entries(share).map(([k, v]) => `<i style="flex:${v};background:${colors[k]}" title="${k}: ${v}"></i>`).join('')}</div>
          <div class="legend">${Object.entries(share).map(([k, v]) => `<span><i style="background:${colors[k]}"></i>${k} ${v}</span>`).join('')}</div>
          <div class="kv"><span>stars ≠ sentiment</span><b class="t-err">${mism.length} flagged</b></div>
          ${mism.map(({ r, p }) => `<div class="flag">${r.stars}★ but “${esc(p.translation)}”</div>`).join('')}
          <div class="kv"><span>top topics</span><b>${Object.entries(topics).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t).join(', ')}</b></div>`;
        running = false;
      }
      step();
    });
    return () => s.dispose();
  }

  // ------------------------------------------------------------------ Image compression pipeline
  function compress(el) {
    const s = scope();
    el.innerHTML = `
      <div class="demo-bar">
        <label>format <select data-fmt><option value="image/webp">WebP</option><option value="image/jpeg">JPEG</option></select></label>
        <label>quality <input type="range" data-q min="5" max="100" value="60"><b data-qv>60</b></label>
        <label>width <input type="range" data-w min="80" max="640" step="20" value="320"><b data-wv>320</b>px</label>
      </div>
      <div class="cmp">
        <figure><img alt="original" src="assets/amit.jpg"><figcaption>original · <b data-o>…</b></figcaption></figure>
        <figure><img alt="compressed" data-out><figcaption>pipeline output · <b data-n>…</b></figcaption></figure>
      </div>
      <p class="demo-note">Re-encoded in your browser with Canvas → Blob. The Studio System ran the same resize, re-encode and size-check steps on every generated UI asset.</p>`;
    const src = new Image(); src.src = 'assets/amit.jpg';
    let origBytes = 0, url = null, pending = false;
    fetch('assets/amit.jpg').then((r) => r.blob()).then((b) => { origBytes = b.size; el.querySelector('[data-o]').textContent = kb(b.size) + ' · 640px JPEG'; run(); }).catch(() => {});
    const kb = (n) => (n / 1024).toFixed(1) + ' KB';
    function run() {
      if (!src.complete || !src.naturalWidth || pending) return;
      pending = true;
      const q = +el.querySelector('[data-q]').value, w = +el.querySelector('[data-w]').value;
      el.querySelector('[data-qv]').textContent = q; el.querySelector('[data-wv]').textContent = w;
      const c = document.createElement('canvas'); c.width = w; c.height = Math.round((w * src.naturalHeight) / src.naturalWidth);
      c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
      c.toBlob((b) => {
        pending = false; if (!s.alive || !b) return;
        if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(b);
        el.querySelector('[data-out]').src = url;
        el.querySelector('[data-n]').textContent = `${kb(b.size)} · ${origBytes ? Math.round((1 - b.size / origBytes) * 100) + '% smaller' : ''}`;
      }, el.querySelector('[data-fmt]').value, q / 100);
    }
    src.onload = run;
    s.on(el, 'input', run); s.on(el, 'change', run);
    s.add(() => url && URL.revokeObjectURL(url));
    return () => s.dispose();
  }

  // ------------------------------------------------------------------ Prototype pollution (sandboxed model)
  function pollution(el) {
    const s = scope();
    el.innerHTML = `
      <div class="split">
        <div>
          <div class="label">Attacker-controlled JSON body</div>
          <textarea class="code payload" spellcheck="false" rows="4">{"name": "guest", "__proto__": {"isAdmin": true}}</textarea>
          <div class="demo-bar">
            <button class="btn sm danger" data-v>Vulnerable merge</button>
            <button class="btn sm" data-s>Safe merge</button>
            <button class="btn sm ghost" data-r>Reset</button>
          </div>
          <pre class="code merge-src"></pre>
        </div>
        <div>
          <div class="label">Simulated <code>Object.prototype</code></div>
          <pre class="code proto"></pre>
          <div class="label">Later, in an unrelated request…</div>
          <pre class="code pp-check"></pre>
          <div class="pp-log"></div>
        </div>
      </div>
      <p class="demo-note">Runs against a sandboxed model of the prototype chain, so this page's real <code>Object.prototype</code> is never touched. On a real Express/EJS server, polluted properties get read as template-engine options, and that is how pollution escalates to XSS or RCE.</p>`;
    const VULN = `function merge(target, source) {
  for (const key in source) {
    if (isObject(source[key])) {
      if (!target[key]) target[key] = {};
      merge(target[key], source[key]);   // key may be "__proto__"
    } else {
      target[key] = source[key];
    }
  }
}`;
    const SAFE = `const BLOCKED = new Set(['__proto__', 'constructor', 'prototype']);

function safeMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (BLOCKED.has(key)) continue;         // never walk into the prototype
    const v = source[key];
    if (isObject(v)) {
      if (!Object.hasOwn(target, key)) target[key] = Object.create(null);
      safeMerge(target[key], v);
    } else target[key] = v;
  }
}`;
    let PROTO = {};
    const CTOR = { __isCtor: true };
    const get = (o, k) => (k === '__proto__' ? PROTO : k === 'constructor' ? CTOR : o === CTOR && k === 'prototype' ? PROTO : o[k]);
    const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
    const log = (h) => el.querySelector('.pp-log').insertAdjacentHTML('beforeend', `<div>${h}</div>`);
    function vulnMerge(t, src, path) {
      for (const k in src) {
        const v = src[k];
        if (isObj(v)) {
          let sub = get(t, k);
          if (!sub) { t[k] = {}; sub = t[k]; }
          if (sub === PROTO) log(`<span class="t-err">⚠ walked into <b>${esc(path + k)}</b>: now writing to Object.prototype</span>`);
          vulnMerge(sub, v, path + k + '.');
        } else { t[k] = v; if (t === PROTO) log(`<span class="t-err">Object.prototype.${esc(k)} = ${esc(JSON.stringify(v))}</span>`); }
      }
    }
    const BLOCK = new Set(['__proto__', 'constructor', 'prototype']);
    function safeMerge(t, src) {
      for (const k of Object.keys(src)) {
        if (BLOCK.has(k)) { log(`<span class="t-ok">✓ blocked key "${esc(k)}"</span>`); continue; }
        const v = src[k];
        if (isObj(v)) { if (!Object.hasOwn(t, k)) t[k] = Object.create(null); safeMerge(t[k], v); } else t[k] = v;
      }
    }
    function render(code) {
      el.querySelector('.merge-src').innerHTML = esc(code).replace(/(\/\/.*)$/gm, '<span class="t-com">$1</span>');
      el.querySelector('.proto').textContent = Object.keys(PROTO).length ? JSON.stringify(PROTO, null, 2) : '{ }   // clean';
      const admin = 'isAdmin' in PROTO ? PROTO.isAdmin : undefined;
      el.querySelector('.pp-check').innerHTML = esc(`const session = {};            // brand-new, empty object
if (session.isAdmin) grantAdmin();`) + `\n\n<span class="${admin ? 't-err' : 't-ok'}">session.isAdmin → ${esc(String(admin))}   ${admin ? '⚠ ADMIN GRANTED to every user' : '✓ access denied'}</span>`;
      el.querySelector('.proto').classList.toggle('polluted', Object.keys(PROTO).length > 0);
    }
    const parse = () => { try { return JSON.parse(el.querySelector('.payload').value); } catch (e) { log(`<span class="t-err">JSON error: ${esc(e.message)}</span>`); return null; } };
    s.on(el.querySelector('[data-v]'), 'click', () => { el.querySelector('.pp-log').innerHTML = ''; const p = parse(); if (!p) return; vulnMerge({}, p, ''); render(VULN); });
    s.on(el.querySelector('[data-s]'), 'click', () => { el.querySelector('.pp-log').innerHTML = ''; PROTO = {}; const p = parse(); if (!p) return; safeMerge(Object.create(null), p); render(SAFE); });
    s.on(el.querySelector('[data-r]'), 'click', () => { PROTO = {}; el.querySelector('.pp-log').innerHTML = ''; render(VULN); });
    render(VULN);
    return () => s.dispose();
  }

  // ------------------------------------------------------------------ IaC scanner
  const TF = `resource "aws_s3_bucket" "events_archive" {
  bucket = "session-events-archive"
}

resource "aws_ebs_volume" "worker_data" {
  availability_zone = "eu-west-1a"
  size              = 100
  encrypted         = false
}

resource "aws_security_group_rule" "ssh" {
  type        = "ingress"
  from_port   = 22
  to_port     = 22
  protocol    = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
}

resource "aws_iam_policy" "pipeline" {
  name   = "ci-pipeline"
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
      Action   = "*"
      Resource = "*"
    }]
  })
}`;
  const REGO = `package iac.aws
import rego.v1

deny contains msg if {
  some name
  vol := input.resource.aws_ebs_volume[name]
  vol.encrypted == false
  msg := sprintf("EBS volume %q is not encrypted", [name])
}

deny contains msg if {
  some name
  rule := input.resource.aws_security_group_rule[name]
  rule.type == "ingress"
  rule.from_port <= 22
  rule.to_port >= 22
  "0.0.0.0/0" in rule.cidr_blocks
  msg := sprintf("%q exposes SSH to the internet", [name])
}

deny contains msg if {
  some name
  stmt := input.resource.aws_iam_policy[name].policy.Statement[_]
  stmt.Action == "*"
  stmt.Resource == "*"
  msg := sprintf("IAM policy %q grants *:* (admin)", [name])
}`;
  function scanTF(src) {
    const lines = src.split('\n');
    const blocks = [];
    const re = /^\s*resource\s+"([\w-]+)"\s+"([\w-]+)"\s*\{/;
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(re); if (!m) continue;
      let depth = 0, j = i;
      for (; j < lines.length; j++) { depth += (lines[j].match(/\{/g) || []).length - (lines[j].match(/\}/g) || []).length; if (depth <= 0 && j > i) break; if (depth <= 0 && j === i && lines[j].includes('}')) break; }
      blocks.push({ type: m[1], name: m[2], start: i, end: j, body: lines.slice(i, j + 1) });
      i = j;
    }
    const find = (b, rx) => { const k = b.body.findIndex((l) => rx.test(l)); return k < 0 ? null : b.start + k; };
    const out = [];
    blocks.forEach((b) => {
      const text = b.body.join('\n');
      if (b.type === 'aws_s3_bucket') {
        const inline = /server_side_encryption_configuration/.test(text);
        const sep = blocks.some((o) => o.type === 'aws_s3_bucket_server_side_encryption_configuration' && o.body.join('\n').includes(`aws_s3_bucket.${b.name}`));
        if (!inline && !sep) out.push({ sev: 'high', id: 'IAC-001', line: b.start, msg: `S3 bucket "${b.name}" has no server-side encryption configuration` });
      }
      if (['aws_ebs_volume', 'aws_db_instance', 'aws_rds_cluster'].includes(b.type)) {
        const l = find(b, /^\s*(encrypted|storage_encrypted)\s*=\s*false/);
        if (l !== null) out.push({ sev: 'high', id: 'IAC-002', line: l, msg: `${b.type} "${b.name}" is explicitly unencrypted` });
        else if (!/(encrypted|storage_encrypted)\s*=\s*true/.test(text)) out.push({ sev: 'med', id: 'IAC-002', line: b.start, msg: `${b.type} "${b.name}" does not enable encryption` });
      }
      if (/security_group/.test(b.type) && /ingress/.test(text) && /0\.0\.0\.0\/0/.test(text)) {
        const from = +(text.match(/from_port\s*=\s*(\d+)/) || [])[1], to = +(text.match(/to_port\s*=\s*(\d+)/) || [])[1];
        const risky = [22, 3389, 5432, 3306, 27017].filter((p) => p >= from && p <= to);
        if (risky.length) out.push({ sev: 'crit', id: 'IAC-003', line: find(b, /0\.0\.0\.0\/0/), msg: `"${b.name}" opens port ${risky.join(', ')} to the whole internet` });
      }
      if (b.type === 'aws_iam_policy' || b.type === 'aws_iam_role_policy') {
        const la = find(b, /Action\s*[=:]\s*"\*"/);
        if (la !== null && /Resource\s*[=:]\s*"\*"/.test(text)) out.push({ sev: 'crit', id: 'IAC-004', line: la, msg: `IAM policy "${b.name}" grants Action "*" on Resource "*" (full admin)` });
      }
    });
    return { out, blocks: blocks.length };
  }
  function iac(el) {
    const s = scope();
    el.innerHTML = `
      <div class="demo-bar"><div class="seg"><button class="on" data-t="tf">main.tf (editable)</button><button data-t="rego">policy.rego</button></div><button class="btn sm ghost" data-fix>Apply fixes</button><button class="btn sm ghost" data-reset>Reset</button></div>
      <div class="split">
        <div class="tfwrap"><div class="gutter"></div><textarea class="code tf" spellcheck="false"></textarea><pre class="code rego" hidden>${esc(REGO).replace(/(\bdeny|contains|if|some|package|import|in)\b/g, '<span class="t-kw">$1</span>')}</pre></div>
        <div><div class="scan-head"></div><ul class="findings"></ul></div>
      </div>
      <p class="demo-note">Rescans on every keystroke. Rules: unencrypted storage, internet-exposed admin ports, wildcard IAM. The real tool is Go + Rego; this is a JavaScript port of the same rules.</p>`;
    const ta = el.querySelector('.tf'); ta.value = TF;
    const FIXED = TF.replace('encrypted         = false', 'encrypted         = true')
      .replace('["0.0.0.0/0"]', '["10.0.0.0/16"]')
      .replace('Action   = "*"', 'Action   = ["ecr:PutImage", "ecr:InitiateLayerUpload"]')
      .replace('Resource = "*"', 'Resource = aws_ecr_repository.api.arn')
      + `\n\nresource "aws_s3_bucket_server_side_encryption_configuration" "events_archive" {\n  bucket = aws_s3_bucket.events_archive.id\n  rule {\n    apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" }\n  }\n}`;
    function scan() {
      const { out, blocks } = scanTF(ta.value);
      const sevRank = { crit: 0, high: 1, med: 2 };
      out.sort((a, b) => sevRank[a.sev] - sevRank[b.sev]);
      el.querySelector('.scan-head').innerHTML = out.length
        ? `<b class="t-err">${out.length} finding${out.length > 1 ? 's' : ''}</b> <span class="muted">in ${blocks} resources</span>`
        : `<b class="t-ok">✓ clean</b> <span class="muted">${blocks} resources passed all rules</span>`;
      el.querySelector('.findings').innerHTML = out.map((f) => `<li class="${f.sev}" data-line="${f.line}"><span class="sev-tag">${f.sev}</span><div><b>${f.id}</b> · line ${f.line + 1}<br>${esc(f.msg)}</div></li>`).join('');
      const bad = new Set(out.map((f) => f.line));
      el.querySelector('.gutter').innerHTML = ta.value.split('\n').map((_, i) => `<span class="${bad.has(i) ? 'hit' : ''}">${i + 1}</span>`).join('');
      el.querySelector('.gutter').scrollTop = ta.scrollTop;
    }
    s.on(ta, 'input', scan);
    s.on(ta, 'scroll', () => { el.querySelector('.gutter').scrollTop = ta.scrollTop; });
    s.on(el.querySelector('.findings'), 'click', (e) => {
      const li = e.target.closest('li'); if (!li) return;
      const n = +li.dataset.line; const pos = ta.value.split('\n').slice(0, n).join('\n').length + (n ? 1 : 0);
      ta.focus(); ta.setSelectionRange(pos, pos + ta.value.split('\n')[n].length);
      ta.scrollTop = Math.max(0, n * 19 - 60);
    });
    s.on(el.querySelector('.seg'), 'click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      el.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b));
      const rego = b.dataset.t === 'rego';
      ta.hidden = rego; el.querySelector('.gutter').hidden = rego; el.querySelector('.rego').hidden = !rego;
    });
    s.on(el.querySelector('[data-fix]'), 'click', () => { ta.value = FIXED; scan(); });
    s.on(el.querySelector('[data-reset]'), 'click', () => { ta.value = TF; scan(); });
    scan();
    return () => s.dispose();
  }

  // ------------------------------------------------------------------ TCP handshake / Wireshark
  function tcp(el) {
    const s = scope();
    const C = '10.0.0.12:52814', S = '93.184.216.34:80';
    const PK = [
      { d: 1, f: ['SYN'], seq: 0, ack: null, len: 0, info: 'Client opens: "I want to talk; my sequence starts at 0."' },
      { d: -1, f: ['SYN', 'ACK'], seq: 0, ack: 1, len: 0, info: 'Server agrees, picks its own ISN, and acknowledges the client SYN (ack = client seq + 1).' },
      { d: 1, f: ['ACK'], seq: 1, ack: 1, len: 0, info: 'Handshake complete. Both sides have synchronized sequence numbers.' },
      { d: 1, f: ['PSH', 'ACK'], seq: 1, ack: 1, len: 78, info: 'HTTP request: GET / HTTP/1.1 (78 bytes of payload).', app: 'GET / HTTP/1.1' },
      { d: -1, f: ['ACK'], seq: 1, ack: 79, len: 0, info: 'Server acknowledges 78 bytes: ack = 1 + 78 = 79.' },
      { d: -1, f: ['PSH', 'ACK'], seq: 1, ack: 79, len: 512, info: 'HTTP response headers and body (512 bytes).', app: 'HTTP/1.1 200 OK' },
      { d: 1, f: ['ACK'], seq: 79, ack: 513, len: 0, info: 'Client acknowledges the 512 response bytes.' },
      { d: 1, f: ['FIN', 'ACK'], seq: 79, ack: 513, len: 0, info: 'Client is done sending. FIN consumes one sequence number.' },
      { d: -1, f: ['FIN', 'ACK'], seq: 513, ack: 80, len: 0, info: 'Server acknowledges the FIN and closes its side too.' },
      { d: 1, f: ['ACK'], seq: 80, ack: 514, len: 0, info: 'Final ACK. Connection closed (client enters TIME_WAIT).' },
    ];
    el.innerHTML = `
      <div class="demo-bar"><button class="btn sm" data-step>Step ▸</button><button class="btn sm" data-play>▶ Play all</button><button class="btn sm ghost" data-reset>Reset</button></div>
      <svg class="tcp-svg" viewBox="0 0 600 120" preserveAspectRatio="xMidYMid meet">
        <g class="host"><rect x="10" y="30" width="120" height="60" rx="10"/><text x="70" y="56">client</text><text x="70" y="74" class="sub">${C}</text></g>
        <g class="host"><rect x="470" y="30" width="120" height="60" rx="10"/><text x="530" y="56">server</text><text x="530" y="74" class="sub">${S}</text></g>
        <line x1="130" y1="60" x2="470" y2="60" class="wire"/>
        <g class="pkt" transform="translate(-100,0)"><rect x="-38" y="44" width="76" height="32" rx="6"/><text x="0" y="65">SYN</text></g>
      </svg>
      <div class="ws"><table class="tbl ws-tbl"><thead><tr><th>No.</th><th>Source</th><th>Destination</th><th>Flags</th><th>Seq</th><th>Ack</th><th>Len</th><th>Info</th></tr></thead><tbody></tbody></table></div>
      <div class="pkt-detail muted">Click a row to inspect the packet.</div>`;
    let idx = 0, playing = false;
    const tb = el.querySelector('tbody'), pkt = el.querySelector('.pkt');
    function detail(i) {
      const p = PK[i];
      tb.querySelectorAll('tr').forEach((r, k) => r.classList.toggle('sel', k === i));
      const flags = ['URG', 'ACK', 'PSH', 'RST', 'SYN', 'FIN'];
      el.querySelector('.pkt-detail').className = 'pkt-detail';
      el.querySelector('.pkt-detail').innerHTML = `
        <div class="flags">${flags.map((f) => `<span class="${p.f.includes(f) ? 'on' : ''}">${f}</span>`).join('')}</div>
        <div>Transmission Control Protocol, Src: ${p.d > 0 ? C : S}, Dst: ${p.d > 0 ? S : C}, Seq: ${p.seq}${p.ack !== null ? `, Ack: ${p.ack}` : ''}, Len: ${p.len}</div>
        <div class="t-com">${esc(p.info)}</div>`;
    }
    function send(then) {
      if (idx >= PK.length) return then && then();
      const p = PK[idx], i = idx++;
      pkt.querySelector('text').textContent = p.app ? 'HTTP' : p.f.join('·');
      pkt.classList.toggle('back', p.d < 0);
      const from = p.d > 0 ? 170 : 430, to = p.d > 0 ? 430 : 170;
      const t0 = performance.now(), D = REDUCED ? 1 : 520;
      const anim = (t) => {
        if (!s.alive) return;
        const k = Math.min(1, (t - t0) / D), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        pkt.setAttribute('transform', `translate(${from + (to - from) * e},0)`);
        if (k < 1) return requestAnimationFrame(anim);
        tb.insertAdjacentHTML('beforeend', `<tr data-i="${i}" class="${p.f.includes('SYN') ? 'syn' : p.f.includes('FIN') ? 'fin' : p.app ? 'http' : ''}"><td>${i + 1}</td><td>${p.d > 0 ? C : S}</td><td>${p.d > 0 ? S : C}</td><td>[${p.f.join(', ')}]</td><td>${p.seq}</td><td>${p.ack ?? ''}</td><td>${p.len}</td><td>${esc(p.app || p.info.split('.')[0])}</td></tr>`);
        detail(i);
        then && then();
      };
      requestAnimationFrame(anim);
    }
    s.on(el.querySelector('[data-step]'), 'click', () => { if (!playing) send(); });
    s.on(el.querySelector('[data-play]'), 'click', () => { if (playing) return; playing = true; const go = () => (idx < PK.length && s.alive ? s.timeout(() => send(go), 250) : (playing = false)); go(); });
    s.on(el.querySelector('[data-reset]'), 'click', () => { if (playing) return; idx = 0; tb.innerHTML = ''; pkt.setAttribute('transform', 'translate(-100,0)'); el.querySelector('.pkt-detail').className = 'pkt-detail muted'; el.querySelector('.pkt-detail').textContent = 'Click a row to inspect the packet.'; });
    s.on(tb, 'click', (e) => { const r = e.target.closest('tr'); if (r) detail(+r.dataset.i); });
    return () => s.dispose();
  }

  // ------------------------------------------------------------------ Mini CTF
  function ctf(el) {
    const s = scope();
    const FLAG = 'flag{d3fense_st4rts_w1th_cur10s1ty}';
    const rot13 = (t) => t.replace(/[a-z]/gi, (c) => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - b + 13) % 26) + b); });
    const rev = (t) => [...t].reverse().join('');
    const toHex = (t) => [...new TextEncoder().encode(t)].map((b) => b.toString(16).padStart(2, '0')).join('');
    const CIPHER = toHex(btoa(rot13(rev(FLAG))));
    const TOOLS = {
      'From Hex': (t) => { const c = t.replace(/\s+/g, ''); if (!/^([0-9a-f]{2})+$/i.test(c)) throw new Error('not valid hex'); return new TextDecoder().decode(new Uint8Array(c.match(/../g).map((h) => parseInt(h, 16)))); },
      'From Base64': (t) => { try { return atob(t.trim()); } catch { throw new Error('not valid base64'); } },
      ROT13: rot13,
      Reverse: rev,
    };
    el.innerHTML = `
      <p class="demo-note" style="margin-top:0">Intercepted string. Recover the flag using the tools below, in the right order.</p>
      <pre class="code ctf-buf"></pre>
      <div class="demo-bar">${Object.keys(TOOLS).map((k) => `<button class="btn sm" data-tool="${k}">${k}</button>`).join('')}<button class="btn sm ghost" data-undo>Undo</button><button class="btn sm ghost" data-hint>Hint</button></div>
      <div class="ctf-trail muted"></div>`;
    const stack = [CIPHER];
    const buf = el.querySelector('.ctf-buf'), trail = el.querySelector('.ctf-trail');
    const steps = [];
    let hint = 0;
    const HINTS = ['Only 0-9 and a-f… what does that suggest?', 'Letters, digits, maybe = at the end? That is base64.', 'Looks like gibberish letters: a classic Caesar shift.', 'Almost there: read it backwards.'];
    function render(err) {
      const cur = stack[stack.length - 1];
      buf.textContent = cur; buf.classList.toggle('solved', cur === FLAG);
      trail.innerHTML = err ? `<span class="t-err">✗ ${esc(err)}</span>` : cur === FLAG ? `<span class="t-ok">🏁 Solved! ${steps.join(' → ')}</span>` : steps.length ? steps.join(' → ') : 'No transformations applied yet.';
    }
    el.querySelectorAll('[data-tool]').forEach((b) => s.on(b, 'click', () => {
      try { stack.push(TOOLS[b.dataset.tool](stack[stack.length - 1])); steps.push(b.dataset.tool); render(); } catch (e) { render(e.message); }
    }));
    s.on(el.querySelector('[data-undo]'), 'click', () => { if (stack.length > 1) { stack.pop(); steps.pop(); } render(); });
    s.on(el.querySelector('[data-hint]'), 'click', () => { trail.innerHTML = `💡 ${HINTS[Math.min(hint++, HINTS.length - 1)]}`; });
    render();
    return () => s.dispose();
  }

  // ------------------------------------------------------------------ Motion detection
  function motion(el) {
    const s = scope();
    const W = 160, H = 120;
    el.innerHTML = `
      <div class="demo-bar">
        <button class="btn sm" data-cam>Use my webcam</button>
        <label>threshold <input type="range" data-th min="8" max="80" value="28"><b data-thv>28</b></label>
        <label>min area <input type="range" data-ma min="10" max="400" value="60"><b data-mav>60</b></label>
      </div>
      <div class="cv3">
        <figure><canvas width="${W}" height="${H}" data-v="frame"></canvas><figcaption>input frame</figcaption></figure>
        <figure><canvas width="${W}" height="${H}" data-v="mask"></canvas><figcaption>|frame − background| &gt; threshold</figcaption></figure>
        <figure><canvas width="${W}" height="${H}" data-v="det"></canvas><figcaption>connected regions → boxes</figcaption></figure>
      </div>
      <p class="demo-note">A running-average background model, absolute difference, threshold, dilation and connected components, computed per frame in plain JS. The Python version used OpenCV for the same steps. The webcam stays local; no frames leave your browser.</p>`;
    const cv = {}; el.querySelectorAll('canvas').forEach((c) => (cv[c.dataset.v] = c.getContext('2d', { willReadFrequently: true })));
    const src = document.createElement('canvas'); src.width = W; src.height = H;
    const sg = src.getContext('2d', { willReadFrequently: true });
    const bg = new Float32Array(W * H); let bgInit = false;
    let video = null, stream = null;
    const th = () => +el.querySelector('[data-th]').value, ma = () => +el.querySelector('[data-ma]').value;
    s.on(el, 'input', () => { el.querySelector('[data-thv]').textContent = th(); el.querySelector('[data-mav]').textContent = ma(); });
    s.on(el.querySelector('[data-cam]'), 'click', async (e) => {
      if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; video = null; bgInit = false; e.target.textContent = 'Use my webcam'; return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        if (!s.alive) { stream.getTracks().forEach((t) => t.stop()); return; }
        video = document.createElement('video'); video.srcObject = stream; video.muted = true; video.playsInline = true; await video.play();
        bgInit = false; e.target.textContent = 'Stop webcam';
      } catch (err) { e.target.textContent = 'Webcam unavailable'; }
    });
    s.add(() => stream && stream.getTracks().forEach((t) => t.stop()));
    // synthetic scene
    const blobs = [{ x: 20, y: 40, vx: 0.9, vy: 0.3, r: 11, c: '#f472b6' }, { x: 120, y: 90, vx: -0.6, vy: -0.5, r: 8, c: '#5eead4' }, { x: 80, y: 20, vx: 0.4, vy: 0.7, r: 6, c: '#fbbf24' }];
    function scene(t) {
      const gr = sg.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1e293b'); gr.addColorStop(1, '#0f172a');
      sg.fillStyle = gr; sg.fillRect(0, 0, W, H);
      sg.fillStyle = '#334155'; sg.fillRect(10, 70, 40, 40); sg.fillRect(110, 15, 36, 26); sg.fillStyle = '#475569'; sg.fillRect(60, 95, 60, 14);
      blobs.forEach((b) => {
        b.x += b.vx; b.y += b.vy;
        if (b.x < b.r || b.x > W - b.r) b.vx *= -1; if (b.y < b.r || b.y > H - b.r) b.vy *= -1;
        sg.fillStyle = b.c; sg.beginPath(); sg.arc(b.x, b.y, b.r, 0, Math.PI * 2); sg.fill();
      });
    }
    const mask = new Uint8Array(W * H), dil = new Uint8Array(W * H), lab = new Int32Array(W * H);
    let frame = 0;
    s.loop((dt, t) => {
      if (++frame % 2) return; // ~30fps is plenty
      if (video && video.readyState >= 2) { sg.save(); sg.scale(-1, 1); sg.drawImage(video, -W, 0, W, H); sg.restore(); }
      else scene(t);
      const img = sg.getImageData(0, 0, W, H), d = img.data;
      // sensor noise so thresholding matters
      if (!video) for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
      cv.frame.putImageData(img, 0, 0);
      const T = th();
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (!bgInit) bg[p] = g;
        mask[p] = Math.abs(g - bg[p]) > T ? 1 : 0;
        bg[p] = bg[p] * 0.93 + g * 0.07;
      }
      bgInit = true;
      // dilate 3x3
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let v = 0;
        for (let dy = -1; dy <= 1 && !v; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && mask[yy * W + xx]) { v = 1; break; } }
        dil[y * W + x] = v;
      }
      const mi = cv.mask.createImageData(W, H);
      for (let p = 0; p < W * H; p++) { const v = dil[p] ? 255 : 0; mi.data[p * 4] = v; mi.data[p * 4 + 1] = v; mi.data[p * 4 + 2] = v; mi.data[p * 4 + 3] = 255; }
      cv.mask.putImageData(mi, 0, 0);
      // connected components (4-neighbour BFS)
      lab.fill(0); let n = 0; const boxes = []; const q = new Int32Array(W * H);
      for (let p = 0; p < W * H; p++) {
        if (!dil[p] || lab[p]) continue;
        n++; let h = 0, tl = 0; q[tl++] = p; lab[p] = n;
        let x0 = W, y0 = H, x1 = 0, y1 = 0, area = 0;
        while (h < tl) {
          const c = q[h++], x = c % W, y = (c / W) | 0; area++;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
          const nb = [c - 1, c + 1, c - W, c + W];
          for (let k = 0; k < 4; k++) { const m = nb[k]; if (m < 0 || m >= W * H) continue; if ((k === 0 && x === 0) || (k === 1 && x === W - 1)) continue; if (dil[m] && !lab[m]) { lab[m] = n; q[tl++] = m; } }
        }
        if (area >= ma()) boxes.push({ x0, y0, x1, y1, area });
      }
      cv.det.putImageData(img, 0, 0);
      cv.det.strokeStyle = '#5eead4'; cv.det.lineWidth = 1.5; cv.det.font = '500 9px "Geist Mono", ui-monospace, monospace'; cv.det.fillStyle = '#5eead4';
      boxes.forEach((b, i) => { cv.det.strokeRect(b.x0 - 1, b.y0 - 1, b.x1 - b.x0 + 3, b.y1 - b.y0 + 3); cv.det.fillText('#' + (i + 1), b.x0, Math.max(8, b.y0 - 3)); });
      cv.det.fillStyle = 'rgba(0,0,0,.6)'; cv.det.fillRect(0, H - 12, 90, 12); cv.det.fillStyle = '#e6ebf5'; cv.det.fillText(`${boxes.length} moving region${boxes.length === 1 ? '' : 's'}`, 3, H - 3);
    });
    return () => s.dispose();
  }

  // ------------------------------------------------------------------ Fuzzy matching
  function fuzzy(el) {
    const s = scope();
    const LABELS = ['INVOICE NUMBER', 'TOTAL AMOUNT', 'DATE ISSUED', 'CUSTOMER ID', 'LICENSE PLATE', 'SERIAL NUMBER', 'DUE DATE'];
    el.innerHTML = `
      <div class="demo-bar">
        <input class="ocr-in" value="T0TAL AM0UNT" aria-label="OCR text">
        <button class="btn sm" data-noise>Simulate OCR noise</button>
        <label>accept ≥ <input type="range" data-th min="40" max="95" value="70"><b data-thv>70</b>%</label>
      </div>
      <div class="fz-list"></div>
      <div class="fz-align"></div>
      <p class="demo-note">Similarity = 1 − Levenshtein distance / max length. Classic OCR confusions (0↔O, 1↔I↔l, 5↔S, 8↔B) cost one edit each, so a noisy read still lands on the right field.</p>`;
    function lev(a, b) {
      const m = a.length, n = b.length, D = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
      for (let j = 1; j <= n; j++) D[0][j] = j;
      for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      // backtrack for alignment
      const ops = []; let i = m, j = n;
      while (i || j) {
        if (i && j && D[i][j] === D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) { ops.unshift(a[i - 1] === b[j - 1] ? ['=', a[i - 1]] : ['~', a[i - 1], b[j - 1]]); i--; j--; }
        else if (i && D[i][j] === D[i - 1][j] + 1) { ops.unshift(['-', a[i - 1]]); i--; }
        else { ops.unshift(['+', b[j - 1]]); j--; }
      }
      return { d: D[m][n], ops };
    }
    function render() {
      const txt = el.querySelector('.ocr-in').value.toUpperCase(); const T = +el.querySelector('[data-th]').value;
      el.querySelector('[data-thv]').textContent = T;
      const res = LABELS.map((l) => { const r = lev(txt, l); return { l, ...r, sim: txt.length || l.length ? 1 - r.d / Math.max(txt.length, l.length) : 0 }; }).sort((a, b) => b.sim - a.sim);
      el.querySelector('.fz-list').innerHTML = res.map((r, i) => `
        <div class="fz-row ${i === 0 && r.sim * 100 >= T ? 'best' : ''}"><span>${r.l}</span><i style="--w:${Math.max(0, r.sim) * 100}%"></i><b>${Math.round(r.sim * 100)}%</b><small>${r.d} edit${r.d === 1 ? '' : 's'}</small></div>`).join('');
      const best = res[0];
      el.querySelector('.fz-align').innerHTML = best.sim * 100 >= T
        ? `<div class="label">Alignment: “${esc(txt)}” → <b class="t-ok">${best.l}</b></div><div class="ops">${best.ops.map((o) => o[0] === '=' ? `<span>${esc(o[1] === ' ' ? '␣' : o[1])}</span>` : o[0] === '~' ? `<span class="sub" title="substitute">${esc(o[1])}<sup>${esc(o[2])}</sup></span>` : o[0] === '-' ? `<span class="del" title="delete">${esc(o[1])}</span>` : `<span class="ins" title="insert">${esc(o[1])}</span>`).join('')}</div>`
        : `<div class="label t-err">No field above ${T}%: routed to manual review.</div>`;
    }
    const CONF = { O: '0', I: '1', S: '5', B: '8', E: 'F', A: '4', L: '1', D: '0', Z: '2', G: '6' };
    s.on(el.querySelector('[data-noise]'), 'click', () => {
      const l = LABELS[Math.floor(Math.random() * LABELS.length)];
      let out = [...l].map((c) => (CONF[c] && Math.random() < 0.35 ? CONF[c] : c)).join('');
      if (Math.random() < 0.5) { const k = 1 + Math.floor(Math.random() * (out.length - 2)); out = out.slice(0, k) + out.slice(k + 1); }
      el.querySelector('.ocr-in').value = out; render();
    });
    s.on(el, 'input', render);
    render();
    return () => s.dispose();
  }

  // ------------------------------------------------------------------ Sorting race
  function sort(el) {
    const s = scope();
    const N = 40;
    const ALGOS = {
      'Bubble · O(n²)': function* (a) { for (let i = 0; i < a.length; i++) for (let j = 0; j < a.length - i - 1; j++) { yield { c: [j, j + 1] }; if (a[j] > a[j + 1]) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; yield { w: [j, j + 1] }; } } },
      'Insertion · O(n²)': function* (a) { for (let i = 1; i < a.length; i++) { let j = i; while (j > 0) { yield { c: [j - 1, j] }; if (a[j - 1] <= a[j]) break; [a[j - 1], a[j]] = [a[j], a[j - 1]]; yield { w: [j - 1, j] }; j--; } } },
      'Merge · O(n log n)': function* (a) {
        function* ms(lo, hi) {
          if (hi - lo < 2) return; const mid = (lo + hi) >> 1; yield* ms(lo, mid); yield* ms(mid, hi);
          const tmp = []; let i = lo, j = mid;
          while (i < mid && j < hi) { yield { c: [i, j] }; tmp.push(a[i] <= a[j] ? a[i++] : a[j++]); }
          while (i < mid) tmp.push(a[i++]); while (j < hi) tmp.push(a[j++]);
          for (let k = 0; k < tmp.length; k++) { a[lo + k] = tmp[k]; yield { w: [lo + k] }; }
        }
        yield* ms(0, a.length);
      },
      'Quick · O(n log n) avg': function* (a) {
        function* qs(lo, hi) {
          if (lo >= hi) return; const p = a[hi]; let i = lo;
          for (let j = lo; j < hi; j++) { yield { c: [j, hi] }; if (a[j] < p) { [a[i], a[j]] = [a[j], a[i]]; yield { w: [i, j] }; i++; } }
          [a[i], a[hi]] = [a[hi], a[i]]; yield { w: [i, hi] };
          yield* qs(lo, i - 1); yield* qs(i + 1, hi);
        }
        yield* qs(0, a.length - 1);
      },
      'Heap · O(n log n)': function* (a) {
        const n = a.length;
        function* sift(i, size) { for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < size) { yield { c: [l, m] }; if (a[l] > a[m]) m = l; } if (r < size) { yield { c: [r, m] }; if (a[r] > a[m]) m = r; } if (m === i) return; [a[i], a[m]] = [a[m], a[i]]; yield { w: [i, m] }; i = m; } }
        for (let i = (n >> 1) - 1; i >= 0; i--) yield* sift(i, n);
        for (let e = n - 1; e > 0; e--) { [a[0], a[e]] = [a[e], a[0]]; yield { w: [0, e] }; yield* sift(0, e); }
      },
    };
    el.innerHTML = `
      <div class="demo-bar"><button class="btn sm" data-go>▶ Race (same input)</button><button class="btn sm ghost" data-shuffle>New random input</button><label>speed <input type="range" data-sp min="1" max="30" value="6"></label></div>
      <div class="race">${Object.keys(ALGOS).map((k) => `<figure><canvas data-a="${k}"></canvas><figcaption><b>${k}</b><span data-cnt="${k}">0 comparisons</span></figcaption></figure>`).join('')}</div>`;
    let base = [];
    const shuffle = () => { base = Array.from({ length: N }, (_, i) => i + 1); for (let i = N - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; } };
    const runs = Object.keys(ALGOS).map((k) => ({ k, c: el.querySelector(`canvas[data-a="${k}"]`) }));
    const reset = () => runs.forEach((r) => { r.a = base.slice(); r.it = null; r.cmp = 0; r.hi = null; r.done = false; r.dim = fitCanvas(r.c); draw(r); el.querySelector(`[data-cnt="${r.k}"]`).textContent = '0 comparisons'; });
    function draw(r) {
      const { g, w, h } = r.dim; g.clearRect(0, 0, w, h);
      const bw = w / N;
      r.a.forEach((v, i) => {
        const on = r.hi && r.hi.includes(i);
        g.fillStyle = r.done ? '#34d399' : on ? (r.hiw ? '#f472b6' : '#fbbf24') : 'rgba(167,139,250,.75)';
        const bh = (v / N) * (h - 4); g.fillRect(i * bw + 1, h - bh, Math.max(1, bw - 2), bh);
      });
    }
    let racing = false;
    s.on(el.querySelector('[data-shuffle]'), 'click', () => { racing = false; shuffle(); reset(); });
    s.on(el.querySelector('[data-go]'), 'click', () => { reset(); runs.forEach((r) => (r.it = ALGOS[r.k](r.a))); racing = true; });
    s.loop(() => {
      if (!racing) return;
      const sp = +el.querySelector('[data-sp]').value;
      let any = false;
      runs.forEach((r) => {
        if (!r.it || r.done) return; any = true;
        for (let k = 0; k < sp; k++) {
          const st = r.it.next();
          if (st.done) { r.done = true; r.hi = null; el.querySelector(`[data-cnt="${r.k}"]`).textContent = `${r.cmp} comparisons ✓`; break; }
          if (st.value.c) { r.cmp++; r.hi = st.value.c; r.hiw = false; } else { r.hi = st.value.w; r.hiw = true; }
        }
        if (!r.done) el.querySelector(`[data-cnt="${r.k}"]`).textContent = `${r.cmp} comparisons`;
        draw(r);
      });
      if (!any) racing = false;
    });
    const ro = new ResizeObserver(() => runs.forEach((r) => { r.dim = fitCanvas(r.c); draw(r); }));
    runs.forEach((r) => ro.observe(r.c)); s.add(() => ro.disconnect());
    shuffle(); reset();
    return () => s.dispose();
  }

  window.DEMOS = {
    pubsub: { title: 'Event-driven pipeline', mount: pubsub },
    sql: { title: 'BigQuery analytics', mount: sql },
    protobuf: { title: 'Protobuf wire encoder', mount: protobuf },
    firebase: { title: 'Realtime QA app (iOS ⇄ Android)', mount: firebase },
    docker: { title: 'Docker layer cache', mount: docker },
    cicd: { title: 'CI/CD pipeline', mount: cicd },
    terminal: { title: 'Terminal', mount: terminal },
    rest: { title: 'Feedback ingestion API', mount: rest },
    polyglot: { title: 'Same logic, every language', mount: polyglot },
    llm: { title: 'Multi-LLM cross-verification', mount: llm },
    hybrid: { title: 'LLM extracts, code decides', mount: hybrid },
    compress: { title: 'Asset compression pipeline', mount: compress },
    pollution: { title: 'Prototype pollution lab', mount: pollution },
    iac: { title: 'IaC risk scanner', mount: iac },
    tcp: { title: 'TCP conversation, packet by packet', mount: tcp },
    ctf: { title: 'Mini CTF challenge', mount: ctf },
    motion: { title: 'Motion detection', mount: motion },
    fuzzy: { title: 'OCR fuzzy matching', mount: fuzzy },
    sort: { title: 'Sorting algorithm race', mount: sort },
  };
})();
